"# 🔄 Switch from Test to Live Razorpay Keys

## Quick Steps (5 minutes)

### 1. Get Live Keys from Razorpay

1. Login to: https://dashboard.razorpay.com
2. Complete KYC if not done (mandatory for live mode)
3. Go to: **Settings → API Keys**
4. Switch to \"Live Mode\" toggle
5. Click \"Generate Key\" (if not already generated)
6. Copy:
   - **Key ID**: `rzp_live_XXXXXX...`
   - **Key Secret**: Click \"Show\" and copy

### 2. Update Supabase Edge Functions

1. Go to: **Supabase Dashboard → Project Settings → Edge Functions → Secrets**
2. Update these secrets:

```
RAZORPAY_KEY_ID=rzp_live_XXXXXX (replace with your live key)
RAZORPAY_KEY_SECRET=XXXXXX (replace with your live secret)
```

3. Click \"Save\"

### 3. Update Frontend .env

Edit `/app/frontend/.env`:

```bash
# Replace these lines:
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_RVeELbQdxuBBiv
EXPO_PUBLIC_RAZORPAY_KEY_SECRET=CtWqj2m5dczsvq3fWC9CJvYO

# With your live keys:
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_XXXXXX
EXPO_PUBLIC_RAZORPAY_KEY_SECRET=XXXXXX
```

### 4. Restart Services

```bash
cd /app/frontend
# If using Expo:
expo start -c

# Or rebuild:
npm run build
```

### 5. Get Razorpay Account Number

1. In Razorpay Dashboard, go to: **Settings → API Keys**
2. Scroll down to find \"Account Number\"
3. Copy the account number (e.g., `2323230058869692`)
4. Add to Supabase Edge Functions secrets:

```
RAZORPAY_ACCOUNT_NUMBER=<YOUR_ACCOUNT_NUMBER>
```

### 6. Test with ₹1 Payout

Before processing real payouts:

1. Create a test payout for ₹1
2. Verify it appears in Razorpay Dashboard → Payouts
3. Check UTR number is generated
4. Confirm money reaches test bank account

### 7. Enable Razorpay Payouts

1. Go to: **Razorpay Dashboard → Payouts**
2. Click \"Activate Payouts\"
3. Add funds to your account:
   - Go to: **Account Balance → Add Funds**
   - Add sufficient balance for payouts

---

## 🔍 Verification

After switching, verify:

- [ ] Edge Functions use live keys (check logs)
- [ ] Frontend shows live key ID (starts with `rzp_live_`)
- [ ] Test ₹1 payout succeeds
- [ ] UTR number generated
- [ ] Razorpay Dashboard shows transaction
- [ ] Bank account receives funds (for test payout)

---

## ⚠️ Important Notes

1. **KYC Required**: You cannot use live mode without completing Razorpay KYC
2. **Account Balance**: Keep sufficient balance in Razorpay account for payouts
3. **Webhooks**: Consider setting up Razorpay webhooks for real-time payout status updates
4. **Rate Limits**: Live API has rate limits (check Razorpay docs)
5. **Refunds**: In live mode, refunds take 5-7 business days

---

## 🚨 Rollback to Test Mode

If something goes wrong, quickly switch back:

1. Change keys back to test keys in Supabase secrets
2. Update .env with test keys
3. Restart services

Test keys (for reference):
```
RAZORPAY_KEY_ID=rzp_test_RVeELbQdxuBBiv
RAZORPAY_KEY_SECRET=CtWqj2m5dczsvq3fWC9CJvYO
```

---

## 📞 Razorpay Support

If you face issues:
- Email: support@razorpay.com
- Phone: 080-46669006
- Dashboard: Click \"Support\" icon (bottom right)

---

## 💡 Pro Tips

1. **Start Small**: Process a few small payouts first
2. **Monitor Closely**: Check Razorpay dashboard regularly for the first week
3. **Set Alerts**: Enable email alerts for failed payouts in Razorpay
4. **Keep Buffer**: Maintain 20% extra balance in Razorpay account
5. **Automate**: Consider setting up automatic fund top-up in Razorpay

---

**Current Status**: 🧪 Test Mode (Safe to experiment)
**After Following Guide**: 🚀 Live Mode (Real money transfers)
"