// Cashfree Seller Payout - Create Transfer
// Deno Edge Function
// Automatically pays sellers after order delivery or service completion

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CASHFREE_PAYOUT_CLIENT_ID = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID') ?? '';
const CASHFREE_PAYOUT_CLIENT_SECRET = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET') ?? '';
const CASHFREE_PUBLIC_KEY = Deno.env.get('CASHFREE_PUBLIC_KEY') ?? '';
const CASHFREE_PAYOUT_API_URL = 'https://payout-gamma.cashfree.com/payout/v1';
const PLATFORM_FEE_PERCENTAGE = 0.10; // 10% platform fee

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
 * Get Bearer Token from Cashfree
 */
async function getBearerToken(): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
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

    return { success: false, error: data.message || 'Failed to get token' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Create Cashfree Transfer (Payout)
 */
async function createTransfer(
  token: string,
  transferId: string,
  beneficiaryId: string,
  amount: number,
  remarks: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const payload = {
      transferId: transferId,
      beneId: beneficiaryId,
      amount: amount.toString(),
      transferMode: 'banktransfer',
      remarks: remarks
    };

    console.log('📤 Transfer Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${CASHFREE_PAYOUT_API_URL}/requestTransfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('📥 Transfer Response:', JSON.stringify(data, null, 2));

    if (response.ok && data.status === 'SUCCESS') {
      return { 
        success: true, 
        data: { 
          transfer_id: data.data?.transferId || transferId,
          reference_id: data.data?.referenceId,
          status: data.data?.status || 'PENDING'
        } 
      };
    }

    return { success: false, error: data.message || 'Transfer failed' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { seller_id, order_id, booking_id, amount } = await req.json();

    console.log('=== Create Seller Payout ===');
    console.log('Seller ID:', seller_id);
    console.log('Order ID:', order_id);
    console.log('Booking ID:', booking_id);
    console.log('Amount:', amount);

    if (!seller_id || !amount || (!order_id && !booking_id)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: seller_id, amount, and (order_id or booking_id)' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get seller details with bank account
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('*, bank_accounts:seller_bank_accounts(*)')
      .eq('id', seller_id)
      .single();

    if (sellerError || !seller) {
      return new Response(
        JSON.stringify({ success: false, error: 'Seller not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if seller is blocked
    if (seller.is_blocked) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cannot process payout for blocked seller' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get primary bank account
    const primaryAccount = seller.bank_accounts?.find((acc: any) => acc.is_primary) || seller.bank_accounts?.[0];

    if (!primaryAccount) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Seller has no bank account configured' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate platform fee and net amount
    const platformFee = amount * PLATFORM_FEE_PERCENTAGE;
    const netAmount = amount - platformFee;

    console.log('💰 Amount:', amount);
    console.log('💸 Platform Fee (10%):', platformFee);
    console.log('💵 Net Amount:', netAmount);

    // Check if payout already exists
    const { data: existingPayout } = await supabase
      .from('payout_transactions')
      .select('*')
      .eq('seller_id', seller_id)
      .eq(order_id ? 'order_id' : 'booking_id', order_id || booking_id)
      .single();

    if (existingPayout) {
      console.log('⚠️ Payout already exists:', existingPayout.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payout already processed',
          data: existingPayout 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Bearer Token
    const authResult = await getBearerToken();
    if (!authResult.success || !authResult.token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authResult.error || 'Failed to authenticate' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique transfer ID
    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const beneficiaryId = primaryAccount.cashfree_beneficiary_id || `bene_${seller_id}`;

    // Create transfer
    const transferResult = await createTransfer(
      authResult.token,
      transferId,
      beneficiaryId,
      netAmount,
      order_id ? `Payout for Order ${order_id.slice(0, 8)}` : `Payout for Booking ${booking_id.slice(0, 8)}`
    );

    if (!transferResult.success) {
      // Create failed payout record
      const { data: failedPayout } = await supabase
        .from('payout_transactions')
        .insert({
          seller_id: seller_id,
          order_id: order_id,
          booking_id: booking_id,
          amount: amount,
          platform_fee: platformFee,
          net_amount: netAmount,
          cashfree_transfer_id: transferId,
          cashfree_beneficiary_id: beneficiaryId,
          status: 'failed',
          failure_reason: transferResult.error
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: transferResult.error,
          payout_id: failedPayout?.id 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create successful payout record
    const { data: payout, error: payoutError } = await supabase
      .from('payout_transactions')
      .insert({
        seller_id: seller_id,
        order_id: order_id,
        booking_id: booking_id,
        amount: amount,
        platform_fee: platformFee,
        net_amount: netAmount,
        cashfree_transfer_id: transferId,
        cashfree_beneficiary_id: beneficiaryId,
        status: 'processing',
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (payoutError) {
      console.error('❌ Failed to create payout record:', payoutError);
    } else {
      console.log('✅ Payout record created:', payout.id);

      // Update order_items or booking payout status
      if (order_id) {
        await supabase
          .from('order_items')
          .update({ 
            payout_status: 'processing',
            payout_reference: transferId 
          })
          .eq('order_id', order_id)
          .eq('seller_id', seller_id);
      } else if (booking_id) {
        await supabase
          .from('bookings')
          .update({ payout_status: 'processing' })
          .eq('id', booking_id);
      }

      // Send notification to seller
      await supabase
        .from('notifications')
        .insert({
          user_id: seller.user_id,
          type: 'payment',
          title: 'Payout Initiated',
          message: `Your payout of ₹${netAmount.toFixed(2)} has been initiated and will be credited to your bank account shortly.`,
          data: { payout_id: payout.id }
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          payout_id: payout?.id,
          transfer_id: transferId,
          net_amount: netAmount,
          platform_fee: platformFee,
          status: 'processing'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in create-seller-payout:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
