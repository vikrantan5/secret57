import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface Complaint {
  id: string;
  user_id: string;
  seller_id: string;
  order_id?: string;
  booking_id?: string;
  product_id?: string;
  service_id?: string;
  report_type: 'product_quality' | 'service_quality' | 'fraud' | 'fake_listing' | 'inappropriate_content' | 'delayed_delivery' | 'rude_behavior' | 'other';
  subject: string;
  message: string;
  images?: string[];
  status: 'pending' | 'under_review' | 'resolved' | 'closed' | 'rejected';
  admin_notes?: string;
  resolution?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

interface ComplaintState {
  complaints: Complaint[];
  loading: boolean;
  
  createComplaint: (data: Partial<Complaint>) => Promise<{ success: boolean; error?: string }>;
  fetchUserComplaints: (userId: string) => Promise<void>;
  fetchSellerComplaints: (sellerId: string) => Promise<void>;
  fetchAllComplaints: () => Promise<void>;
  updateComplaintStatus: (id: string, status: string, notes?: string) => Promise<{ success: boolean; error?: string }>;
}

export const useComplaintStore = create<ComplaintState>((set, get) => ({
  complaints: [],
  loading: false,

  createComplaint: async (data) => {
    try {
      set({ loading: true });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const complaintData = {
        ...data,
        user_id: user.id,
        status: 'pending',
      };

      const { data: newComplaint, error } = await supabase
        .from('complaints')
        .insert([complaintData])
        .select()
        .single();

      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      set({ 
        complaints: [newComplaint, ...get().complaints],
        loading: false 
      });
      
      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  fetchUserComplaints: async (userId: string) => {
    try {
      set({ loading: true });

      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ complaints: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching user complaints:', error);
      set({ loading: false });
    }
  },

  fetchSellerComplaints: async (sellerId: string) => {
    try {
      set({ loading: true });

      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ complaints: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching seller complaints:', error);
      set({ loading: false });
    }
  },

  fetchAllComplaints: async () => {
    try {
      set({ loading: true });

      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ complaints: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching all complaints:', error);
      set({ loading: false });
    }
  },

  updateComplaintStatus: async (id, status, notes) => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (notes) {
        updateData.admin_notes = notes;
      }

      if (status === 'resolved' || status === 'closed') {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.resolved_by = user?.id;
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      const updatedComplaints = get().complaints.map(c =>
        c.id === id ? { ...c, ...updateData } : c
      );
      set({ complaints: updatedComplaints });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
}));
