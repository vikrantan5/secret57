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
 * Razorpay Mock Integration for Testing
 * In production, you would integrate with actual Razorpay SDK
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
   * Open Razorpay Checkout - MOCKED for development
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

      // Use mock payment for testing
      return this.mockPayment(options.amount, onSuccess, onFailure);
    } catch (error) {
      console.error('Razorpay checkout error:', error);
      onFailure(error);
    }
  }

  /**
   * Mock payment for development/testing
   */
  private async mockPayment(
    amount: number,
    onSuccess: (response: RazorpayResponse) => void,
    onFailure: (error: any) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        'Payment Gateway',
        `Process payment of ₹${(amount / 100).toFixed(2)}?\n\n(Using Test Mode)`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              onFailure({ error: 'Payment cancelled by user' });
              resolve();
            },
          },
          {
            text: 'Pay Now',
            onPress: () => {
              // Simulate payment processing
              setTimeout(() => {
                onSuccess({
                  razorpay_payment_id: `pay_${Date.now()}`,
                  razorpay_order_id: `order_${Date.now()}`,
                  razorpay_signature: `sig_${Date.now()}`,
                });
                resolve();
              }, 1000);
            },
          },
        ],
        { cancelable: false }
      );
    });
  }
}

/**
 * Standalone mock payment function
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