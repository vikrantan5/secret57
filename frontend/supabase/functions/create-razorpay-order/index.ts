import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RAZORPAY_KEY_ID = Deno.env.get('EXPO_PUBLIC_RAZORPAY_KEY_ID') || 'rzp_test_RVeELbQdxuBBiv';
const RAZORPAY_KEY_SECRET = Deno.env.get('EXPO_PUBLIC_RAZORPAY_KEY_SECRET') || 'CtWqj2m5dczsvq3fWC9CJvYO';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, currency = 'INR', receipt } = await req.json();

    if (!amount || !receipt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount and receipt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Razorpay expects amount in paise (1 rupee = 100 paise)
    const amountInPaise = Math.round(amount * 100);

    // Create Razorpay order
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: currency,
        receipt: receipt,
        payment_capture: 1, // Auto capture payment
      }),
    });

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.json();
      console.error('Razorpay API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to create Razorpay order', details: errorData }),
        { status: razorpayResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const razorpayOrder = await razorpayResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
