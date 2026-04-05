/**
 * Cashfree Payout Service
 * Handles beneficiary creation and payout transfers
 */

import { supabase } from './supabase';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://hybrid-bazaar.preview.emergentagent.com';

export interface BeneficiaryData {
  seller_id: string;
  user_id: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  email: string;
  phone: string;
  address?: string;
}

export interface PayoutData {
  seller_id: string;
  beneficiary_id: string;
  amount: number;
  order_id?: string;
  booking_id?: string;
  remarks?: string;
}

class CashfreePayoutService {
  /**
   * Create a beneficiary in Cashfree
   */
  async createBeneficiary(data: BeneficiaryData): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      console.log('Creating Cashfree beneficiary for seller:', data.seller_id);

      const { data: response, error } = await supabase.functions.invoke(
        'create-cashfree-beneficiary',
        {
          body: data,
        }
      );

      if (error) {
        console.error('Error creating beneficiary:', error);
        return { success: false, error: error.message };
      }

      console.log('Beneficiary creation response:', response);
      return response;
    } catch (error: any) {
      console.error('Error in createBeneficiary:', error);
      return { success: false, error: error.message || 'Failed to create beneficiary' };
    }
  }

  /**
   * Get beneficiary details
   */
  async getBeneficiary(sellerId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('seller_beneficiaries')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('status', 'ACTIVE')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'No beneficiary found' };
        }
        console.error('Error fetching beneficiary:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Error in getBeneficiary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a payout transfer
   */
  async createPayout(data: PayoutData): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      console.log('Creating payout for seller:', data.seller_id);

      // First check if beneficiary exists
      const beneficiaryResult = await this.getBeneficiary(data.seller_id);
      
      if (!beneficiaryResult.success) {
        return { 
          success: false, 
          error: 'Beneficiary not found. Please add bank account first.' 
        };
      }

      const { data: response, error } = await supabase.functions.invoke(
        'create-cashfree-payout',
        {
          body: {
            ...data,
            beneficiary_id: beneficiaryResult.data.beneficiary_id,
          },
        }
      );

      if (error) {
        console.error('Error creating payout:', error);
        return { success: false, error: error.message };
      }

      console.log('Payout creation response:', response);
      return response;
    } catch (error: any) {
      console.error('Error in createPayout:', error);
      return { success: false, error: error.message || 'Failed to create payout' };
    }
  }

  /**
   * Get payout status from Cashfree
   */
  async getPayoutStatus(transferId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const { data: response, error } = await supabase.functions.invoke(
        'get-cashfree-payout-status',
        {
          body: { transfer_id: transferId },
        }
      );

      if (error) {
        console.error('Error fetching payout status:', error);
        return { success: false, error: error.message };
      }

      return response;
    } catch (error: any) {
      console.error('Error in getPayoutStatus:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get seller earnings summary
   */
  async getSellerEarnings(sellerId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('seller_earnings')
        .select('*')
        .eq('seller_id', sellerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No earnings record yet, return zeros
          return {
            success: true,
            data: {
              total_earnings: 0,
              total_platform_fees: 0,
              total_payouts: 0,
              pending_amount: 0,
              available_balance: 0,
            },
          };
        }
        console.error('Error fetching seller earnings:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Error in getSellerEarnings:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get seller payout history
   */
  async getSellerPayouts(sellerId: string): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('seller_payouts')
        .select(`
          *,
          order:orders(order_number, total_amount),
          booking:bookings(booking_date, total_amount)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching seller payouts:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Error in getSellerPayouts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Request payout withdrawal
   */
  async requestPayout(sellerId: string, userId: string, amount: number): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Check available balance
      const earningsResult = await this.getSellerEarnings(sellerId);
      
      if (!earningsResult.success || !earningsResult.data) {
        return { success: false, error: 'Unable to fetch earnings' };
      }

      const availableBalance = earningsResult.data.available_balance || 0;

      if (amount > availableBalance) {
        return { 
          success: false, 
          error: `Insufficient balance. Available: ₹${availableBalance}` 
        };
      }

      // Create payout request
      const { data, error } = await supabase
        .from('payout_requests')
        .insert({
          seller_id: sellerId,
          user_id: userId,
          requested_amount: amount,
          available_balance: availableBalance,
          status: 'PENDING',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating payout request:', error);
        return { success: false, error: error.message };
      }

      // Notify admin about new payout request
      const { data: adminUsers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      if (adminUsers && adminUsers.length > 0) {
        for (const admin of adminUsers) {
          await supabase.from('notifications').insert({
            user_id: admin.id,
            title: '💰 New Payout Request',
            message: `Seller requested payout of ₹${amount}`,
            type: 'payout_request',
            reference_id: data.id,
            reference_type: 'payout_request',
            created_at: new Date().toISOString(),
          });
        }
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Error in requestPayout:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save bank account details
   */
  async saveBankAccount(data: BeneficiaryData): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Save bank account
      const { data: bankAccount, error: bankError } = await supabase
        .from('seller_bank_accounts')
        .upsert({
          seller_id: data.seller_id,
          user_id: data.user_id,
          account_holder_name: data.account_holder_name,
          account_number: data.account_number,
          ifsc_code: data.ifsc_code,
          bank_name: data.bank_name,
          is_primary: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'seller_id,account_number',
        })
        .select()
        .single();

      if (bankError) {
        console.error('Error saving bank account:', bankError);
        return { success: false, error: bankError.message };
      }

      // Now create beneficiary in Cashfree
      const beneficiaryResult = await this.createBeneficiary({
        ...data,
        bank_account_id: bankAccount.id,
      });

      if (!beneficiaryResult.success) {
        return beneficiaryResult;
      }

      return { success: true, data: { bankAccount, beneficiary: beneficiaryResult.data } };
    } catch (error: any) {
      console.error('Error in saveBankAccount:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new CashfreePayoutService();
