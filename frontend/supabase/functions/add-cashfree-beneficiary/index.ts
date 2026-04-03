// Add Cashfree Beneficiary (Seller Bank Account)
// Deno Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CASHFREE_PAYOUT_CLIENT_ID = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID') ;
const CASHFREE_PAYOUT_CLIENT_SECRET = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET') ;
const CASHFREE_PAYOUT_API_URL = 'https://payout-gamma.cashfree.com/payout/v1'; // Sandbox

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BeneficiaryRequest {
  bene_id: string; // Unique beneficiary ID
  name: string;
  email: string;
  phone: string;
  bank_account: string;
  ifsc: string;
  address1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      bene_id,
      name,
      email,
      phone,
      bank_account,
      ifsc,
      address1,
      city,
      state,
      pincode
    }: BeneficiaryRequest = await req.json();

    // Validate required fields
    if (!bene_id || !name || !email || !phone || !bank_account || !ifsc) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Adding Cashfree beneficiary:', bene_id);

    // Create beneficiary payload
    const beneficiaryPayload = {
      beneId: bene_id,
      name: name,
      email: email,
      phone: phone,
      bankAccount: bank_account,
      ifsc: ifsc,
      address1: address1 || 'Address',
      city: city || 'City',
      state: state || 'State',
      pincode: pincode || '000000'
    };

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
      console.error('Failed to authorize:', authData);
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authData.data.token;

    // Add beneficiary
    const response = await fetch(`${CASHFREE_PAYOUT_API_URL}/addBeneficiary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(beneficiaryPayload)
    });

    const responseData = await response.json();

    if (!response.ok || responseData.status !== 'SUCCESS') {
      console.error('Failed to add beneficiary:', responseData);
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.message || 'Failed to add beneficiary'
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Beneficiary added successfully:', bene_id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          bene_id: responseData.data.beneId,
          status: responseData.status,
          message: responseData.message
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in add-cashfree-beneficiary:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
