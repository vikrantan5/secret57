// Generate OTP for Orders or Bookings
// This function generates a 6-digit OTP for delivery/service verification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { type, id } = await req.json(); // type: 'order' or 'booking', id: order_id or booking_id

    console.log('=== Generate OTP ===');
    console.log('Type:', type);
    console.log('ID:', id);

    if (!type || !id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Type and ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const otp = generateOTP();
    const now = new Date().toISOString();

    if (type === 'order') {
      // Generate OTP for order delivery
      const { data: order, error: updateError } = await supabase
        .from('orders')
        .update({
          delivery_otp: otp,
          delivery_otp_generated_at: now,
          otp_generated_at: now,
          otp_attempts: 0,
          delivery_otp_verified: false,
          otp_verified: false
        })
        .eq('id', id)
        .select('order_number, customer_id')
        .single();

      if (updateError) {
        console.error('Failed to generate OTP for order:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to generate OTP' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get customer details
      const { data: customer } = await supabase
        .from('users')
        .select('name, email, phone')
        .eq('id', order.customer_id)
        .single();

      console.log(`✅ OTP generated for order ${order.order_number}: ${otp}`);

      // Send notification to customer
      await supabase.from('notifications').insert({
        user_id: order.customer_id,
        type: 'order',
        title: '🔐 Delivery OTP',
        message: `Your delivery OTP for order ${order.order_number} is: ${otp}. Share this with the delivery person.`,
        data: { order_id: id, otp: otp },
        created_at: now
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'OTP generated successfully',
          otp: otp, // In production, don't return OTP - send via SMS/email
          order_number: order.order_number,
          customer: customer
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (type === 'booking') {
      // Generate OTP for service completion
      const { data: booking, error: updateError } = await supabase
        .from('bookings')
        .update({
          otp: otp,
          otp_generated_at: now,
          otp_attempts: 0,
          otp_verified: false
        })
        .eq('id', id)
        .select('id, customer_id, booking_date')
        .single();

      if (updateError) {
        console.error('Failed to generate OTP for booking:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to generate OTP' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get customer details
      const { data: customer } = await supabase
        .from('users')
        .select('name, email, phone')
        .eq('id', booking.customer_id)
        .single();

      console.log(`✅ OTP generated for booking ${booking.id}: ${otp}`);

      // Send notification to customer
      await supabase.from('notifications').insert({
        user_id: booking.customer_id,
        type: 'booking',
        title: '🔐 Service Completion OTP',
        message: `Your service completion OTP is: ${otp}. Share this with the service provider after completion.`,
        data: { booking_id: id, otp: otp },
        created_at: now
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'OTP generated successfully',
          otp: otp, // In production, don't return OTP - send via SMS/email
          booking_id: booking.id,
          customer: customer
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid type. Must be \"order\" or \"booking\"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('❌ Exception in generate-otp:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
