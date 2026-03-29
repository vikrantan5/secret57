import { create } from 'zustand';
import { supabase } from '../services/supabase';
import RazorpayService, { mockPayment, RazorpayResponse } from '../services/razorpay';

export interface Payment {
  id: string;
  order_id?: string;
  booking_id?: string;
  custom_order_id?: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  refund_amount?: number;
  refund_reason?: string;
  created_at: string;
  updated_at: string;
}

interface PaymentState {
  payments: Payment[];
  loading: boolean;
  
  // Payment Functions
  createPayment: (data: {
    order_id?: string;
    booking_id?: string;
    custom_order_id?: string;
    amount: number;
    payment_method?: string;
  }) => Promise<{ success: boolean; payment?: Payment; error?: string }>;
  
  updatePaymentStatus: (
    paymentId: string,
    status: 'success' | 'failed',
    razorpayData?: RazorpayResponse
  ) => Promise<{ success: boolean; error?: string }>;
  
  processRazorpayCheckout: (
    amount: number,
    orderId?: string,
    bookingId?: string,
    customerName?: string,
    customerEmail?: string,
    customerPhone?: string
  ) => Promise<{ success: boolean; error?: string }>;
  
  fetchUserPayments: (userId: string) => Promise<void>;
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  payments: [],
  loading: false,

  createPayment: async (data) => {
    try {
      set({ loading: true });

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const paymentData = {
        ...data,
        user_id: user.id,
        currency: 'INR',
        status: 'pending',
      };

      const { data: newPayment, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single();

      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      set({ 
        payments: [newPayment, ...get().payments],
        loading: false 
      });
      
      return { success: true, payment: newPayment };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message || 'Failed to create payment' };
    }
  },

  updatePaymentStatus: async (paymentId, status, razorpayData) => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (razorpayData) {
        updateData.razorpay_payment_id = razorpayData.razorpay_payment_id;
        updateData.razorpay_order_id = razorpayData.razorpay_order_id;
        updateData.razorpay_signature = razorpayData.razorpay_signature;
      }

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Update local state
      const updatedPayments = get().payments.map(p =>
        p.id === paymentId ? { ...p, ...updateData } : p
      );
      set({ payments: updatedPayments });

      // If payment successful and linked to order, update order payment status
      if (status === 'success' && razorpayData) {
        const payment = get().payments.find(p => p.id === paymentId);
        if (payment?.order_id) {
          await supabase
            .from('orders')
            .update({ 
              payment_status: 'paid',
              razorpay_payment_id: razorpayData.razorpay_payment_id,
              razorpay_order_id: razorpayData.razorpay_order_id,
              razorpay_signature: razorpayData.razorpay_signature,
            })
            .eq('id', payment.order_id);
        }

        if (payment?.booking_id) {
          await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', payment.booking_id);
        }
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update payment' };
    }
  },

  processRazorpayCheckout: async (
    amount,
    orderId,
    bookingId,
    customerName,
    customerEmail,
    customerPhone
  ) => {
    return new Promise((resolve) => {
      // REAL RAZORPAY IMPLEMENTATION - NO MOCK
      RazorpayService.openCheckout(
        {
          amount,
          currency: 'INR',
          name: 'Hybrid Bazaar',
          description: orderId ? 'Product Order' : 'Service Booking',
          order_id: orderId || bookingId, // Use actual order/booking ID
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerPhone,
          },
          theme: {
            color: '#5B7CFF',
          },
        },
        async (response) => {
          // Payment successful - create payment record
          const paymentResult = await get().createPayment({
            order_id: orderId,
            booking_id: bookingId,
            amount: amount / 100, // Convert paise to rupees
            payment_method: 'razorpay',
          });

          if (paymentResult.success && paymentResult.payment) {
            await get().updatePaymentStatus(
              paymentResult.payment.id,
              'success',
              response
            );
            resolve({ success: true });
          } else {
            resolve({ success: false, error: 'Failed to record payment' });
          }
        },
        (error) => {
          // Payment failed
          console.error('Razorpay payment failed:', error);
          resolve({ success: false, error: error.error || 'Payment failed' });
        }
      );
    });
  },


  fetchUserPayments: async (userId: string) => {
    try {
      set({ loading: true });

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        set({ loading: false });
        return;
      }

      set({ payments: data || [], loading: false });
    } catch (error) {
      console.error('Error in fetchUserPayments:', error);
      set({ loading: false });
    }
  },
}));
