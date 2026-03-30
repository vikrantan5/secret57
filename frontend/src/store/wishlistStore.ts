import { create } from 'zustand';
import { supabase } from '../services/supabase';

interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: any;
}

interface WishlistState {
  wishlistItems: string[]; // product IDs
  items: WishlistItem[]; // Full wishlist items with product details
  loading: boolean;
  
  addToWishlist: (productId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  removeFromWishlist: (userId: string, productId: string) => Promise<{ success: boolean; error?: string }>;
  fetchWishlist: (userId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string, userId: string) => Promise<void>;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  wishlistItems: [],
  items: [],
  loading: false,

  addToWishlist: async (productId: string, userId: string) => {
    try {
      // Check if already in wishlist
      const { data: existing } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

      if (existing) {
        return { success: true }; // Already in wishlist
      }

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

      // Refresh wishlist to get full data
      await get().fetchWishlist(userId);
      
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

      set(state => ({
        wishlistItems: state.wishlistItems.filter(id => id !== productId),
        items: state.items.filter(item => item.product_id !== productId),
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

      // Fetch wishlist with product details
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          *,
          product:products(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const wishlistItems = data?.map(w => w.product_id) || [];
      
      set({ 
        wishlistItems,
        items: data || [],
        loading: false 
      });
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      set({ wishlistItems: [], items: [], loading: false });
    }
  },

  isInWishlist: (productId: string) => {
    return get().wishlistItems.includes(productId);
  },

  toggleWishlist: async (productId: string, userId: string) => {
    const isInWishlist = get().isInWishlist(productId);
    
    if (isInWishlist) {
      await get().removeFromWishlist(userId, productId);
    } else {
      await get().addToWishlist(productId, userId);
    }
  },
}));