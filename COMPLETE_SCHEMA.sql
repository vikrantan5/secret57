-- =====================================================
-- SERVICEHUB COMPLETE DATABASE SCHEMA
-- Multi-Vendor Marketplace & Service Booking Platform
-- All Phases (1-11) Combined
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PHASE 1 & 2: USERS AND AUTHENTICATION
-- =====================================================

-- Users table (already exists from Phase 1, but including for completeness)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'seller', 'admin')),
  seller_status TEXT CHECK (seller_status IN ('pending', 'approved', 'rejected')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users(role);
CREATE INDEX IF NOT EXISTS users_seller_status_idx ON public.users(seller_status);

-- =====================================================
-- PHASE 3: SELLER COMPANY INFORMATION
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  business_registration_number TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  company_logo TEXT,
  verification_documents TEXT[], -- Array of document URLs
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX sellers_user_id_idx ON public.sellers(user_id);
CREATE INDEX sellers_status_idx ON public.sellers(status);

-- =====================================================
-- PHASE 4: CATEGORIES SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ecommerce', 'booking', 'hybrid')),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX categories_type_idx ON public.categories(type);
CREATE INDEX categories_slug_idx ON public.categories(slug);

-- Insert default categories
INSERT INTO public.categories (name, slug, description, icon, type, sort_order) VALUES
  ('Mehndi Artist', 'mehndi-artist', 'Professional mehndi/henna services', 'hand-left', 'booking', 1),
  ('Makeup Artist', 'makeup-artist', 'Bridal and party makeup services', 'color-palette', 'booking', 2),
  ('Fashion Designer', 'fashion-designer', 'Custom clothing and fashion items', 'shirt', 'ecommerce', 3),
  ('Home Bakers', 'home-bakers', 'Cakes, pastries and custom baked goods', 'pizza', 'hybrid', 4),
  ('Handmade Gifts', 'handmade-gifts', 'Personalized handcrafted gifts', 'gift', 'hybrid', 5),
  ('Event Manager', 'event-manager', 'Wedding and event planning services', 'calendar', 'booking', 6),
  ('Private Tutor', 'private-tutor', 'One-on-one tutoring services', 'book', 'booking', 7)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- PHASE 5: ECOMMERCE - PRODUCTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price DECIMAL(10,2), -- Original price for discounts
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  images TEXT[] NOT NULL, -- Array of image URLs from Supabase Storage
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sku TEXT,
  weight DECIMAL(10,2), -- in kg
  dimensions TEXT, -- e.g., "10x20x5 cm"
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX products_seller_id_idx ON public.products(seller_id);
CREATE INDEX products_category_id_idx ON public.products(category_id);
CREATE INDEX products_is_active_idx ON public.products(is_active);
CREATE INDEX products_is_featured_idx ON public.products(is_featured);

-- =====================================================
-- PHASE 5: SERVICE OFFERINGS (for booking categories)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  duration INTEGER, -- in minutes
  images TEXT[],
  location_type TEXT CHECK (location_type IN ('visit_customer', 'customer_visits', 'both')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX services_seller_id_idx ON public.services(seller_id);
CREATE INDEX services_category_id_idx ON public.services(category_id);

-- =====================================================
-- PHASE 6: BOOKING SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id),
  seller_id UUID REFERENCES public.sellers(id),
  service_id UUID REFERENCES public.services(id),
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  location_type TEXT CHECK (location_type IN ('visit_customer', 'customer_visits')),
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  notes TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'rejected')),
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX bookings_customer_id_idx ON public.bookings(customer_id);
CREATE INDEX bookings_seller_id_idx ON public.bookings(seller_id);
CREATE INDEX bookings_status_idx ON public.bookings(status);
CREATE INDEX bookings_date_idx ON public.bookings(booking_date);

-- =====================================================
-- PHASE 7: ORDERS & CART
-- =====================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id),
  order_number TEXT UNIQUE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  delivery_charges DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  
  -- Delivery Address
  shipping_name TEXT NOT NULL,
  shipping_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_pincode TEXT NOT NULL,
  
  -- Payment Info
  payment_method TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  
  -- Tracking
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  tracking_number TEXT,
  cancellation_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX orders_customer_id_idx ON public.orders(customer_id);
