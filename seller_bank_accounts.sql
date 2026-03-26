"-- =====================================================
-- SELLER BANK ACCOUNTS TABLE
-- For storing seller bank details for payouts
-- =====================================================

CREATE TABLE IF NOT EXISTS public.seller_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  account_holder_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_type TEXT CHECK (account_type IN ('savings', 'current')) DEFAULT 'savings',
  is_verified BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(seller_id, account_number)
);

CREATE INDEX seller_bank_accounts_seller_id_idx ON public.seller_bank_accounts(seller_id);

-- =====================================================
-- PAYOUTS TABLE
-- Track manual payouts from admin to sellers
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  bank_account_id UUID REFERENCES public.seller_bank_accounts(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  order_ids TEXT[], -- Array of order IDs included in this payout
  booking_ids TEXT[], -- Array of booking IDs included in this payout
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payment_method TEXT DEFAULT 'bank_transfer',
  transaction_reference TEXT,
  notes TEXT,
  processed_by UUID REFERENCES public.users(id), -- Admin user who processed
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX payouts_seller_id_idx ON public.payouts(seller_id);
CREATE INDEX payouts_status_idx ON public.payouts(status);
CREATE INDEX payouts_created_at_idx ON public.payouts(created_at);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE public.seller_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Seller Bank Accounts Policies
DROP POLICY IF EXISTS \"Sellers can view own bank accounts\" ON public.seller_bank_accounts;
CREATE POLICY \"Sellers can view own bank accounts\" ON public.seller_bank_accounts FOR SELECT
USING (EXISTS (SELECT 1 FROM public.sellers WHERE id = seller_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS \"Sellers can insert own bank accounts\" ON public.seller_bank_accounts;
CREATE POLICY \"Sellers can insert own bank accounts\" ON public.seller_bank_accounts FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.sellers WHERE id = seller_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS \"Sellers can update own bank accounts\" ON public.seller_bank_accounts;
CREATE POLICY \"Sellers can update own bank accounts\" ON public.seller_bank_accounts FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.sellers WHERE id = seller_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS \"Admin can view all bank accounts\" ON public.seller_bank_accounts;
CREATE POLICY \"Admin can view all bank accounts\" ON public.seller_bank_accounts FOR SELECT
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Payouts Policies
DROP POLICY IF EXISTS \"Sellers can view own payouts\" ON public.payouts;
CREATE POLICY \"Sellers can view own payouts\" ON public.payouts FOR SELECT
USING (EXISTS (SELECT 1 FROM public.sellers WHERE id = seller_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS \"Admin can manage all payouts\" ON public.payouts;
CREATE POLICY \"Admin can manage all payouts\" ON public.payouts FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_seller_bank_accounts_updated_at 
BEFORE UPDATE ON public.seller_bank_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at 
BEFORE UPDATE ON public.payouts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS FOR SELLER REVENUE & PAYOUTS
-- =====================================================

CREATE OR REPLACE VIEW seller_payout_summary AS
SELECT 
  s.id as seller_id,
  s.company_name,
  s.user_id,
  -- Total revenue from orders
  COALESCE(SUM(oi.total), 0) as total_order_revenue,
  -- Total revenue from bookings
  COALESCE((SELECT SUM(b.total_amount) 
    FROM public.bookings b 
    WHERE b.seller_id = s.id 
    AND b.status = 'completed'), 0) as total_booking_revenue,
  -- Total revenue
  COALESCE(SUM(oi.total), 0) + 
  COALESCE((SELECT SUM(b.total_amount) 
    FROM public.bookings b 
    WHERE b.seller_id = s.id 
    AND b.status = 'completed'), 0) as total_revenue,
  -- Total payouts received
  COALESCE((SELECT SUM(p.amount) 
    FROM public.payouts p 
    WHERE p.seller_id = s.id 
    AND p.status = 'completed'), 0) as total_payouts,
  -- Pending amount (revenue - payouts)
  (COALESCE(SUM(oi.total), 0) + 
   COALESCE((SELECT SUM(b.total_amount) 
     FROM public.bookings b 
     WHERE b.seller_id = s.id 
     AND b.status = 'completed'), 0) -
   COALESCE((SELECT SUM(p.amount) 
     FROM public.payouts p 
     WHERE p.seller_id = s.id 
     AND p.status = 'completed'), 0)) as pending_amount
FROM public.sellers s
LEFT JOIN public.order_items oi ON oi.seller_id = s.id
LEFT JOIN public.orders o ON o.id = oi.order_id AND o.payment_status = 'paid'
GROUP BY s.id, s.company_name, s.user_id;

-- =====================================================
-- COMPLETION
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- This creates the necessary tables for seller payouts
"