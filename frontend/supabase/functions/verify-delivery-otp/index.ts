// Verify Delivery OTP for Product Orders
// This function verifies the OTP and triggers instant payout

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
    const { order_id, otp, user_id } = await req.json();

    console.log('=== Verify Delivery OTP ===');
    console.log('Order ID:', order_id);
    console.log('OTP:', otp);
    console.log('User ID:', user_id);

    if (!order_id || !otp) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order ID and OTP are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already verified
    if (order.delivery_otp_verified) {
      return new Response(
        JSON.stringify({ success: false, error: 'Delivery already verified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check OTP attempts
    if (order.otp_attempts >= 3) {
      return new Response(
        JSON.stringify({ success: false, error: 'Maximum OTP attempts exceeded' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify OTP
    if (order.delivery_otp !== otp) {
      // Increment OTP attempts
      await supabase
        .from('orders')
        .update({ otp_attempts: (order.otp_attempts || 0) + 1 })
        .eq('id', order_id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid OTP',
          attempts_remaining: 3 - (order.otp_attempts || 0) - 1
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OTP is correct - Mark as verified
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        delivery_otp_verified: true,
        otp_verified: true,
        delivery_verified_at: new Date().toISOString(),
        otp_verified_at: new Date().toISOString(),
        delivery_verified_by: user_id,
        status: 'delivered',
         payment_status: 'paid', // Ensure payment_status is set
        actual_delivery_date: new Date().toISOString(),
        payout_status: 'processing'
      })
      .eq('id', order_id);

    if (updateError) {
      console.error('Failed to update order:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify delivery' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Delivery OTP verified successfully');

    // TRIGGER INSTANT PAYOUT
    console.log('🚀 Triggering instant payout...');
    
    let payoutTriggered = false;
    let payoutData: any = null;
    let payoutError = null;

    try {
      const payoutResponse = await fetch(`${SUPABASE_URL}/functions/v1/auto-payout-trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          order_id: order_id,
          trigger_type: 'immediate' // This skips the 7-day hold period
        })
      });

      console.log('Payout response status:', payoutResponse.status);
      
      if (!payoutResponse.ok) {
        const errorText = await payoutResponse.text();
        console.error('❌ Payout API error response:', errorText);
        payoutError = `Payout API returned ${payoutResponse.status}: ${errorText}`;
      } else {
        const result = await payoutResponse.json();
        console.log('✅ Payout response:', JSON.stringify(result, null, 2));
        
        payoutData = result.data;
        payoutTriggered = result.success === true;
        
        if (!payoutTriggered) {
          payoutError = result.error || 'Payout failed for unknown reason';
          console.error('❌ Payout trigger failed:', payoutError);
          console.error('Full payout result:', result);
        } else {
          console.log('💰 Payout successfully triggered!');
          console.log('Payouts processed:', payoutData?.successful_payouts || 0);
        }
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
          ? 'Delivery verified successfully. Payout has been triggered successfully!' 
          : 'Delivery verified successfully. Payout could not be processed automatically.',
        payout_triggered: payoutTriggered,
        payout_data: payoutData,
        payout_error: payoutError
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Exception in verify-delivery-otp:', error.message);
    console.error('Stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
