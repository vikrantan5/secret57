import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { Product } from './productStore';

interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

interface WishlistState {
  items: WishlistItem[];
  loading: boolean;
  
  fetchWishlist: (userId: string) => Promise<void>;
  addToWishlist: (userId: string, productId: string) => Promise<{ success: boolean; error?: string }>;
  removeFromWishlist: (userId: string, productId: string) => Promise<{ success: boolean; error?: string }>;
  isInWishlist: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  loading: false,

  fetchWishlist: async (userId: string) => {
    try {
      set({ loading: true });
      
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          *,
          product:products(
            *,
            seller:sellers(*)
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching wishlist:', error);
        set({ loading: false });
        return;
      }

      set({ items: data || [], loading: false });
    } catch (error) {
      console.error('Error in fetchWishlist:', error);
      set({ loading: false });
    }
  },

  addToWishlist: async (userId: string, productId: string) => {
    try {
      const { data, error } = await supabase
        .from('wishlists')
        .insert([{
          user_id: userId,
          product_id: productId,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding to wishlist:', error);
        return { success: false, error: error.message };
      }

      // Add to local state
      set(state => ({ items: [...state.items, data] }));
      
      return { success: true };
    } catch (error: any) {
      console.error('Error in addToWishlist:', error);
      return { success: false, error: error.message };
    }
  },

  removeFromWishlist: async (userId: string, productId: string) => {
    try {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) {
        console.error('Error removing from wishlist:', error);
        return { success: false, error: error.message };
      }

      // Remove from local state
      set(state => ({
        items: state.items.filter(item => item.product_id !== productId),
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in removeFromWishlist:', error);
      return { success: false, error: error.message };
    }
  },

  isInWishlist: (productId: string) => {
    return get().items.some(item => item.product_id === productId);
  },
}));
