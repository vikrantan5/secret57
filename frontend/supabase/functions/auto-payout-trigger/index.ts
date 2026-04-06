// supabase/functions/auto-payout-trigger/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CASHFREE_PAYOUT_CLIENT_ID = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID');
const CASHFREE_PAYOUT_CLIENT_SECRET = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET');
const CASHFREE_PUBLIC_KEY = Deno.env.get('CASHFREE_PUBLIC_KEY');
const CASHFREE_PAYOUT_API_URL = 'https://payout-gamma.cashfree.com/payout/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Configuration - ZERO commission (subscription-only model)
const PLATFORM_COMMISSION_RATE = 0.00; // 0% - Sellers pay subscription, not commission
const HOLD_PERIOD_DAYS = 7; // 7-day escrow hold period

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
    { name: 'RSA-OAEP', hash: 'SHA-1' },  // Cashfree uses SHA-1, not SHA-256
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

    console.log('🔑 Getting Bearer token from Cashfree...');

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

/**
 * Create Cashfree transfer (Bearer Token Auth)
 */
async function createCashfreeTransfer(
  beneId: string,
  amount: number,
  transferId: string,
  remarks: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!CASHFREE_PAYOUT_CLIENT_ID || !CASHFREE_PAYOUT_CLIENT_SECRET) {
      return { success: false, error: 'Cashfree credentials not configured' };
    }

    // Get Bearer Token
    const authResult = await getBearerToken();
    if (!authResult.success || !authResult.token) {
      return { success: false, error: authResult.error || 'Failed to get authorization token' };
    }

    console.log('✅ Using Bearer token for transfer authentication');

    const transferPayload = {
      beneId: beneId,
      amount: amount.toString(),
      transferId: transferId,
      transferMode: 'banktransfer',
      remarks: remarks
    };

    const response = await fetch(`${CASHFREE_PAYOUT_API_URL}/requestTransfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResult.token}`
      },
      body: JSON.stringify(transferPayload)
    });

    const responseData = await response.json();

    if (response.ok && responseData.status === 'SUCCESS') {
      return {
        success: true,
        data: {
          transferId: responseData.data?.transferId,
          referenceId: responseData.data?.referenceId,
          utr: responseData.data?.utr,
          status: responseData.data?.status
        }
      };
    }

    return {
      success: false,
      error: responseData.message || 'Failed to create transfer'
    };
  } catch (error: any) {
    console.error('Transfer error:', error.message);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { order_id, booking_id, trigger_type } = await req.json();

    console.log('=== Auto-Payout Trigger ===');
    console.log('Order ID:', order_id);
    console.log('Booking ID:', booking_id);
    console.log('Trigger Type:', trigger_type);

    if (!order_id && !booking_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Order ID or Booking ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle either ORDER or BOOKING
    let sellerGroups = new Map();
    let payoutResults = [];

    // PROCESS ORDER (Products - Delivery OTP)
    if (order_id) {
      const { data: orderItems, error: orderError } = await supabase
        .from('order_items')
        .select(`
          *,
          seller:sellers!inner(
            id,
            company_name,
            user_id,
            users(email, phone)
          ),
          product:products(name, price),
          order:orders!inner(
            id,
            order_number,
            payment_status,
            status,
            actual_delivery_date,
            created_at,
            total_amount
          )
        `)
        .eq('order_id', order_id)
        .eq('order.payment_status', 'paid');

      if (!orderError && orderItems && orderItems.length > 0) {
        // Group items by seller
        for (const item of orderItems) {
          const sellerId = item.seller_id;
          if (!sellerGroups.has(sellerId)) {
            sellerGroups.set(sellerId, {
              seller: item.seller,
              items: [],
              totalAmount: 0,
              type: 'order',
              order_id: order_id
            });
          }
          const group = sellerGroups.get(sellerId);
          group.items.push(item);
          group.totalAmount += item.total_price || item.total || 0;
        }
      }
    }

    // PROCESS BOOKING (Services - Completion OTP)
    if (booking_id) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          seller:sellers!inner(
            id,
            company_name,
            user_id,
            users(email, phone)
          ),
          service:services(name, price)
        `)
        .eq('id', booking_id)
        .eq('payment_status', 'paid')
        .single();

      if (!bookingError && booking) {
        const sellerId = booking.seller_id;
        if (!sellerGroups.has(sellerId)) {
          sellerGroups.set(sellerId, {
            seller: booking.seller,
            items: [booking],
            totalAmount: booking.total_amount || 0,
            type: 'booking',
            booking_id: booking_id
          });
        }
      }
    }

    if (sellerGroups.size === 0) {
      console.log('No eligible items found for payout');
      return new Response(
        JSON.stringify({ success: false, error: 'No paid orders or bookings found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

      // Process payout for each seller
    for (const [sellerId, group] of sellerGroups) {
      console.log(`Processing ${group.type} payout for seller: ${sellerId}`);

      // INSTANT PAYOUT: Skip hold period check for 'immediate' trigger type (OTP verified)
      if (trigger_type === 'immediate') {
        console.log(`⚡ INSTANT PAYOUT: Skipping hold period for seller ${sellerId} (OTP verified)`);
      } else {
        // For non-immediate triggers, check hold period
        const referenceDate = group.type === 'order' 
          ? new Date(group.items[0].order?.actual_delivery_date || group.items[0].order?.created_at)
          : new Date(group.items[0].booking_date || group.items[0].created_at);
        
        const daysSince = (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSince < HOLD_PERIOD_DAYS) {
          console.log(`Hold period not met for seller ${sellerId} (${daysSince.toFixed(1)} days)`);
          payoutResults.push({
            seller_id: sellerId,
            success: false,
            error: `Hold period not met (${HOLD_PERIOD_DAYS} days required)`
          });
          continue;
        }
      }

      // Get seller's primary bank account
      const { data: bankAccount, error: bankError } = await supabase
        .from('seller_bank_accounts')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('is_primary', true)
        .eq('verification_status', 'verified')
        .single();

      if (bankError || !bankAccount || !bankAccount.cashfree_bene_id) {
        console.error(`No verified bank account for seller ${sellerId}`);
        payoutResults.push({
          seller_id: sellerId,
          success: false,
          error: 'No verified bank account found'
        });
        continue;
      }

      // Calculate payout amount - NO COMMISSION (subscription model)
      const grossAmount = group.totalAmount;
      const commission = 0; // No commission - sellers pay subscription instead
      const netAmount = grossAmount; // 100% to seller

      // Check minimum payout amount
      if (netAmount < 1) {
        console.log(`Payout amount too low for seller ${sellerId}: ₹${netAmount}`);
        payoutResults.push({
          seller_id: sellerId,
          success: false,
          error: 'Payout amount below minimum (₹1)'
        });
        continue;
      }

      // Generate unique transfer ID
      const transferId = `PAYOUT_${sellerId.substring(0, 8)}_${Date.now()}`;

      // Create payout record in database
      const { data: payout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          seller_id: sellerId,
          bank_account_id: bankAccount.id,
          amount: netAmount,
          platform_fee: 0, // ZERO commission
          net_amount: netAmount,
          order_ids: group.type === 'order' ? [group.order_id] : [],
          booking_ids: group.type === 'booking' ? [group.booking_id] : [],
          status: 'processing',
          payment_method: 'cashfree_payout',
          transaction_reference: transferId,
          notes: trigger_type === 'immediate' 
            ? `INSTANT PAYOUT (OTP verified) - ${group.type}` 
            : `${group.type} payout`,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (payoutError) {
        console.error(`Failed to create payout record for seller ${sellerId}:`, payoutError);
        payoutResults.push({
          seller_id: sellerId,
          success: false,
          error: 'Failed to create payout record'
        });
        continue;
      }

      // Initiate Cashfree transfer
      const transferResult = await createCashfreeTransfer(
        bankAccount.cashfree_bene_id,
        Math.round(netAmount * 100) / 100,
        transferId,
        trigger_type === 'immediate' 
          ? `INSTANT PAYOUT - ${group.type} (OTP verified)`
          : `Payout for ${group.type}`
      );

      if (transferResult.success) {
        // Update payout status to completed
        await supabase
          .from('payouts')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            transaction_reference: transferResult.data?.referenceId || transferId
          })
          .eq('id', payout.id);

        console.log(`✅ Payout successful for seller ${sellerId}: ₹${netAmount}`);
        payoutResults.push({
          seller_id: sellerId,
          success: true,
          amount: netAmount,
          transfer_id: transferId,
          utr: transferResult.data?.utr
        });
      } else {
        // Mark payout as failed
        await supabase
          .from('payouts')
          .update({
            status: 'failed',
            notes: `${payout.notes} | Error: ${transferResult.error}`
          })
          .eq('id', payout.id);

        console.error(`❌ Payout failed for seller ${sellerId}:`, transferResult.error);
        payoutResults.push({
          seller_id: sellerId,
          success: false,
          error: transferResult.error
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
               data: {
          order_id: order_id || null,
          booking_id: booking_id || null,
          trigger_type: trigger_type || 'manual',
          instant_payout: trigger_type === 'immediate',
          payouts: payoutResults,
          total_sellers: sellerGroups.size,
          successful_payouts: payoutResults.filter(p => p.success).length
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Exception in auto-payout-trigger:', error.message);
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