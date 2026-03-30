import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface PaymentMethod {
  id: string;
  user_id: string;
  upi_id?: string;
  phone_number?: string;
  preferred_method: 'upi' | 'card' | 'netbanking';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface PaymentMethodState {
  paymentMethod: PaymentMethod | null;
  loading: boolean;
  
  fetchPaymentMethod: (userId: string) => Promise<void>;
  savePaymentMethod: (userId: string, data: {
    upi_id?: string;
    phone_number?: string;
    preferred_method: 'upi' | 'card' | 'netbanking';
  }) => Promise<{ success: boolean; error?: string }>;
  updatePaymentMethod: (id: string, data: Partial<PaymentMethod>) => Promise<{ success: boolean; error?: string }>;
}

export const usePaymentMethodStore = create<PaymentMethodState>((set, get) => ({
  paymentMethod: null,
  loading: false,

  fetchPaymentMethod: async (userId: string) => {
    try {
      set({ loading: true });

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is \"no rows returned\" - not an error for us
        console.error('Error fetching payment method:', error);
        set({ loading: false });
        return;
      }

      set({ paymentMethod: data, loading: false });
    } catch (error) {
      console.error('Error in fetchPaymentMethod:', error);
      set({ loading: false });
    }
  },

  savePaymentMethod: async (userId: string, data) => {
    try {
      set({ loading: true });

      // Check if payment method already exists
      const { data: existing } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

      let result;
      if (existing) {
        // Update existing
        result = await supabase
          .from('payment_methods')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        // Insert new
        result = await supabase
          .from('payment_methods')
          .insert([{
            user_id: userId,
            ...data,
            is_default: true,
          }])
          .select()
          .single();
      }

      if (result.error) {
        set({ loading: false });
        return { success: false, error: result.error.message };
      }

      set({ paymentMethod: result.data, loading: false });
      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message || 'Failed to save payment method' };
    }
  },

  updatePaymentMethod: async (id: string, data) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      // Update local state
      const current = get().paymentMethod;
      if (current && current.id === id) {
        set({ paymentMethod: { ...current, ...data } as PaymentMethod });
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update payment method' };
    }
  },
}));
