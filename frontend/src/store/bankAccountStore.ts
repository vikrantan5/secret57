import { create } from 'zustand';
import { supabase } from '../services/supabase';
import CashfreePayoutService from '../services/cashfreePayoutService';

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
    gst_number?: string;
  cashfree_beneficiary_id?: string;
  cashfree_bene_id?: string;
  verification_status?: 'pending' | 'verified' | 'failed';
  verification_date?: string;
  // Deprecated Razorpay fields (kept for backward compatibility)
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
      if (!CashfreePayoutService.validateIFSC(data.ifsc_code)) {
        set({ loading: false });
        return { success: false, error: 'Invalid IFSC code format' };
      }

      if (!CashfreePayoutService.validateAccountNumber(data.account_number)) {
        set({ loading: false });
        return { success: false, error: 'Invalid account number (must be 9-18 digits)' };
      }

      if (data.pan_number && !CashfreePayoutService.validatePAN(data.pan_number)) {
        set({ loading: false });
        return { success: false, error: 'Invalid PAN format' };
      }

      // Get seller details
      console.log('🔍 Fetching seller details for seller_id:', data.seller_id);
      
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select('*')
        .eq('id', data.seller_id)
        .single();

      if (sellerError) {
        console.error('❌ Error fetching seller:', sellerError);
        set({ loading: false });
        return { success: false, error: `Seller lookup failed: ${sellerError.message}` };
      }

      if (!seller) {
        console.error('❌ No seller found for ID:', data.seller_id);
        set({ loading: false });
        return { success: false, error: 'Seller profile not found. Please complete your seller registration first.' };
      }

      console.log('✅ Seller found:', seller.company_name);

      // Get user details separately
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, phone')
        .eq('id', seller.user_id)
        .single();

      if (userError) {
        console.warn('⚠️ Could not fetch user details:', userError.message);
      }

      const sellerWithUser = {
        ...seller,
        users: userData
      };

      
      // ✅ CRITICAL FIX: Check if beneficiary already exists for this account
      // This prevents creating duplicate beneficiaries for the same seller
      console.log('🔍 Checking for existing beneficiary with same account details...');
      
      const { data: existingAccount, error: existingError } = await supabase
        .from('seller_bank_accounts')
        .select('id, cashfree_bene_id, cashfree_beneficiary_id, verification_status')
        .eq('seller_id', data.seller_id)
        .eq('account_number', data.account_number)
        .eq('ifsc_code', data.ifsc_code.toUpperCase())
        .limit(1);

      if (!existingError && existingAccount && existingAccount.length > 0) {
        const existing = existingAccount[0];
        console.log('⚠️ Account with same details already exists!');
        console.log('Existing account ID:', existing.id);
        console.log('Existing beneficiary ID:', existing.cashfree_bene_id);
        
        set({ loading: false });
        return { 
          success: false, 
          error: 'Bank account with same account number and IFSC already exists. Please use a different account or delete the existing one first.' 
        };
      }

      console.log('✅ No duplicate found. Proceeding with beneficiary creation...');

      // Generate unique beneficiary ID
      const beneId = `SELLER_${data.seller_id.substring(0, 8)}_${Date.now()}`;

     // ✅ REAL API MODE: Edge functions are deployed and working
      const USE_MOCK_MODE = false; // Real Cashfree Payout API integration enabled
      
      let cashfree_beneficiary_id;
      let verification_status: 'pending' | 'verified' | 'failed' = 'pending';

      if (USE_MOCK_MODE) {
        // 🧪 TEST MODE: Auto-approve beneficiary without calling Cashfree API
        console.log('🧪 MOCK MODE: Auto-approving beneficiary for testing');
        console.log('   Set USE_MOCK_MODE = false in bankAccountStore.ts when edge functions are ready');
        cashfree_beneficiary_id = beneId;
        verification_status = 'verified';
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // 🚀 PRODUCTION MODE: Call real Cashfree API via edge function
        console.log('🚀 Calling Cashfree API to add beneficiary...');
        
        const beneficiaryResult = await CashfreePayoutService.addBeneficiary({
          bene_id: beneId,
          name: data.account_holder_name,
       email: sellerWithUser.users?.email || seller.user_id,
          phone: sellerWithUser.users?.phone || '0000000000',
          bank_account: data.account_number,
          ifsc: data.ifsc_code.toUpperCase(),
          address1: seller.address || 'Address',
          city: seller.city || 'City',
          state: seller.state || 'State',
          pincode: seller.pincode || '000000'
        });

        if (beneficiaryResult.success) {
          cashfree_beneficiary_id = beneficiaryResult.bene_id;
          verification_status = 'verified';
          console.log('✅ Cashfree beneficiary created successfully:', cashfree_beneficiary_id);
        } else {
          console.error('❌ Cashfree beneficiary creation failed:', beneficiaryResult.error);
          console.warn('⚠️  Continuing with pending status - you can verify later');
          // Continue anyway - account can be verified later
          cashfree_beneficiary_id = beneId; // Use generated ID
          verification_status = 'pending'; // Mark as pending
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
        cashfree_beneficiary_id,
        cashfree_bene_id: beneId,
        verification_status,
        verification_date: verification_status === 'verified' ? new Date().toISOString() : null,
        is_verified: verification_status === 'verified',
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
    return CashfreePayoutService.validateIFSC(ifsc);
  },

  validateAccountNumber: (accountNumber) => {
    return CashfreePayoutService.validateAccountNumber(accountNumber);
  },

  validatePAN: (pan) => {
    return CashfreePayoutService.validatePAN(pan);
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
