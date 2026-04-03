import { create } from 'zustand';
import { supabase } from '../services/supabase';
// import RazorpayPayoutService from '../services/razorpayPayout';

export interface Payout {
  id: string;
  seller_id: string;
  bank_account_id: string;
  amount: number;
  order_ids: string[];
  booking_ids: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payment_method: string;
  razorpay_payout_id?: string;
  transaction_reference?: string;
  notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  seller?: any;
  bank_account?: any;
}

export interface EligibleSeller {
  seller_id: string;
  company_name: string;
  user_id: string;
  razorpay_contact_id?: string;
  eligible_order_revenue: number;
  eligible_booking_revenue: number;
  total_eligible_revenue: number;
  total_paid_amount: number;
  net_eligible_amount: number;
  eligible_order_count: number;
  eligible_order_ids: string[];
}

interface PayoutState {
  payouts: Payout[];
  pendingPayouts: Payout[];
  eligibleSellers: EligibleSeller[];
  loading: boolean;
  error: string | null;
  
  // Commission configuration
  platformCommission: number; // percentage (10 for 10%)
  minimumPayoutAmount: number; // ₹500
  holdPeriodDays: number; // 7 days
  
  // Fetch seller's payouts
  fetchSellerPayouts: (sellerId: string) => Promise<void>;
  
  // Fetch all payouts (admin)
  fetchAllPayouts: () => Promise<void>;
  
  // Fetch eligible sellers for batch payout
  fetchEligibleSellers: () => Promise<void>;
  
  // Calculate seller earnings
  calculateSellerEarnings: (sellerId: string) => Promise<{
    totalRevenue: number;
    commission: number;
    netEarnings: number;
    orderIds: string[];
    bookingIds: string[];
  }>;
  
  // Create single payout
  createPayout: (data: {
    seller_id: string;
    bank_account_id: string;
    amount: number;
    order_ids?: string[];
    booking_ids?: string[];
    notes?: string;
  }) => Promise<{ success: boolean; payout?: Payout; error?: string }>;
  
  // Generate batch payouts for all eligible sellers
  generateBatchPayouts: () => Promise<{ 
    success: boolean; 
    created: number; 
    failed: number;
    errors: string[];
  }>;
  
