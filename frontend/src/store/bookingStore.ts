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
  latitude?: number | null;
  longitude?: number | null;
  notes: string | null;
  total_amount: number;
  tax_amount?: number;
  payment_method?: string;
  payment_id?: string;
  payment_expires_at?: string;
  status: 'pending_payment' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  service?: any;
  seller?: any;
  customer?: any;
  timeline?: Array<{ status: string; created_at: string; notes?: string }>;
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
  rescheduleBooking: (id: string, newDate: string, newTime: string) => Promise<{ success: boolean; error?: string }>;
  confirmCompletion: (id: string) => Promise<{ success: boolean; error?: string }>;
  startService: (id: string) => Promise<{ success: boolean; error?: string }>;
  updatePaymentStatus: (id: string, paymentStatus: string, paymentId?: string) => Promise<{ success: boolean; error?: string }>;
  setSelectedBooking: (booking: Booking | null) => void;
  clearBookings: () => void;
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
          seller:sellers(
            *,
            user:users(name, email, phone)
          )
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
      
      // Fetch booking details
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          seller:sellers(
            *,
            user:users(name, email, phone, avatar_url)
          ),
          customer:users(name, email, phone)
        `)
        .eq('id', id)
        .single();

      if (bookingError) {
        console.error('Error fetching booking:', bookingError);
        set({ error: bookingError.message, loading: false });
        return;
      }

      // Fetch booking timeline
      const { data: timelineData, error: timelineError } = await supabase
        .from('booking_timeline')
        .select('*')
        .eq('booking_id', id)
        .order('created_at', { ascending: true });

      if (!timelineError && timelineData) {
        bookingData.timeline = timelineData;
      }

      set({ selectedBooking: bookingData, loading: false });
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
          customer:users(name, email, phone)
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
      set({ loading: true, error: null });
      
      // First create the booking
      const { data, error } = await supabase
        .from('bookings')
        .insert([{
          ...booking,
          status: 'pending_payment',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating booking:', error);
        set({ loading: false, error: error.message });
        return { success: false, error: error.message };
      }

      // Add timeline entry
      await supabase
        .from('booking_timeline')
        .insert([{
          booking_id: data.id,
          status: 'pending_payment',
          notes: 'Booking created, awaiting payment',
          created_at: new Date().toISOString(),
        }]);

      // Add to local state
      set(state => ({ 
        bookings: [data, ...state.bookings],
        selectedBooking: data,
        loading: false 
      }));
      
      return { success: true, booking: data };
    } catch (error: any) {
      console.error('Error in createBooking:', error);
      set({ loading: false, error: error.message });
      return { success: false, error: error.message };
    }
  },

  updateBookingStatus: async (id, status, reason) => {
    try {
      set({ loading: true });
      
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
        set({ loading: false });
        return { success: false, error: error.message };
      }

      // Add timeline entry
      await supabase
        .from('booking_timeline')
        .insert([{
          booking_id: id,
          status,
          notes: reason || `Booking status changed to ${status}`,
          created_at: new Date().toISOString(),
        }]);

      // Update local state
      set(state => ({
        bookings: state.bookings.map(b => 
          b.id === id ? { ...b, ...updates } : b
        ),
        selectedBooking: state.selectedBooking?.id === id 
          ? { ...state.selectedBooking, ...updates }
          : state.selectedBooking,
        loading: false
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in updateBookingStatus:', error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  cancelBooking: async (id, reason) => {
    return get().updateBookingStatus(id, 'cancelled', reason);
  },

  rescheduleBooking: async (id, newDate, newTime) => {
    try {
      set({ loading: true });
      
      const { error } = await supabase
        .from('bookings')
        .update({
          booking_date: newDate,
          booking_time: newTime,
          updated_at: new Date().toISOString(),
          status: 'pending', // Reset to pending for seller confirmation
        })
        .eq('id', id);

      if (error) {
        console.error('Error rescheduling booking:', error);
        set({ loading: false });
        return { success: false, error: error.message };
      }

      // Add timeline entry
      await supabase
        .from('booking_timeline')
        .insert([{
          booking_id: id,
          status: 'rescheduled',
          notes: `Rescheduled to ${newDate} at ${newTime}`,
          created_at: new Date().toISOString(),
        }]);

      // Update local state
      const updates = {
        booking_date: newDate,
        booking_time: newTime,
        status: 'pending',
      };
      
      set(state => ({
        bookings: state.bookings.map(b => 
          b.id === id ? { ...b, ...updates } : b
        ),
        selectedBooking: state.selectedBooking?.id === id 
          ? { ...state.selectedBooking, ...updates }
          : state.selectedBooking,
        loading: false
      }));

      return { success: true };
    } catch (error: any) {
      console.error('Error in rescheduleBooking:', error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  confirmCompletion: async (id) => {
    return get().updateBookingStatus(id, 'completed');
  },

  startService: async (id) => {
    return get().updateBookingStatus(id, 'in_progress');
  },

  updatePaymentStatus: async (id, paymentStatus, paymentId) => {
    try {
      set({ loading: true });
      
      let newStatus = 'pending';
      if (paymentStatus === 'success') {
        newStatus = 'pending'; // Waiting for seller confirmation
      } else if (paymentStatus === 'failed') {
        newStatus = 'cancelled';
      }

      const { error } = await supabase
        .from('bookings')
        .update({
          status: newStatus,
          payment_id: paymentId,
          payment_method: 'cashfree',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating payment status:', error);
        set({ loading: false });
        return { success: false, error: error.message };
      }

      // Add timeline entry
      await supabase
        .from('booking_timeline')
        .insert([{
          booking_id: id,
          status: paymentStatus === 'success' ? 'payment_received' : 'payment_failed',
          notes: paymentStatus === 'success' ? 'Payment received successfully' : 'Payment failed',
          created_at: new Date().toISOString(),
        }]);

      set({ loading: false });
      return { success: true };
    } catch (error: any) {
      console.error('Error in updatePaymentStatus:', error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  setSelectedBooking: (booking) => set({ selectedBooking: booking }),

  clearBookings: () => set({ bookings: [], selectedBooking: null, error: null }),
}));