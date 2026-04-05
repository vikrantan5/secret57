import { create } from 'zustand';
import { supabase } from '../services/supabase';

interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string | null;
  service_id: string | null;
  item_type: 'product' | 'service';
  created_at: string;
  product?: any;
  service?: any;
}

interface WishlistState {
  wishlistItems: string[]; // product/service IDs
  items: WishlistItem[]; // Full wishlist items with product/service details
  loading: boolean;
  
  addToWishlist: (itemId: string, userId: string, itemType: 'product' | 'service') => Promise<{ success: boolean; error?: string }>;
  removeFromWishlist: (userId: string, itemId: string, itemType: 'product' | 'service') => Promise<{ success: boolean; error?: string }>;
  fetchWishlist: (userId: string) => Promise<void>;
  isInWishlist: (itemId: string) => boolean;
  toggleWishlist: (itemId: string, userId: string, itemType: 'product' | 'service') => Promise<void>;
}
export const useWishlistStore = create<WishlistState>((set, get) => ({
  wishlistItems: [],
  items: [],
  loading: false,

  addToWishlist: async (itemId: string, userId: string, itemType: 'product' | 'service') => {
    try {
      // Check if already in wishlist
      const { data: existing } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', userId)
        .eq(itemType === 'product' ? 'product_id' : 'service_id', itemId)
        .single();

      if (existing) {
        return { success: true }; // Already in wishlist
      }

      const insertData: any = {
        user_id: userId,
        item_type: itemType,
      };
      
      if (itemType === 'product') {
        insertData.product_id = itemId;
      } else {
        insertData.service_id = itemId;
      }

      const { error } = await supabase
        .from('wishlists')
        .insert([insertData]);
      
      if (error) {
        console.error('Error adding to wishlist:', error);
        return { success: false, error: error.message };
      }

      set(state => ({
        wishlistItems: [...state.wishlistItems, itemId],
      }));

      // Refresh wishlist to get full data
      await get().fetchWishlist(userId);
      
      return { success: true };
    } catch (error: any) {
      console.error('Error in addToWishlist:', error);
      return { success: false, error: error.message };
    }
  },

  removeFromWishlist: async (userId: string, itemId: string, itemType: 'product' | 'service') => {
    try {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', userId)
        .eq(itemType === 'product' ? 'product_id' : 'service_id', itemId);
      
      if (error) {
        console.error('Error removing from wishlist:', error);
        return { success: false, error: error.message };
      }

      set(state => ({
        wishlistItems: state.wishlistItems.filter(id => id !== itemId),
        items: state.items.filter(item => 
          itemType === 'product' ? item.product_id !== itemId : item.service_id !== itemId
        ),
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

      // Fetch wishlist with product and service details
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          *,
          product:products(*),
          service:services(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const wishlistItems = data?.map(w => w.product_id || w.service_id).filter(Boolean) || [];
      
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

  isInWishlist: (itemId: string) => {
    return get().wishlistItems.includes(itemId);
  },

  toggleWishlist: async (itemId: string, userId: string, itemType: 'product' | 'service') => {
    const isInWishlist = get().isInWishlist(itemId);
    
    if (isInWishlist) {
      await get().removeFromWishlist(userId, itemId, itemType);
    } else {
      await get().addToWishlist(itemId, userId, itemType);
    }
  },
}));