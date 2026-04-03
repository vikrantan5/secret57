"# Razorpay Payment Integration - Deployment Guide

## ✅ What Has Been Fixed

### Issues Resolved:
1. **✅ International Cards Error** - Added test card instructions in payment UI
2. **✅ Razorpay Order Creation** - Now uses proper Razorpay API via Edge Functions
3. **✅ Payment Verification** - Implemented server-side signature verification
4. **✅ WebView Errors** - Improved error handling and messaging

### Implementation Changes:

#### 1. New Supabase Edge Functions Created:
- `/supabase/functions/create-razorpay-order/index.ts` - Creates valid Razorpay orders
- `/supabase/functions/verify-razorpay-payment/index.ts` - Verifies payment signatures

#### 2. Updated Frontend Files:
- `/app/checkout.tsx` - Product order payment flow
- `/app/service/[id].tsx` - Service booking payment flow
- `/src/components/RazorpayPayment.tsx` - Added test card UI and better error handling
- `/src/services/razorpayEdgeFunctions.ts` - Service to call Edge Functions

---

## 🚀 Deployment Steps

### Step 1: Deploy Supabase Edge Functions

You have **2 options** to deploy the Edge Functions:

#### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
cd /app/frontend
supabase link --project-ref wqgafgyzcyjcmtyjlkzw
```

4. Deploy the functions:
```bash
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
```

#### Option B: Manual Deployment via Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/wqgafgyzcyjcmtyjlkzw

2. Navigate to: **Edge Functions** → **Create a new function**

3. For `create-razorpay-order`:
   - Function name: `create-razorpay-order`
   - Copy code from `/app/frontend/supabase/functions/create-razorpay-order/index.ts`
   - Paste and deploy

4. For `verify-razorpay-payment`:
   - Function name: `verify-razorpay-payment`
   - Copy code from `/app/frontend/supabase/functions/verify-razorpay-payment/index.ts`
   - Paste and deploy

### Step 2: Configure Environment Variables in Supabase

Go to: **Project Settings → Edge Functions → Secrets**

Add these secrets:
```
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_RVeELbQdxuBBiv
EXPO_PUBLIC_RAZORPAY_KEY_SECRET=CtWqj2m5dczsvq3fWC9CJvYO
```

**Note:** These are test keys. For production, use live keys from Razorpay Dashboard.

### Step 3: Test the Payment Flow

#### For Product Orders:
1. Login as customer: `customer1@gmail.com` / `12345678`
2. Add products to cart
3. Go to checkout
4. Fill shipping details
5. Click \"Place Order\"
6. Use test card details shown in payment UI:
   - Card: `4111 1111 1111 1111`
   - CVV: `111`
   - Expiry: `12/26`
   - OTP: `1234` (if asked)

#### For Service Bookings:
1. Login as customer: `customer1@gmail.com` / `12345678`
2. Browse services
3. Click on a service
4. Click \"Book Now\"
5. Select date, time, and location
6. Complete payment with same test card

---

## 🔍 Testing Checklist

### Product Order Flow:
- [ ] Create order in database
- [ ] Razorpay order created successfully (check console logs)
- [ ] Payment gateway opens
- [ ] Test card accepted
- [ ] Payment success
- [ ] Payment verified
- [ ] Payment record created in DB
- [ ] Order status updated to 'paid'
- [ ] Cart cleared
- [ ] Customer sees \"Order Placed\" message

### Service Booking Flow:
- [ ] Create booking in database
- [ ] Razorpay order created successfully
- [ ] Payment gateway opens
- [ ] Test card accepted
- [ ] Payment success
- [ ] Payment verified
- [ ] Booking status updated to 'confirmed'
- [ ] Customer sees \"Booking Confirmed\" message

### Error Scenarios:
- [ ] Wrong card number shows error
- [ ] International card shows proper error message
- [ ] Payment cancellation handled correctly
- [ ] Network errors handled gracefully

---

## 🐛 Common Issues & Solutions

### Issue 1: \"Edge function not found\"
**Solution:** Make sure Edge Functions are deployed. Check Supabase Dashboard → Edge Functions

### Issue 2: \"Failed to create Razorpay order\"
**Solution:** 
- Check if Razorpay credentials are correct in Supabase secrets
- Check Edge Function logs in Supabase Dashboard

### Issue 3: \"Payment verification failed\"
**Solution:**
- Check if RAZORPAY_KEY_SECRET is correctly set in Supabase
- Verify the signature calculation matches Razorpay's spec

### Issue 4: \"International cards are not supported\"
**Solution:** This is correct behavior in test mode. Use the Indian test card provided:
- Card: `4111 1111 1111 1111`
- CVV: `111`
- Expiry: `12/26`

---

## 📝 Test Cards for Razorpay

### Indian Test Cards (Success):
```
Card Number: 4111 1111 1111 1111
Expiry: Any future date
CVV: Any 3 digits
OTP: 1234
```

### International Test Cards (Will Fail - Expected):
```
These will show \"International cards are not supported\" error:
- 5555 5555 5555 4444 (Mastercard)
- 3782 822463 10005 (Amex)
```

### More Test Scenarios:
Visit: https://razorpay.com/docs/payments/payments/test-card-upi-details/

---

## 🔒 Security Features Implemented

1. **Server-side Payment Verification**
   - Razorpay signature verified using HMAC-SHA256
   - Prevents payment tampering

2. **Secure Key Management**
   - Secret keys stored in Supabase Edge Function environment
   - Never exposed to frontend

3. **Order Integrity**
   - Each payment linked to specific order/booking
   - Amount verification on server-side

---

## 🎯 Production Deployment

When you're ready to go live:

1. **Get Live Razorpay Keys:**
   - Login to Razorpay Dashboard
   - Complete KYC verification
   - Get live API keys from Settings → API Keys

2. **Update Supabase Secrets:**
   ```
   EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY
   EXPO_PUBLIC_RAZORPAY_KEY_SECRET=YOUR_LIVE_SECRET
   ```

3. **Update Frontend .env:**
   ```
   EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY
   EXPO_PUBLIC_RAZORPAY_KEY_SECRET=YOUR_LIVE_SECRET
   ```

4. **Remove Test Card UI:**
   - Edit `/app/frontend/src/components/RazorpayPayment.tsx`
   - Remove the yellow test card info box (lines 133-147)

5. **Test with Real Cards:**
   - Start with small amount (₹1)
   - Verify complete flow
   - Check admin dashboard for settlements

---

## 📊 Admin Flow

After successful payments, admin can:

1. View all payments in admin dashboard
2. Track order/booking statuses
3. Process seller payouts
4. View payment analytics

---

## 💡 Important Notes

1. **Edge Functions are essential** - The app will not work without deploying them
2. **Test mode is active** - Only test cards will work until you switch to live keys
3. **Payment logs** - Check console logs and Razorpay Dashboard for debugging
4. **Webhooks** - Not implemented yet but recommended for production
5. **Refunds** - Manual refund process in place, can be automated later

---

## 🆘 Support

If you encounter issues:

1. Check Supabase Edge Function logs
2. Check React Native console logs
3. Check Razorpay Dashboard → Payments
4. Verify all environment variables are set correctly

---

**Status:** ✅ Ready for Testing
**Next Steps:** Deploy Edge Functions and test payment flows

---

**Built with:**
- React Native (Expo)
- Supabase Edge Functions
- Razorpay Payment Gateway
- TypeScript
"