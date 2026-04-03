-- =====================================================
-- CASHFREE MARKETPLACE MIGRATION SCRIPT
-- Multi-Vendor Platform: Direct Seller Payments
-- Subscription-Based Monetization
-- =====================================================

-- =====================================================
-- STEP 1: CREATE SUBSCRIPTION PLANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  duration_type TEXT NOT NULL CHECK (duration_type IN ('monthly', 'yearly')),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscription_plans_active_idx ON public.subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS subscription_plans_type_idx ON public.subscription_plans(duration_type);

-- =====================================================
-- STEP 2: CREATE SELLER SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.seller_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  auto_renew BOOLEAN DEFAULT false,
  payment_id TEXT,
  cashfree_order_id TEXT,
  amount_paid DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS seller_subscriptions_seller_idx ON public.seller_subscriptions(seller_id);
CREATE INDEX IF NOT EXISTS seller_subscriptions_status_idx ON public.seller_subscriptions(status);
CREATE INDEX IF NOT EXISTS seller_subscriptions_expires_idx ON public.seller_subscriptions(expires_at);

-- =====================================================
-- STEP 3: UPDATE SELLER_BANK_ACCOUNTS FOR CASHFREE
-- =====================================================

-- Add Cashfree-specific columns if they don't exist
ALTER TABLE public.seller_bank_accounts 
  ADD COLUMN IF NOT EXISTS cashfree_beneficiary_id TEXT,
  ADD COLUMN IF NOT EXISTS cashfree_bene_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS gst_number TEXT;

CREATE INDEX IF NOT EXISTS seller_bank_accounts_cashfree_bene_idx ON public.seller_bank_accounts(cashfree_bene_id);
CREATE INDEX IF NOT EXISTS seller_bank_accounts_verification_idx ON public.seller_bank_accounts(verification_status);

-- =====================================================
-- STEP 4: UPDATE PRODUCTS TABLE FOR CASHFREE
-- =====================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seller_settlement_account_id TEXT,
  ADD COLUMN IF NOT EXISTS cashfree_enabled BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS products_settlement_account_idx ON public.products(seller_settlement_account_id);

-- =====================================================
-- STEP 5: UPDATE SERVICES TABLE FOR CASHFREE
-- =====================================================

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS seller_settlement_account_id TEXT,
  ADD COLUMN IF NOT EXISTS cashfree_enabled BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS services_settlement_account_idx ON public.services(seller_settlement_account_id);

