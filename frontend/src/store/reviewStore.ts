import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface Review {
  id: string;
  customer_id: string;
  seller_id: string;
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
  productReviews: { [key: string]: Review[] };
  loading: boolean;
  error: string | null;
  
  fetchProductReviews: (productId: string) => Promise<void>;
  fetchServiceReviews: (serviceId: string) => Promise<void>;
  fetchSellerReviews: (sellerId: string) => Promise<void>;
  createReview: (review: Partial<Review>) => Promise<{ success: boolean; error?: string }>;
  updateReview: (id: string, updates: Partial<Review>) => Promise<{ success: boolean; error?: string }>;
  addSellerReply: (reviewId: string, reply: string) => Promise<{ success: boolean; error?: string }>;
  calculateAverageRating: (reviews: Review[]) => number;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: [],
  productReviews: {},
  loading: false,
  error: null,

  fetchProductReviews: async (productId: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          customer:users(id, name, avatar_url)
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching product reviews:', error);
        set({ error: error.message, loading: false });
        return;
      }

      set(state => ({
        productReviews: {
          ...state.productReviews,
          [productId]: data || [],
        },
        reviews: data || [],
        loading: false,
      }));
    } catch (error: any) {
      console.error('Error in fetchProductReviews:', error);
      set({ error: error.message, loading: false });
    }
  },

  fetchServiceReviews: async (serviceId: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          customer:users(id, name, avatar_url)
        `)
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching service reviews:', error);
        set({ error: error.message, loading: false });
        return;
      }

      set({ reviews: data || [], loading: false });
    } catch (error: any) {
      console.error('Error in fetchServiceReviews:', error);
      set({ error: error.message, loading: false });
    }
  },

  fetchSellerReviews: async (sellerId: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          customer:users(id, name, avatar_url)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching seller reviews:', error);
        set({ error: error.message, loading: false });
        return;
      }

      set({ reviews: data || [], loading: false });
    } catch (error: any) {
      console.error('Error in fetchSellerReviews:', error);
      set({ error: error.message, loading: false });
    }
  },

  createReview: async (review) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([{
          ...review,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating review:', error);
        return { success: false, error: error.message };
      }

      // Send notification to seller
      if (review.seller_id) {
        const { data: seller } = await supabase
          .from('sellers')
          .select('user_id')
          .eq('id', review.seller_id)
          .single();

        if (seller) {
          await supabase
            .from('notifications')
            .insert([{
              user_id: seller.user_id,
              type: 'review',
              title: 'New Review Received',
              message: `You received a ${review.rating}-star review`,
              data: { reviewId: data.id },
            }]);
        }
      }

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

      set(state => ({
        reviews: state.reviews.map(r => r.id === id ? { ...r, ...updates } : r)
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateReview:', error);
      return { success: false, error: error.message };
    }
  },

  addSellerReply: async (reviewId, reply) => {
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

      // Get review to send notification
      const { data: review } = await supabase
        .from('reviews')
        .select('customer_id')
        .eq('id', reviewId)
        .single();

      if (review) {
        await supabase
          .from('notifications')
          .insert([{
            user_id: review.customer_id,
            type: 'review',
            title: 'Seller Replied to Your Review',
            message: 'The seller has responded to your review',
            data: { reviewId },
          }]);
      }

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

  calculateAverageRating: (reviews: Review[]) => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return Number((sum / reviews.length).toFixed(1));
  },
}));
