// Cashfree Payout API v1 - Get/Verify Beneficiary (Fixed: Bearer Token with RSA Signature)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CASHFREE_PAYOUT_CLIENT_ID = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID');
const CASHFREE_PAYOUT_CLIENT_SECRET = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET');
const CASHFREE_PUBLIC_KEY = Deno.env.get('CASHFREE_PUBLIC_KEY');
const CASHFREE_PAYOUT_API_URL = 'https://payout-gamma.cashfree.com/payout/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { bene_id } = await req.json();

    console.log('=== Cashfree Get Beneficiary (Bearer Token Auth) ===');
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

    // Call getBeneficiary endpoint
    const response = await fetch(`${CASHFREE_PAYOUT_API_URL}/getBeneficiary/${bene_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResult.token}`
      }
    });

    const responseData = await response.json();
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(responseData, null, 2));

    if (response.ok && responseData.status === 'SUCCESS') {
      console.log('✅ Beneficiary verified:', bene_id);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            bene_id: responseData.data?.beneId || bene_id,
            name: responseData.data?.name,
            status: responseData.data?.status,
            bank_account: responseData.data?.bankAccount,
            ifsc: responseData.data?.ifsc
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
        error: responseData.message || 'Failed to verify beneficiary'
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
