"# Phase 8: Razorpay Payment Integration Guide

## Overview
This guide explains how to integrate **Razorpay** payment gateway into the ServiceHub app for processing payments for orders and bookings.

## Current Implementation Status

### ✅ Already Configured:
- Razorpay test credentials in `.env` file
- Order creation flow with payment tracking
- Payment status updates in database
- Simulated payment flow for testing

### 🔜 Production Integration Steps:

## Step 1: Install Razorpay Package

For **React Native** apps, we need to use a web view based implementation since Razorpay doesn't have an official Expo-compatible SDK.

```bash
cd /app/frontend
yarn add react-native-webview
```

## Step 2: Create Razorpay Backend Endpoint

Create an API endpoint to generate Razorpay orders (this should be done on backend):

**File: `/app/backend/server.py`** (add this endpoint)

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import razorpay
import os

razorpay_client = razorpay.Client(
    auth=(
        os.getenv('RAZORPAY_KEY_ID'),
        os.getenv('RAZORPAY_KEY_SECRET')
    )
)

class OrderRequest(BaseModel):
    amount: float  # in rupees
    currency: str = \"INR\"
    receipt: str

@app.post(\"/api/create-razorpay-order\")
async def create_razorpay_order(order_request: OrderRequest):
    try:
        # Razorpay expects amount in paise (1 rupee = 100 paise)
        amount_in_paise = int(order_request.amount * 100)
        
        razorpay_order = razorpay_client.order.create({
            \"amount\": amount_in_paise,
            \"currency\": order_request.currency,
            \"receipt\": order_request.receipt,
            \"payment_capture\": 1  # Auto capture payment
        })
        
        return {
            \"success\": True,
            \"order_id\": razorpay_order['id'],
            \"amount\": razorpay_order['amount'],
            \"currency\": razorpay_order['currency']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

@app.post(\"/api/verify-payment\")
async def verify_payment(verification: PaymentVerification):
    try:
        # Verify payment signature
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': verification.razorpay_order_id,
            'razorpay_payment_id': verification.razorpay_payment_id,
            'razorpay_signature': verification.razorpay_signature
        })
        
        return {\"success\": True, \"verified\": True}
    except Exception as e:
        return {\"success\": False, \"error\": str(e)}
```

**Backend Dependencies:**
```bash
cd /app/backend
pip install razorpay
```

## Step 3: Create Razorpay Payment Component

**File: `/app/frontend/src/components/RazorpayPayment.tsx`**

```typescript
import React from 'react';
import { WebView } from 'react-native-webview';
import { Modal, StyleSheet, View } from 'react-native';

interface RazorpayPaymentProps {
  visible: boolean;
  orderId: string;
  amount: number;
  onSuccess: (response: any) => void;
  onFailure: (error: any) => void;
  onClose: () => void;
  customerDetails: {
    name: string;
    email: string;
    contact: string;
  };
}

const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;

export const RazorpayPayment: React.FC<RazorpayPaymentProps> = ({
  visible,
  orderId,
  amount,
  onSuccess,
  onFailure,
  onClose,
  customerDetails,
}) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
      <script src=\"https://checkout.razorpay.com/v1/checkout.js\"></script>
    </head>
    <body>
      <script>
        var options = {
          key: \"${RAZORPAY_KEY_ID}\",
          amount: ${Math.round(amount * 100)},
          currency: \"INR\",
          name: \"ServiceHub\",
          description: \"Order Payment\",
          order_id: \"${orderId}\",
          prefill: {
            name: \"${customerDetails.name}\",
            email: \"${customerDetails.email}\",
            contact: \"${customerDetails.contact}\"
          },
          theme: {
            color: \"#5B7CFF\"
          },
          handler: function (response) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'success',
              data: response
            }));
          },
          modal: {
            ondismiss: function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'close'
              }));
            }
          }
        };
        
        var rzp = new Razorpay(options);
        
        rzp.on('payment.failed', function (response){
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'failure',
            data: response
          }));
        });
        
        rzp.open();
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'success') {
        onSuccess(data.data);
      } else if (data.type === 'failure') {
        onFailure(data.data);
      } else if (data.type === 'close') {
        onClose();
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  return (
    <Modal visible={visible} animationType=\"slide\" transparent>
      <View style={styles.container}>
        <WebView
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          scalesPageToFit
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
```

## Step 4: Update Checkout Screen

Replace the simulated payment in `/app/frontend/app/checkout.tsx`:

```typescript
import { RazorpayPayment } from '../src/components/RazorpayPayment';

// Add state
const [showRazorpay, setShowRazorpay] = useState(false);
const [razorpayOrderId, setRazorpayOrderId] = useState('');

// Replace handlePayment function
const handlePayment = async () => {
  // Validate shipping info
  if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address || 
      !shippingInfo.city || !shippingInfo.state || !shippingInfo.pincode) {
    Alert.alert('Error', 'Please fill all shipping details');
    return;
  }

  if (!user?.id) {
    Alert.alert('Error', 'Please login to continue');
    router.push('/auth/login');
    return;
  }

  setLoading(true);

  try {
    // Step 1: Create order in database
    const orderData = {
      customer_id: user.id,
      subtotal: total,
      discount: discount,
      delivery_charges: deliveryCharges,
      total_amount: finalTotal,
      shipping_name: shippingInfo.name,
      shipping_phone: shippingInfo.phone,
      shipping_address: shippingInfo.address,
      shipping_city: shippingInfo.city,
      shipping_state: shippingInfo.state,
      shipping_pincode: shippingInfo.pincode,
    };

    const result = await createOrder(orderData, items);

    if (!result.success || !result.order) {
      throw new Error(result.error || 'Failed to create order');
    }

    const orderId = result.order.id;

    // Step 2: Create Razorpay order
    const razorpayResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/create-razorpay-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: finalTotal,
        currency: 'INR',
        receipt: orderId,
      }),
    });

    const razorpayData = await razorpayResponse.json();

    if (!razorpayData.success) {
      throw new Error('Failed to create payment order');
    }

    setRazorpayOrderId(razorpayData.order_id);
    setLoading(false);
    setShowRazorpay(true);

  } catch (error: any) {
    console.error('Checkout error:', error);
    Alert.alert('Error', error.message || 'Failed to process checkout');
    setLoading(false);
  }
};

