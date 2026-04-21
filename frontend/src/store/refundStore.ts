import { create } from 'zustand';
import { supabase, supabaseAdmin } from '../services/supabase';
import { notificationService } from '../services/notificationService';
import { uploadMultipleImages } from '../utils/imageUpload';

async function uploadRefundImages(localUris: string[], userId: string): Promise<string[]> {
  const remote = (localUris || []).filter(u => u?.startsWith('http'));
  const local = (localUris || []).filter(u => u && !u.startsWith('http'));
  const uploaded = local.length ? await uploadMultipleImages(local, 'report-images', `refund/${userId}`, 5) : [];
  return [...remote, ...uploaded];
}

export interface RefundRequest {
  id: string;
  user_id: string;
  seller_id?: string;
  order_id?: string;
  booking_id?: string;
  payment_id?: string;
  amount: number;
  reason: string;
  description?: string;
  images?: string[];
  status: 'pending' | 'requested' | 'approved' | 'rejected' | 'processed' | 'refunded';
  seller_response?: string;
  seller_response_at?: string;
  razorpay_refund_id?: string;
  refund_processed_at?: string;
  admin_notes?: string;
  upi_id?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_name?: string;
  account_holder_name?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  order?: any;
}

interface RefundState {
  refunds: RefundRequest[];
  selectedRefund: RefundRequest | null;
  loading: boolean;
  
  createRefundRequest: (data: Partial<RefundRequest>) => Promise<{ success: boolean; error?: string }>;
  fetchUserRefunds: (userId: string) => Promise<void>;
  fetchSellerRefunds: (sellerId: string) => Promise<void>;
  fetchRefundById: (id: string) => Promise<void>;
  updateRefundStatus: (id: string, status: string, response?: string) => Promise<{ success: boolean; error?: string }>;
  processRefund: (id: string) => Promise<{ success: boolean; error?: string }>;
  setSelectedRefund: (refund: RefundRequest | null) => void;
}

export const useRefundStore = create<RefundState>((set, get) => ({
  refunds: [],
  selectedRefund: null,
  loading: false,

  createRefundRequest: async (data) => {
    try {
      set({ loading: true });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ loading: false });
        return { success: false, error: 'User not authenticated' };
      }

      // ✅ Guard: order must exist, belong to this user, and be 'delivered'
      if (data.order_id) {
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .select('id, status, customer_id, payment_status')
          .eq('id', data.order_id)
          .single();
        if (orderErr || !order) {
          set({ loading: false });
          return { success: false, error: 'Order not found' };
        }
        if (order.customer_id !== user.id) {
          set({ loading: false });
          return { success: false, error: 'You can only request refund for your own orders' };
        }
        // Allow also when order was already marked refund_requested (retry), but
        // primary rule: must be delivered (or was delivered and now refund_requested).
        const allowed = ['delivered', 'refund_requested'];
        if (!allowed.includes(order.status)) {
          set({ loading: false });
          return { success: false, error: 'Refund can only be requested after delivery' };
        }
      }

      // Upload any local images
      let imageUrls: string[] = [];
      if (data.images && data.images.length > 0) {
        imageUrls = await uploadRefundImages(data.images, user.id);
      }

      const refundData: any = {
        ...data,
        images: imageUrls.length ? imageUrls : (data.images || []),
        user_id: user.id,
     status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newRefund, error } = await supabaseAdmin
        .from('refund_requests')
        .insert([refundData])
        .select()
        .single();

      if (error) {
        console.error('[refund_requests] insert error:', error);
        set({ loading: false });
        return { success: false, error: error.message };
      }

      // Send notification to seller
      if (data.seller_id) {
        try {
          const { data: seller } = await supabase
            .from('sellers')
            .select('user_id')
            .eq('id', data.seller_id)
            .single();

          if (seller?.user_id) {
            // Get order number
            let orderNumber = data.order_id?.slice(0, 8) || '';
            if (data.order_id) {
              const { data: orderData } = await supabase
                .from('orders')
                .select('order_number')
                .eq('id', data.order_id)
                .single();
              if (orderData) orderNumber = orderData.order_number;
            }

            await notificationService.sendRefundRequestNotification(
              seller.user_id,
              data.order_id || '',
              orderNumber,
              data.amount || 0,
              newRefund.id
            );
          }
        } catch (notifError) {
          console.error('Failed to send refund notification:', notifError);
        }
      }

      set({ 
        refunds: [newRefund, ...get().refunds],
        loading: false 
      });
      
      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  fetchUserRefunds: async (userId: string) => {
    try {
      set({ loading: true });

      const { data, error } = await supabase
        .from('refund_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ refunds: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching user refunds:', error);
      set({ loading: false });
    }
  },

  fetchSellerRefunds: async (sellerId: string) => {
    try {
      set({ loading: true });

      const { data, error } = await supabaseAdmin
        .from('refund_requests')
        .select(`
          *,
          order:orders(id, order_number, total_amount, status, shipping_name)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ refunds: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching seller refunds:', error);
      set({ loading: false });
    }
  },

  fetchRefundById: async (id: string) => {
    try {
      set({ loading: true });

      const { data, error } = await supabaseAdmin
        .from('refund_requests')
        .select(`
          *,
          order:orders(id, order_number, total_amount, status, shipping_name, shipping_phone, created_at)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching refund:', error);
        set({ loading: false });
        return;
      }

      set({ selectedRefund: data, loading: false });
    } catch (error) {
      console.error('Error in fetchRefundById:', error);
      set({ loading: false });
    }
  },

  updateRefundStatus: async (id, status, response) => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (response) {
        updateData.seller_response = response;
        updateData.seller_response_at = new Date().toISOString();
      }

      if (status === 'processed' || status === 'refunded') {
        updateData.refund_processed_at = new Date().toISOString();
      }

      const { error } = await supabaseAdmin
        .from('refund_requests')
        .update(updateData)
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      // Send notification to customer about refund status update
      const refund = get().refunds.find(r => r.id === id) || get().selectedRefund;
      if (refund?.user_id) {
        try {
          await notificationService.sendRefundStatusNotification(
            refund.user_id,
            id,
            refund.order_id || '',
            status,
            refund.amount || 0
          );
        } catch (notifError) {
          console.error('Failed to send refund status notification:', notifError);
        }
      }

      const updatedRefunds = get().refunds.map(r =>
        r.id === id ? { ...r, ...updateData } : r
      );
      set({ refunds: updatedRefunds });

      if (get().selectedRefund?.id === id) {
        set({ selectedRefund: { ...get().selectedRefund!, ...updateData } });
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  processRefund: async (id) => {
    try {
      const updateData = {
        status: 'refunded',
        refund_processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from('refund_requests')
        .update(updateData)
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      // Send notification to customer
      const refund = get().refunds.find(r => r.id === id) || get().selectedRefund;
      if (refund?.user_id) {
        await notificationService.sendRefundStatusNotification(
          refund.user_id,
          id,
          refund.order_id || '',
          'refunded',
          refund.amount || 0
        );
      }

      const updatedRefunds = get().refunds.map(r =>
        r.id === id ? { ...r, ...updateData } : r
      );
      set({ refunds: updatedRefunds });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  setSelectedRefund: (refund) => set({ selectedRefund: refund }),
}));
