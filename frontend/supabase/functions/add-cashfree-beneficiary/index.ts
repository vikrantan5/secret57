// Cashfree Payout API v1 - Add Beneficiary (Fixed: Using Bearer Token with RSA Signature)
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
 * Format: RSA-OAEP encrypt(client_id.timestamp, public_key) → base64
 */
async function generateRSASignature(clientId: string, publicKeyPem: string): Promise<string> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${clientId}.${timestamp}`;
    
    console.log('🔐 Generating RSA signature for:', message);

    // Remove PEM headers/footers and whitespace
    const pemContents = publicKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\s/g, '');

    // Decode base64 to binary
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    // Import the RSA public key (using SHA-1 for OAEP, matching Cashfree's PHP implementation)
    const publicKey = await crypto.subtle.importKey(
      'spki',
      binaryDer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-1'  // Cashfree uses SHA-1, not SHA-256
      },
      false,
      ['encrypt']
    );

    // Encode message to Uint8Array
    const encoder = new TextEncoder();
    const messageData = encoder.encode(message);

    // Encrypt with RSA-OAEP
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP'
      },
      publicKey,
      messageData
    );

    // Convert to base64
    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
    
    console.log('✅ RSA signature generated successfully');
    return base64Signature;
  } catch (error: any) {
    console.error('❌ RSA signature generation failed:', error.message);
    throw new Error(`Failed to generate RSA signature: ${error.message}`);
  }
}

/**
 * Get Bearer Token from Cashfree Authorize API with RSA Signature
 */
async function getBearerToken(): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    if (!CASHFREE_PAYOUT_CLIENT_ID || !CASHFREE_PAYOUT_CLIENT_SECRET) {
      return { success: false, error: 'Cashfree credentials not configured' };
    }

    if (!CASHFREE_PUBLIC_KEY) {
      return { success: false, error: 'Cashfree public key not configured' };
    }

    console.log('🔑 Getting Bearer token from Cashfree...');

    // Generate RSA signature
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
    console.log('📥 Authorize Response:', JSON.stringify(data, null, 2));

    if (response.ok && data.status === 'SUCCESS' && data.data?.token) {
      console.log('✅ Bearer token obtained successfully');
      return { success: true, token: data.data.token };
    }

    console.error('❌ Failed to get Bearer token:', data);
    return { success: false, error: data.message || 'Failed to get authorization token' };
  } catch (error: any) {
    console.error('❌ Exception in getBearerToken:', error.message);
    return { success: false, error: error.message };
  }
}

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

    console.log('=== Cashfree Add Beneficiary (Bearer Token Auth) ===');
    console.log('Beneficiary ID:', bene_id);
    console.log('Name:', name);
    console.log('Bank Account:', bank_account);
    console.log('IFSC:', ifsc);

    // Validate required fields
    if (!bene_id || !name || !bank_account || !ifsc) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: bene_id, name, bank_account, ifsc' 
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

    // Prepare headers with Bearer token
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authResult.token}`
    };

    console.log('✅ Using Bearer token for authentication');

    // Cashfree Payout v1 API - Add Beneficiary Payload
    const beneficiaryPayload = {
      beneId: bene_id,
      name: name,
      email: email || 'noreply@example.com',
      phone: phone || '9999999999',
      bankAccount: bank_account,
      ifsc: ifsc.toUpperCase(),
      address1: address1 || 'Address',
      city: city || 'City',
      state: state || 'State',
      pincode: pincode || '000000'
    };

    console.log('📤 Payload:', JSON.stringify(beneficiaryPayload, null, 2));

    // Call addBeneficiary endpoint
    const response = await fetch(`${CASHFREE_PAYOUT_API_URL}/addBeneficiary`, {
      method: 'POST',
      headers,
      body: JSON.stringify(beneficiaryPayload)
    });

    const responseData = await response.json();
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(responseData, null, 2));

    // Handle success
    if (response.ok && responseData.status === 'SUCCESS') {
      console.log('✅ Beneficiary created successfully:', bene_id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            bene_id: responseData.data?.beneId || bene_id,
            status: responseData.data?.status || 'VERIFIED',
            message: responseData.message || 'Beneficiary added successfully' 
          } 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle already exists error
    if (response.status === 409 || responseData.message?.toLowerCase().includes('already exists')) {
      console.log('⚠️  Beneficiary already exists:', bene_id);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            bene_id: bene_id,
            status: 'VERIFIED',
            message: 'Beneficiary already exists'
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle errors
    console.error('❌ Failed to add beneficiary:', responseData);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: responseData.message || 'Failed to add beneficiary',
        details: responseData
      }),
      { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Exception in add-cashfree-beneficiary:', error.message);
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
