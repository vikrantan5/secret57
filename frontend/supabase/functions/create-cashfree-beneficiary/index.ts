// Cashfree Beneficiary Creation Edge Function
// Deno Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CASHFREE_PAYOUT_CLIENT_ID = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID') ?? '';
const CASHFREE_PAYOUT_CLIENT_SECRET = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET') ?? '';
const CASHFREE_PAYOUT_API_URL = 'https://payout-gamma.cashfree.com/payout/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BeneficiaryRequest {
  seller_id: string;
  user_id: string;
  bank_account_id?: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  email: string;
  phone: string;
  address?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      seller_id,
      user_id,
      bank_account_id,
      account_holder_name,
      account_number,
      ifsc_code,
      bank_name,
      email,
      phone,
      address,
    }: BeneficiaryRequest = await req.json();

    // Validate required fields
    if (!seller_id || !account_holder_name || !account_number || !ifsc_code || !email || !phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate Cashfree credentials
    if (!CASHFREE_PAYOUT_CLIENT_ID || !CASHFREE_PAYOUT_CLIENT_SECRET) {
      console.error('Missing Cashfree Payout credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Cashfree Payout credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if beneficiary already exists in Supabase
    const { data: existingBeneficiary } = await supabase
      .from('seller_beneficiaries')
      .select('*')
      .eq('seller_id', seller_id)
      .eq('status', 'ACTIVE')
      .single();

    if (existingBeneficiary) {
      console.log('Beneficiary already exists for seller:', seller_id);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Beneficiary already exists',
          data: existingBeneficiary,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique beneficiary ID
    const beneficiary_id = `BENE_${seller_id.replace(/-/g, '').substring(0, 16)}_${Date.now()}`;

    console.log('Creating Cashfree beneficiary:', beneficiary_id);

    // Create beneficiary in Cashfree
    const beneficiaryPayload = {
      beneId: beneficiary_id,
      name: account_holder_name,
      email: email,
      phone: phone,
      bankAccount: account_number,
      ifsc: ifsc_code,
      address1: address || bank_name,
      city: 'Default',
      state: 'Default',
      pincode: '000000',
    };

    console.log('Cashfree beneficiary payload:', JSON.stringify(beneficiaryPayload, null, 2));

    const cashfreeResponse = await fetch(`${CASHFREE_PAYOUT_API_URL}/addBeneficiary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': CASHFREE_PAYOUT_CLIENT_ID,
        'X-Client-Secret': CASHFREE_PAYOUT_CLIENT_SECRET,
      },
      body: JSON.stringify(beneficiaryPayload),
    });

    const cashfreeData = await cashfreeResponse.json();

    console.log('Cashfree API response status:', cashfreeResponse.status);
    console.log('Cashfree API response:', JSON.stringify(cashfreeData, null, 2));

    // Check for errors
    if (!cashfreeResponse.ok || cashfreeData.status !== 'SUCCESS') {
      const errorMessage = cashfreeData.message || cashfreeData.subCode || 'Failed to create beneficiary in Cashfree';
      
      // Save failed beneficiary attempt
      await supabase.from('seller_beneficiaries').insert({
        seller_id,
        user_id,
        bank_account_id,
        beneficiary_id,
        account_holder_name,
        account_number,
        ifsc_code,
        bank_name,
        email,
        phone,
        address,
        status: 'FAILED',
        error_message: errorMessage,
        cf_response: cashfreeData,
        created_at: new Date().toISOString(),
      });

      console.error('Cashfree beneficiary creation failed:', errorMessage);
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          details: cashfreeData,
        }),
        { status: cashfreeResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Cashfree beneficiary created successfully');

    // Save beneficiary in Supabase
    const { data: savedBeneficiary, error: saveError } = await supabase
      .from('seller_beneficiaries')
      .insert({
        seller_id,
        user_id,
        bank_account_id,
        beneficiary_id,
        account_holder_name,
        account_number,
        ifsc_code,
        bank_name,
        email,
        phone,
        address,
        status: 'ACTIVE',
        cf_response: cashfreeData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save beneficiary in Supabase:', saveError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Beneficiary created in Cashfree but failed to save in database',
          details: saveError,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Beneficiary saved in Supabase');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Beneficiary created successfully',
        data: savedBeneficiary,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in create-cashfree-beneficiary:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
