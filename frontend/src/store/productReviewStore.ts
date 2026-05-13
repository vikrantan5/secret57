import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string;
  rating: number;
  review: string;
  created_at: string;
  updated_at?: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  product?: any;
}

interface ProductReviewState {
  reviews: ProductReview[];
  loading: boolean;
  error: string | null;

  fetchProductReviews: (productId: string) => Promise<ProductReview[]>;
  fetchAllProductReviews: () => Promise<void>;
  canUserReview: (productId: string, userId: string) => Promise<{ eligible: boolean; orderId?: string; reason?: string }>;
  createProductReview: (data: {
    product_id: string;
    user_id: string;
    order_id: string;
    rating: number;
    review: string;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteProductReview: (id: string) => Promise<{ success: boolean; error?: string }>;
  getAverageRating: (productId: string) => Promise<{ average: number; count: number }>;
}

export const useProductReviewStore = create<ProductReviewState>((set, get) => ({
  reviews: [],
  loading: false,
  error: null,

  fetchProductReviews: async (productId) => {
    try {
      set({ loading: true, error: null });
      console.log('[ProductReviews] Fetching for product:', productId);

      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          *,
          user:users!product_reviews_user_id_fkey(id, name, avatar_url)
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ProductReviews] fetch error:', error);
        set({ error: error.message, loading: false });
        return [];
      }

      const reviews = data || [];
      set({ reviews, loading: false });
      console.log('[ProductReviews] Fetched count:', reviews.length);
      return reviews as ProductReview[];
    } catch (e: any) {
      console.error('[ProductReviews] fetchProductReviews exception:', e);
      set({ error: e.message, loading: false });
      return [];
    }
  },

  fetchAllProductReviews: async () => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          *,
          user:users!product_reviews_user_id_fkey(id, name, avatar_url, email),
          product:products!product_reviews_product_id_fkey(id, name, images)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        set({ error: error.message, loading: false });
        return;
      }
      set({ reviews: data || [], loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  canUserReview: async (productId, userId) => {
    try {
      console.log('[ProductReviews] Checking review eligibility', { productId, userId });

      // Find delivered orders by user that contain this product
      const { data: items, error } = await supabase
        .from('order_items')
        .select(`
          id, order_id, product_id,
          order:orders!order_items_order_id_fkey(id, customer_id, status)
        `)
        .eq('product_id', productId);

      if (error) {
        console.error('[ProductReviews] eligibility query error:', error);
        return { eligible: false, reason: 'Unable to verify purchase' };
      }

      const validItem = (items || []).find(
        (it: any) => it.order?.customer_id === userId && it.order?.status === 'delivered'
      );

      if (!validItem) {
        return { eligible: false, reason: 'You can review only products from delivered orders' };
      }

      // Check duplicate review for that order
      const { data: existing } = await supabase
        .from('product_reviews')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', userId)
        .eq('order_id', validItem.order_id)
        .maybeSingle();

      if (existing) {
        return { eligible: false, reason: 'You have already reviewed this product for this order' };
      }

      return { eligible: true, orderId: validItem.order_id };
    } catch (e: any) {
      console.error('[ProductReviews] canUserReview exception:', e);
      return { eligible: false, reason: e.message };
    }
  },

  createProductReview: async ({ product_id, user_id, order_id, rating, review }) => {
    try {
      console.log('[ProductReviews] Creating review', { product_id, user_id, order_id, rating });

      if (rating < 1 || rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5' };
      }
      if (!review || review.trim().length < 3) {
        return { success: false, error: 'Please write a review (at least 3 characters)' };
      }

      const { data, error } = await supabase
        .from('product_reviews')
        .insert([{
          product_id,
          user_id,
          order_id,
          rating,
          review: review.trim(),
        }])
        .select(`
          *,
          user:users!product_reviews_user_id_fkey(id, name, avatar_url)
        `)
        .single();

      if (error) {
        console.error('[ProductReviews] create error:', error);
        if (error.code === '23505') {
          return { success: false, error: 'You have already reviewed this product for this order' };
        }
        return { success: false, error: error.message };
      }

      console.log('[ProductReviews] Created successfully:', data?.id);
      set(state => ({ reviews: [data, ...state.reviews] }));
      return { success: true };
    } catch (e: any) {
      console.error('[ProductReviews] createProductReview exception:', e);
      return { success: false, error: e.message };
    }
  },

  deleteProductReview: async (id) => {
    try {
      console.log('[ProductReviews] Deleting review:', id);
      const { error } = await supabase.from('product_reviews').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      set(state => ({ reviews: state.reviews.filter(r => r.id !== id) }));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  getAverageRating: async (productId) => {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('rating')
        .eq('product_id', productId);

      if (error || !data) return { average: 0, count: 0 };
      if (data.length === 0) return { average: 0, count: 0 };
      const sum = data.reduce((acc, r: any) => acc + (r.rating || 0), 0);
      return { average: Number((sum / data.length).toFixed(1)), count: data.length };
    } catch {
      return { average: 0, count: 0 };
    }
  },
}));
