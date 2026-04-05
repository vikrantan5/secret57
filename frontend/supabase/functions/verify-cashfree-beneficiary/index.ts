// Cashfree Payout API v2 - Get/Verify Beneficiary
// Updated for 2025 - Uses v2 standard mode
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CASHFREE_PAYOUT_CLIENT_ID = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID');
const CASHFREE_PAYOUT_CLIENT_SECRET = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET');
const CASHFREE_PAYOUT_API_URL = 'https://sandbox.cashfree.com/payout'; // v2 sandbox
const API_VERSION = '2025-01-01';

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
    const { bene_id } = await req.json();

    console.log('=== Cashfree v2 Get Beneficiary ===');
    console.log('Beneficiary ID:', bene_id);

    if (!bene_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required field: bene_id' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate credentials
    if (!CASHFREE_PAYOUT_CLIENT_ID || !CASHFREE_PAYOUT_CLIENT_SECRET) {
      console.error('ERROR: Cashfree credentials not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cashfree credentials not configured' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cashfree Payout v2 API - Get Beneficiary
    const response = await fetch(`${CASHFREE_PAYOUT_API_URL}/beneficiary/${bene_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': API_VERSION,
        'x-client-id': CASHFREE_PAYOUT_CLIENT_ID,
        'x-client-secret': CASHFREE_PAYOUT_CLIENT_SECRET
      }
    });

    const responseData = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('✅ Beneficiary verified:', bene_id);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            bene_id: responseData.beneficiary_id,
            name: responseData.beneficiary_name,
            status: responseData.beneficiary_status,
            bank_account: responseData.beneficiary_instrument_details?.bank_account_number,
            ifsc: responseData.beneficiary_instrument_details?.bank_ifsc
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Beneficiary not found
    if (response.status === 404) {
      console.log('⚠️  Beneficiary not found:', bene_id);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Beneficiary not found'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle errors
    console.error('❌ Failed to verify beneficiary:', responseData);
    return new Response(
      JSON.stringify({
        success: false,
        error: responseData.message || responseData.error || 'Failed to verify beneficiary'
      }),
      { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Exception in verify-cashfree-beneficiary:', error.message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
