import { supabase } from './supabase';

export interface BeneficiaryDetails {
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

export interface TransferDetails {
  bene_id: string;
  amount: number;
  transfer_id: string;
  remarks?: string;
}

class CashfreePayoutService {
  private static instance: CashfreePayoutService;

  private constructor() {}

  static getInstance(): CashfreePayoutService {
    if (!CashfreePayoutService.instance) {
      CashfreePayoutService.instance = new CashfreePayoutService();
    }
    return CashfreePayoutService.instance;
  }

  /**
   * Add beneficiary via Edge Function
   */
  async addBeneficiary(details: BeneficiaryDetails): Promise<{ success: boolean; bene_id?: string; error?: string }> {
    try {
      console.log('Adding beneficiary via Edge Function:', details.bene_id);

      const { data, error } = await supabase.functions.invoke('add-cashfree-beneficiary', {
        body: {
          bene_id: details.bene_id,
          name: details.name,
          email: details.email,
          phone: details.phone,
          bank_account: details.bank_account,
          ifsc: details.ifsc,
          address1: details.address1,
          city: details.city,
          state: details.state,
          pincode: details.pincode
        }
      });

      if (error) {
        console.error('Edge Function Error:', error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        console.error('Add beneficiary failed:', data?.error);
        return { success: false, error: data?.error || 'Failed to add beneficiary' };
      }

      console.log('Beneficiary added successfully:', data.data?.bene_id);
      return { success: true, bene_id: data.data?.bene_id };
    } catch (error: any) {
      console.error('Add Beneficiary Error:', error);
      return { success: false, error: error.message || 'Failed to add beneficiary' };
    }
  }

  /**
   * Verify beneficiary via Edge Function
   */
  async verifyBeneficiary(beneId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('Verifying beneficiary via Edge Function:', beneId);

      const { data, error } = await supabase.functions.invoke('verify-cashfree-beneficiary', {
        body: { bene_id: beneId }
      });

      if (error) {
        console.error('Edge Function Error:', error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Failed to verify beneficiary' };
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      console.error('Verify Beneficiary Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create transfer via Edge Function
   */
  async createTransfer(details: TransferDetails): Promise<{ success: boolean; reference_id?: string; utr?: string; error?: string }> {
    try {
      console.log('Creating transfer via Edge Function:', details.transfer_id);

      const { data, error } = await supabase.functions.invoke('create-cashfree-transfer', {
        body: {
          bene_id: details.bene_id,
          amount: details.amount,
          transfer_id: details.transfer_id,
          remarks: details.remarks
        }
      });

      if (error) {
        console.error('Edge Function Error:', error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Failed to create transfer' };
      }

      return { 
        success: true, 
        reference_id: data.data?.reference_id,
        utr: data.data?.utr
      };
    } catch (error: any) {
      console.error('Create Transfer Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate IFSC code
   */
  validateIFSC(ifsc: string): boolean {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc.toUpperCase());
  }

  /**
   * Validate account number
   */
  validateAccountNumber(accountNumber: string): boolean {
    const accountRegex = /^[0-9]{9,18}$/;
    return accountRegex.test(accountNumber);
  }

  /**
   * Validate PAN number
   */
  validatePAN(pan: string): boolean {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  }

  /**
   * Get transfer status via Edge Function
   */
  async getTransferStatus(referenceId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('Getting transfer status:', referenceId);

      const { data, error } = await supabase.functions.invoke('get-cashfree-transfer-status', {
        body: { reference_id: referenceId }
      });

      if (error) {
        console.error('Edge Function Error:', error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Failed to get transfer status' };
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      console.error('Get Transfer Status Error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default CashfreePayoutService.getInstance();