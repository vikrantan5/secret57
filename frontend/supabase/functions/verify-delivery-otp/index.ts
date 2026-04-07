// Verify Delivery OTP for Product Orders
// FIXED v5: Use SERVICE_ROLE_JWT for the Supabase client (not SUPABASE_SERVICE_ROLE_KEY)
//
// ROOT CAUSE OF \"Invalid OTP\" BUG:
// -----------------------------------
// Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') inside Edge Functions returns an
// internal secret (sb_secret_...), NOT the JWT (eyJ...). When the Supabase JS
// client is created with this internal secret, database queries may:
//   a) Fail silently and return rows with NULL/missing column values
//   b) Not bypass RLS properly, causing the query to return empty results
//
// FIX: Use SERVICE_ROLE_JWT (the real JWT set via `supabase secrets set`)
// to create the Supabase client. This ensures proper authentication and
// RLS bypass for database operations.
//
// ADDITIONAL FIXES:
// - Robust null/undefined checking for delivery_otp
// - String-cast both sides for comparison
// - Full debug logging for every step
// - Proper error messages with diagnostic info

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// The actual JWT service role key for proper DB access and inter-function calls
// Set via: supabase secrets set SERVICE_ROLE_JWT=eyJ...
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
    // ==========================================
    // STEP 1: Parse request body
    // ==========================================
    let body: any;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error('Failed to parse request body:', parseErr);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body - JSON parsing failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order_id, otp, user_id } = body;

    console.log('=== Verify Delivery OTP (v5 - FIXED) ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Order ID:', order_id);
    console.log('Input OTP:', otp);
    console.log('Input OTP type:', typeof otp);
    console.log('User ID:', user_id);
    console.log('Raw request body keys:', Object.keys(body));
    console.log('SERVICE_ROLE_JWT available:', !!SERVICE_ROLE_JWT);
    console.log('SERVICE_ROLE_JWT starts with eyJ:', SERVICE_ROLE_JWT?.startsWith('eyJ'));
    console.log('SUPABASE_SERVICE_ROLE_KEY starts with:', SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10));

    // ==========================================
    // STEP 2: Validate required fields
    // ==========================================
    if (!order_id) {
      console.error('Missing order_id in request');
      return new Response(
        JSON.stringify({ success: false, error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!otp) {
      console.error('Missing otp in request');
      return new Response(
        JSON.stringify({ success: false, error: 'OTP is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // STEP 3: Create Supabase client with the REAL JWT key
    // THIS IS THE CRITICAL FIX - use SERVICE_ROLE_JWT not SUPABASE_SERVICE_ROLE_KEY
    // ==========================================
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_JWT);
    console.log('Supabase client created with SERVICE_ROLE_JWT');

    // ==========================================
    // STEP 4: Fetch order from database
    // ==========================================
    console.log('Fetching order with ID:', order_id);
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError) {
      console.error('Database error fetching order:', JSON.stringify(orderError));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Order not found',
          debug: {
            db_error: orderError.message,
            db_code: orderError.code,
            order_id: order_id
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!order) {
      console.error('Order query returned null for ID:', order_id);
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found - null result' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // STEP 5: Log full order data for debugging
    // ==========================================
    console.log('Order found. Key fields:');
    console.log('  order.id:', order.id);
    console.log('  order.order_number:', order.order_number);
    console.log('  order.status:', order.status);
    console.log('  order.delivery_otp:', order.delivery_otp);
    console.log('  order.delivery_otp type:', typeof order.delivery_otp);
    console.log('  order.delivery_otp_verified:', order.delivery_otp_verified);
    console.log('  order.otp_attempts:', order.otp_attempts);
    console.log('  order.otp_verified:', order.otp_verified);
    console.log('  All order keys:', Object.keys(order));

    // ==========================================
    // STEP 6: Check if already verified
    // ==========================================
    if (order.delivery_otp_verified === true) {
      console.log('Order already verified');
      return new Response(
        JSON.stringify({ success: false, error: 'Delivery already verified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // STEP 7: Check OTP attempts (max 3)
    // ==========================================
    const currentAttempts = Number(order.otp_attempts) || 0;
    if (currentAttempts >= 3) {
      console.log('Max OTP attempts exceeded:', currentAttempts);
      return new Response(
        JSON.stringify({ success: false, error: 'Maximum OTP attempts exceeded. Please request a new OTP.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // STEP 8: OTP Comparison (THE CRITICAL PART)
    // ==========================================
    
    // Check if delivery_otp exists in the order
    if (order.delivery_otp === null || order.delivery_otp === undefined) {
      console.error('CRITICAL: delivery_otp is NULL or undefined in the database!');
      console.error('This means either:');
      console.error('  1. The delivery_otp column does not exist on the orders table');
      console.error('  2. The OTP was never generated for this order');
      console.error('  3. The OTP was cleared by another update');
      console.error('  4. RLS is blocking the read of this column');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No OTP found for this order. Please generate a new OTP by marking the order as delivered again.',
          debug: {
            delivery_otp_value: order.delivery_otp,
            delivery_otp_type: typeof order.delivery_otp,
            has_column: 'delivery_otp' in order
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cast BOTH sides to string and trim whitespace
    const storedOTP = String(order.delivery_otp).trim();
    const inputOTP = String(otp).trim();

    console.log('=== OTP Comparison ===');
    console.log('  Stored OTP (from DB):', JSON.stringify(storedOTP));
    console.log('  Stored OTP length:', storedOTP.length);
    console.log('  Input OTP (from user):', JSON.stringify(inputOTP));
    console.log('  Input OTP length:', inputOTP.length);
    console.log('  Strict equality:', storedOTP === inputOTP);
    console.log('  Char-by-char match:', [...storedOTP].map((c, i) => `${c}==${inputOTP[i]}: ${c === inputOTP[i]}`).join(', '));

    if (storedOTP !== inputOTP) {
      // Increment attempts
      const newAttempts = currentAttempts + 1;
      const { error: attemptError } = await supabase
        .from('orders')
        .update({ otp_attempts: newAttempts })
        .eq('id', order_id);

      if (attemptError) {
        console.error('Failed to update OTP attempts:', attemptError);
      }

      console.error('OTP MISMATCH!');
      console.error('  Expected (stored):', JSON.stringify(storedOTP));
      console.error('  Received (input):', JSON.stringify(inputOTP));

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid OTP',
          attempts_remaining: 3 - newAttempts,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // STEP 9: OTP MATCHED - Update order as verified
    // ==========================================
    console.log('OTP MATCHED! Updating order as delivered & verified...');

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        delivery_otp_verified: true,
        otp_verified: true,
        delivery_verified_at: now,
        otp_verified_at: now,
        delivery_verified_by: user_id || null,
        status: 'delivered',
        payment_status: 'paid',
        actual_delivery_date: now,
        payout_status: 'processing',
      })
      .eq('id', order_id);

    if (updateError) {
      console.error('Failed to update order after OTP verification:', JSON.stringify(updateError));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OTP is correct but failed to update order status. Please try again.',
          debug: { update_error: updateError.message }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order updated successfully! Delivery verified.');

    // ==========================================
    // STEP 10: Trigger instant payout
    // ==========================================
    console.log('Triggering instant payout via direct fetch with JWT...');

    let payoutTriggered = false;
    let payoutData: any = null;
    let payoutError = null;

    try {
      const payoutUrl = `${SUPABASE_URL}/functions/v1/auto-payout-trigger`;
      const payoutBody = JSON.stringify({
        order_id: order_id,
        trigger_type: 'immediate',
      });

      const payoutHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_JWT}`,
        'apikey': SERVICE_ROLE_JWT,
      };

      console.log('=== Payout Trigger Fetch ===');
      console.log('URL:', payoutUrl);
      console.log('Auth token starts with:', SERVICE_ROLE_JWT.substring(0, 20));
      console.log('Is JWT format (starts with eyJ):', SERVICE_ROLE_JWT.startsWith('eyJ'));

      const payoutResponse = await fetch(payoutUrl, {
        method: 'POST',
        headers: payoutHeaders,
        body: payoutBody,
      });

      const responseStatus = payoutResponse.status;
      const responseText = await payoutResponse.text();

      console.log('Payout response status:', responseStatus);
      console.log('Payout response body:', responseText);

      let payoutResult: any;
      try {
        payoutResult = JSON.parse(responseText);
      } catch {
        console.error('Failed to parse payout response as JSON:', responseText);
        payoutError = `Non-JSON response (status ${responseStatus}): ${responseText.substring(0, 200)}`;
        payoutResult = null;
      }

      if (responseStatus === 401) {
        console.error('401 Error on payout trigger');
        payoutError = `Auth error (401): ${responseText}. Check SERVICE_ROLE_JWT secret.`;
      } else if (responseStatus !== 200) {
        console.error(`Payout returned status ${responseStatus}:`, responseText);
        payoutError = `Payout HTTP ${responseStatus}: ${payoutResult?.error || responseText.substring(0, 200)}`;
      } else if (payoutResult) {
        payoutData = payoutResult.data;
        payoutTriggered = payoutResult.success === true;
        if (!payoutTriggered) {
          payoutError = payoutResult.error || 'Payout failed for unknown reason';
        } else {
          console.log('Payout successfully triggered!');
        }
      } else {
        payoutError = 'Empty response from payout function';
      }
    } catch (payoutErr: any) {
      console.error('Exception calling payout trigger:', payoutErr.message);
      payoutError = `Exception: ${payoutErr.message}`;
    }

    // ==========================================
    // STEP 11: Return success response
    // ==========================================
    console.log('=== FINAL RESULT: SUCCESS ===');
    
    return new Response(
      JSON.stringify({
        success: true,
        message: payoutTriggered
          ? 'Delivery verified successfully. Payout has been triggered successfully!'
          : 'Delivery verified successfully. Payout could not be processed automatically.',
        booking_id: order_id,
        user_id: user_id || null,
        payout_triggered: payoutTriggered,
        payout_data: payoutData,
        payout_error: payoutError,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('=== UNHANDLED EXCEPTION in verify-delivery-otp ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
