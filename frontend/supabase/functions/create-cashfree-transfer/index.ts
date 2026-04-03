//cashfree


// Create Cashfree Direct Transfer to Seller
// Deno Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CASHFREE_PAYOUT_CLIENT_ID = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID');
const CASHFREE_PAYOUT_CLIENT_SECRET = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET') ;
const CASHFREE_PAYOUT_API_URL = 'https://payout-gamma.cashfree.com/payout/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransferRequest {
  bene_id: string;
  amount: number;
  transfer_id: string; // Unique transfer ID
  remarks?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bene_id, amount, transfer_id, remarks }: TransferRequest = await req.json();

    if (!bene_id || !amount || !transfer_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating transfer:', transfer_id, 'to beneficiary:', bene_id);

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

    // Create transfer payload
    const transferPayload = {
      beneId: bene_id,
      amount: amount.toString(),
      transferId: transfer_id,
      transferMode: 'banktransfer',
      remarks: remarks || 'Payment for order'
    };

    // Request transfer
    const response = await fetch(`${CASHFREE_PAYOUT_API_URL}/requestTransfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(transferPayload)
    });

    const responseData = await response.json();

    if (!response.ok || responseData.status !== 'SUCCESS') {
      console.error('Transfer request failed:', responseData);
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData.message || 'Failed to create transfer'
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Transfer created successfully:', transfer_id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transfer_id: responseData.data.transferId,
          reference_id: responseData.data.referenceId,
          utr: responseData.data.utr,
          status: responseData.data.status
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in create-cashfree-transfer:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
