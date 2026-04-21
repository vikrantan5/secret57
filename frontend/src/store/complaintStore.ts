// Complaint Store - routes customer \"Report Issue\" submissions to the
// existing `reports` table (schema: id, customer_id, seller_id, order_id,
// booking_id, reason, description, images, status, admin_notes, action_taken,
// reviewed_by, reviewed_at, seller_response, seller_response_at, created_at, updated_at).
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { notificationService } from '../services/notificationService';
import { uploadMultipleImages } from '../utils/imageUpload';

export interface Complaint {
  id: string;
  user_id: string;          // maps to reports.customer_id
  seller_id: string;
  order_id?: string;
  booking_id?: string;
  product_id?: string;      // UI-only (not stored — reports has no product_id)
  service_id?: string;      // UI-only
  report_type: string;      // maps to reports.reason
  subject: string;          // stored as first line of description
  message: string;          // stored as body of description
  images?: string[];
  status: 'pending' | 'under_review' | 'resolved' | 'closed' | 'rejected';
  admin_notes?: string;
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

const SUBJECT_PREFIX = 'SUBJECT: ';

function packDescription(subject: string, message: string) {
  return `${SUBJECT_PREFIX}${subject || ''}

${message || ''}`;
}

/** Unpack a reports row into the UI-expected Complaint shape. */
function mapComplaintRow(row: any): Complaint {
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
    report_type: row.reason,
    subject,
    message,
  } as Complaint;
}

/** Upload local image URIs to `report-images` bucket and return public URLs. */
async function uploadImages(localUris: string[], userId: string): Promise<string[]> {
  const remote = localUris.filter(u => u?.startsWith('http'));
  const local = localUris.filter(u => u && !u.startsWith('http'));
  const uploaded = local.length ? await uploadMultipleImages(local, 'report-images', `reports/${userId}`, 5) : [];
  return [...remote, ...uploaded];
}

export const useComplaintStore = create<ComplaintState>((set, get) => ({
  complaints: [],
  loading: false,

  createComplaint: async (data) => {
    try {
      set({ loading: true });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ loading: false });
        return { success: false, error: 'User not authenticated' };
      }

      if (!data.seller_id) {
        set({ loading: false });
        return { success: false, error: 'Seller is required' };
      }

      // Validate order status = 'delivered' when order_id is provided
      if (data.order_id) {
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .select('id, status, customer_id')
          .eq('id', data.order_id)
          .single();
        if (orderErr || !order) {
          set({ loading: false });
          return { success: false, error: 'Order not found' };
        }
        if (order.customer_id !== user.id) {
          set({ loading: false });
          return { success: false, error: 'You can only report your own orders' };
        }
        if (order.status !== 'delivered') {
          set({ loading: false });
          return { success: false, error: 'You can only report issues after the order is delivered' };
        }
      }

      // Upload images to storage bucket
      let imageUrls: string[] = [];
      if (data.images && data.images.length > 0) {
        imageUrls = await uploadImages(data.images, user.id);
      }

      const insertRow = {
        customer_id: user.id,
        seller_id: data.seller_id,
        order_id: data.order_id || null,
        booking_id: data.booking_id || null,
        reason: data.report_type || 'other',
        description: packDescription(data.subject || '', data.message || ''),
        images: imageUrls,
        status: 'pending',
      };

      const { data: newRow, error } = await supabase
        .from('reports')
        .insert([insertRow])
        .select()
        .single();

      if (error) {
        console.error('[reports] insert error:', error);
        set({ loading: false });
        return { success: false, error: error.message };
      }

      // Notify seller's user account
      try {
        const { data: seller } = await supabase
          .from('sellers')
          .select('user_id')
          .eq('id', data.seller_id)
          .single();
        if (seller?.user_id) {
          await notificationService.sendNotification(
            seller.user_id,
            'issue',
            'Customer Reported an Issue',
            `${data.subject || 'New issue'} — tap to view details.`,
            { report_id: newRow.id, order_id: data.order_id, type: 'issue_report' }
          );
        }
      } catch (e) {
        console.error('[reports] notification failed:', e);
      }

      set({ complaints: [newRow as any, ...get().complaints], loading: false });
      return { success: true };
    } catch (error: any) {
      console.error('[reports] unexpected error:', error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  fetchUserComplaints: async (userId: string) => {
    try {
      set({ loading: true });
      const { data, error } = await supabase
        .from('reports')
        .select('*, order:orders(id, order_number, total_amount, status)')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ complaints: (data || []).map(mapComplaintRow), loading: false });
    } catch (error) {
      console.error('fetchUserComplaints error:', error);
      set({ loading: false });
    }
  },

  fetchSellerComplaints: async (sellerId: string) => {
    try {
      set({ loading: true });
      const { data, error } = await supabase
        .from('reports')
        .select('*, order:orders(id, order_number, total_amount, status, shipping_name, shipping_phone)')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ complaints: (data || []).map(mapComplaintRow), loading: false });
    } catch (error) {
      console.error('fetchSellerComplaints error:', error);
      set({ loading: false });
    }
  },

  fetchAllComplaints: async () => {
    try {
      set({ loading: true });
      const { data, error } = await supabase
        .from('reports')
        .select('*, order:orders(id, order_number, total_amount, status, shipping_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ complaints: (data || []).map(mapComplaintRow), loading: false });
    } catch (error) {
      console.error('fetchAllComplaints error:', error);
      set({ loading: false });
    }
  },

  updateComplaintStatus: async (id, status, notes) => {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (notes) updateData.admin_notes = notes;
      if (status === 'resolved' || status === 'closed') {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.reviewed_by = user?.id;
        updateData.reviewed_at = new Date().toISOString();
      }
      const { error } = await supabase.from('reports').update(updateData).eq('id', id);
      if (error) return { success: false, error: error.message };
      const updated = get().complaints.map(c => (c.id === id ? { ...c, ...updateData } : c));
      set({ complaints: updated });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
}));