import { create } from 'zustand';
import { supabase } from '../services/supabase';
import CashfreeService from '../services/cashfreeService';

export interface SubscriptionPlan {
  id: string;
  name: string;
  duration_type: 'monthly' | 'yearly';
  price: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SellerSubscription {
  id: string;
  seller_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'cancelled';
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  payment_id?: string;
  cashfree_order_id?: string;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  // Joined data
  plan?: SubscriptionPlan;
}

interface SubscriptionState {
  plans: SubscriptionPlan[];
  subscriptions: SellerSubscription[];
  currentSubscription: SellerSubscription | null;
  loading: boolean;
  error: string | null;

  // Fetch all active subscription plans
  fetchPlans: () => Promise<void>;

  // Fetch seller's subscriptions
  fetchSellerSubscriptions: (sellerId: string) => Promise<void>;

  // Check if seller has active subscription
  hasActiveSubscription: (sellerId: string) => Promise<boolean>;

  // Get current active subscription
  getCurrentSubscription: (sellerId: string) => Promise<SellerSubscription | null>;

  // Create subscription payment order
  createSubscriptionOrder: (data: {
    seller_id: string;
    plan_id: string;
    seller_name: string;
    seller_email: string;
    seller_phone: string;
  }) => Promise<{
    success: boolean;
    order_data?: any;
    error?: string;
  }>;

  // Complete subscription after payment
  completeSubscription: (data: {
    seller_id: string;
    plan_id: string;
    cashfree_order_id: string;
    payment_id: string;
    amount_paid: number;
  }) => Promise<{ success: boolean; subscription?: SellerSubscription; error?: string }>;

  // Cancel subscription
  cancelSubscription: (subscriptionId: string) => Promise<{ success: boolean; error?: string }>;

  // Admin: Create/Update plans
  createPlan: (planData: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>) => Promise<{
    success: boolean;
    plan?: SubscriptionPlan;
    error?: string;
  }>;

  updatePlan: (
    planId: string,
    planData: Partial<SubscriptionPlan>
  ) => Promise<{ success: boolean; error?: string }>;

  // Admin: Fetch all subscriptions
  fetchAllSubscriptions: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  plans: [],
  subscriptions: [],
  currentSubscription: null,
  loading: false,
  error: null,

  fetchPlans: async () => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      set({ plans: data || [], loading: false });
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      set({ error: error.message, loading: false });
    }
  },

  fetchSellerSubscriptions: async (sellerId: string) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from('seller_subscriptions')
        .select(
          `
          *,
          plan:subscription_plans(*)
        `
        )
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Find current active subscription
      const active = data?.find(
        (sub) => sub.status === 'active' && new Date(sub.expires_at) > new Date()
      );

      set({
        subscriptions: data || [],
        currentSubscription: active || null,
        loading: false
      });
    } catch (error: any) {
      console.error('Error fetching seller subscriptions:', error);
      set({ error: error.message, loading: false });
    }
  },

  hasActiveSubscription: async (sellerId: string) => {
    try {
      const { data, error } = await supabase
        .from('seller_subscriptions')
        .select('id')
        .eq('seller_id', sellerId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        throw error;
      }

      return !!data;
    } catch (error: any) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  },

  getCurrentSubscription: async (sellerId: string) => {
    try {
      const { data, error } = await supabase
        .from('seller_subscriptions')
        .select(
          `
          *,
          plan:subscription_plans(*)
        `
        )
        .eq('seller_id', sellerId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || null;
    } catch (error: any) {
      console.error('Error fetching current subscription:', error);
      return null;
    }
  },

  createSubscriptionOrder: async (data) => {
    try {
      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', data.plan_id)
        .single();

      if (planError) throw planError;
      if (!plan) throw new Error('Subscription plan not found');

      // Create Cashfree order via service
      const orderResult = await CashfreeService.createSubscriptionOrder({
        subscription_amount: plan.price,
        plan_name: plan.name,
        seller_id: data.seller_id,
        seller_name: data.seller_name,
        seller_email: data.seller_email,
        seller_phone: data.seller_phone,
        return_url: 'https://yourapp.com/subscription-success' // Update with actual URL
      });

      if (!orderResult.success) {
        return { success: false, error: orderResult.error };
      }

      return {
        success: true,
        order_data: {
          ...orderResult.data,
          plan_id: data.plan_id,
          amount: plan.price,
          duration_days: plan.duration_days
        }
      };
    } catch (error: any) {
      console.error('Error creating subscription order:', error);
      return { success: false, error: error.message };
    }
  },

  completeSubscription: async (data) => {
    try {
      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', data.plan_id)
        .single();

      if (planError) throw planError;

      // Calculate expiry date
      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + plan.duration_days);

      // Create subscription record
      const { data: subscription, error } = await supabase
        .from('seller_subscriptions')
        .insert([
          {
            seller_id: data.seller_id,
            plan_id: data.plan_id,
            status: 'active',
            started_at: startDate.toISOString(),
            expires_at: expiryDate.toISOString(),
            payment_id: data.payment_id,
            cashfree_order_id: data.cashfree_order_id,
            amount_paid: data.amount_paid
          }
        ])
        .select(
          `
          *,
          plan:subscription_plans(*)
        `
        )
        .single();

      if (error) throw error;

      // Update local state
      set({
        subscriptions: [subscription, ...get().subscriptions],
        currentSubscription: subscription
      });

      return { success: true, subscription };
    } catch (error: any) {
      console.error('Error completing subscription:', error);
      return { success: false, error: error.message };
    }
  },

  cancelSubscription: async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('seller_subscriptions')
        .update({ status: 'cancelled', auto_renew: false })
        .eq('id', subscriptionId);

      if (error) throw error;

      // Update local state
      const updatedSubscriptions = get().subscriptions.map((sub) =>
        sub.id === subscriptionId ? { ...sub, status: 'cancelled' as const, auto_renew: false } : sub
      );

      set({ subscriptions: updatedSubscriptions, currentSubscription: null });

      return { success: true };
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      return { success: false, error: error.message };
    }
  },

  createPlan: async (planData) => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert([planData])
        .select()
        .single();

      if (error) throw error;

      set({ plans: [...get().plans, data] });

      return { success: true, plan: data };
    } catch (error: any) {
      console.error('Error creating plan:', error);
      return { success: false, error: error.message };
    }
  },

  updatePlan: async (planId, planData) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update(planData)
        .eq('id', planId);

      if (error) throw error;

      // Refresh plans
      await get().fetchPlans();

      return { success: true };
    } catch (error: any) {
      console.error('Error updating plan:', error);
      return { success: false, error: error.message };
    }
  },

  fetchAllSubscriptions: async () => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from('seller_subscriptions')
        .select(
          `
          *,
          plan:subscription_plans(*),
          seller:sellers(*, users(*))
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ subscriptions: data || [], loading: false });
    } catch (error: any) {
      console.error('Error fetching all subscriptions:', error);
      set({ error: error.message, loading: false });
    }
  }
}));
