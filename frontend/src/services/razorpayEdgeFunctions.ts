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
    console.log('📞 Calling create-razorpay-order with params:', params);
    
    const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
      body: params,
    });

    console.log('📥 Edge function response - data:', data);
    console.log('📥 Edge function response - error:', error);

    if (error) {
      console.error('❌ Supabase function error:', error);
      
      // Try to extract more details from the error
      const errorMessage = error.message || error.msg || error.context?.message || 'Failed to create Razorpay order';
      
      return {
        success: false,
        error: errorMessage,
        details: error,
      };
    }

    // Check if data has an error field (edge function returned error in body)
    if (data && data.error) {
      console.error('❌ Edge function returned error in body:', data.error);
      return {
        success: false,
        error: data.error,
        details: data.details,
      };
    }

    console.log('✅ Razorpay order created successfully');
    return data as CreateRazorpayOrderResponse;
  } catch (error: any) {
    console.error('❌ Exception in createRazorpayOrder:', error);
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
    console.log('📞 Calling verify-razorpay-payment with params:', {
      orderId: params.razorpay_order_id,
      paymentId: params.razorpay_payment_id,
      hasSignature: !!params.razorpay_signature,
    });
    
    const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
      body: params,
    });

    console.log('📥 Verify response - data:', data);
    console.log('📥 Verify response - error:', error);

    if (error) {
      console.error('❌ Supabase function error:', error);
      
      // Try to extract more details from the error
      const errorMessage = error.message || error.msg || error.context?.message || 'Failed to verify payment';
      
      return {
        success: false,
        verified: false,
        error: errorMessage,
      };
    }

    // Check if data has an error field (edge function returned error in body)
    if (data && data.error) {
      console.error('❌ Edge function returned error in body:', data.error);
      return {
        success: false,
        verified: false,
        error: data.error,
      };
    }

    console.log('✅ Payment verification response received');
    return data as VerifyRazorpayPaymentResponse;
  } catch (error: any) {
    console.error('❌ Exception in verifyRazorpayPayment:', error);
    return {
      success: false,
      verified: false,
      error: error.message || 'Failed to verify payment',
    };
  }
};