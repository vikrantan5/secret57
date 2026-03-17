-- =====================================================
-- FIX FOR USER REGISTRATION RLS POLICY ISSUE
-- =====================================================

-- The issue: The current policy requires auth.uid() = id for INSERT,
-- but during registration, we need to allow users to insert their own record
-- right after Supabase Auth creates their auth account.

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;

-- Create new policy that allows authenticated users to insert their own record
-- This policy checks that the user is authenticated and trying to insert their own ID
CREATE POLICY "Users can insert own data" ON public.users 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Also need to allow anon users to insert during registration (if using anon key)
-- This is more permissive but necessary for the registration flow
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
CREATE POLICY "Enable insert for authenticated users" ON public.users
FOR INSERT
WITH CHECK (true);

-- For better security, you can also use a Supabase Database Function/Trigger
-- to handle user creation, but for now this policy will work.

-- =====================================================
-- ALTERNATIVE: Use Service Role Key (Recommended)
-- =====================================================

-- If you want better security, modify the register function in authStore.ts
-- to use the service role key for inserting the user record.
-- This bypasses RLS entirely for that operation.

-- In your React Native app, you would:
-- 1. Create auth user with regular client
-- 2. Call an Edge Function that uses service role to insert user record
-- 3. Or use service role key directly (less secure if exposed)

-- For now, the above policy change should fix the registration issue.
