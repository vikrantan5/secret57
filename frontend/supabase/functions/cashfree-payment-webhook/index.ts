// Cashfree Payment Webhook Handler
// Deno Edge Function
// Handles payment success notifications from Cashfree

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CASHFREE_APP_ID = Deno.env.get('CASHFREE_APP_ID') ?? '';
const CASHFREE_SECRET_KEY = Deno.env.get('CASHFREE_SECRET_KEY') ?? '';

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
    
    // Get webhook payload from Cashfree
    const payload = await req.json();
    
    console.log('📥 Cashfree Webhook Received:', JSON.stringify(payload, null, 2));

    const { 
      type, 
      data 
    } = payload;

    // Handle payment success event
    if (type === 'PAYMENT_SUCCESS_WEBHOOK' || data?.order?.order_status === 'PAID') {
      const orderData = data?.order || data;
      const cashfreeOrderId = orderData.order_id;
      const cashfreePaymentId = orderData.cf_payment_id || orderData.payment_id;
      const orderAmount = orderData.order_amount;
      const paymentTime = orderData.payment_time || new Date().toISOString();

      console.log('✅ Payment Success - Cashfree Order ID:', cashfreeOrderId);
      console.log('📦 Payment ID:', cashfreePaymentId);
      console.log('💰 Amount:', orderAmount);

      // ✅ FIX: Find order by cashfree_order_id (which we now store during order creation)
      const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('cashfree_order_id', cashfreeOrderId)
        .limit(1);

      if (orders && orders.length > 0) {
        const order = orders[0];
        console.log('📦 Found Order in Supabase:', order.id);
        console.log('📦 Order Number:', order.order_number);

        // Update order payment status
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'processing',
            cashfree_payment_id: cashfreePaymentId,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (updateError) {
          console.error('❌ Failed to update order:', updateError);
        } else {
          console.log('✅ Order payment status updated to PAID');
        }

        // Update or create payment record
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('order_id', order.id)
          .limit(1)
          .single();

        if (existingPayment) {
          // Update existing payment
          await supabase
            .from('payments')
            .update({
              status: 'success',
              cashfree_order_id: cashfreeOrderId,
              cashfree_payment_id: cashfreePaymentId,
              payment_method: 'cashfree',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPayment.id);
          console.log('✅ Payment record updated');
        } else {
          // Create new payment record
          await supabase
            .from('payments')
            .insert({
              order_id: order.id,
              user_id: order.customer_id,
              amount: orderAmount,
              status: 'success',
              payment_method: 'cashfree',
              cashfree_order_id: cashfreeOrderId,
              cashfree_payment_id: cashfreePaymentId,
              created_at: new Date().toISOString()
            });
          console.log('✅ Payment record created');
        }

        // Send notification to customer
        await supabase
          .from('notifications')
          .insert({
            user_id: order.customer_id,
            type: 'payment',
            title: 'Payment Successful',
            message: `Your payment of ₹${orderAmount} has been received. Order #${order.order_number} is being processed.`,
            data: { order_id: order.id },
            created_at: new Date().toISOString()
          });
        console.log('✅ Customer notification sent');

        // Get order items to notify sellers
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('*, seller:sellers(id, user_id, company_name)')
          .eq('order_id', order.id);

        if (orderItems && orderItems.length > 0) {
          // Notify each seller
          const notifiedSellers = new Set();
          for (const item of orderItems) {
            if (item.seller?.user_id && !notifiedSellers.has(item.seller.user_id)) {
              await supabase
                .from('notifications')
                .insert({
                  user_id: item.seller.user_id,
                  type: 'order',
                  title: 'New Order Received',
                  message: `You have a new order for ${item.product_name}. Order #${order.order_number}`,
                  data: { order_id: order.id, order_item_id: item.id },
                  created_at: new Date().toISOString()
                });
              notifiedSellers.add(item.seller.user_id);
            }
          }
          console.log(`✅ Notified ${notifiedSellers.size} seller(s)`);
        }
      }

      // ✅ FIX: Check for booking by cashfree_order_id
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('*, seller:sellers(id, user_id, company_name), service:services(name)')
        .eq('cashfree_order_id', cashfreeOrderId)
        .limit(1);

      if (bookings && bookings.length > 0) {
        const booking = bookings[0];
        console.log('📅 Found Booking in Supabase:', booking.id);

        // Update booking status to confirmed
        const { error: updateBookingError } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            payment_method: 'cashfree',
            cashfree_payment_id: cashfreePaymentId,
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        if (updateBookingError) {
          console.error('❌ Failed to update booking:', updateBookingError);
        } else {
          console.log('✅ Booking status updated to CONFIRMED');
        }

        // Add booking timeline entry
        await supabase
          .from('booking_timeline')
          .insert({
            booking_id: booking.id,
            status: 'payment_received',
            notes: 'Payment received successfully, booking confirmed',
            created_at: new Date().toISOString()
          });
        console.log('✅ Booking timeline updated');

        // Update or create payment record
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('booking_id', booking.id)
          .limit(1)
          .single();

        if (existingPayment) {
          await supabase
            .from('payments')
            .update({
              status: 'success',
              cashfree_order_id: cashfreeOrderId,
              cashfree_payment_id: cashfreePaymentId,
              payment_method: 'cashfree',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPayment.id);
          console.log('✅ Booking payment record updated');
        } else {
          await supabase
            .from('payments')
            .insert({
              booking_id: booking.id,
              user_id: booking.customer_id,
              amount: orderAmount,
              status: 'success',
              payment_method: 'cashfree',
              cashfree_order_id: cashfreeOrderId,
              cashfree_payment_id: cashfreePaymentId,
              created_at: new Date().toISOString()
            });
          console.log('✅ Booking payment record created');
        }

        // Send notification to customer
        await supabase
          .from('notifications')
          .insert({
            user_id: booking.customer_id,
            type: 'booking',
            title: 'Booking Confirmed',
            message: `Your booking has been confirmed. Service: ${booking.service?.name || 'Service'} scheduled for ${new Date(booking.booking_date).toLocaleDateString()}.`,
            data: { booking_id: booking.id },
            created_at: new Date().toISOString()
          });
        console.log('✅ Customer notification sent');

        // Send notification to seller
        if (booking.seller?.user_id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: booking.seller.user_id,
              type: 'booking',
              title: 'New Booking Received',
              message: `You have a new booking for ${booking.service?.name || 'Service'} scheduled for ${new Date(booking.booking_date).toLocaleDateString()}.`,
              data: { booking_id: booking.id },
              created_at: new Date().toISOString()
            });
          console.log('✅ Seller notification sent');
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook processed successfully' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle payment failure
    if (type === 'PAYMENT_FAILED_WEBHOOK' || data?.order?.order_status === 'FAILED') {
      const orderData = data?.order || data;
      const cashfreeOrderId = orderData.order_id;

      console.log('❌ Payment Failed - Order ID:', cashfreeOrderId);

      // Update order
      await supabase
        .from('orders')
        .update({ payment_status: 'failed' })
        .or(`cashfree_order_id.eq.${cashfreeOrderId},razorpay_order_id.eq.${cashfreeOrderId}`);

      // Update booking
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('cashfree_order_id', cashfreeOrderId);

      // Update payment
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('cashfree_order_id', cashfreeOrderId);

      return new Response(
        JSON.stringify({ success: true, message: 'Payment failure handled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Webhook Error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