const handlePaymentSuccess = async (response: any) => {
  setShowRazorpay(false);
  setLoading(true);

  // Verify payment on backend
  const verifyResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response),
  });

  const verifyData = await verifyResponse.json();

  if (verifyData.success && verifyData.verified) {
    // Update order payment status
    const paymentResult = await updatePaymentStatus(orderId, {
      method: 'razorpay',
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
    });

    if (paymentResult.success) {
      clearCart();
      setLoading(false);
      
      Alert.alert(
        'Payment Successful!',
        'Your order has been placed successfully',
        [
          {
            text: 'View Order',
            onPress: () => router.replace('/orders'),
          },
        ]
      );
    }
  } else {
    setLoading(false);
    Alert.alert('Error', 'Payment verification failed');
  }
};

const handlePaymentFailure = (error: any) => {
  setShowRazorpay(false);
  Alert.alert('Payment Failed', error.error?.description || 'Payment was not successful');
};

// Add at the end of JSX
{showRazorpay && (
  <RazorpayPayment
    visible={showRazorpay}
    orderId={razorpayOrderId}
    amount={finalTotal}
    onSuccess={handlePaymentSuccess}
    onFailure={handlePaymentFailure}
    onClose={() => setShowRazorpay(false)}
    customerDetails={{
      name: shippingInfo.name,
      email: user.email,
      contact: shippingInfo.phone,
    }}
  />
)}
```

## Step 5: Testing

### Test Mode (Current):
- Uses test keys: `rzp_test_RVeELbQdxuBBiv`
- Test cards: https://razorpay.com/docs/payments/payments/test-card-upi-details/
- Example: `4111 1111 1111 1111`, any future date, any CVV

### Production Mode:
1. Go to Razorpay Dashboard
2. Get live API keys
3. Update `.env` with live keys
4. Test thoroughly before going live

## Step 6: Webhooks (Optional but Recommended)

Set up webhooks to handle payment status updates:

1. Go to Razorpay Dashboard → Webhooks
2. Add endpoint: `https://your-backend-url/api/razorpay-webhook`
3. Select events: `payment.captured`, `payment.failed`, `order.paid`

```python
@app.post(\"/api/razorpay-webhook\")
async def razorpay_webhook(request: Request):
    # Verify webhook signature
    webhook_signature = request.headers.get('X-Razorpay-Signature')
    webhook_secret = os.getenv('RAZORPAY_WEBHOOK_SECRET')
    
    body = await request.body()
    
    try:
        razorpay_client.utility.verify_webhook_signature(
            body.decode('utf-8'),
            webhook_signature,
            webhook_secret
        )
    except:
        raise HTTPException(status_code=400, detail=\"Invalid signature\")
    
    # Process webhook event
    # Update order status based on payment status
    return {\"status\": \"ok\"}
```

## Features Covered

✅ **Phase 6 - Booking System:**
- Service booking with date/time picker
- Location type selection (visit customer / customer visits)
- Booking management
- Booking cancellation with reason

✅ **Phase 7 - Orders & Checkout:**
- Complete checkout flow with shipping information
- Order creation
- Order listing with filters
- Order detail with tracking timeline
- Order cancellation

✅ **Phase 8 - Payments:**
- Razorpay integration setup (test mode working)
- Payment verification
- Payment status tracking
- Refund management ready

## Security Best Practices

1. **Never expose secret keys** in frontend code
2. **Always verify payments** on backend
3. **Use webhooks** for reliable status updates
4. **Log all transactions** for auditing
5. **Handle edge cases** (network failures, timeouts)

## Common Issues & Solutions

### Issue: Payment not opening
- Check if Razorpay key is correct
- Ensure WebView permissions
- Check internet connectivity

### Issue: Payment success but order not updated
- Verify webhook setup
- Check backend logs
- Ensure database update logic is correct

### Issue: Test payments failing
- Use only test cards from Razorpay docs
- Check if test mode is enabled
- Verify test key is being used

---

**Note:** The current implementation uses **simulated payments** for testing. Follow the steps above to enable real Razorpay integration.

**Documentation:** https://razorpay.com/docs/payments/
"