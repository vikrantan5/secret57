// Report Store - Customer Reports against Sellers
import { create } from 'zustand';
import { supabase } from '../services/supabase';

interface Report {
  id: string;
  customer_id: string;
  seller_id: string;
  order_id?: string;
  booking_id?: string;
  reason: string;
  description?: string;
  images?: string[];
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  admin_notes?: string;
  action_taken?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  // Relations
  customer?: any;
  seller?: any;
  order?: any;
  booking?: any;
}

interface ReportStore {
  reports: Report[];
  selectedReport: Report | null;
  loading: boolean;
  error: string | null;

  // Customer actions
  createReport: (reportData: Partial<Report>) => Promise<{ success: boolean; error?: string; data?: Report }>;
  fetchCustomerReports: (customerId: string) => Promise<void>;

  // Admin actions
  fetchAllReports: (status?: string) => Promise<void>;
  updateReportStatus: (reportId: string, status: string, adminNotes?: string, actionTaken?: string) => Promise<{ success: boolean; error?: string }>;
  fetchReportById: (reportId: string) => Promise<void>;

  clearError: () => void;
}

export const useReportStore = create<ReportStore>((set, get) => ({
  reports: [],
  selectedReport: null,
  loading: false,
  error: null,

  createReport: async (reportData) => {
    set({ loading: true, error: null });
    
    try {
      const { data, error } = await supabase
        .from('reports')
        .insert({
          customer_id: reportData.customer_id,
          seller_id: reportData.seller_id,
          order_id: reportData.order_id,
          booking_id: reportData.booking_id,
          reason: reportData.reason,
          description: reportData.description,
          images: reportData.images || [],
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      set({ loading: false });
      return { success: true, data };
    } catch (error: any) {
      console.error('Failed to create report:', error);
      set({ loading: false, error: error.message });
      return { success: false, error: error.message };
    }
  },

  fetchCustomerReports: async (customerId) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          seller:sellers(id, company_name, user:users(name, email)),
          order:orders(id, order_number),
          booking:bookings(id, booking_date)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ reports: data || [], loading: false });
    } catch (error: any) {
      console.error('Failed to fetch customer reports:', error);
      set({ loading: false, error: error.message });
    }
  },

  fetchAllReports: async (status) => {
    set({ loading: true, error: null });

    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          customer:users!reports_customer_id_fkey(id, name, email, phone),
          seller:sellers(id, company_name, user:users(name, email, phone)),
          order:orders(id, order_number),
          booking:bookings(id, booking_date),
          reviewed_by_user:users!reports_reviewed_by_fkey(name, email)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      set({ reports: data || [], loading: false });
    } catch (error: any) {
      console.error('Failed to fetch all reports:', error);
      set({ loading: false, error: error.message });
    }
  },

  updateReportStatus: async (reportId, status, adminNotes, actionTaken) => {
    set({ loading: true, error: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('reports')
        .update({
          status,
          admin_notes: adminNotes,
          action_taken: actionTaken,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      // Refresh reports list
      const currentState = get();
      if (currentState.reports.length > 0) {
        await get().fetchAllReports();
      }

      set({ loading: false });
      return { success: true };
    } catch (error: any) {
      console.error('Failed to update report status:', error);
      set({ loading: false, error: error.message });
      return { success: false, error: error.message };
    }
  },

  fetchReportById: async (reportId) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          customer:users!reports_customer_id_fkey(id, name, email, phone),
          seller:sellers(id, company_name, user:users(name, email, phone)),
          order:orders(id, order_number, total_amount),
          booking:bookings(id, booking_date, total_amount),
          reviewed_by_user:users!reports_reviewed_by_fkey(name, email)
        `)
        .eq('id', reportId)
        .single();

      if (error) throw error;

      set({ selectedReport: data, loading: false });
    } catch (error: any) {
      console.error('Failed to fetch report:', error);
      set({ loading: false, error: error.message });
    }
  },

  clearError: () => set({ error: null })
}));
