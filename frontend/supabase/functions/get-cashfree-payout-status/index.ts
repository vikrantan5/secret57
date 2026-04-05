// Cashfree Payout Status Check Edge Function
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { transfer_id } = await req.json();

    if (!transfer_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Transfer ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking payout status for transfer:', transfer_id);

    // Get payout from Cashfree
    const cashfreeResponse = await fetch(
      `${CASHFREE_PAYOUT_API_URL}/getTransferStatus?transferId=${transfer_id}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': CASHFREE_PAYOUT_CLIENT_ID,
          'X-Client-Secret': CASHFREE_PAYOUT_CLIENT_SECRET,
        },
      }
    );

    const cashfreeData = await cashfreeResponse.json();

    console.log('Cashfree status response:', JSON.stringify(cashfreeData, null, 2));

    if (!cashfreeResponse.ok || cashfreeData.status !== 'SUCCESS') {
      return new Response(
        JSON.stringify({
          success: false,
          error: cashfreeData.message || 'Failed to fetch transfer status',
        }),
        { status: cashfreeResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transferData = cashfreeData.data?.transfer || {};
    
    // Map Cashfree status to our status
    let payoutStatus = 'PENDING';
    const cfStatus = transferData.status?.toUpperCase() || 'PENDING';
    
    if (cfStatus === 'SUCCESS') payoutStatus = 'SUCCESS';
    else if (cfStatus === 'FAILED' || cfStatus === 'REJECTED') payoutStatus = 'FAILED';
    else if (cfStatus === 'REVERSED') payoutStatus = 'REVERSED';
    else if (cfStatus === 'PENDING' || cfStatus === 'INITIATED') payoutStatus = 'PROCESSING';

    // Update payout in Supabase
    const { data: updatedPayout, error: updateError } = await supabase
      .from('seller_payouts')
      .update({
        status: payoutStatus,
        cf_transfer_id: transferData.referenceId || null,
        utr_number: transferData.utr || null,
        transferred_at: payoutStatus === 'SUCCESS' ? new Date().toISOString() : null,
        failure_reason: payoutStatus === 'FAILED' ? transferData.reason : null,
        cf_response: cashfreeData,
        updated_at: new Date().toISOString(),
      })
      .eq('transfer_id', transfer_id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update payout status:', updateError);
    } else {
      console.log('✅ Payout status updated in Supabase');

      // Send notification if status changed to SUCCESS or FAILED
      if (payoutStatus === 'SUCCESS' || payoutStatus === 'FAILED') {
        const { data: seller } = await supabase
          .from('sellers')
          .select('user_id')
          .eq('id', updatedPayout.seller_id)
          .single();

        if (seller) {
          await supabase.from('notifications').insert({
            user_id: seller.user_id,
            type: 'payout',
            title: payoutStatus === 'SUCCESS' ? '✅ Payout Completed' : '❌ Payout Failed',
            message: payoutStatus === 'SUCCESS'
              ? `Your payout of ₹${updatedPayout.net_amount} has been credited. UTR: ${transferData.utr}`
              : `Your payout of ₹${updatedPayout.net_amount} failed. Please contact support.`,
            data: { payout_id: updatedPayout.id, transfer_id, utr: transferData.utr },
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transfer_id,
          status: payoutStatus,
          cf_status: cfStatus,
          amount: transferData.amount,
          utr: transferData.utr,
          transferred_at: transferData.processedOn,
          reason: transferData.reason,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in get-cashfree-payout-status:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
