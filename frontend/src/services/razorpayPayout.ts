import { supabase } from './supabase';

export interface RazorpayContact {
  id: string;
  name: string;
  email: string;
  contact: string;
  type: 'vendor';
}

export interface RazorpayFundAccount {
  id: string;
  contact_id: string;
  account_type: 'bank_account';
  bank_account: {
    name: string;
    ifsc: string;
    account_number: string;
  };
}

export interface RazorpayPayout {
  id: string;
  fund_account_id: string;
  amount: number;
  currency: 'INR';
  mode: 'IMPS' | 'NEFT' | 'RTGS' | 'UPI';
  purpose: string;
  status: 'processing' | 'processed' | 'reversed' | 'cancelled' | 'queued';
  utr?: string;
}

class RazorpayPayoutService {
  
  /**
   * Create Razorpay Contact for a seller
   */
  async createContact(sellerData: {
    name: string;
    email: string;
    phone: string;
  }): Promise<{ success: boolean; contact_id?: string; error?: string }> {
    try {
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('create-razorpay-contact', {
        body: {
          name: sellerData.name,
          email: sellerData.email,
          contact: sellerData.phone,
          type: 'vendor'
        }
      });
      
      if (error) {
        console.error('Edge Function Error:', error);
        throw error;
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Failed to create contact' };
      }
      
      return { success: true, contact_id: data.data.id };
    } catch (error: any) {
      console.error('Create Contact Error:', error);
      return { success: false, error: error.message || 'Failed to create contact' };
    }
  }
  
  /**
   * Create Razorpay Fund Account (bank account)
   */
  async createFundAccount(accountData: {
    contact_id: string;
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
  }): Promise<{ success: boolean; fund_account_id?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('create-razorpay-fund-account', {
        body: {
          contact_id: accountData.contact_id,
          account_holder_name: accountData.account_holder_name,
          account_number: accountData.account_number,
          ifsc_code: accountData.ifsc_code
        }
      });
      
      if (error) {
        console.error('Edge Function Error:', error);
        throw error;
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Failed to create fund account' };
      }
      
      return { success: true, fund_account_id: data.data.id };
    } catch (error: any) {
      console.error('Create Fund Account Error:', error);
      return { success: false, error: error.message || 'Failed to create fund account' };
    }
  }
  
  /**
   * Initiate payout to seller
   */
  async createPayout(payoutData: {
    fund_account_id: string;
    amount: number;
    purpose: string;
    reference_id: string;
  }): Promise<{ success: boolean; payout_id?: string; status?: string; utr?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('create-razorpay-payout', {
        body: payoutData
      });
      
      if (error) {
        console.error('Edge Function Error:', error);
        throw error;
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Failed to create payout' };
      }
      
      return {
        success: true,
        payout_id: data.data.id,
        status: data.data.status,
        utr: data.data.utr
      };
    } catch (error: any) {
      console.error('Create Payout Error:', error);
      return { success: false, error: error.message || 'Failed to create payout' };
    }
  }
  
  /**
   * Check payout status
   */
  async getPayoutStatus(payoutId: string): Promise<{
    success: boolean;
    status?: string;
    utr?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('get-payout-status', {
        body: { payout_id: payoutId }
      });
      
      if (error) {
        console.error('Edge Function Error:', error);
        throw error;
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Failed to get payout status' };
      }
      
      return {
        success: true,
        status: data.data.status,
        utr: data.data.utr
      };
    } catch (error: any) {
      console.error('Get Payout Status Error:', error);
      return { success: false, error: error.message || 'Failed to get payout status' };
    }
  }
}

export default new RazorpayPayoutService();
