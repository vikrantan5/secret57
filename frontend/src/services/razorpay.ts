import { Alert } from 'react-native';

const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.EXPO_PUBLIC_RAZORPAY_KEY_SECRET || '';

export interface RazorpayOptions {
  amount: number; // Amount in paise (multiply by 100)
  currency?: string;
  name: string;
  description?: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

/**
 * Razorpay Integration Service
 * This is a marker class - actual payment is handled by RazorpayPayment component
 */
export class RazorpayService {
  private static instance: RazorpayService;

  private constructor() {}

  static getInstance(): RazorpayService {
    if (!RazorpayService.instance) {
      RazorpayService.instance = new RazorpayService();
    }
    return RazorpayService.instance;
  }

  /**
   * This method is kept for backward compatibility
   * Actual implementation uses RazorpayPayment WebView component
   */
  async openCheckout(
    options: RazorpayOptions,
    onSuccess: (response: RazorpayResponse) => void,
    onFailure: (error: any) => void
  ): Promise<void> {
    console.warn('RazorpayService.openCheckout is deprecated. Use RazorpayPayment component instead.');
    
    // For now, show an informational alert
    Alert.alert(
      'Payment Gateway',
      'Please use the updated payment flow with RazorpayPayment component',
      [{ text: 'OK', onPress: () => onFailure({ error: 'Deprecated method' }) }]
    );
  }

  /**
   * Get Razorpay configuration
   */
  getConfig() {
    return {
      keyId: RAZORPAY_KEY_ID,
      keySecret: RAZORPAY_KEY_SECRET,
    };
  }

  /**
   * Validate Razorpay configuration
   */
  isConfigured(): boolean {
    return !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
  }
}

/**
 * Utility function to create Razorpay order ID
 * In production, this should be done on backend
 */
export const generateOrderId = (prefix: string = 'order'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * Format amount for Razorpay (convert rupees to paise)
 */
export const formatAmountForRazorpay = (amount: number): number => {
  return Math.round(amount * 100);
};

/**
 * Format amount from Razorpay (convert paise to rupees)
 */
export const formatAmountFromRazorpay = (amount: number): number => {
  return amount / 100;
};

export default RazorpayService.getInstance();
