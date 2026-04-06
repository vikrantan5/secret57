// Cashfree Payout API v1 - Get Authorization Bearer Token (with RSA Signature)
// This function obtains a Bearer token for all Cashfree Payout API calls
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

    // Import the RSA public key (using SHA-1 for OAEP, matching Cashfree's implementation)
    const publicKey = await crypto.subtle.importKey(
      'spki',
      binaryDer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-1'  // Cashfree uses SHA-1
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== Cashfree Authorize - Get Bearer Token (RSA Signature) ===');

    // Validate credentials
    if (!CASHFREE_PAYOUT_CLIENT_ID || !CASHFREE_PAYOUT_CLIENT_SECRET) {
      console.error('❌ ERROR: Cashfree credentials not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cashfree credentials not configured. Please add CASHFREE_PAYOUT_CLIENT_ID and CASHFREE_PAYOUT_CLIENT_SECRET to Supabase secrets.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!CASHFREE_PUBLIC_KEY) {
      console.error('❌ ERROR: Cashfree public key not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cashfree public key not configured. Please add CASHFREE_PUBLIC_KEY to Supabase secrets.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📤 Calling Cashfree /authorize endpoint with RSA signature...');

    // Generate RSA signature
    const signature = await generateRSASignature(CASHFREE_PAYOUT_CLIENT_ID, CASHFREE_PUBLIC_KEY);

    // Call Cashfree authorize endpoint
    const response = await fetch(`${CASHFREE_PAYOUT_API_URL}/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': CASHFREE_PAYOUT_CLIENT_ID,
        'X-Client-Secret': CASHFREE_PAYOUT_CLIENT_SECRET,
        'X-Cf-Signature': signature
      }
    });

    const responseData = await response.json();
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response:', JSON.stringify(responseData, null, 2));

    // Handle success
    if (response.ok && responseData.status === 'SUCCESS') {
      const token = responseData.data?.token;
      
      if (!token) {
        console.error('❌ No token in response');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No token received from Cashfree' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Bearer token obtained successfully');
      console.log('🔑 Token:', token.substring(0, 20) + '...');

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            token: token,
            expiry: responseData.data?.expiry || '24 hours'
          } 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle errors
    console.error('❌ Authorization failed:', responseData);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: responseData.message || 'Failed to get authorization token',
        details: responseData
      }),
      { status: response.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Exception in cashfree-authorize:', error.message);
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