  // Process payout via Razorpay (admin action)
  processPayout: (payoutId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Update payout status
  updatePayoutStatus: (
    payoutId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    transaction_reference?: string,
    razorpay_payout_id?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export const usePayoutStore = create<PayoutState>((set, get) => ({
  payouts: [],
  pendingPayouts: [],
  eligibleSellers: [],
  loading: false,
  error: null,
  platformCommission: 10, // 10% commission
  minimumPayoutAmount: 500, // ₹500 minimum
  holdPeriodDays: 7, // 7 days hold period
  
  fetchSellerPayouts: async (sellerId: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('payouts')
        .select(`
          *,
          seller:sellers(*),
          bank_account:seller_bank_accounts(*)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      set({ payouts: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  fetchAllPayouts: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('payouts')
        .select(`
          *,
          seller:sellers(*, users(*)),
          bank_account:seller_bank_accounts(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const pending = data?.filter(p => p.status === 'pending') || [];
      
      set({ payouts: data || [], pendingPayouts: pending, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  fetchEligibleSellers: async () => {
    try {
      set({ loading: true, error: null });
      
      // Fetch from the seller_eligible_payouts view
      const { data, error } = await supabase
        .from('seller_eligible_payouts')
        .select('*')
        .gte('net_eligible_amount', get().minimumPayoutAmount);
      
      if (error) {
        console.error('Error fetching eligible sellers:', error);
        throw error;
      }
      
      set({ eligibleSellers: data || [], loading: false });
    } catch (error: any) {
      console.error('fetchEligibleSellers error:', error);
      set({ error: error.message, loading: false });
    }
  },
  
  calculateSellerEarnings: async (sellerId: string) => {
    try {
      const holdDate = new Date();
      holdDate.setDate(holdDate.getDate() - get().holdPeriodDays);
      
      // Get delivered orders older than hold period
      const { data: orderItems, error: orderError } = await supabase
        .from('order_items')
        .select(`
          *,
          order:orders!inner(*)
        `)
        .eq('seller_id', sellerId)
        .eq('order.status', 'delivered')
        .eq('order.payment_status', 'paid')
        .lte('order.actual_delivery_date', holdDate.toISOString());
      
      if (orderError) throw orderError;
      
      // Get completed bookings older than hold period
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('status', 'completed')
        .lte('updated_at', holdDate.toISOString());
      
      if (bookingError) throw bookingError;
      
      // Calculate totals
      const orderRevenue = orderItems?.reduce((sum, item) => sum + item.total, 0) || 0;
      const bookingRevenue = bookings?.reduce((sum, booking) => sum + booking.total_amount, 0) || 0;
      const totalRevenue = orderRevenue + bookingRevenue;
      
      const commission = (totalRevenue * get().platformCommission) / 100;
      const netEarnings = totalRevenue - commission;
      
      const orderIds = orderItems?.map(item => item.order_id) || [];
      const bookingIds = bookings?.map(b => b.id) || [];
      
      return {
        totalRevenue,
        commission,
        netEarnings,
        orderIds: [...new Set(orderIds)],
        bookingIds
      };
    } catch (error: any) {
      console.error('Error calculating earnings:', error);
      return {
        totalRevenue: 0,
        commission: 0,
        netEarnings: 0,
        orderIds: [],
        bookingIds: []
      };
    }
  },
  
  createPayout: async (data) => {
    try {
      set({ loading: true });
      
      const { data: payout, error } = await supabase
        .from('payouts')
        .insert([{
          ...data,
          status: 'pending',
          payment_method: 'bank_transfer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select(`
          *,
          seller:sellers(*),
          bank_account:seller_bank_accounts(*)
        `)
        .single();
      
      if (error) throw error;
      
      set({
        payouts: [payout, ...get().payouts],
        pendingPayouts: [payout, ...get().pendingPayouts],
        loading: false
      });
      
      return { success: true, payout };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },
  
  generateBatchPayouts: async () => {
    try {
      set({ loading: true });
      
      // Fetch eligible sellers
      await get().fetchEligibleSellers();
      const eligibleSellers = get().eligibleSellers;
      
      if (eligibleSellers.length === 0) {
        set({ loading: false });
        return { success: true, created: 0, failed: 0, errors: [] };
      }
      
      let created = 0;
      let failed = 0;
      const errors: string[] = [];
      
      for (const seller of eligibleSellers) {
        try {
          // Get seller's primary bank account
          const { data: bankAccount } = await supabase
            .from('seller_bank_accounts')
            .select('*')
            .eq('seller_id', seller.seller_id)
            .eq('is_primary', true)
            .single();
          
          if (!bankAccount) {
            failed++;
            errors.push(`${seller.company_name}: No primary bank account`);
            continue;
          }
          
          // Get eligible booking IDs for this seller
          const holdDate = new Date();
          holdDate.setDate(holdDate.getDate() - get().holdPeriodDays);
          
          const { data: bookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('seller_id', seller.seller_id)
            .eq('status', 'completed')
            .lte('updated_at', holdDate.toISOString());
          
          const bookingIds = bookings?.map(b => b.id) || [];
          
          // Create payout
          const result = await get().createPayout({
            seller_id: seller.seller_id,
            bank_account_id: bankAccount.id,
            amount: seller.net_eligible_amount,
            order_ids: seller.eligible_order_ids || [],
            booking_ids: bookingIds,
            notes: `Batch payout generated on ${new Date().toLocaleDateString()}`
          });
          
          if (result.success) {
            created++;
          } else {
            failed++;
            errors.push(`${seller.company_name}: ${result.error}`);
          }
        } catch (error: any) {
          failed++;
          errors.push(`${seller.company_name}: ${error.message}`);
        }
      }
      
      set({ loading: false });
      
      // Refresh payouts
      await get().fetchAllPayouts();
      
      return { success: true, created, failed, errors };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, created: 0, failed: 0, errors: [error.message] };
    }
  },
  
  processPayout: async (payoutId: string) => {
    try {
      // 1. Get payout details
      const { data: payout } = await supabase
        .from('payouts')
        .select(`
          *,
          seller:sellers(*),
          bank_account:seller_bank_accounts(*)
        `)
        .eq('id', payoutId)
        .single();
      
      if (!payout) throw new Error('Payout not found');
      
      if (!payout.bank_account?.razorpay_fund_account_id) {
        throw new Error('Razorpay fund account not configured for this seller');
      }
      
      // 2. Update status to processing
      await supabase
        .from('payouts')
        .update({ status: 'processing' })
        .eq('id', payoutId);
      
      // 3. Initiate Razorpay payout
      const payoutResult = await RazorpayPayoutService.createPayout({
        fund_account_id: payout.bank_account.razorpay_fund_account_id,
        amount: payout.amount,
        purpose: 'payout',
        reference_id: payoutId
      });
      
      if (!payoutResult.success) {
        // Mark as failed
        await supabase
          .from('payouts')
          .update({
            status: 'failed',
            notes: payoutResult.error
          })
          .eq('id', payoutId);
        
        return { success: false, error: payoutResult.error };
      }
      
      // 4. Update with Razorpay payout ID
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('payouts')
        .update({
          status: 'completed',
          razorpay_payout_id: payoutResult.payout_id,
          transaction_reference: payoutResult.utr,
          processed_by: user?.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', payoutId);
      
      // 5. Refresh payouts
      await get().fetchAllPayouts();
      
      return { success: true };
    } catch (error: any) {
      console.error('processPayout error:', error);
      return { success: false, error: error.message };
    }
  },
  
  updatePayoutStatus: async (payoutId, status, transaction_reference, razorpay_payout_id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      
      if (status === 'completed') {
        updateData.processed_at = new Date().toISOString();
        updateData.processed_by = user?.id;
      }
      
      if (transaction_reference) {
        updateData.transaction_reference = transaction_reference;
      }
      
      if (razorpay_payout_id) {
        updateData.razorpay_payout_id = razorpay_payout_id;
      }
      
      const { error } = await supabase
        .from('payouts')
        .update(updateData)
        .eq('id', payoutId);
      
      if (error) throw error;
      
      // Refresh payouts
      await get().fetchAllPayouts();
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
}));
