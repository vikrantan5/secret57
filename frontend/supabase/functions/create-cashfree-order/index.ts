// Cashfree Order Creation for Customer Payments
// Deno Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const CASHFREE_APP_ID = Deno.env.get('EXPO_PUBLIC_CASHFREE_APP_ID') ;
const CASHFREE_SECRET_KEY = Deno.env.get('EXPO_PUBLIC_CASHFREE_SECRET_KEY');
const CASHFREE_API_URL = 'https://sandbox.cashfree.com/pg/orders'; // Use production URL for live

interface OrderRequest {
  order_amount: number;
  order_currency: string;
  order_note?: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  return_url: string;
  notify_url?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      order_amount,
      order_currency = 'INR',
      order_note,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      return_url,
      notify_url
    }: OrderRequest = await req.json();

    // Validate required fields
    if (!order_amount || !customer_id || !customer_email || !customer_phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique order ID
    const order_id = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;

     // Create Cashfree order
    const orderPayload = {
      order_id,
      order_amount: parseFloat(order_amount.toString()),
      order_currency,
      customer_details: {
        customer_id,
        customer_name,
        customer_email,
        customer_phone
          },
      order_meta: {
        return_url: return_url
      }
    };

    console.log('Creating Cashfree order:', order_id);

    const response = await fetch(CASHFREE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01'
      },
      body: JSON.stringify(orderPayload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Cashfree order creation failed:', responseData);
      return new Response(
        JSON.stringify({ success: false, error: responseData.message || 'Failed to create order' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Cashfree order created successfully:', responseData.order_id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          order_id: responseData.order_id,
          payment_session_id: responseData.payment_session_id,
          order_token: responseData.order_token,
          order_status: responseData.order_status
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in create-cashfree-order:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