CREATE INDEX orders_status_idx ON public.orders(status);
CREATE INDEX orders_order_number_idx ON public.orders(order_number);

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  seller_id UUID REFERENCES public.sellers(id),
  product_name TEXT NOT NULL,
  product_image TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX order_items_order_id_idx ON public.order_items(order_id);
CREATE INDEX order_items_seller_id_idx ON public.order_items(seller_id);

-- =====================================================
-- PHASE 7: CUSTOM ORDERS (for hybrid categories)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.custom_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id),
  seller_id UUID REFERENCES public.sellers(id),
  category_id UUID REFERENCES public.categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reference_images TEXT[],
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  delivery_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled')),
  quoted_price DECIMAL(10,2),
  seller_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX custom_orders_customer_id_idx ON public.custom_orders(customer_id);
CREATE INDEX custom_orders_seller_id_idx ON public.custom_orders(seller_id);
CREATE INDEX custom_orders_status_idx ON public.custom_orders(status);

-- =====================================================
-- PHASE 8: PAYMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id),
  booking_id UUID REFERENCES public.bookings(id),
  custom_order_id UUID REFERENCES public.custom_orders(id),
  user_id UUID REFERENCES public.users(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_method TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_signature TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  refund_amount DECIMAL(10,2),
  refund_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX payments_order_id_idx ON public.payments(order_id);
CREATE INDEX payments_user_id_idx ON public.payments(user_id);
CREATE INDEX payments_status_idx ON public.payments(status);

-- =====================================================
-- PHASE 9 & 11: REVIEWS AND RATINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id),
  seller_id UUID REFERENCES public.sellers(id),
  product_id UUID REFERENCES public.products(id),
  service_id UUID REFERENCES public.services(id),
  order_id UUID REFERENCES public.orders(id),
  booking_id UUID REFERENCES public.bookings(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  images TEXT[],
  is_verified_purchase BOOLEAN DEFAULT false,
  seller_reply TEXT,
  seller_reply_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX reviews_customer_id_idx ON public.reviews(customer_id);
CREATE INDEX reviews_seller_id_idx ON public.reviews(seller_id);
CREATE INDEX reviews_product_id_idx ON public.reviews(product_id);
CREATE INDEX reviews_rating_idx ON public.reviews(rating);

-- =====================================================
-- PHASE 11: WISHLIST
-- =====================================================

CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX wishlists_user_id_idx ON public.wishlists(user_id);

-- =====================================================
-- PHASE 11: COUPONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount_amount DECIMAL(10,2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX coupons_code_idx ON public.coupons(code);
CREATE INDEX coupons_is_active_idx ON public.coupons(is_active);

-- =====================================================
-- PHASE 8 & 11: NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('order', 'booking', 'payment', 'review', 'seller_approval', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX notifications_is_read_idx ON public.notifications(is_read);
CREATE INDEX notifications_created_at_idx ON public.notifications(created_at);

-- =====================================================
-- PHASE 11: CHAT/MESSAGES (Customer-Seller Communication)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id),
  seller_id UUID REFERENCES public.sellers(id),
  product_id UUID REFERENCES public.products(id),
  service_id UUID REFERENCES public.services(id),
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, seller_id)
);

CREATE INDEX conversations_customer_id_idx ON public.conversations(customer_id);
CREATE INDEX conversations_seller_id_idx ON public.conversations(seller_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id),
  message TEXT NOT NULL,
  images TEXT[],
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX messages_conversation_id_idx ON public.messages(conversation_id);
CREATE INDEX messages_created_at_idx ON public.messages(created_at);

-- =====================================================
-- PHASE 10: PLATFORM ANALYTICS (for Admin Dashboard)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.platform_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  total_orders INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  new_sellers INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX platform_stats_date_idx ON public.platform_stats(date);

