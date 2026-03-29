import { create } from 'zustand';
import { supabase } from '../services/supabase';
import RazorpayPayoutService from '../services/razorpayPayout';

export interface SellerBankAccount {
  id: string;
  seller_id: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  account_type: 'savings' | 'current';
  upi_id?: string;
  pan_number?: string;
  razorpay_contact_id?: string;
  razorpay_fund_account_id?: string;
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
    upi_id?: string;
    pan_number?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateBankAccount: (id: string, data: Partial<SellerBankAccount>) => Promise<{ success: boolean; error?: string }>;
  deleteBankAccount: (id: string) => Promise<{ success: boolean; error?: string }>;
  setPrimaryAccount: (id: string, sellerId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Validation Functions
  validateIFSC: (ifsc: string) => boolean;
  validateAccountNumber: (accountNumber: string) => boolean;
  validatePAN: (pan: string) => boolean;
  
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

      // Validate inputs
      if (!get().validateIFSC(data.ifsc_code)) {
        set({ loading: false });
        return { success: false, error: 'Invalid IFSC code format' };
      }

      if (!get().validateAccountNumber(data.account_number)) {
        set({ loading: false });
        return { success: false, error: 'Invalid account number (must be 9-18 digits)' };
      }

      if (data.pan_number && !get().validatePAN(data.pan_number)) {
        set({ loading: false });
        return { success: false, error: 'Invalid PAN format' };
      }

      // Get seller details
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select('*, users(*)')
        .eq('id', data.seller_id)
        .single();

      if (sellerError || !seller) {
        set({ loading: false });
        return { success: false, error: 'Seller not found' };
      }

      // Create or get Razorpay Contact
      let razorpay_contact_id = seller.razorpay_contact_id;

      if (!razorpay_contact_id) {
        const contactResult = await RazorpayPayoutService.createContact({
          name: seller.company_name || seller.users?.name || 'Unknown',
          email: seller.users?.email || '',
          phone: seller.users?.phone || ''
        });

        if (!contactResult.success) {
          console.warn('Razorpay contact creation failed:', contactResult.error);
          // Continue anyway - can be created later
        } else {
          razorpay_contact_id = contactResult.contact_id;

          // Update seller with contact_id
          await supabase
            .from('sellers')
            .update({ razorpay_contact_id })
            .eq('id', data.seller_id);
        }
      }

      // Create Razorpay Fund Account if contact exists
      let razorpay_fund_account_id;
      if (razorpay_contact_id) {
        const fundAccountResult = await RazorpayPayoutService.createFundAccount({
          contact_id: razorpay_contact_id,
          account_holder_name: data.account_holder_name,
          account_number: data.account_number,
          ifsc_code: data.ifsc_code
        });

        if (!fundAccountResult.success) {
          console.warn('Razorpay fund account creation failed:', fundAccountResult.error);
          // Continue anyway - can be created later
        } else {
          razorpay_fund_account_id = fundAccountResult.fund_account_id;
        }
      }

      // Save bank account to Supabase
      const accountData = {
        seller_id: data.seller_id,
        account_holder_name: data.account_holder_name,
        account_number: data.account_number,
        ifsc_code: data.ifsc_code.toUpperCase(),
        bank_name: data.bank_name,
        account_type: data.account_type || 'savings',
        upi_id: data.upi_id,
        pan_number: data.pan_number?.toUpperCase(),
        razorpay_contact_id,
        razorpay_fund_account_id,
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

      // Check if it's the only account
      if (get().bankAccounts.length === 1) {
        set({ loading: false });
        return { success: false, error: 'Cannot delete the only bank account' };
      }

      // Check if it's primary
      const account = get().bankAccounts.find(acc => acc.id === id);
      if (account?.is_primary && get().bankAccounts.length > 1) {
        set({ loading: false });
        return { success: false, error: 'Cannot delete primary account. Set another account as primary first.' };
      }

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

  setPrimaryAccount: async (id, sellerId) => {
    try {
      set({ loading: true });

      // Unset all other primary accounts for this seller
      await supabase
        .from('seller_bank_accounts')
        .update({ is_primary: false })
        .eq('seller_id', sellerId);

      // Set this account as primary
      const { error } = await supabase
        .from('seller_bank_accounts')
        .update({ is_primary: true })
        .eq('id', id);

      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      // Update local state
      const updatedAccounts = get().bankAccounts.map(acc => ({
        ...acc,
        is_primary: acc.id === id
      }));

      set({ bankAccounts: updatedAccounts, loading: false });
      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message || 'Failed to set primary account' };
    }
  },

  // Validation Functions
  validateIFSC: (ifsc) => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc.toUpperCase());
  },

  validateAccountNumber: (accountNumber) => {
    const cleaned = accountNumber.replace(/\s/g, '');
    return /^\d{9,18}$/.test(cleaned);
  },

  validatePAN: (pan) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
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
