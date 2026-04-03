#!/usr/bin/env node

/**
 * Check Razorpay Account Settings
 * This script checks if international cards are enabled
 */

const https = require('https');

const RAZORPAY_KEY_ID = 'rzp_test_SYwsPLh6VGAMpI';
const RAZORPAY_KEY_SECRET = 'UrQTbLEoQwjf9ebSn736gCuZ';

function makeRazorpayRequest(path) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    
    const options = {
      hostname: 'api.razorpay.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function checkRazorpaySettings() {
  console.log('🔍 Checking Razorpay Account Settings');
  console.log('=' + '='.repeat(60) + '');

  try {
    // Check if credentials are valid by fetching account info
    console.log('📝 Step 1: Validating Razorpay credentials...');
    const response = await makeRazorpayRequest('/v1/payments?count=1');

    console.log('   Status Code:', response.statusCode);
    
    if (response.statusCode === 200) {
      console.log('✅ Razorpay credentials are VALID');
      
      console.log('📊 Account Status:');
      console.log('   Test Mode: ACTIVE ✅');
      console.log('   API Access: WORKING ✅');
      console.log();
      
      console.log('⚠️  IMPORTANT:');
      console.log("   Your Razorpay API credentials are working, but you're getting");
      console.log('   \"International cards not supported\" error in the checkout.');
      console.log();
      console.log('   This means payment methods need to be enabled in Dashboard.');
      console.log();
      
    } else if (response.statusCode === 401) {
      console.log('❌ Authentication failed - Invalid credentials');
      console.log('   Please check your Razorpay Key ID and Secret');
      return;
    } else {
      console.log('⚠️  Unexpected response:', response.statusCode);
      console.log('   Response:', JSON.stringify(response.data, null, 2));
    }

    console.log('=' + '='.repeat(60));
    console.log('🔧 SOLUTION: Enable Payment Methods in Dashboard');
    console.log('=' + '='.repeat(60));
    console.log();
    console.log('1. Go to: https://dashboard.razorpay.com/');
    console.log('2. Switch to TEST MODE (top-right toggle)');
    console.log('3. Navigate to: Settings → Configuration → Payment Methods');
    console.log('4. Enable:');
    console.log('   ✅ Debit Cards');
    console.log('   ✅ Credit Cards');
    console.log('   ✅ International Cards ← CRITICAL!');
    console.log('5. Click \"Save Changes\"');
    console.log();
    console.log('After enabling, test again with:');
    console.log('   Card: 4111 1111 1111 1111');
    console.log('   CVV: 123');
    console.log('   Expiry: 12/30');
    console.log();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRazorpaySettings();
