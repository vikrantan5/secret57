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

        // Check bank account
        const bankAccounts = useBankAccountStore.getState().accounts;
        const hasValidBank = bankAccounts.some(
          acc => acc.seller_id === service.seller_id && acc.verification_status === 'verified'
        );
        
        if (!hasValidBank) {
          return { 
            success: false, 
            error: 'Verified bank account required. Please add and verify your bank details in Payout Settings.' 
          };
        }
      }

      const { data, error } = await supabase
        .from('services')
        .insert([{
          ...service,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating service:', error);
        return { success: false, error: error.message };
      }

      // Add to local state
      set(state => ({ services: [data, ...state.services] }));
      
      return { success: true, service: data };
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
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting service:', error);
        return { success: false, error: error.message };
      }

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
