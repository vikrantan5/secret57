-- =====================================================
-- SERVICEHUB - NEW FEATURES DATABASE ADDITIONS
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add OTP fields to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS otp VARCHAR(6),
ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS otp_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS cashfree_order_id TEXT,
ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed'));

-- 2. Add blocking fields to sellers table  
ALTER TABLE public.sellers
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS block_reason TEXT,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES public.users(id);

-- 3. Add payout tracking to order_items
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS payout_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payout_reference TEXT;

-- 4. Add Cashfree fields to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS cashfree_order_id TEXT,
ADD COLUMN IF NOT EXISTS cashfree_payment_id TEXT;

-- 5. Add Cashfree fields to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS cashfree_order_id TEXT,
ADD COLUMN IF NOT EXISTS cashfree_payment_id TEXT;

-- 6. Create seller_warnings table (for 3-strike system)
CREATE TABLE IF NOT EXISTS public.seller_warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES public.users(id) NOT NULL,
  reason TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  action_taken TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS seller_warnings_seller_id_idx ON public.seller_warnings(seller_id);
CREATE INDEX IF NOT EXISTS seller_warnings_resolved_idx ON public.seller_warnings(resolved);

-- 7. Create reports table (Customer -> Seller reports)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  images TEXT[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')) NOT NULL,
  admin_notes TEXT,
  action_taken TEXT,
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reports_customer_id_idx ON public.reports(customer_id);
CREATE INDEX IF NOT EXISTS reports_seller_id_idx ON public.reports(seller_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status);

-- 8. Create payout_transactions table (for tracking seller payouts)
CREATE TABLE IF NOT EXISTS public.payout_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  cashfree_transfer_id TEXT,
  cashfree_beneficiary_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reversed')) NOT NULL,
  failure_reason TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payout_transactions_seller_id_idx ON public.payout_transactions(seller_id);
CREATE INDEX IF NOT EXISTS payout_transactions_status_idx ON public.payout_transactions(status);
CREATE INDEX IF NOT EXISTS payout_transactions_cashfree_transfer_id_idx ON public.payout_transactions(cashfree_transfer_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.seller_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_transactions ENABLE ROW LEVEL SECURITY;

-- Seller Warnings Policies
DROP POLICY IF EXISTS "Admin can manage warnings" ON public.seller_warnings;
CREATE POLICY "Admin can manage warnings" ON public.seller_warnings FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Sellers can view own warnings" ON public.seller_warnings;
CREATE POLICY "Sellers can view own warnings" ON public.seller_warnings FOR SELECT
USING (EXISTS (SELECT 1 FROM public.sellers WHERE id = seller_id AND user_id = auth.uid()));

-- Reports Policies
DROP POLICY IF EXISTS "Customers can create reports" ON public.reports;
CREATE POLICY "Customers can create reports" ON public.reports FOR INSERT
WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can view own reports" ON public.reports;
CREATE POLICY "Customers can view own reports" ON public.reports FOR SELECT
USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Admin can manage all reports" ON public.reports;
CREATE POLICY "Admin can manage all reports" ON public.reports FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Payout Transactions Policies
DROP POLICY IF EXISTS "Sellers can view own payouts" ON public.payout_transactions;
CREATE POLICY "Sellers can view own payouts" ON public.payout_transactions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.sellers WHERE id = seller_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Admin can manage payouts" ON public.payout_transactions;
CREATE POLICY "Admin can manage payouts" ON public.payout_transactions FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to generate 6-digit OTP
CREATE OR REPLACE FUNCTION generate_booking_otp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate OTP for new bookings
  IF NEW.otp IS NULL THEN
    NEW.otp := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    NEW.otp_generated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate OTP on booking creation
DROP TRIGGER IF EXISTS generate_otp_on_booking ON public.bookings;
CREATE TRIGGER generate_otp_on_booking
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION generate_booking_otp();

-- Function to update reports updated_at
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for reports
DROP TRIGGER IF EXISTS update_reports_updated_at ON public.reports;
CREATE TRIGGER update_reports_updated_at 
BEFORE UPDATE ON public.reports
FOR EACH ROW 
EXECUTE FUNCTION update_reports_updated_at();

-- =====================================================
-- VIEWS FOR SELLER EARNINGS
-- =====================================================

DROP VIEW IF EXISTS seller_earnings_summary;
CREATE VIEW seller_earnings_summary AS
SELECT 
  s.id as seller_id,
  s.company_name,
  s.user_id,
  -- Order earnings (completed orders only)
  COALESCE(SUM(CASE 
    WHEN o.status = 'delivered' AND o.payment_status = 'paid' 
    THEN oi.total 
    ELSE 0 
  END), 0) as total_order_earnings,
  -- Booking earnings (completed bookings only)
  COALESCE(SUM(CASE 
    WHEN b.status = 'completed' AND b.payment_method IS NOT NULL
    THEN b.total_amount 
    ELSE 0 
  END), 0) as total_booking_earnings,
  -- Platform fees (10%)
  COALESCE(SUM(CASE 
    WHEN o.status = 'delivered' AND o.payment_status = 'paid' 
    THEN oi.total * 0.10 
    ELSE 0 
  END), 0) + COALESCE(SUM(CASE 
    WHEN b.status = 'completed' AND b.payment_method IS NOT NULL
    THEN b.total_amount * 0.10 
    ELSE 0 
  END), 0) as total_platform_fees,
  -- Net earnings (after platform fee)
  COALESCE(SUM(CASE 
    WHEN o.status = 'delivered' AND o.payment_status = 'paid' 
    THEN oi.total * 0.90 
    ELSE 0 
  END), 0) + COALESCE(SUM(CASE 
    WHEN b.status = 'completed' AND b.payment_method IS NOT NULL
    THEN b.total_amount * 0.90 
    ELSE 0 
  END), 0) as net_earnings,
  -- Payouts already sent
  COALESCE((SELECT SUM(net_amount) 
    FROM public.payout_transactions pt 
    WHERE pt.seller_id = s.id AND pt.status = 'completed'), 0) as total_payouts,
  -- Pending payout amount
  COALESCE(SUM(CASE 
    WHEN o.status = 'delivered' AND o.payment_status = 'paid' 
    THEN oi.total * 0.90 
    ELSE 0 
  END), 0) + COALESCE(SUM(CASE 
    WHEN b.status = 'completed' AND b.payment_method IS NOT NULL
    THEN b.total_amount * 0.90 
    ELSE 0 
  END), 0) - COALESCE((SELECT SUM(net_amount) 
    FROM public.payout_transactions pt 
    WHERE pt.seller_id = s.id AND pt.status = 'completed'), 0) as pending_payout
FROM public.sellers s
LEFT JOIN public.order_items oi ON oi.seller_id = s.id
LEFT JOIN public.orders o ON o.id = oi.order_id
LEFT JOIN public.bookings b ON b.seller_id = s.id
GROUP BY s.id, s.company_name, s.user_id;

-- Grant access to the view
GRANT SELECT ON seller_earnings_summary TO authenticated;

-- =====================================================
-- COMPLETION
-- =====================================================
-- All database additions completed successfully!
-- Next: Run this script in Supabase SQL Editor
