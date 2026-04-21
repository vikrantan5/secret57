// Issue Report Store - seller-facing view of customer reports stored in the
// `reports` table. Field mapping:
//   issue_type   = reports.reason
//   subject      = first line of description (\"SUBJECT: ...\")
//   message      = remainder of description
//   seller_response    = reports.seller_response (new column)
//   seller_response_at = reports.seller_response_at (new column)
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { notificationService } from '../services/notificationService';

export interface IssueReport {
  id: string;
  user_id: string;          // alias of customer_id (for existing UI compat)
  customer_id: string;
  seller_id?: string;
  order_id?: string;
  booking_id?: string;
  issue_type: string;
  subject: string;
  message: string;
  images?: string[];
  status: 'pending' | 'under_review' | 'resolved' | 'closed' | 'rejected';
  seller_response?: string;
  seller_response_at?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  order?: any;
  customer?: any;
}

interface IssueReportState {
  issues: IssueReport[];
  selectedIssue: IssueReport | null;
  loading: boolean;

  fetchUserIssues: (userId: string) => Promise<void>;
  fetchSellerIssues: (sellerId: string) => Promise<void>;
  fetchIssueById: (id: string) => Promise<void>;
  updateIssueStatus: (id: string, status: string, response?: string) => Promise<{ success: boolean; error?: string }>;
  setSelectedIssue: (issue: IssueReport | null) => void;
}

const SUBJECT_PREFIX = 'SUBJECT: ';

function mapRow(row: any): IssueReport {
  const desc: string = row?.description || '';
  let subject = '';
  let message = desc;
  if (desc.startsWith(SUBJECT_PREFIX)) {
    const nl = desc.indexOf('\n');
    if (nl > 0) {
      subject = desc.slice(SUBJECT_PREFIX.length, nl).trim();
      message = desc.slice(nl + 1).trimStart();
    } else {
      subject = desc.slice(SUBJECT_PREFIX.length).trim();
      message = '';
    }
  }
  return {
    ...row,
    user_id: row.customer_id,
    issue_type: row.reason,
    subject,
    message,
  } as IssueReport;
}

export const useIssueReportStore = create<IssueReportState>((set, get) => ({
  issues: [],
  selectedIssue: null,
  loading: false,

  fetchUserIssues: async (userId: string) => {
    try {
      set({ loading: true });
      const { data, error } = await supabase
        .from('reports')
        .select('*, order:orders(id, order_number, total_amount, status, shipping_name)')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('fetchUserIssues error:', error);
        set({ loading: false });
        return;
      }
      set({ issues: (data || []).map(mapRow), loading: false });
    } catch (e) {
      console.error('fetchUserIssues ex:', e);
      set({ loading: false });
    }
  },

  fetchSellerIssues: async (sellerId: string) => {
    try {
      set({ loading: true });
      const { data, error } = await supabase
        .from('reports')
        .select('*, order:orders(id, order_number, total_amount, status, shipping_name, shipping_phone)')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('fetchSellerIssues error:', error);
        set({ loading: false });
        return;
      }
      set({ issues: (data || []).map(mapRow), loading: false });
    } catch (e) {
      console.error('fetchSellerIssues ex:', e);
      set({ loading: false });
    }
  },

  fetchIssueById: async (id: string) => {
    try {
      set({ loading: true });
      const { data, error } = await supabase
        .from('reports')
        .select('*, order:orders(id, order_number, total_amount, status, shipping_name, shipping_phone, created_at)')
        .eq('id', id)
        .single();
      if (error) {
        console.error('fetchIssueById error:', error);
        set({ loading: false });
        return;
      }
      set({ selectedIssue: mapRow(data), loading: false });
    } catch (e) {
      console.error('fetchIssueById ex:', e);
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
        updateData.action_taken = response;
      }
      if (status === 'resolved' || status === 'closed') {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.reviewed_by = user?.id;
        updateData.reviewed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', id);

      if (error) return { success: false, error: error.message };

      // Notify customer
      const issue = get().issues.find(i => i.id === id) || get().selectedIssue;
      if (issue?.customer_id) {
        try {
          await notificationService.sendNotification(
            issue.customer_id,
            'issue',
            `Issue ${status === 'resolved' ? 'Resolved' : 'Updated'}`,
            `Your report has been ${status}.${response ? ' Seller: ' + response.slice(0, 60) : ''}`,
            { issue_id: id, order_id: issue.order_id, type: 'issue_update' }
          );
        } catch (e) {
          console.error('notify error:', e);
        }
      }

      const updated = get().issues.map(i => (i.id === id ? { ...i, ...updateData } : i));
      set({ issues: updated });
      if (get().selectedIssue?.id === id) {
        set({ selectedIssue: { ...(get().selectedIssue as IssueReport), ...updateData } });
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  setSelectedIssue: (issue) => set({ selectedIssue: issue }),
}));
