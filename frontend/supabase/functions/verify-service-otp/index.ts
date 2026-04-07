// Verify Service Completion OTP for Bookings
// This function verifies the OTP and triggers instant payout
// FIXED v4: Using direct fetch() with the actual JWT service role key
// Root cause: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') returns an internal
// Edge Functions secret (sb_secret_...) NOT the JWT (eyJ...). The Supabase
// gateway requires a valid JWT in the Authorization header for function-to-function calls.
// Solution: Store the real JWT as a custom secret SERVICE_ROLE_JWT.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// The actual JWT service role key for inter-function Authorization header
// Set via: supabase secrets set SERVICE_ROLE_JWT=eyJ...
// Falls back to SUPABASE_SERVICE_ROLE_KEY if not set (but will fail if that's not a JWT)
const SERVICE_ROLE_JWT = Deno.env.get('SERVICE_ROLE_JWT') || SUPABASE_SERVICE_ROLE_KEY;

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

    console.log('=== Verify Service OTP (v4) ===');
    console.log('Booking ID:', booking_id);
    console.log('OTP:', otp);
    console.log('User ID:', user_id);
    console.log('SERVICE_ROLE_JWT starts with:', SERVICE_ROLE_JWT.substring(0, 10));
    console.log('SUPABASE_SERVICE_ROLE_KEY starts with:', SUPABASE_SERVICE_ROLE_KEY.substring(0, 10));

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

    // Verify OTP
    const storedOTP = String(booking.otp || '').trim();
    const inputOTP = String(otp || '').trim();
    
    console.log('OTP Comparison Debug:');
    console.log('  Stored OTP:', storedOTP, '(type:', typeof booking.otp, ')');
    console.log('  Input OTP:', inputOTP, '(type:', typeof otp, ')');
    console.log('  Match:', storedOTP === inputOTP);
    
    if (storedOTP !== inputOTP) {
      await supabase
        .from('bookings')
        .update({ otp_attempts: (booking.otp_attempts || 0) + 1 })
        .eq('id', booking_id);

      console.error('OTP Mismatch! Expected:', storedOTP, 'Received:', inputOTP);

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

    console.log('Service OTP verified successfully');

    // ============================================================
    // TRIGGER INSTANT PAYOUT - FIXED v4
    // Uses SERVICE_ROLE_JWT (the actual eyJ... JWT) for Authorization
    // NOT SUPABASE_SERVICE_ROLE_KEY (which is sb_secret_... inside Edge Functions)
    // ============================================================
    console.log('Triggering instant payout via direct fetch with JWT...');
    
    let payoutTriggered = false;
    let payoutData: any = null;
    let payoutError = null;

    try {
      const payoutUrl = `${SUPABASE_URL}/functions/v1/auto-payout-trigger`;
      const payoutBody = JSON.stringify({
        booking_id: booking_id,
        trigger_type: 'immediate'
      });

      const payoutHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_JWT}`,
        'apikey': SERVICE_ROLE_JWT
      };

      // === Payout Trigger Fetch Debug ===
      console.log('=== Payout Trigger Fetch ===');
      console.log('URL:', payoutUrl);
      console.log('Auth token starts with:', SERVICE_ROLE_JWT.substring(0, 20));
      console.log('Is JWT format (starts with eyJ):', SERVICE_ROLE_JWT.startsWith('eyJ'));
      console.log('Body:', payoutBody);

      const payoutResponse = await fetch(payoutUrl, {
        method: 'POST',
        headers: payoutHeaders,
        body: payoutBody
      });

      const responseStatus = payoutResponse.status;
      const responseText = await payoutResponse.text();

      console.log('Response status:', responseStatus);
      console.log('Response body:', responseText);

      let payoutResult: any;
      try {
        payoutResult = JSON.parse(responseText);
      } catch {
        console.error('Failed to parse payout response as JSON:', responseText);
        payoutError = `Non-JSON response (status ${responseStatus}): ${responseText.substring(0, 200)}`;
        payoutResult = null;
      }

      if (responseStatus === 401) {
        console.error('401 Error - Token used starts with:', SERVICE_ROLE_JWT.substring(0, 15));
        console.error('Ensure SERVICE_ROLE_JWT secret is set to the actual JWT (eyJ...)');
        payoutError = `Auth error (401): ${responseText}. Check SERVICE_ROLE_JWT secret.`;
      } else if (responseStatus !== 200) {
        console.error(`Payout returned status ${responseStatus}:`, responseText);
        payoutError = `Payout HTTP ${responseStatus}: ${payoutResult?.error || responseText.substring(0, 200)}`;
      } else if (payoutResult) {
        console.log('Payout response parsed:', JSON.stringify(payoutResult, null, 2));
        
        payoutData = payoutResult.data;
        payoutTriggered = payoutResult.success === true;
        
        if (!payoutTriggered) {
          payoutError = payoutResult.error || 'Payout failed for unknown reason';
          console.error('Payout trigger failed:', payoutError);
        } else {
          console.log('Payout successfully triggered!');
          console.log('Payouts processed:', payoutData?.successful_payouts || 0);
        }
      } else {
        payoutError = 'Empty response from payout function';
      }
    } catch (payoutErr: any) {
      console.error('Exception calling payout trigger:', payoutErr.message);
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
    console.error('Exception in verify-service-otp:', error.message);
    console.error('Stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
