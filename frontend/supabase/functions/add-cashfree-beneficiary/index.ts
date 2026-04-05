// add-cashfree-beneficiary/index.ts - SIMPLE VERSION

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CASHFREE_PAYOUT_CLIENT_ID = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID');
const CASHFREE_PAYOUT_CLIENT_SECRET = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET');
const CASHFREE_PAYOUT_API_URL = 'https://payout-gamma.cashfree.com/payout/v2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bene_id, name, email, phone, bank_account, ifsc, address1, city, state, pincode } = await req.json();

    console.log('Adding beneficiary:', bene_id);

    // Simple auth without signature (requires IP whitelist)
    const authResponse = await fetch(`${CASHFREE_PAYOUT_API_URL}/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': CASHFREE_PAYOUT_CLIENT_ID!,
        'X-Client-Secret': CASHFREE_PAYOUT_CLIENT_SECRET!
      }
    });

    const authData = await authResponse.json();
    console.log('Auth status:', authResponse.status);
    console.log('Auth response:', JSON.stringify(authData, null, 2));

    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: authData.message || 'Auth failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authData.token || authData.data?.token;
    console.log('Auth successful, token obtained');

    // Add beneficiary
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

    console.log('Payload:', JSON.stringify(beneficiaryPayload, null, 2));

    const addResponse = await fetch(`${CASHFREE_PAYOUT_API_URL}/beneficiary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Client-Id': CASHFREE_PAYOUT_CLIENT_ID!
      },
      body: JSON.stringify(beneficiaryPayload)
    });

    const responseData = await addResponse.json();
    console.log('Add beneficiary status:', addResponse.status);
    console.log('Response:', JSON.stringify(responseData, null, 2));

    if (!addResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: responseData.message || 'Failed to add beneficiary' }),
        { status: addResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Beneficiary added successfully:', bene_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          bene_id: responseData.beneId || responseData.data?.beneId,
          message: 'Beneficiary added successfully' 
        } 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});