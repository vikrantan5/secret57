// Verify Service Completion OTP for Bookings
// This function verifies the OTP and triggers instant payout
// FIXED v2: Using Supabase client's functions.invoke() for proper authentication

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { booking_id, otp, user_id } = await req.json();

    console.log('=== Verify Service OTP ===');
    console.log('Booking ID:', booking_id);
    console.log('OTP:', otp);
    console.log('User ID:', user_id);

    if (!booking_id || !otp) {
      return new Response(
        JSON.stringify({ success: false, error: 'Booking ID and OTP are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError);
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already verified
    if (booking.otp_verified) {
      return new Response(
        JSON.stringify({ success: false, error: 'Service already verified as completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check OTP attempts
    if (booking.otp_attempts >= 3) {
      return new Response(
        JSON.stringify({ success: false, error: 'Maximum OTP attempts exceeded' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify OTP - Convert both to strings and trim whitespace for comparison
    const storedOTP = String(booking.otp || '').trim();
    const inputOTP = String(otp || '').trim();
    
    console.log('🔍 OTP Comparison Debug:');
    console.log('  Stored OTP:', storedOTP, '(type:', typeof booking.otp, ')');
    console.log('  Input OTP:', inputOTP, '(type:', typeof otp, ')');
    console.log('  Match:', storedOTP === inputOTP);
    
    if (storedOTP !== inputOTP) {
      // Increment OTP attempts
      await supabase
        .from('bookings')
        .update({ otp_attempts: (booking.otp_attempts || 0) + 1 })
        .eq('id', booking_id);

      console.error('❌ OTP Mismatch!');
      console.error('  Expected:', storedOTP);
      console.error('  Received:', inputOTP);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid OTP',
          attempts_remaining: 3 - (booking.otp_attempts || 0) - 1
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OTP is correct - Mark as verified and completed
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        otp_verified: true,
        otp_verified_at: new Date().toISOString(),
        otp_verified_by: user_id,
        status: 'completed',
        payment_status: 'paid',
        payout_status: 'processing'
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('Failed to update booking:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify service completion' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Service OTP verified successfully');

    // TRIGGER INSTANT PAYOUT - METHOD 2: Using Supabase Functions.invoke()
    console.log('🚀 Triggering instant payout via Supabase client...');
    
    let payoutTriggered = false;
    let payoutData: any = null;
    let payoutError = null;

    try {
      // ✅ FIX v2: Use Supabase client's functions.invoke() instead of fetch
      // This properly handles authentication and environment variable access
      const { data: payoutResult, error: payoutFunctionError } = await supabase.functions.invoke(
        'auto-payout-trigger',
        {
          body: {
            booking_id: booking_id,
            trigger_type: 'immediate'
          }
        }
      );

      console.log('Payout function invoke result:', JSON.stringify({ data: payoutResult, error: payoutFunctionError }, null, 2));

      if (payoutFunctionError) {
        console.error('❌ Payout function error:', payoutFunctionError);
        payoutError = `Payout function error: ${payoutFunctionError.message || JSON.stringify(payoutFunctionError)}`;
      } else if (payoutResult) {
        console.log('✅ Payout response:', JSON.stringify(payoutResult, null, 2));
        
        payoutData = payoutResult.data;
        payoutTriggered = payoutResult.success === true;
        
        if (!payoutTriggered) {
          payoutError = payoutResult.error || 'Payout failed for unknown reason';
          console.error('❌ Payout trigger failed:', payoutError);
          console.error('Full payout result:', payoutResult);
        } else {
          console.log('💰 Payout successfully triggered!');
          console.log('Payouts processed:', payoutData?.successful_payouts || 0);
        }
      } else {
        payoutError = 'No response from payout function';
        console.error('❌ No response from payout function');
      }
    } catch (payoutErr: any) {
      console.error('❌ Exception calling payout trigger:', payoutErr.message);
      console.error('Stack:', payoutErr.stack);
      payoutError = `Exception: ${payoutErr.message}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: payoutTriggered 
          ? 'Service completion verified. Payout has been triggered successfully!' 
          : 'Service completion verified. Payout could not be processed automatically.',
        payout_triggered: payoutTriggered,
        payout_data: payoutData,
        payout_error: payoutError
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Exception in verify-service-otp:', error.message);
    console.error('Stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
