import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') 
const RAZORPAY_ACCOUNT_NUMBER = Deno.env.get('RAZORPAY_ACCOUNT_NUMBER') 

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fund_account_id, amount, purpose = 'payout', reference_id } = await req.json()

    if (!fund_account_id || !amount) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Razorpay Payout
    const response = await fetch('https://api.razorpay.com/v1/payouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
        'X-Payout-Idempotency': reference_id || `payout_${Date.now()}`
      },
      body: JSON.stringify({
        account_number: RAZORPAY_ACCOUNT_NUMBER,
        fund_account_id,
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR',
        mode: 'IMPS',
        purpose,
        queue_if_low_balance: true,
        reference_id: reference_id || `payout_${Date.now()}`,
        narration: purpose || 'Seller Payout'
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Razorpay Payout API Error:', data)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.error?.description || 'Failed to create payout',
          details: data
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
