import { supabase } from './supabase';

export interface CashfreeOrderOptions {
  amount: number; // Amount in rupees (not paise)
  currency?: string;
  order_note?: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  return_url: string;
}

export interface CashfreeOrderResponse {
  order_id: string;
  payment_session_id: string;
  order_token: string;
  order_status: string;
}

/**
 * Cashfree Payment Gateway Integration Service
 */
export class CashfreeService {
  private static instance: CashfreeService;
  private readonly CASHFREE_APP_ID = process.env.EXPO_PUBLIC_CASHFREE_APP_ID || '';
  private readonly CASHFREE_PAYMENT_URL = 'https://sandbox.cashfree.com/pg/orders'; // Change for production

  private constructor() {}

  static getInstance(): CashfreeService {
    if (!CashfreeService.instance) {
      CashfreeService.instance = new CashfreeService();
    }
    return CashfreeService.instance;
  }

  /**
   * Create Cashfree order via Edge Function
   */
  async createOrder(
    options: CashfreeOrderOptions
  ): Promise<{ success: boolean; data?: CashfreeOrderResponse; error?: string }> {
    try {
      console.log('Creating Cashfree order via Edge Function');

      const { data, error } = await supabase.functions.invoke('create-cashfree-order', {
        body: {
          order_amount: options.amount,
          order_currency: options.currency || 'INR',
          order_note: options.order_note,
          customer_id: options.customer_id,
          customer_name: options.customer_name,
          customer_email: options.customer_email,
          customer_phone: options.customer_phone,
          return_url: options.return_url
        }
      });

      if (error) {
        console.error('Edge Function Error:', error);
        throw error;
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Failed to create order' };
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      console.error('Create Order Error:', error);
      return { success: false, error: error.message || 'Failed to create order' };
    }
  }

  /**
   * Verify payment status via Edge Function
   */
  async verifyPayment(
    orderId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('Verifying Cashfree payment:', orderId);

      const { data, error } = await supabase.functions.invoke('verify-cashfree-payment', {
        body: { order_id: orderId }
      });

      if (error) {
        console.error('Edge Function Error:', error);
        throw error;
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Failed to verify payment' };
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      console.error('Verify Payment Error:', error);
      return { success: false, error: error.message || 'Failed to verify payment' };
    }
  }

  /**
   * Create subscription order (payment goes to admin)
   */
  async createSubscriptionOrder(data: {
    subscription_amount: number;
    plan_name: string;
    seller_id: string;
    seller_name: string;
    seller_email: string;
    seller_phone: string;
    return_url: string;
  }): Promise<{ success: boolean; data?: CashfreeOrderResponse; error?: string }> {
    try {
      console.log('Creating subscription order via Edge Function');

      const { data: response, error } = await supabase.functions.invoke(
        'create-subscription-order',
        { body: data }
      );

      if (error) {
        console.error('Edge Function Error:', error);
        throw error;
      }

      if (!response?.success) {
        return { success: false, error: response?.error || 'Failed to create subscription order' };
      }

      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Create Subscription Order Error:', error);
      return { success: false, error: error.message || 'Failed to create subscription order' };
    }
  }

  /**
   * Get Cashfree configuration
   */
  getConfig() {
    return {
      appId: this.CASHFREE_APP_ID,
      paymentUrl: this.CASHFREE_PAYMENT_URL
    };
  }

  /**
   * Validate Cashfree configuration
   */
  isConfigured(): boolean {
    return !!this.CASHFREE_APP_ID;
  }

  /**
   * Get payment session URL for WebView
   * Now returns the payment_url from API response directly
   */
  getPaymentSessionUrl(paymentSessionId: string, paymentUrl?: string): string {
    // If payment_url is provided from API response, use it directly
    if (paymentUrl) {
      return paymentUrl;
    }
    
    // Fallback: Use Cashfree's order pay endpoint
    // This is the correct format for sandbox environment
    return `https://sandbox.cashfree.com/pg/orders/pay/${paymentSessionId}`;
  }
}

export default CashfreeService.getInstance();
