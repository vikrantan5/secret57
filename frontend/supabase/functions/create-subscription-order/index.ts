//cashfree

// Create Cashfree Order for Seller Subscription Payment (Goes to Admin)
// Deno Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CASHFREE_APP_ID = Deno.env.get('EXPO_PUBLIC_CASHFREE_APP_ID');
const CASHFREE_SECRET_KEY = Deno.env.get('EXPO_PUBLIC_CASHFREE_SECRET_KEY');
const CASHFREE_API_URL = 'https://sandbox.cashfree.com/pg/orders';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubscriptionOrderRequest {
  subscription_amount: number;
  plan_name: string;
  seller_id: string;
  seller_name: string;
  seller_email: string;
  seller_phone: string;
  return_url: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      console.error('Missing Cashfree credentials in environment');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cashfree credentials not configured. Please set EXPO_PUBLIC_CASHFREE_APP_ID and EXPO_PUBLIC_CASHFREE_SECRET_KEY in Supabase secrets.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      subscription_amount,
      plan_name,
      seller_id,
      seller_name,
      seller_email,
      seller_phone,
      return_url
    }: SubscriptionOrderRequest = await req.json();

  

    console.log('Received subscription order request:', {
      subscription_amount,
      plan_name,
      seller_id,
      seller_email
    });

    if (!subscription_amount || !seller_id || !seller_email || !seller_phone) {
      console.error('Missing required fields in request');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: subscription_amount, seller_id, seller_email, seller_phone' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique order ID for subscription
    const order_id = `sub_${seller_id}_${Date.now()}`;

    console.log('Creating subscription order with ID:', order_id);

      // Create Cashfree order (payment goes to admin/platform account)
    const orderPayload = {
      order_id,
      order_amount: parseFloat(subscription_amount.toString()),
      order_currency: 'INR',
      customer_details: {
        customer_id: seller_id,
        customer_name: seller_name,
        customer_email: seller_email,
        customer_phone: seller_phone
          },
      order_meta: {
        return_url: return_url 
      }
    };

    console.log('Sending request to Cashfree API:', CASHFREE_API_URL);
    console.log('Order payload:', JSON.stringify(orderPayload, null, 2));

    const response = await fetch(CASHFREE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': CASHFREE_APP_ID!,
        'x-client-secret': CASHFREE_SECRET_KEY!,
        'x-api-version': '2023-08-01'
      },
      body: JSON.stringify(orderPayload)
    });

    const responseData = await response.json();

    console.log('Cashfree API response status:', response.status);
    console.log('Cashfree API response:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error('Cashfree API error:', responseData);
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.message || `Cashfree API error: ${response.status}`,
          details: responseData
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Subscription order created successfully:', responseData.order_id);
    console.log('Payment link from Cashfree:', responseData.payment_link);

    // IMPORTANT: Use ONLY payment_link from Cashfree API response
    // Do NOT construct URLs manually - causes 404 errors
    const paymentUrl = responseData.payment_link;

    if (!paymentUrl) {
      console.error('No payment_link in Cashfree response:', responseData);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment link not received from Cashfree' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          order_id: responseData.order_id,
          order_status: responseData.order_status,
          payment_url: paymentUrl
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in create-subscription-order:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
