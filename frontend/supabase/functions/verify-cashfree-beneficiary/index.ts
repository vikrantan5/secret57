// Add Cashfree Beneficiary for Payouts
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
  // Handle CORS preflight
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
    } = await req.json();

    console.log('Adding beneficiary:', { bene_id, name, email, phone, bank_account, ifsc });

    // Validate required fields
    if (!bene_id || !name || !email || !phone || !bank_account || !ifsc) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: bene_id, name, email, phone, bank_account, ifsc' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authorization token
    console.log('Getting authorization token...');
    const authResponse = await fetch(`${CASHFREE_PAYOUT_API_URL}/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': CASHFREE_PAYOUT_CLIENT_ID!,
        'X-Client-Secret': CASHFREE_PAYOUT_CLIENT_SECRET!
      }
    });

    const authData = await authResponse.json();
    console.log('Auth response:', JSON.stringify(authData, null, 2));

    if (!authResponse.ok || authData.status !== 'SUCCESS') {
      console.error('Authorization failed:', authData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authData.message || 'Authorization failed' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authData.data.token;
    console.log('Authorization successful, token obtained');

    // Add beneficiary
    const beneficiaryData = {
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

    console.log('Adding beneficiary with data:', JSON.stringify(beneficiaryData, null, 2));

    const response = await fetch(`${CASHFREE_PAYOUT_API_URL}/addBeneficiary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(beneficiaryData)
    });

    const responseData = await response.json();
    console.log('Add beneficiary response:', JSON.stringify(responseData, null, 2));

    if (!response.ok || responseData.status !== 'SUCCESS') {
      console.error('Failed to add beneficiary:', responseData);
      
      // Check if beneficiary already exists
      if (responseData.message && responseData.message.includes('already exists')) {
        console.log('Beneficiary already exists, proceeding...');
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              bene_id: bene_id,
              message: 'Beneficiary already exists'
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
          name: responseData.data.name,
          message: 'Beneficiary added successfully'
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