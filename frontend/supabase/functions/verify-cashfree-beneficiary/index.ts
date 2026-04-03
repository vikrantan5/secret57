// Verify Cashfree Beneficiary
// Deno Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CASHFREE_PAYOUT_CLIENT_ID = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID');
const CASHFREE_PAYOUT_CLIENT_SECRET = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET');
const CASHFREE_PAYOUT_API_URL = 'https://payout-gamma.cashfree.com/payout/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bene_id } = await req.json();

    if (!bene_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Beneficiary ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying beneficiary:', bene_id);

    // Get authorization token
    const authResponse = await fetch(`${CASHFREE_PAYOUT_API_URL}/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': CASHFREE_PAYOUT_CLIENT_ID,
        'X-Client-Secret': CASHFREE_PAYOUT_CLIENT_SECRET
      }
    });

    const authData = await authResponse.json();

    if (!authResponse.ok || authData.status !== 'SUCCESS') {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authData.data.token;

    // Get beneficiary details
    const response = await fetch(`${CASHFREE_PAYOUT_API_URL}/getBeneficiary/${bene_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const responseData = await response.json();

    if (!response.ok || responseData.status !== 'SUCCESS') {
      console.error('Failed to verify beneficiary:', responseData);
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.message || 'Beneficiary not found'
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Beneficiary verified:', bene_id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          bene_id: responseData.data.beneId,
          name: responseData.data.name,
          email: responseData.data.email,
          phone: responseData.data.phone,
          bank_account: responseData.data.bankAccount,
          ifsc: responseData.data.ifsc,
          status: responseData.data.status
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in verify-cashfree-beneficiary:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
