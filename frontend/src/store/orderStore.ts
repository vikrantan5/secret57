import { create } from 'zustand';
import { supabase } from '../services/supabase';
export interface Order {
  id: string;
  customer_id: string;
  order_number: string;
  subtotal: number;
  discount: number;
  delivery_charges: number;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  seller_status?: 'pending' | 'processing' | 'processed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;
  payment_method: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  tracking_number: string | null;
  cancellation_reason: string | null;
  delivery_otp?: string | null;
  otp_verified?: boolean;
  otp_attempts?: number;
  created_at: string;
  updated_at: string;
  seller_status_updated_at?: string | null;
  seller_notes?: string | null;
  // Joined data
  order_items?: any[];
  items?: any[];
  timeline?: Array<{ status: string; seller_status?: string; created_at: string; notes?: string }>;
}

interface OrderState {
  orders: Order[];
  selectedOrder: Order | null;
  loading: boolean;
  error: string | null;
  
  fetchOrders: (userId: string) => Promise<void>;
  fetchOrderById: (id: string) => Promise<void>;
   fetchSellerOrders: (sellerId: string) => Promise<void>;
  createOrder: (order: Partial<Order>, items: any[]) => Promise<{ success: boolean; error?: string; order?: Order }>;
  updateOrderStatus: (id: string, status: string) => Promise<{ success: boolean; error?: string }>;
  updateSellerStatus: (orderId: string, sellerStatus: string, notes?: string) => Promise<{ success: boolean; error?: string }>;
  updatePaymentStatus: (orderId: string, paymentData: any) => Promise<{ success: boolean; error?: string }>;
   cancelOrder: (orderId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  requestRefund: (orderId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  verifyDeliveryOTP: (orderId: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  setSelectedOrder: (order: Order | null) => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  selectedOrder: null,
  loading: false,
  error: null,

  fetchOrders: async (userId: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        set({ error: error.message, loading: false });
        return;
      }

      set({ orders: data || [], loading: false });
    } catch (error: any) {
      console.error('Error in fetchOrders:', error);
      set({ error: error.message, loading: false });
    }
  },

  fetchOrderById: async (id: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching order:', error);
        set({ error: error.message, loading: false });
        return;
      }

      set({ selectedOrder: data, loading: false });
    } catch (error: any) {
      console.error('Error in fetchOrderById:', error);
      set({ error: error.message, loading: false });
    }
  },

    fetchSellerOrders: async (sellerId: string) => {
    try {
      set({ loading: true, error: null });
      
      // ✅ Fetch ALL orders (both pending and paid) for seller to track abandoned checkouts
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
           order:orders!inner(
            *,
            customer:users!orders_customer_id_fkey(name, email, phone)
          )
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching seller orders:', error);
        set({ error: error.message, loading: false });
        return;
      }

      console.log('Fetched seller order items:', data?.length);

      // Group by order and format
      const ordersMap = new Map();
      data?.forEach((item: any) => {
        if (item.order) {
          const orderId = item.order.id;
          if (!ordersMap.has(orderId)) {
            ordersMap.set(orderId, {
              ...item.order,
              items: [item],
              customer_name: item.order.shipping_name,
            });
          } else {
            ordersMap.get(orderId).items.push(item);
          }
        }
      });

      const orders = Array.from(ordersMap.values());
      console.log('Grouped seller orders:', orders.length);
      
      set({ orders, loading: false });
    } catch (error: any) {
      console.error('Error in fetchSellerOrders:', error);
      set({ error: error.message, loading: false });
    }
  },
  createOrder: async (order, items) => {
    try {
      // Generate order number
      const orderNumber = 'ORD' + Date.now();
      
      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          ...order,
          order_number: orderNumber,
          status: 'pending',
          payment_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        return { success: false, error: orderError.message };
      }

      // Create order items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_id: item.productId,
        seller_id: item.sellerId,
        product_name: item.name,
        product_image: item.image,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
        created_at: new Date().toISOString(),
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        // Rollback order creation
        await supabase.from('orders').delete().eq('id', orderData.id);
        return { success: false, error: itemsError.message };
      }

      // Add to local state
      set(state => ({ orders: [orderData, ...state.orders] }));
      
      return { success: true, order: orderData };
    } catch (error: any) {
      console.error('Error in createOrder:', error);
      return { success: false, error: error.message };
    }
  },

  updateOrderStatus: async (id, status) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating order status:', error);
        return { success: false, error: error.message };
      }

      // Update local state
      set(state => ({
        orders: state.orders.map(o => o.id === id ? { ...o, status } : o)
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateOrderStatus:', error);
      return { success: false, error: error.message };
    }
  },

   updatePaymentStatus: async (orderId, paymentData) => {
    try {
      // ✅ Support both Razorpay and Cashfree payment methods
      const updateData: any = {
        payment_status: 'paid',
        status: 'processing', // Auto-update order status to processing when payment is confirmed
        payment_method: paymentData.method,
        updated_at: new Date().toISOString(),
      };

      // Add Razorpay fields if present
      if (paymentData.razorpay_order_id) {
        updateData.razorpay_order_id = paymentData.razorpay_order_id;
      }
      if (paymentData.razorpay_payment_id) {
        updateData.razorpay_payment_id = paymentData.razorpay_payment_id;
      }
      if (paymentData.razorpay_signature) {
        updateData.razorpay_signature = paymentData.razorpay_signature;
      }

      // ✅ FIX: Add Cashfree fields to proper columns
      if (paymentData.cashfree_order_id) {
        updateData.cashfree_order_id = paymentData.cashfree_order_id;
      }
      if (paymentData.cashfree_payment_id) {
        updateData.cashfree_payment_id = paymentData.cashfree_payment_id;
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) {
        console.error('Error updating payment status:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Payment status updated successfully for order:', orderId);

      // Update local state
      set(state => ({
        orders: state.orders.map(o => 
          o.id === orderId ? { ...o, payment_status: 'paid', status: 'processing' } : o
        )
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in updatePaymentStatus:', error);
      return { success: false, error: error.message };
    }
  },

    cancelOrder: async (orderId, reason) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error cancelling order:', error);
        return { success: false, error: error.message };
      }

      // Update local state
      set(state => ({
        orders: state.orders.map(o => 
          o.id === orderId ? { ...o, status: 'cancelled', cancellation_reason: reason } : o
        )
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in cancelOrder:', error);
      return { success: false, error: error.message };
    }
  },

  requestRefund: async (orderId, reason) => {
    try {
      // Get order details
      const { data: order } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();

      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'refunded',
          payment_status: 'refunded',
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (orderError) {
        console.error('Error updating order:', orderError);
        return { success: false, error: orderError.message };
      }

      // Create payment refund record
      await supabase
        .from('payments')
        .insert([{
          order_id: orderId,
          user_id: order.customer_id,
          amount: order.total_amount,
          status: 'refunded',
          refund_reason: reason,
          refund_amount: order.total_amount,
        }]);

      // Send notification to customer
      await supabase
        .from('notifications')
        .insert([{
          user_id: order.customer_id,
          type: 'payment',
          title: 'Refund Processed',
          message: `Your refund of ₹${order.total_amount.toFixed(2)} has been initiated for order ${order.order_number}`,
          data: { orderId: order.id },
        }]);

      // Notify sellers
      const sellerIds = [...new Set(order.order_items.map((item: any) => item.seller_id))];
      for (const sellerId of sellerIds) {
        const { data: seller } = await supabase
          .from('sellers')
          .select('user_id')
          .eq('id', sellerId)
          .single();

        if (seller) {
          await supabase
            .from('notifications')
            .insert([{
              user_id: seller.user_id,
              type: 'order',
              title: 'Order Refunded',
              message: `Order ${order.order_number} has been refunded`,
              data: { orderId: order.id },
            }]);
        }
      }

      // Update local state
      set(state => ({
        orders: state.orders.map(o => 
          o.id === orderId ? { ...o, status: 'refunded', payment_status: 'refunded' } : o
        )
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in requestRefund:', error);
      return { success: false, error: error.message };
    }
  },

   updateSellerStatus: async (orderId, sellerStatus, notes) => {
    try {
      set({ loading: true });
      
      // Generate OTP if status is 'delivered'
      const updateData: any = {
        seller_status: sellerStatus,
        seller_status_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (notes) {
        updateData.seller_notes = notes;
      }

      // Generate OTP when marking as delivered
      if (sellerStatus === 'delivered') {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        updateData.delivery_otp = otp;
        updateData.otp_verified = false;
        updateData.otp_attempts = 0;
        updateData.otp_generated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) {
        console.error('Error updating seller status:', error);
        set({ loading: false });
        return { success: false, error: error.message };
      }

      // Insert into order_timeline
      await supabase
        .from('order_timeline')
        .insert([{
          order_id: orderId,
          seller_status: sellerStatus,
          status: sellerStatus === 'delivered' ? 'delivered' : undefined,
          notes: notes || `Order status updated to ${sellerStatus}`,
          created_at: new Date().toISOString(),
        }]);

      // Update local state
      set(state => ({
        orders: state.orders.map(o =>
          o.id === orderId ? { ...o, ...updateData } : o
        ),
        selectedOrder: state.selectedOrder?.id === orderId
          ? { ...state.selectedOrder, ...updateData }
          : state.selectedOrder,
        loading: false
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateSellerStatus:', error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  verifyDeliveryOTP: async (orderId, otp) => {
    try {
      set({ loading: true, error: null });

      // Fetch the order
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;
      if (!order) throw new Error('Order not found');

      // Check OTP
      if (order.delivery_otp !== otp) {
        // Increment OTP attempts
        await supabase
          .from('orders')
          .update({ otp_attempts: (order.otp_attempts || 0) + 1 })
          .eq('id', orderId);

        set({ loading: false, error: 'Invalid OTP' });
        return { success: false, error: 'Invalid OTP. Please check and try again.' };
      }

      if (order.otp_verified) {
        set({ loading: false });
        return { success: false, error: 'OTP has already been verified.' };
      }

      // Verify OTP and mark order as completed
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          seller_status: 'delivered',
          otp_verified: true,
          otp_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Add to timeline
      await supabase
        .from('order_timeline')
        .insert({
          order_id: orderId,
          status: 'delivered',
          seller_status: 'delivered',
          notes: 'Order delivered and OTP verified successfully',
          created_at: new Date().toISOString()
        });

      // Refresh order data
      await get().fetchOrderById(orderId);

      set({ loading: false });
      return { success: true };
    } catch (error: any) {
      console.error('Failed to verify OTP:', error);
      set({ loading: false, error: error.message });
      return { success: false, error: error.message };
    }
  },

  setSelectedOrder: (order) => set({ selectedOrder: order }),
}));