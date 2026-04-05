// Cashfree Payout API v2 - Create Transfer
// Updated for 2025 - Uses v2 standard mode (async transfers)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CASHFREE_PAYOUT_CLIENT_ID = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID');
const CASHFREE_PAYOUT_CLIENT_SECRET = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET');
const CASHFREE_PAYOUT_API_URL = 'https://sandbox.cashfree.com/payout'; // v2 sandbox
const API_VERSION = '2025-01-01';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransferRequest {
  bene_id: string;
  amount: number;
  transfer_id: string;
  remarks?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bene_id, amount, transfer_id, remarks }: TransferRequest = await req.json();

    console.log('=== Cashfree v2 Create Transfer ===');
    console.log('Transfer ID:', transfer_id);
    console.log('Beneficiary ID:', bene_id);
    console.log('Amount:', amount);

    // Validate required fields
    if (!bene_id || !amount || !transfer_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: bene_id, amount, transfer_id' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount
    if (amount < 1) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Amount must be at least ₹1' 
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

    // Cashfree Payout v2 API - Create Transfer (Async)
    const transferPayload = {
      transfer_id: transfer_id,
      transfer_amount: amount,
      beneficiary_details: {
        beneficiary_id: bene_id
      },
      transfer_remarks: remarks || 'Seller payout'
    };

    console.log('Payload:', JSON.stringify(transferPayload, null, 2));

    const response = await fetch(`${CASHFREE_PAYOUT_API_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': API_VERSION,
        'x-client-id': CASHFREE_PAYOUT_CLIENT_ID,
        'x-client-secret': CASHFREE_PAYOUT_CLIENT_SECRET
      },
      body: JSON.stringify(transferPayload)
    });

    const responseData = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(responseData, null, 2));

    // Handle success
    if (response.ok) {
      console.log('✅ Transfer created successfully:', transfer_id);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            transfer_id: responseData.transfer_id || transfer_id,
            cf_transfer_id: responseData.cf_transfer_id,
            status: responseData.status || 'RECEIVED',
            message: 'Transfer initiated successfully'
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle beneficiary not found
    if (response.status === 404 || responseData.error_code === 'BENE_NOT_EXIST') {
      console.error('❌ Beneficiary not found:', bene_id);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Beneficiary not found. Please add bank account first.',
          error_code: 'BENE_NOT_EXIST'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle duplicate transfer
    if (response.status === 409 || responseData.error_code === 'DUPLICATE_TRANSFER') {
      console.log('⚠️  Duplicate transfer:', transfer_id);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Transfer with this ID already exists',
          error_code: 'DUPLICATE_TRANSFER'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle insufficient balance
    if (responseData.error_code === 'INSUFFICIENT_BALANCE') {
      console.error('❌ Insufficient balance in Cashfree account');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Insufficient balance in payout account',
          error_code: 'INSUFFICIENT_BALANCE'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle other errors
    console.error('❌ Failed to create transfer:', responseData);
    return new Response(
      JSON.stringify({
        success: false,
        error: responseData.message || responseData.error || 'Failed to create transfer',
        error_code: responseData.error_code,
        details: responseData
      }),
      { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Exception in create-cashfree-transfer:', error.message);
    console.error('Stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
