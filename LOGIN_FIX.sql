-- =====================================================
-- FIX FOR LOGIN "USER NOT FOUND" ISSUE
-- =====================================================
-- 
-- ISSUE: The current RLS policy only allows authenticated users to read
-- their own data, but during login, the user is not authenticated yet!
-- 
-- SOLUTION: Add a public read policy to allow login queries
-- =====================================================

-- Step 1: Drop the restrictive policy
DROP POLICY IF EXISTS "Users can read own data" ON public.users;

-- Step 2: Create a public read policy that allows anyone to read user data
-- This is safe for a marketplace where profiles need to be visible
CREATE POLICY "Public read access for users" ON public.users 
FOR SELECT 
USING (true);

-- Step 3: Keep the authenticated read policy for consistency
CREATE POLICY "Authenticated users can read own data" ON public.users 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Step 4: Verify the test accounts exist
SELECT id, name, email, role, seller_status 
FROM public.users 
WHERE email IN ('customer@gmail.com', 'seller@gmail.com');

-- =====================================================
-- If the accounts don't exist, you'll need to:
-- 1. Create them in Supabase Auth (Authentication > Users)
-- 2. Then insert records in public.users table
-- =====================================================
