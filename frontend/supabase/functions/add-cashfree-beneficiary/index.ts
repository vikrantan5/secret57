// Cashfree Payout API v2 - Add Beneficiary with Signature Authentication
// Updated for 2025 - Uses v2 standard mode with RSA signature
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CASHFREE_PAYOUT_CLIENT_ID = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID');
const CASHFREE_PAYOUT_CLIENT_SECRET = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET');
const CASHFREE_PUBLIC_KEY = Deno.env.get('CASHFREE_PUBLIC_KEY'); // RSA Public Key
const CASHFREE_PAYOUT_API_URL = 'https://sandbox.cashfree.com/payout'; // v2 sandbox
const API_VERSION = '2025-01-01';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate RSA signature for Cashfree authentication
async function generateSignature(clientId: string, publicKeyPem: string): Promise<string> {
  try {
    // Get current Unix timestamp
    const timestamp = Math.floor(Date.now() / 1000);
    const dataToEncrypt = `${clientId}.${timestamp}`;
    
    console.log('Generating signature for:', dataToEncrypt);
    
    // Import the public key
    const publicKey = await crypto.subtle.importKey(
      'spki',
      pemToArrayBuffer(publicKeyPem),
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false,
      ['encrypt']
    );
    
    // Encrypt the data
    const encoder = new TextEncoder();
    const data = encoder.encode(dataToEncrypt);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      data
    );
    
    // Convert to base64
    const signature = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    console.log('✅ Signature generated successfully');
    return signature;
  } catch (error: any) {
    console.error('❌ Signature generation failed:', error.message);
    throw new Error(`Failed to generate signature: ${error.message}`);
  }
}

// Convert PEM format to ArrayBuffer
function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Remove PEM header/footer and whitespace
  const pemContents = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');
  
  // Decode base64
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
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

    console.log('=== Cashfree v2 Add Beneficiary (with Signature) ===');
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

    // Check if public key is available for signature generation
    let signature = '';
    if (CASHFREE_PUBLIC_KEY) {
      console.log('🔐 Generating request signature...');
      try {
        signature = await generateSignature(CASHFREE_PAYOUT_CLIENT_ID, CASHFREE_PUBLIC_KEY);
      } catch (error: any) {
        console.error('⚠️  Signature generation failed, continuing without signature');
        console.error('Error:', error.message);
        // Continue without signature - will work if IP is whitelisted
      }
    } else {
      console.log('⚠️  No public key found - IP must be whitelisted or add CASHFREE_PUBLIC_KEY to secrets');
    }

    // Prepare headers
    const headers: any = {
      'Content-Type': 'application/json',
      'x-api-version': API_VERSION,
      'x-client-id': CASHFREE_PAYOUT_CLIENT_ID,
      'x-client-secret': CASHFREE_PAYOUT_CLIENT_SECRET,
    };

    // Add signature if generated
    if (signature) {
      headers['x-cf-signature'] = signature;
      console.log('✅ Request signature added to headers');
    }

    // Cashfree Payout v2 API - Create Beneficiary
    const beneficiaryPayload = {
      beneficiary_id: bene_id,
      beneficiary_name: name,
      beneficiary_instrument_details: {
        bank_account_number: bank_account,
        bank_ifsc: ifsc.toUpperCase()
      },
      beneficiary_contact_details: {
        beneficiary_email: email || 'noreply@example.com',
        beneficiary_phone: phone || '9999999999',
        beneficiary_country_code: '+91'
      }
    };

    console.log('Payload:', JSON.stringify(beneficiaryPayload, null, 2));

    const response = await fetch(`${CASHFREE_PAYOUT_API_URL}/beneficiary`, {
      method: 'POST',
      headers,
      body: JSON.stringify(beneficiaryPayload)
    });

    const responseData = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(responseData, null, 2));

    // Handle success
    if (response.ok) {
      console.log('✅ Beneficiary created successfully:', bene_id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            bene_id: responseData.beneficiary_id || bene_id,
            status: responseData.beneficiary_status || 'VERIFIED',
            message: 'Beneficiary added successfully' 
          } 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle already exists error
    if (response.status === 409 || responseData.message?.includes('already exists')) {
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

    // Handle signature errors
    if (response.status === 400 && responseData.message?.includes('Signature missing')) {
      console.error('❌ Signature required but missing or invalid');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication failed: Signature required. Please whitelist your IP in Cashfree Dashboard or add CASHFREE_PUBLIC_KEY to Supabase secrets.',
          details: 'Go to Cashfree Dashboard → Settings → IP Whitelist and add your Supabase edge function IP'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
