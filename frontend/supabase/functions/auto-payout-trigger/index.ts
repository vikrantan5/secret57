// supabase/functions/auto-payout-trigger/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CASHFREE_PAYOUT_CLIENT_ID = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID');
const CASHFREE_PAYOUT_CLIENT_SECRET = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET');
// Use SANDBOX API URL - credentials with \"test\" are for sandbox environment
const CASHFREE_PAYOUT_API_URL = 'https://payout-gamma.cashfree.com/payout/v1';
const CASHFREE_API_VERSION = '2024-01-01';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Configuration - ZERO commission (subscription-only model)
const PLATFORM_COMMISSION_RATE = 0.00; // 0% - Sellers pay subscription, not commission
const HOLD_PERIOD_DAYS = 0; // 7-day escrow hold period



// Cache for Cashfree authorization token
let cachedToken: string | null = null;
let tokenExpiryTime: number = 0;

/**
 * Get Cashfree authorization token
 * Token is valid for 5 minutes, we cache it for 4 minutes
 */
async function getCashfreeToken(): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    // Return cached token if still valid
    if (cachedToken && Date.now() < tokenExpiryTime) {
      console.log('🔑 Using cached Cashfree token');
      return { success: true, token: cachedToken };
    }

    if (!CASHFREE_PAYOUT_CLIENT_ID || !CASHFREE_PAYOUT_CLIENT_SECRET) {
      return { success: false, error: 'Cashfree credentials not configured' };
    }

    console.log('🔑 Requesting new Cashfree authorization token...');

    const authResponse = await fetch(`${CASHFREE_PAYOUT_API_URL}/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': CASHFREE_PAYOUT_CLIENT_ID,
        'X-Client-Secret': CASHFREE_PAYOUT_CLIENT_SECRET
      }
    });

    const authData = await authResponse.json();

    console.log('🔑 Auth response:', JSON.stringify(authData, null, 2));

    if (authData.status === 'SUCCESS' && authData.data?.token) {
      cachedToken = authData.data.token;
      // Cache token for 4 minutes (token is valid for 5 minutes)
      tokenExpiryTime = Date.now() + (4 * 60 * 1000);
      console.log('✅ Authorization token obtained');
      return { success: true, token: cachedToken };
    }

    const errorMessage = authData.message || 'Failed to get authorization token';
    console.error('❌ Authorization failed:', errorMessage);
    return { success: false, error: errorMessage };
  } catch (error: any) {
    console.error('❌ Authorization exception:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Create Cashfree transfer using v1 API with Token Authorization
 */
async function createCashfreeTransfer(
  beneId: string,
  amount: number,
  transferId: string,
  remarks: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Step 1: Get authorization token
    const tokenResult = await getCashfreeToken();
    if (!tokenResult.success || !tokenResult.token) {
      return { success: false, error: tokenResult.error || 'Failed to get authorization token' };
    }

    console.log('🔑 Using Cashfree Payout API v1 (SANDBOX) with token auth');
    console.log('🔑 API URL:', CASHFREE_PAYOUT_API_URL);

    // V1 API uses different payload structure
    const transferPayload = {
      beneId: beneId,
      amount: amount.toString(),
      transferId: transferId,
      remarks: remarks
    };

    console.log('📤 Transfer payload:', JSON.stringify(transferPayload, null, 2));

    // Step 2: Make transfer request with token
    const response = await fetch(`${CASHFREE_PAYOUT_API_URL}/requestTransfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenResult.token}`
      },
      body: JSON.stringify(transferPayload)
    });
    const responseData = await response.json();

    console.log('📥 Cashfree HTTP status:', response.status);
    console.log('📥 Cashfree response:', JSON.stringify(responseData, null, 2));

    // v1 API returns { status: 'SUCCESS', subCode: '200', message: '...', data: { transfer: {...} } }
    if (responseData.status === 'SUCCESS' && responseData.data?.transfer) {
      const transfer = responseData.data.transfer;
      return {
        success: true,
        data: {
          transferId: transfer.transferId || transferId,
          referenceId: transfer.referenceId || transfer.utr,
          utr: transfer.utr || null,
          status: transfer.status || 'SUCCESS'
        }
      };
    }

    // Handle error response
    const errorMessage = responseData.message || responseData.subCode || 'Failed to create transfer';
    console.error('❌ Transfer failed:', errorMessage);
    console.error('❌ Full error response:', JSON.stringify(responseData, null, 2));
    
    return {
      success: false,
      error: errorMessage
    };
  } catch (error: any) {
    console.error('❌ Transfer exception:', error.message);
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
      console.log('🔍 Fetching order:', order_id);
      
      const { data: orderItems, error: orderError } = await supabase
        .from('order_items')
        .select(`
          *,
          seller:sellers!inner(
            id,
            company_name,
            user_id,
           seller_user:users!sellers_user_id_fkey(email, phone)
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
        .eq('order_id', order_id);

      if (orderError) {
        console.error('❌ Error fetching order items:', orderError);
      } else if (!orderItems || orderItems.length === 0) {
        console.error('❌ No order items found');
      } else {
        console.log('✅ Order items found:', orderItems.length);
        
        // Group items by seller - only include if order is paid and delivered
        for (const item of orderItems) {
          const order = item.order;
          const isPaid = order?.payment_status === 'paid';
          const isDelivered = order?.status === 'delivered' || order?.status === 'completed';
          
          console.log(`Order ${order?.order_number}: paid=${isPaid}, delivered=${isDelivered}`);
          
          if (isPaid && isDelivered) {
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
    }

     // PROCESS BOOKING (Services - Completion OTP)
    if (booking_id) {
      console.log('🔍 Fetching booking:', booking_id);
      
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          seller:sellers!inner(
            id,
            company_name,
            user_id,
            seller_user:users!sellers_user_id_fkey(email, phone)
          ),
          service:services(name, price)
        `)
        .eq('id', booking_id)
        .single();

      if (bookingError) {
        console.error('❌ Error fetching booking:', bookingError);
      } else if (!booking) {
        console.error('❌ Booking not found');
      } else {
           console.log('✅ Booking found:', booking.id);
        console.log('Payment status:', booking.payment_status);
        console.log('Status:', booking.status);
        console.log('OTP Verified:', booking.otp_verified);
        
        // Check if booking is PAID AND completed/otp_verified
        const isPaid = booking.payment_status === 'paid';
        const isCompleted = booking.status === 'completed' || booking.otp_verified === true;
        
        if (isPaid && isCompleted) {
          console.log('✅ Booking eligible for payout');
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
        } else {
            console.log('❌ Booking not eligible:', { isPaid, isCompleted, payment_status: booking.payment_status });
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
      console.log(`🏦 Fetching bank account for seller: ${sellerId}`);
      
      const { data: bankAccounts, error: bankError } = await supabase
        .from('seller_bank_accounts')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('is_primary', true)
        .eq('verification_status', 'verified');

      if (bankError) {
        console.error(`❌ Bank account query error for seller ${sellerId}:`, bankError);
        payoutResults.push({
          seller_id: sellerId,
          success: false,
          error: 'Error fetching bank account'
        });
        continue;
      }

      if (!bankAccounts || bankAccounts.length === 0) {
        console.error(`❌ No verified bank account for seller ${sellerId}`);
        payoutResults.push({
          seller_id: sellerId,
          success: false,
          error: 'No verified bank account found'
        });
        continue;
      }

      // Take the first verified primary account
      const bankAccount = bankAccounts[0];
      
      if (!bankAccount.cashfree_bene_id) {
        console.error(`❌ Missing cashfree_bene_id for seller ${sellerId}`);
        payoutResults.push({
          seller_id: sellerId,
          success: false,
          error: 'Bank account missing Cashfree beneficiary ID'
        });
        continue;
      }

      console.log(`✅ Bank account found: ${bankAccount.cashfree_bene_id}`);

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
            cashfree_bene_id: bankAccount.cashfree_bene_id,
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
             transaction_reference: transferResult.data?.referenceId || transferId,
            cashfree_transfer_id: transferResult.data?.transferId || null,
            cashfree_reference_id: transferResult.data?.referenceId || null
          })
          .eq('id', payout.id);


               // Update booking/order payout_status to completed
        if (group.type === 'booking') {
          await supabase
            .from('bookings')
            .update({ payout_status: 'completed' })
            .eq('id', group.booking_id);
        } else if (group.type === 'order') {
          await supabase
            .from('orders')
            .update({ payout_status: 'completed' })
            .eq('id', group.order_id);
        }

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


                // Update booking/order payout_status to failed
        if (group.type === 'booking') {
          await supabase
            .from('bookings')
            .update({ payout_status: 'failed' })
            .eq('id', group.booking_id);
        } else if (group.type === 'order') {
          await supabase
            .from('orders')
            .update({ payout_status: 'failed' })
            .eq('id', group.order_id);
        }

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