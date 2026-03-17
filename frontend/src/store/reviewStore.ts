import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface Review {
  id: string;
  customer_id: string;
  seller_id: string | null;
  product_id: string | null;
  service_id: string | null;
  order_id: string | null;
  booking_id: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[] | null;
  is_verified_purchase: boolean;
  seller_reply: string | null;
  seller_reply_date: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  customer?: any;
}

interface ReviewState {
  reviews: Review[];
  loading: boolean;
  
  fetchProductReviews: (productId: string) => Promise<void>;
  fetchServiceReviews: (serviceId: string) => Promise<void>;
  fetchSellerReviews: (sellerId: string) => Promise<void>;
  createReview: (review: Partial<Review>) => Promise<{ success: boolean; error?: string }>;
  updateReview: (id: string, updates: Partial<Review>) => Promise<{ success: boolean; error?: string }>;
  addSellerReply: (reviewId: string, reply: string) => Promise<{ success: boolean; error?: string }>;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: [],
  loading: false,

  fetchProductReviews: async (productId: string) => {
    try {
      set({ loading: true });
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          customer:users!customer_id(*)
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching product reviews:', error);
        set({ loading: false });
        return;
      }

      set({ reviews: data || [], loading: false });
    } catch (error) {
      console.error('Error in fetchProductReviews:', error);
      set({ loading: false });
    }
  },

  fetchServiceReviews: async (serviceId: string) => {
    try {
      set({ loading: true });
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          customer:users!customer_id(*)
        `)
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching service reviews:', error);
        set({ loading: false });
        return;
      }

      set({ reviews: data || [], loading: false });
    } catch (error) {
      console.error('Error in fetchServiceReviews:', error);
      set({ loading: false });
    }
  },

  fetchSellerReviews: async (sellerId: string) => {
    try {
      set({ loading: true });
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          customer:users!customer_id(*)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching seller reviews:', error);
        set({ loading: false });
        return;
      }

      set({ reviews: data || [], loading: false });
    } catch (error) {
      console.error('Error in fetchSellerReviews:', error);
      set({ loading: false });
    }
  },

  createReview: async (review) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([{
          ...review,
          is_verified_purchase: true, // Set based on actual purchase
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating review:', error);
        return { success: false, error: error.message };
      }

      // Add to local state
      set(state => ({ reviews: [data, ...state.reviews] }));
      
      return { success: true };
    } catch (error: any) {
      console.error('Error in createReview:', error);
      return { success: false, error: error.message };
    }
  },

  updateReview: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating review:', error);
        return { success: false, error: error.message };
      }

      // Update local state
      set(state => ({
        reviews: state.reviews.map(r => r.id === id ? { ...r, ...updates } : r)
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateReview:', error);
      return { success: false, error: error.message };
    }
  },

  addSellerReply: async (reviewId: string, reply: string) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          seller_reply: reply,
          seller_reply_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);

      if (error) {
        console.error('Error adding seller reply:', error);
        return { success: false, error: error.message };
      }

      // Update local state
      set(state => ({
        reviews: state.reviews.map(r => 
          r.id === reviewId 
            ? { ...r, seller_reply: reply, seller_reply_date: new Date().toISOString() } 
            : r
        )
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in addSellerReply:', error);
      return { success: false, error: error.message };
    }
  },
}));
