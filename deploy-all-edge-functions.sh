#!/bin/bash

# 🚀 Deploy All Razorpay Edge Functions to Supabase
# This script deploys all 6 edge functions with updated credentials

echo "🚀 Starting deployment of all Razorpay Edge Functions..."
echo ""

# Navigate to frontend directory
cd /app/frontend

echo "📦 Deploying Edge Functions..."
echo ""

# Deploy all 6 functions
echo "1/6 Deploying create-razorpay-order..."
supabase functions deploy create-razorpay-order

echo ""
echo "2/6 Deploying verify-razorpay-payment..."
supabase functions deploy verify-razorpay-payment

echo ""
echo "3/6 Deploying create-razorpay-contact..."
supabase functions deploy create-razorpay-contact

echo ""
echo "4/6 Deploying create-razorpay-fund-account..."
supabase functions deploy create-razorpay-fund-account

echo ""
echo "5/6 Deploying create-razorpay-payout..."
supabase functions deploy create-razorpay-payout

echo ""
echo "6/6 Deploying get-payout-status..."
supabase functions deploy get-payout-status

echo ""
echo "✅ All edge functions deployed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Update Supabase secrets with new Razorpay credentials"
echo "2. Test payment flow"
echo ""
