import { create } from 'zustand';
import { supabase, supabaseAdmin } from '../services/supabase';
import { notificationService } from '../services/notificationService';

export interface IssueReport {
  id: string;
  user_id: string;
  seller_id?: string;
  order_id?: string;
  booking_id?: string;
  order_item_id?: string;
  issue_type: string;
  subject: string;
  message: string;
  images?: string[];
  status: 'pending' | 'under_review' | 'resolved' | 'closed' | 'rejected';
  seller_response?: string;
  seller_response_at?: string;
  admin_notes?: string;
  resolution?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  order?: any;
  customer?: any;
}

interface IssueReportState {
  issues: IssueReport[];
  selectedIssue: IssueReport | null;
  loading: boolean;

  createIssueReport: (data: Partial<IssueReport>) => Promise<{ success: boolean; error?: string }>;
  fetchUserIssues: (userId: string) => Promise<void>;
  fetchSellerIssues: (sellerId: string) => Promise<void>;
  fetchIssueById: (id: string) => Promise<void>;
  updateIssueStatus: (id: string, status: string, response?: string) => Promise<{ success: boolean; error?: string }>;
  setSelectedIssue: (issue: IssueReport | null) => void;
}

export const useIssueReportStore = create<IssueReportState>((set, get) => ({
  issues: [],
  selectedIssue: null,
  loading: false,

  createIssueReport: async (data) => {
    try {
      set({ loading: true });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ loading: false });
        return { success: false, error: 'User not authenticated' };
      }

      const issueData = {
        ...data,
        user_id: user.id,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newIssue, error } = await supabaseAdmin
        .from('issue_reports')
        .insert([issueData])
        .select()
        .single();

      if (error) {
        console.error('Error creating issue report:', error);
        set({ loading: false });
        return { success: false, error: error.message };
      }

      // Send notification to seller
      if (data.seller_id) {
        const { data: seller } = await supabase
          .from('sellers')
          .select('user_id')
          .eq('id', data.seller_id)
          .single();

        if (seller) {
              // Get order number for better notification message
          let orderLabel = data.order_id?.slice(0, 8) || '';
          if (data.order_id) {
            const { data: orderData } = await supabase
              .from('orders')
              .select('order_number')
              .eq('id', data.order_id)
              .single();
            if (orderData?.order_number) orderLabel = orderData.order_number;
          }
          await notificationService.sendNotification(
            seller.user_id,
            'issue',
            'Customer Reported an Issue',
            `Order #${orderLabel} - ${data.subject}. Tap to view details.`,
            { 
              issue_id: newIssue.id,
              order_id: data.order_id,
              type: 'issue_report'
            }
          );
        }
      }

      set({
        issues: [newIssue, ...get().issues],
        loading: false,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error in createIssueReport:', error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  fetchUserIssues: async (userId: string) => {
    try {
      set({ loading: true });

      const { data, error } = await supabase
        .from('issue_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user issues:', error);
        set({ loading: false });
        return;
      }

      set({ issues: data || [], loading: false });
    } catch (error) {
      console.error('Error in fetchUserIssues:', error);
      set({ loading: false });
    }
  },

  fetchSellerIssues: async (sellerId: string) => {
    try {
      set({ loading: true });

      const { data, error } = await supabaseAdmin
        .from('issue_reports')
        .select(`
          *,
          order:orders(id, order_number, total_amount, status, shipping_name)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching seller issues:', error);
        set({ loading: false });
        return;
      }

      set({ issues: data || [], loading: false });
    } catch (error) {
      console.error('Error in fetchSellerIssues:', error);
      set({ loading: false });
    }
  },

  fetchIssueById: async (id: string) => {
    try {
      set({ loading: true });

      const { data, error } = await supabaseAdmin
        .from('issue_reports')
        .select(`
          *,
          order:orders(id, order_number, total_amount, status, shipping_name, shipping_phone, created_at)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching issue:', error);
        set({ loading: false });
        return;
      }

      set({ selectedIssue: data, loading: false });
    } catch (error) {
      console.error('Error in fetchIssueById:', error);
      set({ loading: false });
    }
  },

  updateIssueStatus: async (id, status, response) => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (response) {
        updateData.seller_response = response;
        updateData.seller_response_at = new Date().toISOString();
      }

      if (status === 'resolved' || status === 'closed') {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.resolved_by = user?.id;
        updateData.resolved_at = new Date().toISOString();
        updateData.resolution = response || 'Issue resolved';
      }

      const { error } = await supabaseAdmin
        .from('issue_reports')
        .update(updateData)
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      // Send notification to customer
      const issue = get().issues.find(i => i.id === id) || get().selectedIssue;
      if (issue?.user_id) {
        await notificationService.sendNotification(
          issue.user_id,
         'issue',
          `Issue ${status === 'resolved' ? 'Resolved' : 'Updated'}`,
          `Your issue report has been ${status}. ${response ? 'Seller responded: ' + response.slice(0, 50) : ''}`,
          {
            issue_id: id,
            order_id: issue.order_id,
            type: 'issue_update'
          }
        );
      }

      const updatedIssues = get().issues.map(i =>
        i.id === id ? { ...i, ...updateData } : i
      );
      set({ issues: updatedIssues });

      if (get().selectedIssue?.id === id) {
        set({ selectedIssue: { ...get().selectedIssue!, ...updateData } });
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  setSelectedIssue: (issue) => set({ selectedIssue: issue }),
}));
