-- =====================================================
-- CASHFREE DIRECT SELLER PAYMENTS - DATABASE MIGRATION
-- ServiceHub Multi-Vendor Marketplace
-- =====================================================

-- This migration converts the platform from Razorpay escrow model
-- to Cashfree direct seller payment model with subscription-based monetization

-- =====================================================
-- STEP 1: CREATE SUBSCRIPTION PLANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  duration_type TEXT NOT NULL CHECK (duration_type IN ('monthly', 'yearly')),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  duration_days INTEGER NOT NULL, -- 30 for monthly, 365 for yearly
  features JSONB, -- List of features
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, duration_type, price, duration_days, features, sort_order) VALUES
  ('Monthly Subscription', 'monthly', 499.00, 30, '["Add unlimited products", "Add unlimited services", "Receive direct payments", "Dashboard analytics", "Customer reviews"]'::jsonb, 1),
  ('Yearly Subscription', 'yearly', 4999.00, 365, '["Add unlimited products", "Add unlimited services", "Receive direct payments", "Dashboard analytics", "Customer reviews", "Save ₹1,000 annually", "Priority support"]'::jsonb, 2)
ON CONFLICT DO NOTHING;

CREATE INDEX subscription_plans_is_active_idx ON public.subscription_plans(is_active);

