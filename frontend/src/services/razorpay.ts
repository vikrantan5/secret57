import { Alert, Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '';

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
 * Razorpay Integration for Expo (Web-based)
 * 
 * Since Expo doesn't support native Razorpay SDK, we use web-based checkout
 * This creates a payment link and opens it in a browser
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
   * Open Razorpay Checkout (Web-based for Expo)
   * For production, you should create orders on your backend first
   */
  async openCheckout(
    options: RazorpayOptions,
    onSuccess: (response: RazorpayResponse) => void,
    onFailure: (error: any) => void
  ): Promise<void> {
    try {
      if (!RAZORPAY_KEY_ID) {
        throw new Error('Razorpay Key ID not configured');
      }

      // For Expo, we'll use WebView-based approach
      // In production, you should:
      // 1. Create order on backend
      // 2. Get order_id from backend
      // 3. Use that order_id here

      const checkoutUrl = this.generateCheckoutUrl(options);
      
      // Open in browser
      const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });

      // Note: In a real implementation, you'd need a backend to handle the callback
      // and verify the payment, then notify your app
      if (result.type === 'cancel' || result.type === 'dismiss') {
        onFailure({ error: 'Payment cancelled by user' });
      }
    } catch (error) {
      console.error('Razorpay checkout error:', error);
      onFailure(error);
    }
  }

  /**
   * Generate Razorpay payment link
   * Note: This is a simplified version. In production, create orders on backend
   */
  private generateCheckoutUrl(options: RazorpayOptions): string {
    const params = new URLSearchParams({
      key_id: RAZORPAY_KEY_ID,
      amount: options.amount.toString(),
      currency: options.currency || 'INR',
      name: options.name,
      description: options.description || '',
      // Add other params as needed
    });

    // This is a mock URL - in production, your backend should create
    // a payment link using Razorpay Payment Links API
    return `https://api.razorpay.com/v1/checkout/embedded?${params.toString()}`;
  }

  /**
   * Verify payment signature (should be done on backend)
   */
  verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
    secret: string
  ): boolean {
    // This should ONLY be done on the backend for security
    // Never expose your secret key in the frontend
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(orderId + '|' + paymentId);
    const generatedSignature = hmac.digest('hex');
    return generatedSignature === signature;
  }
}

/**
 * Alternative: Mock payment for development/testing
 * Use this for testing without actual Razorpay integration
 */
export const mockPayment = async (
  amount: number,
  onSuccess: (response: RazorpayResponse) => void,
  onFailure: (error: any) => void
): Promise<void> => {
  return new Promise((resolve) => {
    Alert.alert(
      'Mock Payment',
      `Simulate payment of ₹${(amount / 100).toFixed(2)}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            onFailure({ error: 'Payment cancelled' });
            resolve();
          },
        },
        {
          text: 'Success',
          onPress: () => {
            onSuccess({
              razorpay_payment_id: `pay_mock_${Date.now()}`,
              razorpay_order_id: `order_mock_${Date.now()}`,
              razorpay_signature: `sig_mock_${Date.now()}`,
            });
            resolve();
          },
        },
        {
          text: 'Fail',
          style: 'destructive',
          onPress: () => {
            onFailure({ error: 'Payment failed' });
            resolve();
          },
        },
      ],
      { cancelable: false }
    );
  });
};

export default RazorpayService.getInstance();
