//cashfree

// Create Cashfree Order for Seller Subscription Payment (Goes to Admin)
// Deno Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CASHFREE_APP_ID = Deno.env.get('EXPO_PUBLIC_CASHFREE_APP_ID') ;
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
    const {
      subscription_amount,
      plan_name,
      seller_id,
      seller_name,
      seller_email,
      seller_phone,
      return_url
    }: SubscriptionOrderRequest = await req.json();

    if (!subscription_amount || !seller_id || !seller_email || !seller_phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique order ID for subscription
    const order_id = `sub_${seller_id}_${Date.now()}`;

    console.log('Creating subscription order:', order_id);

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
      }
    };

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
      console.error('Failed to create subscription order:', responseData);
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.message || 'Failed to create subscription order'
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Subscription order created successfully:', responseData.order_id);

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
    console.error('Error in create-subscription-order:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