-- =====================================================
-- STEP 2: CREATE SELLER SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.seller_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  auto_renew BOOLEAN DEFAULT false,
  
  -- Payment tracking
  payment_id TEXT, -- Cashfree payment ID
  cashfree_order_id TEXT,
  amount_paid DECIMAL(10,2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX seller_subscriptions_seller_id_idx ON public.seller_subscriptions(seller_id);
CREATE INDEX seller_subscriptions_status_idx ON public.seller_subscriptions(status);
CREATE INDEX seller_subscriptions_expires_at_idx ON public.seller_subscriptions(expires_at);

-- =====================================================
-- STEP 3: UPDATE SELLER BANK ACCOUNTS FOR CASHFREE
-- =====================================================

-- Add Cashfree-specific fields
ALTER TABLE public.seller_bank_accounts 
  ADD COLUMN IF NOT EXISTS cashfree_beneficiary_id TEXT,
  ADD COLUMN IF NOT EXISTS cashfree_bene_id TEXT, -- Alternative beneficiary ID format
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' 
    CHECK (verification_status IN ('pending', 'verified', 'failed')),
  ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS upi_id TEXT,
  ADD COLUMN IF NOT EXISTS pan_number TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT;

-- Update existing constraint if needed
ALTER TABLE public.seller_bank_accounts 
  DROP CONSTRAINT IF EXISTS seller_bank_accounts_account_type_check;

ALTER TABLE public.seller_bank_accounts 
  ADD CONSTRAINT seller_bank_accounts_account_type_check 
  CHECK (account_type IN ('savings', 'current', 'Savings', 'Current'));

-- =====================================================
-- STEP 4: UPDATE PRODUCTS TABLE FOR CASHFREE
-- =====================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seller_settlement_account_id UUID REFERENCES public.seller_bank_accounts(id),
  ADD COLUMN IF NOT EXISTS cashfree_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS requires_subscription BOOLEAN DEFAULT true;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS products_seller_settlement_account_id_idx 
  ON public.products(seller_settlement_account_id);

-- =====================================================
-- STEP 5: UPDATE SERVICES TABLE FOR CASHFREE
-- =====================================================

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS seller_settlement_account_id UUID REFERENCES public.seller_bank_accounts(id),
  ADD COLUMN IF NOT EXISTS cashfree_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS requires_subscription BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS services_seller_settlement_account_id_idx 
  ON public.services(seller_settlement_account_id);

-- =====================================================
-- STEP 6: UPDATE ORDERS TABLE FOR CASHFREE
-- =====================================================

-- Add Cashfree payment fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cashfree_order_id TEXT,
  ADD COLUMN IF NOT EXISTS cashfree_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS cashfree_signature TEXT,
  ADD COLUMN IF NOT EXISTS cashfree_order_token TEXT,
  ADD COLUMN IF NOT EXISTS direct_transfer_status TEXT DEFAULT 'pending' 
    CHECK (direct_transfer_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS seller_settlement_account_id UUID REFERENCES public.seller_bank_accounts(id),
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'cashfree';

-- Keep Razorpay fields for backward compatibility but mark as deprecated
COMMENT ON COLUMN public.orders.razorpay_order_id IS 'DEPRECATED: Use cashfree_order_id';
COMMENT ON COLUMN public.orders.razorpay_payment_id IS 'DEPRECATED: Use cashfree_payment_id';
COMMENT ON COLUMN public.orders.razorpay_signature IS 'DEPRECATED: Use cashfree_signature';

CREATE INDEX IF NOT EXISTS orders_cashfree_order_id_idx ON public.orders(cashfree_order_id);
CREATE INDEX IF NOT EXISTS orders_payment_provider_idx ON public.orders(payment_provider);

-- =====================================================
-- STEP 7: UPDATE BOOKINGS TABLE FOR CASHFREE
-- =====================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cashfree_order_id TEXT,
  ADD COLUMN IF NOT EXISTS cashfree_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS cashfree_signature TEXT,
  ADD COLUMN IF NOT EXISTS cashfree_order_token TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  ADD COLUMN IF NOT EXISTS direct_transfer_status TEXT DEFAULT 'pending' 
    CHECK (direct_transfer_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS seller_settlement_account_id UUID REFERENCES public.seller_bank_accounts(id),
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'cashfree';

CREATE INDEX IF NOT EXISTS bookings_cashfree_order_id_idx ON public.bookings(cashfree_order_id);
CREATE INDEX IF NOT EXISTS bookings_payment_status_idx ON public.bookings(payment_status);

-- =====================================================
-- STEP 8: UPDATE PAYMENTS TABLE FOR CASHFREE
-- =====================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS cashfree_order_id TEXT,
  ADD COLUMN IF NOT EXISTS cashfree_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS cashfree_signature TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'cashfree';

-- Keep razorpay fields for backward compatibility
COMMENT ON COLUMN public.payments.razorpay_order_id IS 'DEPRECATED: Use cashfree_order_id';

-- =====================================================
-- STEP 9: CREATE VIEWS FOR SUBSCRIPTION TRACKING
-- =====================================================

-- Active seller subscriptions view
CREATE OR REPLACE VIEW active_seller_subscriptions AS
SELECT 
  ss.id,
  ss.seller_id,
  s.company_name,
  s.user_id,
  u.email as seller_email,
  sp.name as plan_name,
  sp.duration_type,
  ss.status,
  ss.started_at,
  ss.expires_at,
  ss.auto_renew,
  CASE 
    WHEN ss.expires_at > NOW() THEN true
    ELSE false
  END as is_active,
  EXTRACT(DAY FROM (ss.expires_at - NOW())) as days_remaining
FROM public.seller_subscriptions ss
INNER JOIN public.sellers s ON s.id = ss.seller_id
INNER JOIN public.users u ON u.id = s.user_id
INNER JOIN public.subscription_plans sp ON sp.id = ss.plan_id
WHERE ss.status = 'active'
ORDER BY ss.expires_at ASC;

-- Seller subscription status view (for quick checks)
CREATE OR REPLACE VIEW seller_subscription_status AS
SELECT 
  s.id as seller_id,
  s.company_name,
  s.user_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.seller_subscriptions ss 
      WHERE ss.seller_id = s.id 
      AND ss.status = 'active' 
      AND ss.expires_at > NOW()
    ) THEN true
    ELSE false
  END as has_active_subscription,
  (
    SELECT ss.expires_at 
    FROM public.seller_subscriptions ss 
    WHERE ss.seller_id = s.id 
    AND ss.status = 'active' 
    AND ss.expires_at > NOW()
    ORDER BY ss.expires_at DESC 
    LIMIT 1
  ) as subscription_expires_at,
  (
    SELECT ss.id
    FROM public.seller_subscriptions ss 
    WHERE ss.seller_id = s.id 
    AND ss.status = 'active' 
    AND ss.expires_at > NOW()
    ORDER BY ss.expires_at DESC 
    LIMIT 1
  ) as active_subscription_id
FROM public.sellers s;

-- Admin revenue view (from subscriptions only)
CREATE OR REPLACE VIEW admin_subscription_revenue AS
SELECT 
  DATE_TRUNC('month', ss.created_at) as month,
  COUNT(DISTINCT ss.id) as total_subscriptions,
  COUNT(DISTINCT ss.seller_id) as unique_sellers,
  SUM(ss.amount_paid) as total_revenue,
  SUM(CASE WHEN sp.duration_type = 'monthly' THEN ss.amount_paid ELSE 0 END) as monthly_revenue,
  SUM(CASE WHEN sp.duration_type = 'yearly' THEN ss.amount_paid ELSE 0 END) as yearly_revenue
FROM public.seller_subscriptions ss
INNER JOIN public.subscription_plans sp ON sp.id = ss.plan_id
GROUP BY DATE_TRUNC('month', ss.created_at)
ORDER BY month DESC;

-- =====================================================
-- STEP 10: ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscription Plans Policies (Public read, Admin write)
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view active subscription plans" ON public.subscription_plans 
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admin can manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Admin can manage subscription plans" ON public.subscription_plans 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Seller Subscriptions Policies
DROP POLICY IF EXISTS "Sellers can view own subscriptions" ON public.seller_subscriptions;
CREATE POLICY "Sellers can view own subscriptions" ON public.seller_subscriptions 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sellers WHERE id = seller_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Sellers can create own subscriptions" ON public.seller_subscriptions;
CREATE POLICY "Sellers can create own subscriptions" ON public.seller_subscriptions 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.sellers WHERE id = seller_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin can view all subscriptions" ON public.seller_subscriptions;
CREATE POLICY "Admin can view all subscriptions" ON public.seller_subscriptions 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admin can manage all subscriptions" ON public.seller_subscriptions;
CREATE POLICY "Admin can manage all subscriptions" ON public.seller_subscriptions 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- STEP 11: FUNCTIONS AND TRIGGERS
-- =====================================================

-- Trigger for subscription_plans updated_at
CREATE TRIGGER update_subscription_plans_updated_at 
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for seller_subscriptions updated_at
CREATE TRIGGER update_seller_subscriptions_updated_at 
BEFORE UPDATE ON public.seller_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if seller has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(seller_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.seller_subscriptions 
    WHERE seller_id = seller_uuid 
    AND status = 'active' 
    AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if seller has verified bank account
CREATE OR REPLACE FUNCTION has_verified_bank_account(seller_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.seller_bank_accounts 
    WHERE seller_id = seller_uuid 
    AND verification_status = 'verified'
    AND is_primary = true
  );
END;
$$ LANGUAGE plpgsql;

-- Function to automatically expire subscriptions (run via cron)
CREATE OR REPLACE FUNCTION expire_old_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE public.seller_subscriptions
  SET status = 'expired'
  WHERE status = 'active'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 12: DEPRECATE OLD PAYOUT SYSTEM
-- =====================================================

-- Mark old payouts table as deprecated
COMMENT ON TABLE public.payouts IS 'DEPRECATED: Admin-controlled payouts removed. Sellers receive direct payments via Cashfree.';

-- We keep the table for historical data but it won't be used going forward
-- Admin can still view old payout records

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- Migration completed successfully!
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Deploy Cashfree Edge Functions
-- 3. Update frontend with new payment flows
-- 4. Test subscription purchase
-- 5. Test direct seller payments

-- Rollback instructions (if needed):
-- To rollback, you would need to:
-- 1. Drop new tables: subscription_plans, seller_subscriptions
-- 2. Remove new columns from existing tables
-- 3. Re-enable old payout system
-- However, this is not recommended after production data exists
