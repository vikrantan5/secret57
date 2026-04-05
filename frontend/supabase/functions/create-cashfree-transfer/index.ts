// Cashfree Payout API v1 - Create Transfer (Fixed: Bearer Token with RSA Signature)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CASHFREE_PAYOUT_CLIENT_ID = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID');
const CASHFREE_PAYOUT_CLIENT_SECRET = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET');
const CASHFREE_PUBLIC_KEY = Deno.env.get('CASHFREE_PUBLIC_KEY');
const CASHFREE_PAYOUT_API_URL = 'https://payout-gamma.cashfree.com/payout/v1';

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

/**
 * Generate RSA signature for Cashfree authentication
 */
async function generateRSASignature(clientId: string, publicKeyPem: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${clientId}.${timestamp}`;
  
  const pemContents = publicKeyPem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const publicKey = await crypto.subtle.importKey(
    'spki',
    binaryDer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  const encoder = new TextEncoder();
  const messageData = encoder.encode(message);

  const encryptedData = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    messageData
  );

  return btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
}

/**
 * Get Bearer Token from Cashfree Authorize API
 */
async function getBearerToken(): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    if (!CASHFREE_PAYOUT_CLIENT_ID || !CASHFREE_PAYOUT_CLIENT_SECRET || !CASHFREE_PUBLIC_KEY) {
      return { success: false, error: 'Cashfree credentials not configured' };
    }

    const signature = await generateRSASignature(CASHFREE_PAYOUT_CLIENT_ID, CASHFREE_PUBLIC_KEY);

    const response = await fetch(`${CASHFREE_PAYOUT_API_URL}/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': CASHFREE_PAYOUT_CLIENT_ID,
        'X-Client-Secret': CASHFREE_PAYOUT_CLIENT_SECRET,
        'X-Cf-Signature': signature
      }
    });

    const data = await response.json();

    if (response.ok && data.status === 'SUCCESS' && data.data?.token) {
      return { success: true, token: data.data.token };
    }

    return { success: false, error: data.message || 'Failed to get authorization token' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bene_id, amount, transfer_id, remarks }: TransferRequest = await req.json();

    console.log('=== Cashfree Create Transfer (Bearer Token Auth) ===');
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

    // Get Bearer Token
    const authResult = await getBearerToken();
    if (!authResult.success || !authResult.token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authResult.error || 'Failed to authenticate with Cashfree' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Using Bearer token for authentication');

    // Cashfree Payout v1 API - Request Transfer Payload
    const transferPayload = {
      beneId: bene_id,
      amount: amount.toString(),
      transferId: transfer_id,
      transferMode: 'banktransfer',
      remarks: remarks || 'Seller payout'
    };

    console.log('📤 Payload:', JSON.stringify(transferPayload, null, 2));

    // Call requestTransfer endpoint
    const response = await fetch(`${CASHFREE_PAYOUT_API_URL}/requestTransfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResult.token}`
      },
      body: JSON.stringify(transferPayload)
    });

    const responseData = await response.json();
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(responseData, null, 2));

    // Handle success
    if (response.ok && responseData.status === 'SUCCESS') {
      console.log('✅ Transfer created successfully:', transfer_id);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            transfer_id: responseData.data?.transferId || transfer_id,
            reference_id: responseData.data?.referenceId,
            utr: responseData.data?.utr,
            status: responseData.data?.status || 'PENDING',
            message: responseData.message || 'Transfer initiated successfully'
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle beneficiary not found
    if (response.status === 404 || responseData.subCode === 'BENE_NOT_EXIST') {
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
    if (response.status === 409 || responseData.subCode === 'DUPLICATE_TRANSFER') {
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
    if (responseData.subCode === 'INSUFFICIENT_BALANCE') {
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
        error: responseData.message || 'Failed to create transfer',
        error_code: responseData.subCode,
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
