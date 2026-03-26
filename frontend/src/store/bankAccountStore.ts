import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface SellerBankAccount {
  id: string;
  seller_id: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  account_type: 'savings' | 'current';
  is_verified: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payout {
  id: string;
  seller_id: string;
  bank_account_id: string;
  amount: number;
  order_ids: string[];
  booking_ids: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payment_method: string;
  transaction_reference: string | null;
  notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BankAccountState {
  bankAccounts: SellerBankAccount[];
  payouts: Payout[];
  loading: boolean;
  
  // Bank Account Functions
  fetchBankAccounts: (sellerId: string) => Promise<void>;
  addBankAccount: (data: {
    seller_id: string;
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    bank_name: string;
    account_type?: 'savings' | 'current';
  }) => Promise<{ success: boolean; error?: string }>;
  updateBankAccount: (id: string, data: Partial<SellerBankAccount>) => Promise<{ success: boolean; error?: string }>;
  deleteBankAccount: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // Payout Functions
  fetchPayouts: (sellerId: string) => Promise<void>;
  fetchAllPayouts: () => Promise<Payout[]>; // For admin
  createPayout: (data: {
    seller_id: string;
    bank_account_id: string;
    amount: number;
    order_ids?: string[];
    booking_ids?: string[];
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updatePayoutStatus: (
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    transaction_reference?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export const useBankAccountStore = create<BankAccountState>((set, get) => ({
  bankAccounts: [],
  payouts: [],
  loading: false,

  fetchBankAccounts: async (sellerId: string) => {
    try {
      set({ loading: true });
      
      const { data, error } = await supabase
        .from('seller_bank_accounts')
        .select('*')
        .eq('seller_id', sellerId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bank accounts:', error);
        set({ loading: false });
        return;
      }

      set({ bankAccounts: data || [], loading: false });
    } catch (error) {
      console.error('Error in fetchBankAccounts:', error);
      set({ loading: false });
    }
  },

  addBankAccount: async (data) => {
    try {
      set({ loading: true });

      const accountData = {
        ...data,
        account_type: data.account_type || 'savings',
        is_verified: false,
        is_primary: get().bankAccounts.length === 0, // First account is primary
      };

      const { data: newAccount, error } = await supabase
        .from('seller_bank_accounts')
        .insert([accountData])
        .select()
        .single();

      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      set({ 
        bankAccounts: [...get().bankAccounts, newAccount],
        loading: false 
      });
      
      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message || 'Failed to add bank account' };
    }
  },

  updateBankAccount: async (id, data) => {
    try {
      set({ loading: true });

      const { error } = await supabase
        .from('seller_bank_accounts')
        .update(data)
        .eq('id', id);

      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      const updatedAccounts = get().bankAccounts.map(acc =>
        acc.id === id ? { ...acc, ...data } : acc
      );
      
      set({ bankAccounts: updatedAccounts, loading: false });
      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message || 'Failed to update bank account' };
    }
  },

  deleteBankAccount: async (id) => {
    try {
      set({ loading: true });

      const { error } = await supabase
        .from('seller_bank_accounts')
        .delete()
        .eq('id', id);

      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      set({ 
        bankAccounts: get().bankAccounts.filter(acc => acc.id !== id),
        loading: false 
      });
      
      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message || 'Failed to delete bank account' };
    }
  },

  fetchPayouts: async (sellerId: string) => {
    try {
      set({ loading: true });
      
      const { data, error } = await supabase
        .from('payouts')
        .select('*, bank_account:seller_bank_accounts(*)')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payouts:', error);
        set({ loading: false });
        return;
      }

      set({ payouts: data || [], loading: false });
    } catch (error) {
      console.error('Error in fetchPayouts:', error);
      set({ loading: false });
    }
  },

  fetchAllPayouts: async () => {
    try {
      const { data, error } = await supabase
        .from('payouts')
        .select(`
          *,
          seller:sellers(id, company_name, user_id),
          bank_account:seller_bank_accounts(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all payouts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in fetchAllPayouts:', error);
      return [];
    }
  },

  createPayout: async (data) => {
    try {
      set({ loading: true });

      const payoutData = {
        ...data,
        status: 'pending',
        order_ids: data.order_ids || [],
        booking_ids: data.booking_ids || [],
      };

      const { data: newPayout, error } = await supabase
        .from('payouts')
        .insert([payoutData])
        .select()
        .single();

      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      set({ 
        payouts: [newPayout, ...get().payouts],
        loading: false 
      });
      
      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message || 'Failed to create payout' };
    }
  },

  updatePayoutStatus: async (id, status, transaction_reference) => {
    try {
      set({ loading: true });

      const { data: { user } } = await supabase.auth.getUser();

      const updateData: any = {
        status,
        processed_at: status === 'completed' ? new Date().toISOString() : null,
        processed_by: user?.id || null,
      };

      if (transaction_reference) {
        updateData.transaction_reference = transaction_reference;
      }

      const { error } = await supabase
        .from('payouts')
        .update(updateData)
        .eq('id', id);

      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      const updatedPayouts = get().payouts.map(payout =>
        payout.id === id ? { ...payout, ...updateData } : payout
      );
      
      set({ payouts: updatedPayouts, loading: false });
      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message || 'Failed to update payout status' };
    }
  },
}));
