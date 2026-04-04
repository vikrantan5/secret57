import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { useSubscriptionStore } from './subscriptionStore';
import { useBankAccountStore } from './bankAccountStore';

export interface Product {
  id: string;
  seller_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  sku: string | null;
  weight: number | null;
  dimensions: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  // Joined data
  seller?: any;
  category?: any;
}

interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  loading: boolean;
  error: string | null;
  
  fetchProducts: (categoryId?: string) => Promise<void>;
  fetchProductById: (id: string) => Promise<void>;
  fetchSellerProducts: (sellerId: string) => Promise<void>;
  createProduct: (product: Partial<Product>) => Promise<{ success: boolean; error?: string; product?: Product }>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  setSelectedProduct: (product: Product | null) => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  selectedProduct: null,
  loading: false,
  error: null,

  fetchProducts: async (categoryId?: string) => {
    try {
      set({ loading: true, error: null });
      
      let query = supabase
        .from('products')
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
        console.error('Error fetching products:', error);
        set({ error: error.message, loading: false });
        return;
      }

      set({ products: data || [], loading: false });
    } catch (error: any) {
      console.error('Error in fetchProducts:', error);
      set({ error: error.message, loading: false });
    }
  },

  fetchProductById: async (id: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:sellers(*),
          category:categories(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        set({ error: error.message, loading: false });
        return;
      }

      set({ selectedProduct: data, loading: false });
    } catch (error: any) {
      console.error('Error in fetchProductById:', error);
      set({ error: error.message, loading: false });
    }
  },

  fetchSellerProducts: async (sellerId: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching seller products:', error);
        set({ error: error.message, loading: false });
        return;
      }

      set({ products: data || [], loading: false });
    } catch (error: any) {
      console.error('Error in fetchSellerProducts:', error);
      set({ error: error.message, loading: false });
    }
  },











   createProduct: async (product) => {
    try {
      // Check active subscription
      if (product.seller_id) {
        const hasActiveSubscription = await useSubscriptionStore.getState().hasActiveSubscription(product.seller_id);
        if (!hasActiveSubscription) {
          return { 
            success: false, 
            error: 'Active subscription required. Please subscribe to a plan to add products.' 
          };
        }

        // Check bank account and get primary bank account ID
        // Fetch fresh data from database to ensure we have latest bank accounts
        const { data: bankAccounts, error: bankError } = await supabase
          .from('seller_bank_accounts')
          .select('id, verification_status, is_primary')
          .eq('seller_id', product.seller_id)
          .eq('verification_status', 'verified')
          .eq('is_primary', true)
          .single();
        
        if (bankError || !bankAccounts) {
          return { 
            success: false, 
            error: 'Verified bank account required. Please add and verify your bank details in Payout Settings.' 
          };
        }

        // Add seller's bank account ID for direct payment settlements
        const productData = {
          ...product,
          seller_settlement_account_id: bankAccounts.id, // Store bank account ID (UUID)
          cashfree_enabled: true,
          requires_subscription: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();

        if (error) {
          console.error('Error creating product:', error);
          return { success: false, error: error.message };
        }

        // Add to local state
        set(state => ({ products: [data, ...state.products] }));
        
        return { success: true, product: data };
      }

      return { success: false, error: 'Seller ID is required' };
    } catch (error: any) {
      console.error('Error in createProduct:', error);
      return { success: false, error: error.message };
    }
  },










  
  updateProduct: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating product:', error);
        return { success: false, error: error.message };
      }

      // Update local state
      set(state => ({
        products: state.products.map(p => p.id === id ? { ...p, ...updates } : p)
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateProduct:', error);
      return { success: false, error: error.message };
    }
  },

  deleteProduct: async (id) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting product:', error);
        return { success: false, error: error.message };
      }

      // Remove from local state
      set(state => ({
        products: state.products.filter(p => p.id !== id)
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in deleteProduct:', error);
      return { success: false, error: error.message };
    }
  },

  setSelectedProduct: (product) => set({ selectedProduct: product }),
}));
