// Cashfree Payment Verification
// Deno Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const CASHFREE_APP_ID = Deno.env.get('CASHFREE_APP_ID') ;
const CASHFREE_SECRET_KEY = Deno.env.get('CASHFREE_SECRET_KEY') ;
const CASHFREE_API_URL = 'https://sandbox.cashfree.com/pg/orders';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying Cashfree payment for order:', order_id);

    // Fetch order status from Cashfree
    const response = await fetch(`${CASHFREE_API_URL}/${order_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01'
      }
    });

    const orderData = await response.json();

    if (!response.ok) {
      console.error('Failed to fetch order status:', orderData);
      return new Response(
        JSON.stringify({ success: false, error: orderData.message || 'Failed to verify payment' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order status:', orderData.order_status);

    // Check if payment is successful
     // In test/sandbox mode, Cashfree returns 'ACTIVE' for successful payments
    // In production, it returns 'PAID'
    const isSuccess = orderData.order_status === 'PAID' || orderData.order_status === 'ACTIVE';


    return new Response(
      JSON.stringify({
        success: true,
        data: {
          order_id: orderData.order_id,
          order_status: orderData.order_status,
          payment_status: isSuccess ? 'success' : 'pending',
          order_amount: orderData.order_amount,
          payment_time: orderData.payment_time || null,
          cf_order_id: orderData.cf_order_id
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in verify-cashfree-payment:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
