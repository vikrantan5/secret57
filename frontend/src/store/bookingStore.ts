import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface Booking {
  id: string;
  customer_id: string;
  seller_id: string;
  service_id: string;
  booking_date: string;
  booking_time: string;
  location_type: 'visit_customer' | 'customer_visits';
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  notes: string | null;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rejected';
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  service?: any;
  seller?: any;
}

interface BookingState {
  bookings: Booking[];
  selectedBooking: Booking | null;
  loading: boolean;
  error: string | null;
  
  fetchBookings: (userId: string) => Promise<void>;
  fetchBookingById: (id: string) => Promise<void>;
  fetchSellerBookings: (sellerId: string) => Promise<void>;
  createBooking: (booking: Partial<Booking>) => Promise<{ success: boolean; error?: string; booking?: Booking }>;
  updateBookingStatus: (id: string, status: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  cancelBooking: (id: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  setSelectedBooking: (booking: Booking | null) => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  selectedBooking: null,
  loading: false,
  error: null,

  fetchBookings: async (userId: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          seller:sellers(*)
        `)
        .eq('customer_id', userId)
        .order('booking_date', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        set({ error: error.message, loading: false });
        return;
      }

      set({ bookings: data || [], loading: false });
    } catch (error: any) {
      console.error('Error in fetchBookings:', error);
      set({ error: error.message, loading: false });
    }
  },

  fetchBookingById: async (id: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          seller:sellers(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching booking:', error);
        set({ error: error.message, loading: false });
        return;
      }

      set({ selectedBooking: data, loading: false });
    } catch (error: any) {
      console.error('Error in fetchBookingById:', error);
      set({ error: error.message, loading: false });
    }
  },

  fetchSellerBookings: async (sellerId: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          customer:users(*)
        `)
        .eq('seller_id', sellerId)
        .order('booking_date', { ascending: false });

      if (error) {
        console.error('Error fetching seller bookings:', error);
        set({ error: error.message, loading: false });
        return;
      }

      set({ bookings: data || [], loading: false });
    } catch (error: any) {
      console.error('Error in fetchSellerBookings:', error);
      set({ error: error.message, loading: false });
    }
  },

  createBooking: async (booking) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([{
          ...booking,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating booking:', error);
        return { success: false, error: error.message };
      }

      // Add to local state
      set(state => ({ bookings: [data, ...state.bookings] }));
      
      return { success: true, booking: data };
    } catch (error: any) {
      console.error('Error in createBooking:', error);
      return { success: false, error: error.message };
    }
  },

  updateBookingStatus: async (id, status, reason) => {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'cancelled' || status === 'rejected') {
        updates.cancellation_reason = reason;
      }

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating booking status:', error);
        return { success: false, error: error.message };
      }

      // Update local state
      set(state => ({
        bookings: state.bookings.map(b => 
          b.id === id ? { ...b, ...updates } : b
        )
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateBookingStatus:', error);
      return { success: false, error: error.message };
    }
  },

  
  cancelBooking: async (id, reason) => {
    return get().updateBookingStatus(id, 'cancelled', reason);
  },

  setSelectedBooking: (booking) => set({ selectedBooking: booking }),
}));