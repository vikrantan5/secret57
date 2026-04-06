#!/bin/bash

# =====================================================
# TRIGGER PAYOUT FOR STUCK BOOKINGS
# This script calls the auto-payout-trigger edge function
# for bookings that are completed but haven't triggered payout
# =====================================================

# Configuration
SUPABASE_URL="https://wqgafgyzcyjcmtyjlkzw.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZ2FmZ3l6Y3lqY210eWpsa3p3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcxNDUyMywiZXhwIjoyMDg5MjkwNTIzfQ.m9GZhvJeygCWnU4jSxCgAoTr4ezDyc1WleJkm6cVt38"

# Stuck booking IDs from your SQL query (5 bookings)
BOOKING_IDS=(
  "f9b8b78a-f525-4540-b557-50c473e564b9"
  "55187c8e-d10e-45c4-9ea3-d96fb3339d64"
  "c48da5ad-56bf-48f9-a9b5-d709316e0f9f"
  "f281e6e8-c077-4efe-a8fc-d47cea339651"
  "2ed497ee-f950-462e-99f2-df23480a97f2"
)

echo "🚀 Triggering Auto-Payouts for Stuck Bookings"
echo "=============================================="
echo ""

for booking_id in "${BOOKING_IDS[@]}"; do
  echo "Processing booking: $booking_id"
  
  response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/auto-payout-trigger" 
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" 
    -H "Content-Type: application/json" 
    -d "{"booking_id": "$booking_id", "trigger_type": "immediate"}")
  
  echo "Response: $response"
  echo ""
  
  # Check if successful
  if echo "$response" | grep -q '"success":true'; then
    echo "✅ Payout triggered successfully for $booking_id"
  else
    echo "❌ Failed to trigger payout for $booking_id"
  fi
  
  echo "----------------------------------------------"
  echo ""
done

echo "🎯 Processing complete!"
echo ""
echo "Next steps:"
echo "1. Check Supabase Edge Function logs: $SUPABASE_URL/project/wqgafgyzcyjcmtyjlkzw/functions/auto-payout-trigger/logs"
echo "2. Check Cashfree dashboard for transfers"
echo "3. Run this SQL to verify payout status:"
echo ""
echo "SELECT b.id, b.booking_date, b.total_amount, b.payout_status,"
echo "       sp.status as payout_transfer_status, sp.net_amount, sp.transferred_at"
echo "FROM bookings b"
echo "LEFT JOIN seller_payouts sp ON sp.booking_id = b.id"
echo "WHERE b.id IN ("
echo "  '${BOOKING_IDS[0]}',"
echo "  '${BOOKING_IDS[1]}',"
echo "  '${BOOKING_IDS[2]}',"
echo "  '${BOOKING_IDS[3]}',"
echo "  '${BOOKING_IDS[4]}'"
echo ")"
echo "ORDER BY b.created_at DESC;"






















# PowerShell Commands to Trigger Payouts for All 5 Bookings
# Run these commands one by one in PowerShell

# Booking 1: f9b8b78a-f525-4540-b557-50c473e564b9 (₹20)
curl -Method POST "https://wqgafgyzcyjcmtyjlkzw.supabase.co/functions/v1/auto-payout-trigger" `
  -Headers @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZ2FmZ3l6Y3lqY210eWpsa3p3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcxNDUyMywiZXhwIjoyMDg5MjkwNTIzfQ.m9GZhvJeygCWnU4jSxCgAoTr4ezDyc1WleJkm6cVt38"
    "Content-Type"  = "application/json"
  } `
  -Body '{"booking_id": "f9b8b78a-f525-4540-b557-50c473e564b9", "trigger_type": "immediate"}'

Write-Host "Booking 1 processed. Press Enter to continue..." -ForegroundColor Green
Read-Host

# Booking 2: 55187c8e-d10e-45c4-9ea3-d96fb3339d64 (₹20)
curl -Method POST "https://wqgafgyzcyjcmtyjlkzw.supabase.co/functions/v1/auto-payout-trigger" `
  -Headers @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZ2FmZ3l6Y3lqY210eWpsa3p3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcxNDUyMywiZXhwIjoyMDg5MjkwNTIzfQ.m9GZhvJeygCWnU4jSxCgAoTr4ezDyc1WleJkm6cVt38"
    "Content-Type"  = "application/json"
  } `
  -Body '{"booking_id": "55187c8e-d10e-45c4-9ea3-d96fb3339d64", "trigger_type": "immediate"}'

Write-Host "Booking 2 processed. Press Enter to continue..." -ForegroundColor Green
Read-Host

# Booking 3: c48da5ad-56bf-48f9-a9b5-d709316e0f9f (₹20)
curl -Method POST "https://wqgafgyzcyjcmtyjlkzw.supabase.co/functions/v1/auto-payout-trigger" `
  -Headers @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZ2FmZ3l6Y3lqY210eWpsa3p3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcxNDUyMywiZXhwIjoyMDg5MjkwNTIzfQ.m9GZhvJeygCWnU4jSxCgAoTr4ezDyc1WleJkm6cVt38"
    "Content-Type"  = "application/json"
  } `
  -Body '{"booking_id": "c48da5ad-56bf-48f9-a9b5-d709316e0f9f", "trigger_type": "immediate"}'

Write-Host "Booking 3 processed. Press Enter to continue..." -ForegroundColor Green
Read-Host

# Booking 4: f281e6e8-c077-4efe-a8fc-d47cea339651 (₹200)
curl -Method POST "https://wqgafgyzcyjcmtyjlkzw.supabase.co/functions/v1/auto-payout-trigger" `
  -Headers @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZ2FmZ3l6Y3lqY210eWpsa3p3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcxNDUyMywiZXhwIjoyMDg5MjkwNTIzfQ.m9GZhvJeygCWnU4jSxCgAoTr4ezDyc1WleJkm6cVt38"
    "Content-Type"  = "application/json"
  } `
  -Body '{"booking_id": "f281e6e8-c077-4efe-a8fc-d47cea339651", "trigger_type": "immediate"}'

Write-Host "Booking 4 processed. Press Enter to continue..." -ForegroundColor Green
Read-Host

# Booking 5: 2ed497ee-f950-462e-99f2-df23480a97f2 (₹200)
curl -Method POST "https://wqgafgyzcyjcmtyjlkzw.supabase.co/functions/v1/auto-payout-trigger" `
  -Headers @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZ2FmZ3l6Y3lqY210eWpsa3p3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcxNDUyMywiZXhwIjoyMDg5MjkwNTIzfQ.m9GZhvJeygCWnU4jSxCgAoTr4ezDyc1WleJkm6cVt38"
    "Content-Type"  = "application/json"
  } `
  -Body '{"booking_id": "2ed497ee-f950-462e-99f2-df23480a97f2", "trigger_type": "immediate"}'

Write-Host ""
Write-Host "✅ All 5 bookings processed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Check Supabase Edge Function logs"
Write-Host "2. Run the verification SQL query"
Write-Host "3. Check Cashfree dashboard for transfers"
