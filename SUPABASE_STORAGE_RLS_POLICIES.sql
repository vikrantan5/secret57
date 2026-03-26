-- =====================================================
-- SUPABASE STORAGE RLS POLICIES FOR IMAGE UPLOADS
-- =====================================================
-- Run these policies in your Supabase SQL Editor
-- to ensure proper access control for all storage buckets
-- =====================================================

-- =====================================================
-- 1. PRODUCT IMAGES BUCKET (Public)
-- =====================================================

-- Allow authenticated users to upload product images
CREATE POLICY "Allow authenticated users to upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Allow authenticated users to update their own product images
CREATE POLICY "Allow authenticated users to update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

-- Allow authenticated users to delete their own product images
CREATE POLICY "Allow authenticated users to delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- Allow public read access to product images
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- =====================================================
-- 2. SERVICE IMAGES BUCKET (Public)
-- =====================================================

-- Allow authenticated users to upload service images
CREATE POLICY "Allow authenticated users to upload service images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service-images');

-- Allow authenticated users to update service images
CREATE POLICY "Allow authenticated users to update service images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'service-images');

-- Allow authenticated users to delete service images
CREATE POLICY "Allow authenticated users to delete service images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'service-images');

-- Allow public read access to service images
CREATE POLICY "Public read access for service images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'service-images');

-- =====================================================
-- 3. COMPANY LOGOS BUCKET (Public)
-- =====================================================

-- Allow authenticated users to upload company logos
CREATE POLICY "Allow authenticated users to upload company logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-logos');

-- Allow authenticated users to update company logos
CREATE POLICY "Allow authenticated users to update company logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-logos');

-- Allow authenticated users to delete company logos
CREATE POLICY "Allow authenticated users to delete company logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-logos');

-- Allow public read access to company logos
CREATE POLICY "Public read access for company logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- =====================================================
-- 4. USER AVATARS BUCKET (Public)
-- =====================================================

-- Allow authenticated users to upload user avatars
CREATE POLICY "Allow authenticated users to upload user avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-avatars');

-- Allow authenticated users to update user avatars
CREATE POLICY "Allow authenticated users to update user avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-avatars');

-- Allow authenticated users to delete user avatars
CREATE POLICY "Allow authenticated users to delete user avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-avatars');

-- Allow public read access to user avatars
CREATE POLICY "Public read access for user avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-avatars');

-- =====================================================
-- 5. SELLER DOCUMENTS BUCKET (Private)
-- =====================================================
-- Note: This bucket should remain private for verification documents

-- Allow authenticated sellers to upload their documents
CREATE POLICY "Allow authenticated users to upload seller documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'seller-documents');

-- Allow authenticated users to update their documents
CREATE POLICY "Allow authenticated users to update seller documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'seller-documents');

-- Allow authenticated users to delete their documents
CREATE POLICY "Allow authenticated users to delete seller documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'seller-documents');

-- Allow authenticated users to read seller documents
-- (Admin panel will need to view these for approval)
CREATE POLICY "Allow authenticated users to read seller documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'seller-documents');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify your buckets and policies are set up correctly

-- Check all storage buckets
SELECT id, name, public FROM storage.buckets ORDER BY name;

-- Check all storage policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
ORDER BY tablename, policyname;

-- =====================================================
-- BUCKET CREATION (if not exists)
-- =====================================================
-- Run these if you need to create the buckets

-- Create product-images bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create service-images bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create company-logos bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create user-avatars bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create seller-documents bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('seller-documents', 'seller-documents', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- CLEANUP (Optional - use with caution!)
-- =====================================================
-- Remove all existing policies if you need to start fresh
-- WARNING: This will delete ALL storage policies!

-- DROP POLICY IF EXISTS "Allow authenticated users to upload product images" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated users to update product images" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated users to delete product images" ON storage.objects;
-- DROP POLICY IF EXISTS "Public read access for product images" ON storage.objects;

-- (Add similar DROP statements for other policies as needed)

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Make sure all public buckets have 'public' = true in storage.buckets
-- 2. Private buckets (seller-documents) should have 'public' = false
-- 3. These policies allow ALL authenticated users to upload/modify
--    For production, you may want to add more restrictive policies
--    that check if the user owns the resource
-- 4. Test uploads after applying these policies
-- =====================================================
