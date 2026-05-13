import { create } from 'zustand';
import { supabase } from '../services/supabase';

export type RefundStatus =
  | 'requested'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'processed';

export interface RefundRecord {
  id: string;
  order_id: string | null;
  booking_id: string | null;
  user_id: string;
  reason: string;
  description?: string | null;
  status: RefundStatus;
  refund_amount: number;
  admin_notes?: string | null;
  processed_at?: string | null;
  created_at: string;
  updated_at: string;
  // joined data
  user?: any;
  order?: any;
  booking?: any;
}

export interface RefundTimelineEntry {
  id: string;
  refund_id: string;
  status: string;
  notes?: string | null;
  changed_by?: string | null;
  created_at: string;
}

interface RefundTrackingState {
  refunds: RefundRecord[];
  loading: boolean;
  error: string | null;

  fetchUserRefunds: (userId: string) => Promise<void>;
  fetchAllRefunds: () => Promise<void>;
  fetchRefundById: (refundId: string) => Promise<RefundRecord | null>;
  fetchRefundTimeline: (refundId: string) => Promise<RefundTimelineEntry[]>;
  createRefund: (data: {
    order_id?: string | null;
    booking_id?: string | null;
    user_id: string;
    reason: string;
    description?: string;
    refund_amount: number;
  }) => Promise<{ success: boolean; error?: string; refund?: RefundRecord }>;
  updateRefundStatus: (
    id: string,
    status: RefundStatus,
    adminNotes?: string
  ) => Promise<{ success: boolean; error?: string }>;
  subscribeToRefund: (
    refundId: string,
    onChange: (refund: RefundRecord) => void
  ) => () => void;
}

export const useRefundTrackingStore = create<RefundTrackingState>((set, get) => ({
  refunds: [],
  loading: false,
  error: null,

  fetchUserRefunds: async (userId) => {
    try {
      set({ loading: true, error: null });
      console.log('[RefundTracking] fetchUserRefunds for:', userId);
      const { data, error } = await supabase
        .from('refunds')
        .select(`
          *,
          order:orders!refunds_order_id_fkey(id, order_number, total_amount, status),
          booking:bookings!refunds_booking_id_fkey(id, service_id, booking_date)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[RefundTracking] fetchUserRefunds error:', error);
        set({ error: error.message, loading: false });
        return;
      }

      set({ refunds: (data as RefundRecord[]) || [], loading: false });
      console.log('[RefundTracking] refunds count:', data?.length || 0);
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchAllRefunds: async () => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('refunds')
        .select(`
          *,
          user:users!refunds_user_id_fkey(id, name, email),
          order:orders!refunds_order_id_fkey(id, order_number, total_amount, status),
          booking:bookings!refunds_booking_id_fkey(id, service_id, booking_date)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        set({ error: error.message, loading: false });
        return;
      }
      set({ refunds: (data as RefundRecord[]) || [], loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchRefundById: async (refundId) => {
    try {
      const { data, error } = await supabase
        .from('refunds')
        .select(`
          *,
          user:users!refunds_user_id_fkey(id, name, email),
          order:orders!refunds_order_id_fkey(id, order_number, total_amount, status),
          booking:bookings!refunds_booking_id_fkey(id, service_id, booking_date)
        `)
        .eq('id', refundId)
        .maybeSingle();

      if (error) {
        console.error('[RefundTracking] fetchRefundById error:', error);
        return null;
      }
      return data as RefundRecord;
    } catch {
      return null;
    }
  },

  fetchRefundTimeline: async (refundId) => {
    try {
      const { data, error } = await supabase
        .from('refund_timeline')
        .select('*')
        .eq('refund_id', refundId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[RefundTracking] timeline error:', error);
        return [];
      }
      return (data as RefundTimelineEntry[]) || [];
    } catch {
      return [];
    }
  },

  createRefund: async ({ order_id, booking_id, user_id, reason, description, refund_amount }) => {
    try {
      console.log('[RefundTracking] createRefund', { order_id, booking_id, user_id, refund_amount });

      if (!reason || reason.trim().length < 3) {
        return { success: false, error: 'Please provide a valid reason' };
      }
      if (!refund_amount || refund_amount <= 0) {
        return { success: false, error: 'Invalid refund amount' };
      }
      if (!order_id && !booking_id) {
        return { success: false, error: 'Missing order or booking reference' };
      }

      // Validate that order is delivered before allowing refund (only for orders)
      if (order_id) {
        const { data: order } = await supabase
          .from('orders')
          .select('id, status, customer_id')
          .eq('id', order_id)
          .maybeSingle();

        if (!order) return { success: false, error: 'Order not found' };
        if (order.customer_id !== user_id) {
          return { success: false, error: 'You can only request refunds for your own orders' };
        }
        if (order.status !== 'delivered' && order.status !== 'shipped') {
          return {
            success: false,
            error: 'Refunds are allowed only after delivery or shipping',
          };
        }
      }

      const { data, error } = await supabase
        .from('refunds')
        .insert([{
          order_id: order_id || null,
          booking_id: booking_id || null,
          user_id,
          reason: reason.trim(),
          description: description?.trim() || null,
          refund_amount,
          status: 'requested',
        }])
        .select()
        .single();

      if (error) {
        console.error('[RefundTracking] insert error:', error);
        return { success: false, error: error.message };
      }

      console.log('[RefundTracking] refund created:', data.id);
      set(state => ({ refunds: [data as RefundRecord, ...state.refunds] }));
      return { success: true, refund: data as RefundRecord };
    } catch (e: any) {
      console.error('[RefundTracking] createRefund exception:', e);
      return { success: false, error: e.message };
    }
  },

  updateRefundStatus: async (id, status, adminNotes) => {
    try {
      console.log('[RefundTracking] updateRefundStatus', { id, status });

      const updates: any = {
        status,
        admin_notes: adminNotes ?? null,
        updated_at: new Date().toISOString(),
      };
      if (status === 'processed') {
        updates.processed_at = new Date().toISOString();
      }

      const { error } = await supabase.from('refunds').update(updates).eq('id', id);
      if (error) {
        console.error('[RefundTracking] update error:', error);
        return { success: false, error: error.message };
      }

      set(state => ({
        refunds: state.refunds.map(r => r.id === id ? { ...r, ...updates } : r),
      }));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  subscribeToRefund: (refundId, onChange) => {
    console.log('[RefundTracking] subscribing to realtime updates for:', refundId);
    const channel = supabase
      .channel(`refund_${refundId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'refunds', filter: `id=eq.${refundId}` },
        (payload) => {
          console.log('[RefundTracking] realtime update:', payload.new);
          onChange(payload.new as RefundRecord);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
