import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { notificationService } from '../services/notificationService';
export interface Order {
  id: string;
  customer_id: string;
  order_number: string;
  subtotal: number;
  discount: number;
  delivery_charges: number;
    gst_amount?: number;
  

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
    cancelled_at?: string | null;
  cancelled_by?: string | null;
  refund_method?: string | null;
  refund_status?: string | null;
  refund_upi_id?: string | null;
  refund_account_number?: string | null;
  refund_bank_ifsc?: string | null;
  refund_bank_name?: string | null;
  refund_account_holder_name?: string | null;
  refund_processed_at?: string | null;
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

      // ✅ Safe default: if gst_amount missing on payload, default to 0
      const orderPayload: any = {
        ...order,
        gst_amount: typeof order.gst_amount === 'number' ? order.gst_amount : 0,
        order_number: orderNumber,
        status: 'pending',
        payment_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('[orderStore.createOrder] Insert payload:', JSON.stringify({
        customer_id: orderPayload.customer_id,
        subtotal: orderPayload.subtotal,
        gst_amount: orderPayload.gst_amount,
        delivery_charges: orderPayload.delivery_charges,
        total_amount: orderPayload.total_amount,
      }));

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        return { success: false, error: orderError.message };
      }

      // ✅ CRITICAL FIX: Fetch product details with beneficiary info for payouts
      const productIds = items.map(item => item.productId);
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, seller_id, seller_bank_account_id, cashfree_bene_id, price')
        .in('id', productIds);

      if (productsError) {
        console.error('Error fetching products for order:', productsError);
      }

      // Create a map for quick product lookup
      const productMap = new Map();
      productsData?.forEach(product => {
        productMap.set(product.id, product);
      });

      // ✅ CRITICAL FIX: Create order items WITH beneficiary info from products
      const orderItems = items.map(item => {
        const product = productMap.get(item.productId);
        const totalPrice = item.price * item.quantity;
        
        const orderItem: any = {
          order_id: orderData.id,
          product_id: item.productId,
          seller_id: item.sellerId,
          product_name: item.name,
          product_image: item.image,
          quantity: item.quantity,
          price: item.price,
          total: totalPrice,
          created_at: new Date().toISOString(),
        };

        // Copy beneficiary info from product to order_item
        if (product?.cashfree_bene_id && product?.seller_bank_account_id) {
          orderItem.cashfree_bene_id = product.cashfree_bene_id;
          orderItem.seller_bank_account_id = product.seller_bank_account_id;
          orderItem.seller_payout_amount = totalPrice; // Full amount to seller (adjust if commission needed)
          console.log(`✅ Order item created with payout info for product ${item.productId}`);
        } else {
          console.warn(`⚠️ Product ${item.productId} missing beneficiary info`);
        }

        return orderItem;
      });

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



         // Send payment notification to seller(s)
      try {
        const { data: orderWithItems } = await supabase
          .from('orders')
          .select('order_number, total_amount, order_items(seller_id)')
          .eq('id', orderId)
          .single();

        if (orderWithItems?.order_items) {
          const sellerIds = [...new Set(orderWithItems.order_items.map((item: any) => item.seller_id).filter(Boolean))];
          for (const sellerId of sellerIds) {
            const { data: seller } = await supabase
              .from('sellers')
              .select('user_id')
              .eq('id', sellerId)
              .single();

            if (seller?.user_id) {
              await notificationService.sendPaymentNotification(
                seller.user_id,
                orderWithItems.total_amount || 0,
                orderId,
                orderWithItems.order_number || orderId.slice(0, 8)
              );
            }
          }
        }
      } catch (notifError) {
        console.error('Failed to send payment notification:', notifError);
      }

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
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData = {
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) {
        console.error('Error cancelling order:', error);
        return { success: false, error: error.message };
      }