-- =====================================================
-- SELLER AVAILABILITY (for booking services)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.seller_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX seller_availability_seller_id_idx ON public.seller_availability(seller_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_availability ENABLE ROW LEVEL SECURITY;

-- Users Policies (already exists from Phase 1)
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
CREATE POLICY "Users can insert own data" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin can read all users" ON public.users;
CREATE POLICY "Admin can read all users" ON public.users FOR SELECT
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Categories Policies (Public read)
CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT USING (is_active = true);

-- Products Policies
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Sellers can manage own products" ON public.products FOR ALL
USING (EXISTS (SELECT 1 FROM public.sellers WHERE id = seller_id AND user_id = auth.uid()));

-- Services Policies
CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING (is_active = true);
CREATE POLICY "Sellers can manage own services" ON public.services FOR ALL
USING (EXISTS (SELECT 1 FROM public.sellers WHERE id = seller_id AND user_id = auth.uid()));

-- Sellers Policies
CREATE POLICY "Sellers can read own data" ON public.sellers FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Sellers can insert own data" ON public.sellers FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Sellers can update own data" ON public.sellers FOR UPDATE
USING (user_id = auth.uid());

-- Bookings Policies
CREATE POLICY "Customers can view own bookings" ON public.bookings FOR SELECT
USING (customer_id = auth.uid());

CREATE POLICY "Sellers can view their bookings" ON public.bookings FOR SELECT
USING (EXISTS (SELECT 1 FROM public.sellers WHERE id = seller_id AND user_id = auth.uid()));

CREATE POLICY "Customers can create bookings" ON public.bookings FOR INSERT
WITH CHECK (customer_id = auth.uid());

-- Orders Policies
CREATE POLICY "Customers can view own orders" ON public.orders FOR SELECT
USING (customer_id = auth.uid());

CREATE POLICY "Customers can create orders" ON public.orders FOR INSERT
WITH CHECK (customer_id = auth.uid());

-- Wishlists Policies
CREATE POLICY "Users can manage own wishlist" ON public.wishlists FOR ALL
USING (user_id = auth.uid());

-- Reviews Policies
CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customers can create reviews" ON public.reviews FOR INSERT
WITH CHECK (customer_id = auth.uid());

-- Notifications Policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON public.sellers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'ORD' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STORAGE BUCKETS (Run in Supabase Dashboard > Storage)
-- =====================================================

-- Run these commands in Supabase Dashboard:
-- 1. Create bucket: product-images (public)
-- 2. Create bucket: service-images (public)
-- 3. Create bucket: user-avatars (public)
-- 4. Create bucket: seller-documents (private)
-- 5. Create bucket: custom-order-images (private)

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- Seller Revenue View
CREATE OR REPLACE VIEW seller_revenue AS
SELECT 
  s.id as seller_id,
  s.company_name,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(oi.total) as total_revenue,
  COUNT(DISTINCT b.id) as total_bookings,
  SUM(b.total_amount) as booking_revenue
FROM public.sellers s
LEFT JOIN public.order_items oi ON oi.seller_id = s.id
LEFT JOIN public.orders o ON o.id = oi.order_id AND o.payment_status = 'paid'
LEFT JOIN public.bookings b ON b.seller_id = s.id AND b.status = 'completed'
GROUP BY s.id, s.company_name;

-- Product Stats View
CREATE OR REPLACE VIEW product_stats AS
SELECT 
  p.id,
  p.name,
  p.price,
  p.stock,
  COUNT(DISTINCT oi.id) as times_sold,
  SUM(oi.quantity) as total_quantity_sold,
  AVG(r.rating) as average_rating,
  COUNT(DISTINCT r.id) as review_count
FROM public.products p
LEFT JOIN public.order_items oi ON oi.product_id = p.id
LEFT JOIN public.reviews r ON r.product_id = p.id
GROUP BY p.id;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- Database schema created successfully!
-- Next steps:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Create storage buckets in Supabase Dashboard
-- 3. Configure storage policies for each bucket
-- 4. Test with sample data
