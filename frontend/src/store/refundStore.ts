import { create } from 'zustand';
import { supabase } from '../services/supabase';

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
  status: 'pending' | 'seller_approved' | 'seller_rejected' | 'processing' | 'completed' | 'failed';
  seller_response?: string;
  seller_response_at?: string;
  razorpay_refund_id?: string;
  refund_processed_at?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

interface RefundState {
  refunds: RefundRequest[];
  loading: boolean;
  
  createRefundRequest: (data: Partial<RefundRequest>) => Promise<{ success: boolean; error?: string }>;
  fetchUserRefunds: (userId: string) => Promise<void>;
  fetchSellerRefunds: (sellerId: string) => Promise<void>;
  updateRefundStatus: (id: string, status: string, response?: string) => Promise<{ success: boolean; error?: string }>;
  processRefund: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export const useRefundStore = create<RefundState>((set, get) => ({
  refunds: [],
  loading: false,

  createRefundRequest: async (data) => {
    try {
      set({ loading: true });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const refundData = {
        ...data,
        user_id: user.id,
        status: 'pending',
      };

      const { data: newRefund, error } = await supabase
        .from('refund_requests')
        .insert([refundData])
        .select()
        .single();

      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
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

      const { data, error } = await supabase
        .from('refund_requests')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ refunds: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching seller refunds:', error);
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

      const { error } = await supabase
        .from('refund_requests')
        .update(updateData)
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
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

  processRefund: async (id) => {
    try {
      // In production, this would call Razorpay Refund API
      // For now, we'll just update the status
      const updateData = {
        status: 'completed',
        refund_processed_at: new Date().toISOString(),
        razorpay_refund_id: `rfnd_${Date.now()}`, // Mock refund ID
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('refund_requests')
        .update(updateData)
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
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
}));
