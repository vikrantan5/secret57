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
    cancelled_at?: string | null;
  cancelled_by?: string | null;
  refund_method?: string | null;
  refund_status?: string | null;
  refund_upi_id?: string | null;
  refund_account_number?: string | null;
  refund_bank_ifsc?: string | null;
  refund_bank_name?: string | null;
  refund_account_holder_name?: string | null;
  refund_processed_at?: string | null;
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
      
      // ✅ CRITICAL FIX: Fetch service with beneficiary info for payout
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('id, seller_id, seller_bank_account_id, cashfree_bene_id, price')
        .eq('id', booking.service_id)
        .single();

      if (serviceError || !serviceData) {
        console.error('Error fetching service for booking:', serviceError);
        set({ loading: false, error: 'Service not found' });
        return { success: false, error: 'Service not found' };
      }

      // Prepare booking data with beneficiary info from service
      const bookingData: any = {
        ...booking,
        status: 'pending_payment',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // ✅ CRITICAL FIX: Copy beneficiary info from service to booking
      if (serviceData.cashfree_bene_id && serviceData.seller_bank_account_id) {
        bookingData.cashfree_bene_id = serviceData.cashfree_bene_id;
        bookingData.seller_bank_account_id = serviceData.seller_bank_account_id;
        bookingData.seller_payout_amount = booking.total_amount || serviceData.price;
        console.log('✅ Booking created with payout info from service:', {
          cashfree_bene_id: serviceData.cashfree_bene_id,
          seller_bank_account_id: serviceData.seller_bank_account_id
        });
      } else {
        console.warn('⚠️ Service missing beneficiary info. Payout will be fetched during payment.');
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
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
     try {
      set({ loading: true });
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates: any = {
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error cancelling booking:', error);
        set({ loading: false });
        return { success: false, error: error.message };
      }

      await supabase
        .from('booking_timeline')
        .insert([{
          booking_id: id,
          status: 'cancelled',
          notes: reason || 'Booking cancelled by customer',
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
      console.error('Error in cancelBooking:', error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  rescheduleBooking: async (id, newDate, newTime) => {
    try {
      set({ loading: true });
      
            // ✅ CRITICAL FIX: Fetch seller's bank account details for payout
      let updateData: any = {
          booking_date: newDate,
          booking_time: newTime,
          updated_at: new Date().toISOString(),
          status: 'pending',
            };

      if (paymentStatus === 'success' || paymentStatus === 'paid') {
        console.log('💰 Fetching seller bank account for future payout...');
        
        // Get booking to find seller_id
        const { data: bookingData, error: fetchError } = await supabase
          .from('bookings')
          .select('seller_id, total_amount')
          .eq('id', id)
          .single();

        if (!fetchError && bookingData) {
          // Get seller's primary verified bank account
          const { data: bankAccounts, error: bankError } = await supabase
            .from('seller_bank_accounts')
            .select('id, cashfree_bene_id')
            .eq('seller_id', bookingData.seller_id)
            .eq('is_primary', true)
            .eq('verification_status', 'verified')
            .limit(1);

          if (!bankError && bankAccounts && bankAccounts.length > 0) {
            const bankAccount = bankAccounts[0];
            updateData.cashfree_bene_id = bankAccount.cashfree_bene_id;
            updateData.seller_bank_account_id = bankAccount.id;
            updateData.seller_payout_amount = bookingData.total_amount; // Full amount for now, adjust if commission needed
            console.log('✅ Seller bank account stored for payout:', bankAccount.cashfree_bene_id);
          } else {
            console.warn('⚠️ No verified bank account found for seller. Payout will need manual setup.');
          }
        }
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
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
      
      // ✅ FIX: After payment, booking should be auto-confirmed (no seller confirmation needed)
      let newStatus = 'pending_payment';
      if (paymentStatus === 'success' || paymentStatus === 'paid') {
        newStatus = 'confirmed'; // Changed from 'pending' to 'confirmed'
      } else if (paymentStatus === 'failed') {
        newStatus = 'cancelled';
      }

      // ✅ CRITICAL FIX: Fetch seller's bank account details for payout
      let updateData: any = {
        status: newStatus,
        payment_id: paymentId,
        payment_method: 'cashfree',
        payment_status: paymentStatus === 'success' || paymentStatus === 'paid' ? 'paid' : 'failed',
        updated_at: new Date().toISOString(),
      };

      if (paymentStatus === 'success' || paymentStatus === 'paid') {
        console.log('💰 Fetching seller bank account for future payout...');
        
        // Get booking to find seller_id
        const { data: bookingData, error: fetchError } = await supabase
          .from('bookings')
          .select('seller_id, total_amount')
          .eq('id', id)
          .single();

        if (!fetchError && bookingData) {
          // Get seller's primary verified bank account
          const { data: bankAccounts, error: bankError } = await supabase
            .from('seller_bank_accounts')
            .select('id, cashfree_bene_id')
            .eq('seller_id', bookingData.seller_id)
            .eq('is_primary', true)
            .eq('verification_status', 'verified')
            .limit(1);

          if (!bankError && bankAccounts && bankAccounts.length > 0) {
            const bankAccount = bankAccounts[0];
            updateData.cashfree_bene_id = bankAccount.cashfree_bene_id;
            updateData.seller_bank_account_id = bankAccount.id;
            updateData.seller_payout_amount = bookingData.total_amount; // Full amount for now, adjust if commission needed
            console.log('✅ Seller bank account stored for payout:', bankAccount.cashfree_bene_id);
          } else {
            console.warn('⚠️ No verified bank account found for seller. Payout will need manual setup.');
          }
        }
      }

      console.log('📝 Updating booking payment status...');
      console.log('Update data:', JSON.stringify(updateData, null, 2));
      
      const { data: updatedBooking, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating payment status:', error);
        console.error('Error details:', error.message, error.details, error.hint);
        set({ loading: false });
        return { success: false, error: error.message };
      }

      console.log(`✅ Booking ${id} payment status updated: ${paymentStatus} -> ${newStatus}`);
      console.log('Updated booking data:', JSON.stringify(updatedBooking, null, 2));

        const { error: timelineError } = await supabase
        .from('booking_timeline')
        .insert([{
          booking_id: id,
          status: paymentStatus === 'success' || paymentStatus === 'paid' ? 'payment_received' : 'payment_failed',
          notes: paymentStatus === 'success' || paymentStatus === 'paid' ? 'Payment received successfully, awaiting seller confirmation' : 'Payment failed',
          created_at: new Date().toISOString(),
        }]);
      
      if (timelineError) {
        console.warn('⚠️ Timeline insert failed (non-critical):', timelineError.message);
      } else {
        console.log('✅ Booking timeline updated');
           }

      // ✅ Send notifications to seller
      if (paymentStatus === 'success' || paymentStatus === 'paid') {
        console.log('📧 Sending notifications...');
        
        // Get booking data for notification
        const { data: bookingForNotif } = await supabase
          .from('bookings')
          .select('seller_id, customer_name')
          .eq('id', id)
          .single();

        if (bookingForNotif) {
          // Get seller user_id
          const { data: sellerData } = await supabase
            .from('sellers')
            .select('user_id')
            .eq('id', bookingForNotif.seller_id)
            .single();

          if (sellerData) {
            await supabase
              .from('notifications')
              .insert({
                user_id: sellerData.user_id,
                type: 'booking',
                title: '💰 New Paid Booking',
                message: `${bookingForNotif.customer_name || 'A customer'} has booked your service and paid successfully!`,
                data: { booking_id: id },
                created_at: new Date().toISOString()
              });
            console.log('✅ Seller notified');
          }
        }
      }




            // ✅ CRITICAL FIX: Generate OTP after successful payment
      if (paymentStatus === 'success' || paymentStatus === 'paid') {
        console.log('🔐 Generating OTP for booking after successful payment...');
        
        try {
            // Use service role key for edge function authentication
          const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
          const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-otp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
               'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({
              type: 'booking',
              id: id
            })
          });

                    // Log response status for debugging
          console.log('OTP API Response Status:', response.status);
          
          // Check if response is OK
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ OTP API Error Response:', errorText);
            throw new Error(`OTP generation failed with status ${response.status}: ${errorText}`);
          }

          const otpResult = await response.json();
            console.log('OTP API Result:', JSON.stringify(otpResult, null, 2));

          if (otpResult.success) {
            console.log('✅ OTP generated and sent to customer:', otpResult.otp);
          } else {
              console.error('❌ Failed to generate OTP:', otpResult.error || 'Unknown error');
            console.error('Full OTP result:', otpResult);
            // Don't fail the payment update, just log the error
          }
        } catch (otpError: any) {
          console.error('❌ Exception generating OTP:', otpError.message);
             console.error('OTP Error details:', otpError);
          // Don't fail the payment update, just log the error
        }
      }

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
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }


      
      // ✅ CRITICAL: Check if booking is cancelled - block OTP verification
      const { data: bookingCheck, error: checkError } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', bookingId)
        .single();

      if (checkError) {
        console.error('Error checking booking status:', checkError);
        set({ loading: false, error: 'Failed to check booking status' });
        return { success: false, error: 'Failed to check booking status' };
      }

      if (bookingCheck?.status === 'cancelled') {
        console.log('❌ Booking is cancelled - OTP verification blocked');
        set({ loading: false, error: 'Cannot verify OTP for a cancelled booking' });
        return { 
          success: false, 
          error: 'Cannot verify OTP for a cancelled booking' 
        };
      }
       // Use service role key for edge function authentication
      const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

      // Call the verify-service-otp edge function
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/verify-service-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
           'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({
          booking_id: bookingId,
          otp: otp,
          user_id: user.id
        })
      });

      const result = await response.json();

      if (!result.success) {
        set({ loading: false, error: result.error });
        return { success: false, error: result.error };
      }

      console.log('✅ OTP verified successfully. Payout triggered:', result.payout_triggered);

      // Refresh booking data
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
   setSelectedBooking: (booking) => set({ selectedBooking: booking }),
}));
