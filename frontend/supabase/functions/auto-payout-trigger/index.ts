// supabase/functions/auto-payout-trigger/index.ts
// FIXED VERSION v3 - Direct authentication without token/signature
// For Cashfree Payout API with cfsk credentials

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CASHFREE_PAYOUT_CLIENT_ID = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID');
const CASHFREE_PAYOUT_CLIENT_SECRET = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET');

// Try BOTH API endpoints - v1 and Standard
const CASHFREE_API_V1 = 'https://payout-gamma.cashfree.com/payout/v1';
const CASHFREE_API_STANDARD = 'https://payout-gamma.cashfree.com/payout/v1.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PLATFORM_COMMISSION_RATE = 0.00;
const HOLD_PERIOD_DAYS = 0;

/**
 * Create Cashfree transfer - Try multiple API versions
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

    console.log('💸 Creating Cashfree transfer');
    console.log('💸 Beneficiary ID:', beneId);
    console.log('💸 Amount:', amount);
    console.log('💸 Transfer ID:', transferId);

    // METHOD 1: Try Standard API v1.2 with direct credentials
    console.log('🔄 Trying Standard API v1.2...');
    
    const payload = {
      beneId: beneId,
      amount: amount.toFixed(2),
      transferId: transferId,
      transferMode: 'banktransfer',
      remarks: remarks
    };

    console.log('📤 Payload:', JSON.stringify(payload, null, 2));

    const response1 = await fetch(`${CASHFREE_API_STANDARD}/requestTransfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': CASHFREE_PAYOUT_CLIENT_ID,
        'X-Client-Secret': CASHFREE_PAYOUT_CLIENT_SECRET,
      },
      body: JSON.stringify(payload)
    });

    const responseData1 = await response1.json();
    console.log('📥 v1.2 Response:', JSON.stringify(responseData1, null, 2));

    if (responseData1.status === 'SUCCESS' || responseData1.status === 'success') {
      const transfer = responseData1.data?.transfer || responseData1.data;
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

    // METHOD 2: Try v1 API
    console.log('🔄 v1.2 failed, trying v1 API...');
    
    const response2 = await fetch(`${CASHFREE_API_V1}/requestTransfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': CASHFREE_PAYOUT_CLIENT_ID,
        'X-Client-Secret': CASHFREE_PAYOUT_CLIENT_SECRET,
      },
      body: JSON.stringify(payload)
    });

    const responseData2 = await response2.json();
    console.log('📥 v1 Response:', JSON.stringify(responseData2, null, 2));

    if (responseData2.status === 'SUCCESS' || responseData2.status === 'success') {
      const transfer = responseData2.data?.transfer || responseData2.data;
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

    // METHOD 3: Try with addBeneficiary endpoint (if beneficiary doesn't exist)
    if (responseData2.message?.includes('Beneficiary') || responseData2.message?.includes('beneficiary')) {
      console.log('⚠️ Beneficiary issue detected, checking if bene exists...');
      
      const getBeneResponse = await fetch(`${CASHFREE_API_STANDARD}/getBeneficiary/${beneId}`, {
        method: 'GET',
        headers: {
          'X-Client-Id': CASHFREE_PAYOUT_CLIENT_ID,
          'X-Client-Secret': CASHFREE_PAYOUT_CLIENT_SECRET,
        }
      });

      const beneData = await getBeneResponse.json();
      console.log('📥 Beneficiary check:', JSON.stringify(beneData, null, 2));

      if (beneData.status === 'ERROR') {
        return {
          success: false,
          error: `Beneficiary not found in Cashfree. Please add bank account first. BeneID: ${beneId}`
        };
      }
    }

    // All methods failed
    const errorMessage = responseData2.message || responseData1.message || 'Failed to create transfer';
    console.error('❌ All API methods failed');
    console.error('❌ Error:', errorMessage);
    
    return {
      success: false,
      error: `${errorMessage} | v1.2 error: ${responseData1.message} | v1 error: ${responseData2.message}`
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

    let sellerGroups = new Map();
    let payoutResults = [];

    // PROCESS ORDER
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
        
        for (const item of orderItems) {
          const order = item.order;
          const isPaid = order?.payment_status === 'paid';
          const isDelivered = order?.status === 'delivered' || order?.status === 'completed';
          
          if (isPaid && isDelivered) {
            const sellerId = item.seller_id;
            if (!sellerGroups.has(sellerId)) {
              sellerGroups.set(sellerId, {
                seller: item.seller,
                items: [],
                totalAmount: 0,
                type: 'order',
                order_id: order_id,
                cashfree_bene_id: item.cashfree_bene_id,
                seller_bank_account_id: item.seller_bank_account_id
              });
            }
            const group = sellerGroups.get(sellerId);
            group.items.push(item);
            group.totalAmount += item.seller_payout_amount || item.total_price || item.total || 0;
          }
        }
      }
    }

    // PROCESS BOOKING
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
        console.log('OTP Verified:', booking.otp_verified);
        console.log('Stored Cashfree Bene ID:', booking.cashfree_bene_id);
        
        const isPaid = booking.payment_status === 'paid';
        const isCompleted = booking.status === 'completed' || booking.otp_verified === true;
        
        if (isPaid && isCompleted) {
          console.log('✅ Booking eligible for payout');
          const sellerId = booking.seller_id;
          if (!sellerGroups.has(sellerId)) {
            sellerGroups.set(sellerId, {
              seller: booking.seller,
              items: [booking],
              totalAmount: booking.seller_payout_amount || booking.total_amount || 0,
              type: 'booking',
              booking_id: booking_id,
              cashfree_bene_id: booking.cashfree_bene_id,
              seller_bank_account_id: booking.seller_bank_account_id
            });
          }
        } else {
          console.log('❌ Booking not eligible:', { isPaid, isCompleted });
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

      if (trigger_type === 'immediate') {
        console.log(`⚡ INSTANT PAYOUT: Skipping hold period (OTP verified)`);
      }

      // Get beneficiary ID
      let cashfree_bene_id = group.cashfree_bene_id;
      let bank_account_id = group.seller_bank_account_id;

      if (!cashfree_bene_id) {
        console.log(`🏦 Fetching bank account for seller: ${sellerId} (fallback)`);
        
        const { data: bankAccounts, error: bankError } = await supabase
          .from('seller_bank_accounts')
          .select('*')
          .eq('seller_id', sellerId)
          .eq('is_primary', true)
          .eq('verification_status', 'verified');

        if (bankError || !bankAccounts || bankAccounts.length === 0) {
          console.error(`❌ No verified bank account for seller ${sellerId}`);
          payoutResults.push({
            seller_id: sellerId,
            success: false,
            error: 'No verified bank account found'
          });
          continue;
        }

        const bankAccount = bankAccounts[0];
        cashfree_bene_id = bankAccount.cashfree_bene_id;
        bank_account_id = bankAccount.id;
      } else {
        console.log(`✅ Using stored beneficiary ID: ${cashfree_bene_id}`);
      }

      if (!cashfree_bene_id) {
        console.error(`❌ Missing cashfree_bene_id for seller ${sellerId}`);
        payoutResults.push({
          seller_id: sellerId,
          success: false,
          error: 'Missing Cashfree beneficiary ID'
        });
        continue;
      }

      const grossAmount = group.totalAmount;
      const netAmount = grossAmount;

      if (netAmount < 1) {
        payoutResults.push({
          seller_id: sellerId,
          success: false,
          error: 'Payout amount below minimum (₹1)'
        });
        continue;
      }

      const transferId = `PAYOUT_${sellerId.substring(0, 8)}_${Date.now()}`;

      // Create payout record
      const { data: payout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          seller_id: sellerId,
          bank_account_id: bank_account_id,
          amount: netAmount,
          platform_fee: 0,
          net_amount: netAmount,
          order_ids: group.type === 'order' ? [group.order_id] : [],
          booking_ids: group.type === 'booking' ? [group.booking_id] : [],
          status: 'processing',
          payment_method: 'cashfree_payout',
          transaction_reference: transferId,
          cashfree_bene_id: cashfree_bene_id,
          notes: trigger_type === 'immediate' 
            ? `INSTANT PAYOUT (OTP verified) - ${group.type}` 
            : `${group.type} payout`,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (payoutError) {
        console.error(`Failed to create payout record:`, payoutError);
        payoutResults.push({
          seller_id: sellerId,
          success: false,
          error: 'Failed to create payout record'
        });
        continue;
      }

      // Initiate Cashfree transfer
      const transferResult = await createCashfreeTransfer(
        cashfree_bene_id,
        netAmount,
        transferId,
        trigger_type === 'immediate' 
          ? `INSTANT PAYOUT - ${group.type} (OTP verified)`
          : `Payout for ${group.type}`
      );

      if (transferResult.success) {
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

        console.log(`✅ Payout successful: ₹${netAmount}`);
        payoutResults.push({
          seller_id: sellerId,
          success: true,
          amount: netAmount,
          transfer_id: transferId,
          utr: transferResult.data?.utr
        });
      } else {
        await supabase
          .from('payouts')
          .update({
            status: 'failed',
            notes: `${payout.notes} | Error: ${transferResult.error}`
          })
          .eq('id', payout.id);

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

        console.error(`❌ Payout failed:`, transferResult.error);
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
    console.error('❌ Exception:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
