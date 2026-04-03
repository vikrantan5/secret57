import { supabase } from './supabase';

export interface CashfreeBeneficiary {
  bene_id: string;
  name: string;
  email: string;
  phone: string;
  bank_account: string;
  ifsc: string;
  address1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface CashfreeTransfer {
  bene_id: string;
  amount: number;
  transfer_id: string;
  remarks?: string;
}

/**
 * Cashfree Payout Service for Direct Seller Payments
 */
class CashfreePayoutService {
  /**
   * Add seller as beneficiary in Cashfree
   */
  async addBeneficiary(beneficiaryData: CashfreeBeneficiary): Promise<{
    success: boolean;
    bene_id?: string;
    error?: string;
  }> {
    try {
      console.log('Adding beneficiary via Edge Function:', beneficiaryData.bene_id);

      const { data, error } = await supabase.functions.invoke('add-cashfree-beneficiary', {
        body: beneficiaryData
      });

      if (error) {
        console.error('Edge Function Error:', error);
        throw error;
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Failed to add beneficiary' };
      }

      return { success: true, bene_id: data.data.bene_id };
    } catch (error: any) {
      console.error('Add Beneficiary Error:', error);
      return { success: false, error: error.message || 'Failed to add beneficiary' };
    }
  }

  /**
   * Verify beneficiary status
   */
  async verifyBeneficiary(beneId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      console.log('Verifying beneficiary:', beneId);

      const { data, error } = await supabase.functions.invoke('verify-cashfree-beneficiary', {
        body: { bene_id: beneId }
      });

      if (error) {
        console.error('Edge Function Error:', error);
        throw error;
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Failed to verify beneficiary' };
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      console.error('Verify Beneficiary Error:', error);
      return { success: false, error: error.message || 'Failed to verify beneficiary' };
    }
  }

  /**
   * Create direct transfer to seller
   */
  async createTransfer(transferData: CashfreeTransfer): Promise<{
    success: boolean;
    transfer_id?: string;
    utr?: string;
    status?: string;
    error?: string;
  }> {
    try {
      console.log('Creating transfer via Edge Function:', transferData.transfer_id);

      const { data, error } = await supabase.functions.invoke('create-cashfree-transfer', {
        body: transferData
      });

      if (error) {
        console.error('Edge Function Error:', error);
        throw error;
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Failed to create transfer' };
      }

      return {
        success: true,
        transfer_id: data.data.transfer_id,
        utr: data.data.utr,
        status: data.data.status
      };
    } catch (error: any) {
      console.error('Create Transfer Error:', error);
      return { success: false, error: error.message || 'Failed to create transfer' };
    }
  }

  /**
   * Validate IFSC code format
   */
  validateIFSC(ifsc: string): boolean {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc);
  }

  /**
   * Validate bank account number
   */
  validateAccountNumber(accountNumber: string): boolean {
    const cleaned = accountNumber.replace(/\s/g, '');
    return /^[0-9]{9,18}$/.test(cleaned);
  }

  /**
   * Validate PAN number format
   */
  validatePAN(pan: string): boolean {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  }
}

export default new CashfreePayoutService();
