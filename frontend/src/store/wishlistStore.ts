import { create } from 'zustand';
import { supabase } from '../services/supabase';

interface WishlistState {
  wishlistItems: string[]; // product IDs
  loading: boolean;
  
  addToWishlist: (productId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  removeFromWishlist: (productId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  fetchWishlist: (userId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string, userId: string) => Promise<void>;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  wishlistItems: [],
  loading: false,

  addToWishlist: async (productId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('wishlists')
        .insert([{ user_id: userId, product_id: productId }]);
      
      if (error) {
        console.error('Error adding to wishlist:', error);
        return { success: false, error: error.message };
      }

      set(state => ({
        wishlistItems: [...state.wishlistItems, productId],
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in addToWishlist:', error);
      return { success: false, error: error.message };
    }
  },

  removeFromWishlist: async (productId: string, userId: string) => {
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

      set(state => ({
        wishlistItems: state.wishlistItems.filter(id => id !== productId),
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in removeFromWishlist:', error);
      return { success: false, error: error.message };
    }
  },

  fetchWishlist: async (userId: string) => {
    try {
      set({ loading: true });

      const { data, error } = await supabase
        .from('wishlists')
        .select('product_id')
        .eq('user_id', userId);
      
      if (error) throw error;

      set({ 
        wishlistItems: data?.map(w => w.product_id) || [],
        loading: false 
      });
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      set({ loading: false });
    }
  },

  isInWishlist: (productId: string) => {
    return get().wishlistItems.includes(productId);
  },

  toggleWishlist: async (productId: string, userId: string) => {
    const isInWishlist = get().isInWishlist(productId);
    
    if (isInWishlist) {
      await get().removeFromWishlist(productId, userId);
    } else {
      await get().addToWishlist(productId, userId);
    }
  },
}));