-- =====================================================
-- STEP 6: UPDATE ORDERS TABLE FOR CASHFREE
-- =====================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cashfree_order_id TEXT,
  ADD COLUMN IF NOT EXISTS cashfree_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS seller_settlement_account_id TEXT,
  ADD COLUMN IF NOT EXISTS direct_transfer_status TEXT CHECK (direct_transfer_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS direct_transfer_utr TEXT,
  ADD COLUMN IF NOT EXISTS direct_transfer_date TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS orders_cashfree_order_idx ON public.orders(cashfree_order_id);
CREATE INDEX IF NOT EXISTS orders_transfer_status_idx ON public.orders(direct_transfer_status);

-- =====================================================
-- STEP 7: UPDATE BOOKINGS TABLE FOR CASHFREE
-- =====================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cashfree_order_id TEXT,
  ADD COLUMN IF NOT EXISTS cashfree_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS seller_settlement_account_id TEXT,
  ADD COLUMN IF NOT EXISTS direct_transfer_status TEXT CHECK (direct_transfer_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS direct_transfer_utr TEXT,
  ADD COLUMN IF NOT EXISTS direct_transfer_date TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS bookings_cashfree_order_idx ON public.bookings(cashfree_order_id);
CREATE INDEX IF NOT EXISTS bookings_transfer_status_idx ON public.bookings(direct_transfer_status);

-- =====================================================
-- STEP 8: INSERT DEFAULT SUBSCRIPTION PLANS
-- =====================================================

INSERT INTO public.subscription_plans (name, duration_type, price, duration_days, features, is_active, sort_order) VALUES
  ('Monthly Plan', 'monthly', 499.00, 30, ARRAY[
    'Add unlimited products',
    'Add unlimited services',
    'Direct payments to your bank',
    'Dashboard analytics',
    'Customer support'
  ], true, 1),
  ('Yearly Plan', 'yearly', 4999.00, 365, ARRAY[
    'Add unlimited products',
    'Add unlimited services',
    'Direct payments to your bank',
    'Dashboard analytics',
    'Priority customer support',
    'Save ₹988 per year'
  ], true, 2)
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 9: CREATE HELPER VIEWS
-- =====================================================

-- View for active subscriptions
CREATE OR REPLACE VIEW public.active_seller_subscriptions AS
SELECT 
  ss.*,
  sp.name as plan_name,
  sp.duration_type,
  s.company_name,
  u.email as seller_email
FROM public.seller_subscriptions ss
JOIN public.subscription_plans sp ON ss.plan_id = sp.id
JOIN public.sellers s ON ss.seller_id = s.id
JOIN public.users u ON s.user_id = u.id
WHERE ss.status = 'active' 
  AND ss.expires_at > NOW();

-- View for expired subscriptions needing renewal
CREATE OR REPLACE VIEW public.expired_seller_subscriptions AS
SELECT 
  ss.*,
  sp.name as plan_name,
  s.company_name,
  u.email as seller_email
FROM public.seller_subscriptions ss
JOIN public.subscription_plans sp ON ss.plan_id = sp.id
JOIN public.sellers s ON ss.seller_id = s.id
JOIN public.users u ON s.user_id = u.id
WHERE (ss.status = 'active' AND ss.expires_at <= NOW())
   OR ss.status = 'expired';

-- View for subscription revenue analytics
CREATE OR REPLACE VIEW public.subscription_revenue AS
SELECT 
  sp.name as plan_name,
  sp.duration_type,
  COUNT(ss.id) as total_subscriptions,
  SUM(ss.amount_paid) as total_revenue,
  COUNT(CASE WHEN ss.status = 'active' AND ss.expires_at > NOW() THEN 1 END) as active_count,
  SUM(CASE WHEN ss.status = 'active' AND ss.expires_at > NOW() THEN ss.amount_paid ELSE 0 END) as active_revenue
FROM public.subscription_plans sp
LEFT JOIN public.seller_subscriptions ss ON sp.id = ss.plan_id
GROUP BY sp.id, sp.name, sp.duration_type
ORDER BY sp.sort_order;

-- =====================================================
-- STEP 10: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to check if seller has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_seller_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.seller_subscriptions
    WHERE seller_id = p_seller_id
      AND status = 'active'
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get seller's current subscription
CREATE OR REPLACE FUNCTION public.get_current_subscription(p_seller_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  plan_name TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.id,
    sp.name,
    ss.expires_at,
    GREATEST(0, EXTRACT(DAY FROM (ss.expires_at - NOW()))::INTEGER) as days_remaining
  FROM public.seller_subscriptions ss
  JOIN public.subscription_plans sp ON ss.plan_id = sp.id
  WHERE ss.seller_id = p_seller_id
    AND ss.status = 'active'
    AND ss.expires_at > NOW()
  ORDER BY ss.expires_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-expire subscriptions (call this via cron or scheduled job)
CREATE OR REPLACE FUNCTION public.expire_old_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.seller_subscriptions
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active'
    AND expires_at <= NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 11: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on subscription tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscription Plans: Everyone can view active plans
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view active subscription plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

-- Subscription Plans: Only admins can manage
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Admins can manage subscription plans"
  ON public.subscription_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- Seller Subscriptions: Sellers can view their own
DROP POLICY IF EXISTS "Sellers can view own subscriptions" ON public.seller_subscriptions;
CREATE POLICY "Sellers can view own subscriptions"
  ON public.seller_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sellers
      WHERE sellers.id = seller_subscriptions.seller_id
        AND sellers.user_id = auth.uid()
    )
  );

-- Seller Subscriptions: Sellers can create their own
DROP POLICY IF EXISTS "Sellers can create own subscriptions" ON public.seller_subscriptions;
CREATE POLICY "Sellers can create own subscriptions"
  ON public.seller_subscriptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sellers
      WHERE sellers.id = seller_subscriptions.seller_id
        AND sellers.user_id = auth.uid()
    )
  );

-- Seller Subscriptions: Admins can view all
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.seller_subscriptions;
CREATE POLICY "Admins can view all subscriptions"
  ON public.seller_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

-- =====================================================
-- STEP 12: UPDATE EXISTING DATA (OPTIONAL)
-- =====================================================

-- Update existing seller bank accounts to set verification status
UPDATE public.seller_bank_accounts
SET verification_status = CASE 
  WHEN is_verified = true THEN 'verified'
  ELSE 'pending'
END
WHERE verification_status IS NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify migration
DO $$
DECLARE
  plans_count INTEGER;
  subscriptions_table_exists BOOLEAN;
BEGIN
  -- Check if tables exist
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'seller_subscriptions'
  ) INTO subscriptions_table_exists;
  
  -- Check if plans were inserted
  SELECT COUNT(*) INTO plans_count FROM public.subscription_plans;
  
  -- Output results
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'CASHFREE MIGRATION STATUS';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Subscription tables created: %', subscriptions_table_exists;
  RAISE NOTICE 'Default plans inserted: % plans', plans_count;
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '==============================================';
END $$;
