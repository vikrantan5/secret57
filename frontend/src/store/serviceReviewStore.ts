import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface ServiceReview {
  id: string;
  service_id: string;
  user_id: string;
  booking_id: string;
  rating: number;
  review: string;
  created_at: string;
  updated_at?: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  service?: any;
}

interface ServiceReviewState {
  reviews: ServiceReview[];
  loading: boolean;
  error: string | null;

  fetchServiceReviews: (serviceId: string) => Promise<ServiceReview[]>;
  fetchAllServiceReviews: () => Promise<void>;
  canUserReview: (serviceId: string, userId: string) => Promise<{ eligible: boolean; bookingId?: string; reason?: string }>;
  createServiceReview: (data: {
    service_id: string;
    user_id: string;
    booking_id: string;
    rating: number;
    review: string;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteServiceReview: (id: string) => Promise<{ success: boolean; error?: string }>;
  getAverageRating: (serviceId: string) => Promise<{ average: number; count: number }>;
}

export const useServiceReviewStore = create<ServiceReviewState>((set, get) => ({
  reviews: [],
  loading: false,
  error: null,

  fetchServiceReviews: async (serviceId) => {
    try {
      set({ loading: true, error: null });
      console.log('[ServiceReviews] Fetching for service:', serviceId);

      const { data, error } = await supabase
        .from('service_reviews')
        .select(`
          *,
          user:users!service_reviews_user_id_fkey(id, name, avatar_url)
        `)
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ServiceReviews] fetch error:', error);
        set({ error: error.message, loading: false });
        return [];
      }

      const reviews = data || [];
      set({ reviews, loading: false });
      console.log('[ServiceReviews] Fetched count:', reviews.length);
      return reviews as ServiceReview[];
    } catch (e: any) {
      console.error('[ServiceReviews] fetchServiceReviews exception:', e);
      set({ error: e.message, loading: false });
      return [];
    }
  },

  fetchAllServiceReviews: async () => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase
        .from('service_reviews')
        .select(`
          *,
          user:users!service_reviews_user_id_fkey(id, name, avatar_url, email),
          service:services!service_reviews_service_id_fkey(id, name, images)
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

  canUserReview: async (serviceId, userId) => {
    try {
      console.log('[ServiceReviews] Checking review eligibility', { serviceId, userId });

      // Find completed/paid bookings for this service & user
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, customer_id, service_id, status, payment_status')
        .eq('service_id', serviceId)
        .eq('customer_id', userId);

      if (error) {
        console.error('[ServiceReviews] eligibility query error:', error);
        return { eligible: false, reason: 'Unable to verify booking' };
      }

      const validBooking = (bookings || []).find(
        (b: any) =>
          (b.status === 'completed' || b.status === 'delivered') &&
          (b.payment_status === 'paid' || b.payment_status === 'completed')
      );

      if (!validBooking) {
        return {
          eligible: false,
          reason: 'You can review only after your service booking is completed and paid',
        };
      }

      // Check duplicate review for that booking
      const { data: existing } = await supabase
        .from('service_reviews')
        .select('id')
        .eq('service_id', serviceId)
        .eq('user_id', userId)
        .eq('booking_id', validBooking.id)
        .maybeSingle();

      if (existing) {
        return { eligible: false, reason: 'You have already reviewed this service booking' };
      }

      return { eligible: true, bookingId: validBooking.id };
    } catch (e: any) {
      console.error('[ServiceReviews] canUserReview exception:', e);
      return { eligible: false, reason: e.message };
    }
  },

  createServiceReview: async ({ service_id, user_id, booking_id, rating, review }) => {
    try {
      console.log('[ServiceReviews] Creating review', { service_id, user_id, booking_id, rating });

      if (rating < 1 || rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5' };
      }
      if (!review || review.trim().length < 3) {
        return { success: false, error: 'Please write a review (at least 3 characters)' };
      }

      const { data, error } = await supabase
        .from('service_reviews')
        .insert([{
          service_id,
          user_id,
          booking_id,
          rating,
          review: review.trim(),
        }])
        .select(`
          *,
          user:users!service_reviews_user_id_fkey(id, name, avatar_url)
        `)
        .single();

      if (error) {
        console.error('[ServiceReviews] create error:', error);
        if (error.code === '23505') {
          return { success: false, error: 'You have already reviewed this service booking' };
        }
        return { success: false, error: error.message };
      }

      console.log('[ServiceReviews] Created successfully:', data?.id);
      set(state => ({ reviews: [data, ...state.reviews] }));
      return { success: true };
    } catch (e: any) {
      console.error('[ServiceReviews] createServiceReview exception:', e);
      return { success: false, error: e.message };
    }
  },

  deleteServiceReview: async (id) => {
    try {
      console.log('[ServiceReviews] Deleting review:', id);
      const { error } = await supabase.from('service_reviews').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      set(state => ({ reviews: state.reviews.filter(r => r.id !== id) }));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  getAverageRating: async (serviceId) => {
    try {
      const { data, error } = await supabase
        .from('service_reviews')
        .select('rating')
        .eq('service_id', serviceId);

      if (error || !data) return { average: 0, count: 0 };
      if (data.length === 0) return { average: 0, count: 0 };
      const sum = data.reduce((acc, r: any) => acc + (r.rating || 0), 0);
      return { average: Number((sum / data.length).toFixed(1)), count: data.length };
    } catch {
      return { average: 0, count: 0 };
    }
  },
}));
