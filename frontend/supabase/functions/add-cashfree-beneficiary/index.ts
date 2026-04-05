// Cashfree Payout API v2 - Add Beneficiary
// Fixed: Using Web Crypto API for HMAC-SHA256 signature
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CASHFREE_PAYOUT_CLIENT_ID = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID');
const CASHFREE_PAYOUT_CLIENT_SECRET = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET');
const CASHFREE_PAYOUT_API_URL = 'https://payout-gamma.cashfree.com/payout/v1';
const API_VERSION = '2024-01-01';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate HMAC-SHA256 signature using Web Crypto API
 * Format: HMAC-SHA256(client_id.timestamp, client_secret)
 */
async function generateSignature(clientId: string, clientSecret: string): Promise<string> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${clientId}.${timestamp}`;
    
    console.log('🔐 Generating HMAC-SHA256 signature for:', message);
    
    // Encode the secret key and message
    const encoder = new TextEncoder();
    const keyData = encoder.encode(clientSecret);
    const messageData = encoder.encode(message);
    
    // Import the key for HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Sign the message
    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    
    // Convert to base64
    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    console.log('✅ Signature generated successfully');
    return base64Signature;
  } catch (error: any) {
    console.error('❌ Signature generation failed:', error.message);
    throw new Error(`Failed to generate signature: ${error.message}`);
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

    console.log('=== Cashfree v2 Add Beneficiary (HMAC-SHA256) ===');
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

    // Validate credentials
    if (!CASHFREE_PAYOUT_CLIENT_ID || !CASHFREE_PAYOUT_CLIENT_SECRET) {
      console.error('ERROR: Cashfree credentials not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cashfree credentials not configured. Please add CASHFREE_PAYOUT_CLIENT_ID and CASHFREE_PAYOUT_CLIENT_SECRET to Supabase secrets.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate HMAC-SHA256 signature
    console.log('🔐 Generating HMAC-SHA256 signature...');
    const signature = await generateSignature(CASHFREE_PAYOUT_CLIENT_ID, CASHFREE_PAYOUT_CLIENT_SECRET);

    // Prepare headers for Cashfree Payout API v2
    const headers: any = {
      'Content-Type': 'application/json',
      'x-api-version': API_VERSION,
      'x-client-id': CASHFREE_PAYOUT_CLIENT_ID,
      'x-client-secret': CASHFREE_PAYOUT_CLIENT_SECRET,
      'x-cf-signature': signature,
    };

    console.log('✅ Request signature added to headers');

    // Cashfree Payout v2 API - Create Beneficiary
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

    const response = await fetch(`${CASHFREE_PAYOUT_API_URL}/addBeneficiary`, {
      method: 'POST',
      headers,
      body: JSON.stringify(beneficiaryPayload)
    });

    const responseData = await response.json();
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(responseData, null, 2));

    // Handle success
    if (response.ok || response.status === 200) {
      console.log('✅ Beneficiary created successfully:', bene_id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            bene_id: responseData.data?.beneId || bene_id,
            status: responseData.data?.status || responseData.status || 'VERIFIED',
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

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      console.error('❌ Authentication failed:', responseData);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication failed. Please check your Cashfree credentials.',
          details: responseData.message || responseData.error
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle other errors
    console.error('❌ Failed to add beneficiary:', responseData);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: responseData.message || responseData.error || 'Failed to add beneficiary',
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
