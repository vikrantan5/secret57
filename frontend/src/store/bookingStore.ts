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
  cashfree_order_id?: string;
  otp?: string;
  otp_verified?: boolean;
  otp_generated_at?: string;
  payout_status?: string;
  status: 'pending_payment' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  cancellation_reason: string | null;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
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
  verifyOTP: (bookingId: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
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
            user:users!sellers_user_id_fkey(name, email, phone)
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
       // Fetch booking with service and seller info
      // Customer info is stored directly in bookings table (denormalized)
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*),
          seller:sellers(
            *,
             user:users!sellers_user_id_fkey(name, email, phone, avatar_url)
        )
        `)
        .eq('id', id)
        .single();

      if (bookingError) {
        console.error('Error fetching booking:', bookingError);
        set({ error: bookingError.message, loading: false });
        return;
      }

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
       // Select customer info directly from bookings table (denormalized)
      // This avoids RLS issues with joining users table
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(*)
        `)
        .eq('seller_id', sellerId)
        .order('booking_date', { ascending: false });

      if (error) {
        console.error('Error fetching seller bookings:', error);
        set({ error: error.message, loading: false });
        return;
      }

      // Customer data is now stored directly in bookings table
      // No need to map from joined customer data
      set({ bookings: data || [], loading: false });
    } catch (error: any) {
      console.error('Error in fetchSellerBookings:', error);
      set({ error: error.message, loading: false });
    }
  },

  createBooking: async (booking) => {
    try {
      set({ loading: true, error: null });
      
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

      await supabase
        .from('booking_timeline')
        .insert([{
          booking_id: data.id,
          status: 'pending_payment',
          notes: 'Booking created, awaiting payment',
          created_at: new Date().toISOString(),
        }]);

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

      await supabase
        .from('booking_timeline')
        .insert([{
          booking_id: id,
          status,
          notes: reason || `Booking status changed to ${status}`,
          created_at: new Date().toISOString(),
        }]);

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
          status: 'pending',
        })
        .eq('id', id);

      if (error) {
        console.error('Error rescheduling booking:', error);
        set({ loading: false });
        return { success: false, error: error.message };
      }

      await supabase
        .from('booking_timeline')
        .insert([{
          booking_id: id,
          status: 'rescheduled',
          notes: `Rescheduled to ${newDate} at ${newTime}`,
          created_at: new Date().toISOString(),
        }]);

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
      
      let newStatus = 'pending_payment';
      if (paymentStatus === 'success' || paymentStatus === 'paid') {
        newStatus = 'pending';
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

      console.log(`✅ Booking ${id} payment status updated: ${paymentStatus} -> ${newStatus}`);

      await supabase
        .from('booking_timeline')
        .insert([{
          booking_id: id,
          status: paymentStatus === 'success' || paymentStatus === 'paid' ? 'payment_received' : 'payment_failed',
          notes: paymentStatus === 'success' || paymentStatus === 'paid' ? 'Payment received successfully, awaiting seller confirmation' : 'Payment failed',
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

  verifyOTP: async (bookingId, otp) => {
    set({ loading: true, error: null });

    try {
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*, seller:sellers(id, user_id)')
        .eq('id', bookingId)
        .single();

      if (fetchError) throw fetchError;
      if (!booking) throw new Error('Booking not found');

      if (booking.otp !== otp) {
        set({ loading: false, error: 'Invalid OTP' });
        return { success: false, error: 'Invalid OTP. Please check and try again.' };
      }

      if (booking.otp_verified) {
        set({ loading: false });
        return { success: false, error: 'OTP has already been verified.' };
      }

      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'completed',
          otp_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      await supabase
        .from('notifications')
        .insert({
          user_id: booking.customer_id,
          type: 'booking',
          title: 'Service Completed',
          message: 'Your service has been completed successfully. Thank you for using our platform!',
          data: { booking_id: bookingId }
        });

      // ✅ FIXED: Payout will be handled by backend database trigger or webhook
      // Removed frontend payout trigger to prevent JWT errors
      console.log('✅ Service completed. Payout will be processed by backend.');

      await get().fetchBookingById(bookingId);

      set({ loading: false });
      return { success: true };
    } catch (error: any) {
      console.error('Failed to verify OTP:', error);
      set({ loading: false, error: error.message });
      return { success: false, error: error.message };
    }
  },

  clearError: () => set({ error: null }),
}));
