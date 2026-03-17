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
  created_at: string;
  updated_at: string;
  // Joined data
  order_items?: any[];
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
  updatePaymentStatus: (orderId: string, paymentData: any) => Promise<{ success: boolean; error?: string }>;
   cancelOrder: (orderId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  requestRefund: (orderId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
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
      
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          order:orders(*)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching seller orders:', error);
        set({ error: error.message, loading: false });
        return;
      }

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
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_method: paymentData.method,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating payment status:', error);
        return { success: false, error: error.message };
      }

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

  setSelectedOrder: (order) => set({ selectedOrder: order }),
}));