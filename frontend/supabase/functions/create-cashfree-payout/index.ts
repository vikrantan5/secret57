// Cashfree Payout Transfer Edge Function
// Deno Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CASHFREE_PAYOUT_CLIENT_ID = Deno.env.get('CASHFREE_PAYOUT_CLIENT_ID') ?? '';
const CASHFREE_PAYOUT_CLIENT_SECRET = Deno.env.get('CASHFREE_PAYOUT_CLIENT_SECRET') ?? '';
const CASHFREE_PAYOUT_API_URL = 'https://payout-gamma.cashfree.com/payout/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayoutRequest {
  seller_id: string;
  beneficiary_id: string; // Cashfree beneficiary ID
  amount: number;
  order_id?: string;
  booking_id?: string;
  payout_type?: string;
  remarks?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      seller_id,
      beneficiary_id,
      amount,
      order_id,
      booking_id,
      payout_type = 'manual_withdrawal',
      remarks,
    }: PayoutRequest = await req.json();

    // Validate required fields
    if (!seller_id || !beneficiary_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields or invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate Cashfree credentials
    if (!CASHFREE_PAYOUT_CLIENT_ID || !CASHFREE_PAYOUT_CLIENT_SECRET) {
      console.error('Missing Cashfree Payout credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Cashfree Payout credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get seller info
    const { data: seller } = await supabase
      .from('sellers')
      .select('user_id')
      .eq('id', seller_id)
      .single();

    if (!seller) {
      return new Response(
        JSON.stringify({ success: false, error: 'Seller not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get beneficiary from Supabase
    const { data: beneficiary } = await supabase
      .from('seller_beneficiaries')
      .select('*')
      .eq('beneficiary_id', beneficiary_id)
      .eq('status', 'ACTIVE')
      .single();

    if (!beneficiary) {
      return new Response(
        JSON.stringify({ success: false, error: 'Beneficiary not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique transfer ID
    const transfer_id = `TXN_${seller_id.replace(/-/g, '').substring(0, 12)}_${Date.now()}`;

    console.log('Creating Cashfree payout transfer:', transfer_id);

    // Calculate platform fee (e.g., 5%)
    const platformFeePercentage = 0.05; // 5%
    const platformFee = Math.round(amount * platformFeePercentage * 100) / 100;
    const netAmount = Math.round((amount - platformFee) * 100) / 100;

    // Create transfer request
    const transferPayload = {
      beneId: beneficiary_id,
      amount: netAmount.toString(),
      transferId: transfer_id,
      remarks: remarks || `Payout for seller ${seller_id}`,
    };

    console.log('Cashfree transfer payload:', JSON.stringify(transferPayload, null, 2));

    const cashfreeResponse = await fetch(`${CASHFREE_PAYOUT_API_URL}/requestTransfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': CASHFREE_PAYOUT_CLIENT_ID,
        'X-Client-Secret': CASHFREE_PAYOUT_CLIENT_SECRET,
      },
      body: JSON.stringify(transferPayload),
    });

    const cashfreeData = await cashfreeResponse.json();

    console.log('Cashfree API response status:', cashfreeResponse.status);
    console.log('Cashfree API response:', JSON.stringify(cashfreeData, null, 2));

    // Determine status
    let payoutStatus = 'PENDING';
    let failureReason = null;

    if (!cashfreeResponse.ok || cashfreeData.status !== 'SUCCESS') {
      payoutStatus = 'FAILED';
      failureReason = cashfreeData.message || cashfreeData.subCode || 'Payout failed';
    } else if (cashfreeData.data?.transfer?.status) {
      const cfStatus = cashfreeData.data.transfer.status.toUpperCase();
      if (cfStatus === 'SUCCESS') payoutStatus = 'SUCCESS';
      else if (cfStatus === 'FAILED' || cfStatus === 'REJECTED') payoutStatus = 'FAILED';
      else if (cfStatus === 'PENDING' || cfStatus === 'INITIATED') payoutStatus = 'PROCESSING';
    }

    // Get beneficiary DB record ID
    const { data: beneficiaryRecord } = await supabase
      .from('seller_beneficiaries')
      .select('id')
      .eq('beneficiary_id', beneficiary_id)
      .single();

    // Save payout in Supabase
    const { data: savedPayout, error: saveError } = await supabase
      .from('seller_payouts')
      .insert({
        seller_id,
        user_id: seller.user_id,
        beneficiary_id: beneficiaryRecord?.id,
        order_id,
        booking_id,
        payout_type,
        amount,
        platform_fee: platformFee,
        net_amount: netAmount,
        transfer_id,
        cf_transfer_id: cashfreeData.data?.transfer?.referenceId || null,
        status: payoutStatus,
        failure_reason: failureReason,
        cf_response: cashfreeData,
        utr_number: cashfreeData.data?.transfer?.utr || null,
        transferred_at: payoutStatus === 'SUCCESS' ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save payout in Supabase:', saveError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payout initiated but failed to save in database',
          details: saveError,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update seller earnings if payout successful
    if (payoutStatus === 'SUCCESS' || payoutStatus === 'PROCESSING') {
      await supabase.rpc('update_seller_earnings_after_payout', {
        p_seller_id: seller_id,
        p_amount: amount,
      });

      // Or manual update if RPC doesn't exist
      await supabase
        .from('seller_earnings')
        .update({
          total_payouts: supabase.sql`total_payouts + ${netAmount}`,
          available_balance: supabase.sql`available_balance - ${amount}`,
          pending_amount: supabase.sql`pending_amount - ${amount}`,
          last_payout_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('seller_id', seller_id);

      console.log('✅ Seller earnings updated');
    }

    // Send notification to seller
    await supabase.from('notifications').insert({
      user_id: seller.user_id,
      type: 'payout',
      title: payoutStatus === 'FAILED' ? '❌ Payout Failed' : '✅ Payout Initiated',
      message: payoutStatus === 'FAILED' 
        ? `Payout of ₹${netAmount} failed. Reason: ${failureReason}`
        : `Payout of ₹${netAmount} has been initiated. It will be credited to your account shortly.`,
      data: { payout_id: savedPayout.id, transfer_id },
      created_at: new Date().toISOString(),
    });

    console.log('✅ Payout saved and notification sent');

    if (payoutStatus === 'FAILED') {
      return new Response(
        JSON.stringify({
          success: false,
          error: failureReason,
          data: savedPayout,
          cashfree_response: cashfreeData,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payout initiated successfully',
        data: savedPayout,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in create-cashfree-payout:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
