// Cashfree Order Creation for Customer Payments
// Deno Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CASHFREE_APP_ID = Deno.env.get('CASHFREE_APP_ID');
const CASHFREE_SECRET_KEY = Deno.env.get('CASHFREE_SECRET_KEY');
const CASHFREE_API_URL = 'https://sandbox.cashfree.com/pg/orders';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Validate Cashfree credentials
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      console.error('Missing Cashfree credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Cashfree credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique order ID
    const order_id = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create Cashfree order
    const orderPayload = {
      order_id,
      order_amount: parseFloat(order_amount.toString()),
      order_currency,
      order_note: order_note || 'Service Booking Payment',
      customer_details: {
        customer_id,
        customer_name: customer_name || 'Customer',
        customer_email,
        customer_phone
      },
      order_meta: {
        return_url: return_url
      }
    };

    console.log('Creating Cashfree order:', order_id);
    console.log('Order payload:', JSON.stringify(orderPayload, null, 2));

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

    console.log('Cashfree API response status:', response.status);
    console.log('Cashfree API response:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error('Cashfree order creation failed:', responseData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData.message || 'Failed to create order',
          details: responseData
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Cashfree order created successfully:', responseData.order_id);
    
    // Get the payment session ID from Cashfree response
    let paymentSessionId = responseData.payment_session_id;
    
    if (!paymentSessionId) {
      console.error('No payment_session_id in Cashfree response:', responseData);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment session not received from Cashfree' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Raw payment_session_id from Cashfree:', paymentSessionId);

    // IMPORTANT: Keep the payment_session_id as-is from Cashfree
    // Even if it has "payment" at the end, it's valid
    // Just construct the URL directly
    
    // Construct checkout URL (using SDK method is better, but URL works for simple cases)
    const paymentUrl = `https://sandbox.cashfree.com/pg/checkout?payment_session_id=${paymentSessionId}`;
    console.log('Constructed payment URL:', paymentUrl);

    // Return both the session ID and URL
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          order_id: responseData.order_id,
          order_status: responseData.order_status,
          payment_session_id: paymentSessionId,  // Return the raw session ID
          payment_url: paymentUrl                 // Return the URL as well
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