import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { useSubscriptionStore } from './subscriptionStore';
import { useBankAccountStore } from './bankAccountStore';

export interface Service {
  id: string;
  seller_id: string;
  category_id: string;
  name: string;
  description: string;
 price: number;
  duration: number | null; // in minutes
  images: string[] | null;
  video_url: string | null; // YouTube video URL
  location_type: 'visit_customer' | 'customer_visits' | 'both' | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  seller?: any;
  category?: any;
}

interface ServiceState {
  services: Service[];
  selectedService: Service | null;
  loading: boolean;
  error: string | null;
  
  fetchServices: (categoryId?: string) => Promise<void>;
  fetchServiceById: (id: string) => Promise<void>;
  fetchSellerServices: (sellerId: string) => Promise<void>;
  
  createService: (service: Partial<Service>) => Promise<{ success: boolean; error?: string; service?: Service }>;
  updateService: (id: string, updates: Partial<Service>) => Promise<{ success: boolean; error?: string }>;
  deleteService: (id: string) => Promise<{ success: boolean; error?: string }>;
  setSelectedService: (service: Service | null) => void;
}

export const useServiceStore = create<ServiceState>((set, get) => ({
  services: [],
  selectedService: null,
  loading: false,
  error: null,

  fetchServices: async (categoryId?: string) => {
    try {
      set({ loading: true, error: null });
      
      let query = supabase
        .from('services')
        .select(`
          *,
          seller:sellers(*),
          category:categories(*)
        `)
        .eq('is_active', true);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching services:', error);
        set({ error: error.message, loading: false });
        return;
      }

      set({ services: data || [], loading: false });
    } catch (error: any) {
      console.error('Error in fetchServices:', error);
      set({ error: error.message, loading: false });
    }
  },

  fetchServiceById: async (id: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          seller:sellers(*),
          category:categories(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching service:', error);
        set({ error: error.message, loading: false });
        return;
      }

      set({ selectedService: data, loading: false });
    } catch (error: any) {
      console.error('Error in fetchServiceById:', error);
      set({ error: error.message, loading: false });
    }
  },

  fetchSellerServices: async (sellerId: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('seller_id', sellerId)
          .eq('is_deleted', false) // ✅ FIX: Filter out soft-deleted services
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching seller services:', error);
        set({ error: error.message, loading: false });
        return;
      }

      set({ services: data || [], loading: false });
    } catch (error: any) {
      console.error('Error in fetchSellerServices:', error);
      set({ error: error.message, loading: false });
    }
  },

  createService: async (service) => {
    try {
      // Check active subscription
      if (service.seller_id) {
        const hasActiveSubscription = await useSubscriptionStore.getState().hasActiveSubscription(service.seller_id);
        if (!hasActiveSubscription) {
          return { 
            success: false, 
            error: 'Active subscription required. Please subscribe to a plan to add services.' 
          };
        }

        // ✅ CRITICAL FIX: Fetch bank account WITH cashfree_bene_id for payouts
        const { data: bankAccounts, error: bankError } = await supabase
          .from('seller_bank_accounts')
          .select('id, cashfree_bene_id, verification_status, is_primary')
          .eq('seller_id', service.seller_id)
          .eq('verification_status', 'verified')
          .eq('is_primary', true)
          .single();
        
        if (bankError || !bankAccounts) {
          return { 
            success: false, 
            error: 'Verified bank account required. Please add and verify your bank details in Payout Settings.' 
          };
        }

        if (!bankAccounts.cashfree_bene_id) {
          return { 
            success: false, 
            error: 'Bank account not verified with Cashfree. Please complete bank verification in Payout Settings.' 
          };
        }

        // ✅ CRITICAL FIX: Store both bank account ID AND cashfree_bene_id for instant payouts
        const serviceData = {
          ...service,
          seller_bank_account_id: bankAccounts.id,
          cashfree_bene_id: bankAccounts.cashfree_bene_id, // CRITICAL: Store beneficiary ID
          seller_payout_percentage: 100.00, // Full amount to seller (adjust if commission needed)
          platform_commission_percentage: 0.00,
          cashfree_enabled: true,
          requires_subscription: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log('✅ Creating service with payout details:', {
          seller_id: service.seller_id,
          bank_account_id: bankAccounts.id,
          cashfree_bene_id: bankAccounts.cashfree_bene_id
        });

        const { data, error } = await supabase
          .from('services')
          .insert([serviceData])
          .select()
          .single();

        if (error) {
          console.error('Error creating service:', error);
          return { success: false, error: error.message };
        }

        // Add to local state
        set(state => ({ services: [data, ...state.services] }));
        
        return { success: true, service: data };
      }

      return { success: false, error: 'Seller ID is required' };
    } catch (error: any) {
      console.error('Error in createService:', error);
      return { success: false, error: error.message };
    }
  },

  updateService: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating service:', error);
        return { success: false, error: error.message };
      }

      // Update local state
      set(state => ({
        services: state.services.map(s => s.id === id ? { ...s, ...updates } : s)
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateService:', error);
      return { success: false, error: error.message };
    }
  },

   deleteService: async (id) => {
    try {
      // ✅ FIX: Implement soft delete instead of hard delete
      // This prevents foreign key constraint violation errors with bookings
      console.log('🗑️ Soft deleting service:', id);
      
      const { error } = await supabase
        .from('services')
        .update({ 
          is_deleted: true,
          is_active: false, // Also deactivate the service
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error soft deleting service:', error);
        
        // Check if it's a foreign key constraint error (fallback)
        if (error.message.includes('foreign key constraint')) {
          return { 
            success: false, 
            error: 'Cannot delete service: It has existing bookings. The service has been deactivated instead.' 
          };
        }
        
        return { success: false, error: error.message };
      }

      console.log('✅ Service soft deleted successfully');

      // Remove from local state
      set(state => ({
        services: state.services.filter(s => s.id !== id)
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in deleteService:', error);
      return { success: false, error: error.message };
    }
  },
  setSelectedService: (service) => set({ selectedService: service }),
}));
