import { supabase } from './supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

export interface CreateRazorpayOrderParams {
  amount: number;
  currency?: string;
  receipt: string;
}

export interface CreateRazorpayOrderResponse {
  success: boolean;
  order_id?: string;
  amount?: number;
  currency?: string;
  receipt?: string;
  error?: string;
  details?: any;
}

export interface VerifyRazorpayPaymentParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyRazorpayPaymentResponse {
  success: boolean;
  verified: boolean;
  message?: string;
  error?: string;
}

/**
 * Create a Razorpay order using Supabase Edge Function
 */
export const createRazorpayOrder = async (
  params: CreateRazorpayOrderParams
): Promise<CreateRazorpayOrderResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
      body: params,
    });

    if (error) {
      console.error('Supabase function error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create Razorpay order',
      };
    }

    return data as CreateRazorpayOrderResponse;
  } catch (error: any) {
    console.error('Error calling create-razorpay-order:', error);
    return {
      success: false,
      error: error.message || 'Failed to create Razorpay order',
    };
  }
};

/**
 * Verify Razorpay payment signature using Supabase Edge Function
 */
export const verifyRazorpayPayment = async (
  params: VerifyRazorpayPaymentParams
): Promise<VerifyRazorpayPaymentResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
      body: params,
    });

    if (error) {
      console.error('Supabase function error:', error);
      return {
        success: false,
        verified: false,
        error: error.message || 'Failed to verify payment',
      };
    }

    return data as VerifyRazorpayPaymentResponse;
  } catch (error: any) {
    console.error('Error calling verify-razorpay-payment:', error);
    return {
      success: false,
      verified: false,
      error: error.message || 'Failed to verify payment',
    };
  }
};