      // Update local state
      set(state => ({
        orders: state.orders.map(o => 
          o.id === orderId ? { ...o, ...updateData } : o
        ),
        selectedOrder: state.selectedOrder?.id === orderId 
          ? { ...state.selectedOrder, ...updateData }
          : state.selectedOrder
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



         // ✅ CRITICAL: Check if order is cancelled - block all updates
      const { data: orderCheck, error: checkError } = await supabase
        .from('orders')
        .select('status, seller_status')
        .eq('id', orderId)
        .single();

      if (checkError) {
        console.error('Error checking order status:', checkError);
        set({ loading: false });
        return { success: false, error: 'Failed to check order status' };
      }

      if (orderCheck?.status === 'cancelled') {
        console.log('❌ Order is cancelled - status updates blocked');
        set({ loading: false });
        return { 
          success: false, 
          error: 'Cannot update status of a cancelled order' 
        };
      }
      
      // ✅ STEP 1: Generate OTP FIRST if marking as delivered
      let generatedOTP: string | null = null;
      
      if (sellerStatus === 'delivered') {
        console.log('🔐 Generating delivery OTP via edge function BEFORE updating status...');
        
        try {
          // Use service role key for better authentication
          const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
          
          const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-otp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({
              type: 'order',
              id: orderId
            })
          });

          console.log('OTP Generation Response Status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ OTP API Error Response:', errorText);
            set({ loading: false });
            return { 
              success: false, 
              error: `Failed to generate OTP: ${response.status} - ${errorText}` 
            };
          }

          const otpResult = await response.json();
          console.log('OTP Generation Result:', JSON.stringify(otpResult, null, 2));

          if (otpResult.success && otpResult.otp) {
            generatedOTP = otpResult.otp;
            console.log('✅ Delivery OTP generated successfully:', generatedOTP);
          } else {
            console.error('❌ Failed to generate delivery OTP:', otpResult.error || 'Unknown error');
            set({ loading: false });
            return { 
              success: false, 
              error: 'Failed to generate delivery OTP: ' + (otpResult.error || 'No OTP returned') 
            };
          }
        } catch (otpError: any) {
          console.error('❌ Exception generating delivery OTP:', otpError);
          console.error('Error stack:', otpError.stack);
          set({ loading: false });
          return { 
            success: false, 
            error: 'Failed to generate delivery OTP: ' + (otpError.message || 'Network error') 
          };
        }
      }

      // ✅ STEP 2: Now update the order status
      const updateData: any = {
        seller_status: sellerStatus,
        seller_status_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (notes) {
        updateData.seller_notes = notes;
      }

      // If OTP was generated, it's already in the database (edge function did it)
      // No need to add it here

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

      console.log('✅ Seller status updated to:', sellerStatus);
      if (generatedOTP) {
        console.log('✅ OTP sent to customer:', generatedOTP);
      }


        // Send notification to customer about status update
      try {
        const { data: orderData } = await supabase
          .from('orders')
          .select('customer_id, order_number')
          .eq('id', orderId)
          .single();

        if (orderData?.customer_id) {
          await notificationService.sendOrderStatusNotification(
            orderData.customer_id,
            orderId,
            orderData.order_number || orderId.slice(0, 8),
            sellerStatus,
            notes
          );
          console.log('✅ Notification sent to customer for status:', sellerStatus);
        }
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }

      // Update local state (OTP is already in DB from edge function)
      set(state => ({
        orders: state.orders.map(o =>
          o.id === orderId ? { ...o, ...updateData, delivery_otp: generatedOTP || o.delivery_otp } : o
        ),
        selectedOrder: state.selectedOrder?.id === orderId
          ? { ...state.selectedOrder, ...updateData, delivery_otp: generatedOTP || state.selectedOrder.delivery_otp }
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

      console.log('🔐 Verifying delivery OTP via edge function...');

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }



          // ✅ CRITICAL: Check if order is cancelled - block OTP verification
      const { data: orderCheck, error: checkError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (checkError) {
        console.error('Error checking order status:', checkError);
        set({ loading: false, error: 'Failed to check order status' });
        return { success: false, error: 'Failed to check order status' };
      }

      if (orderCheck?.status === 'cancelled') {
        console.log('❌ Order is cancelled - OTP verification blocked');
        set({ loading: false, error: 'Cannot verify OTP for a cancelled order' });
        return { 
          success: false, 
          error: 'Cannot verify OTP for a cancelled order' 
        };
      }


      // ✅ CRITICAL FIX: Use service role key for Authorization (same as generate-otp)
      // The user's session access_token can be expired/null, causing Supabase to return 401
      // BEFORE the Edge Function even runs — resulting in \"Invalid OTP\" with no Edge Function logs.
      const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

      console.log('Using service role key for auth:', serviceRoleKey ? 'SET' : 'MISSING');
      console.log('Order ID:', orderId);
      console.log('OTP:', otp);
      console.log('User ID:', user.id);

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/verify-delivery-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({
          order_id: orderId,
          otp: String(otp).trim(),
          user_id: user.id
        })
      });

      console.log('Verify OTP Response Status:', response.status);

      const responseText = await response.text();
      console.log('Verify OTP Raw Response:', responseText);

      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('Failed to parse verify response:', responseText);
        set({ loading: false, error: 'Server returned invalid response' });
        return { success: false, error: 'Server returned invalid response' };
      }

      if (!result.success) {
        const errorMsg = result.error || result.msg || 'OTP verification failed';
        console.error('❌ OTP verification failed:', errorMsg);
        set({ loading: false, error: errorMsg });
        return { success: false, error: errorMsg };
      }

      console.log('✅ Delivery OTP verified successfully');
      console.log('💸 Payout triggered:', result.payout_triggered);

      // Refresh order data
      await get().fetchOrderById(orderId);

      set({ loading: false });
      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to verify OTP:', error);
      console.error('Error stack:', error.stack);
      set({ loading: false, error: error.message });
      return { success: false, error: error.message };
    }
  },

  setSelectedOrder: (order) => set({ selectedOrder: order }),
}));