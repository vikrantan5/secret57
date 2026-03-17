-- =====================================================
-- COMPLETE FIX FOR LOGIN ISSUE
-- =====================================================

-- Step 1: Drop all problematic policies
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Admin can read all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;

-- Step 2: Create fixed policies without recursion

-- Policy 1: Allow authenticated users to read their own data
CREATE POLICY "Users can read own data" ON public.users 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Policy 2: Allow public read access for all users
-- (Required for marketplace: sellers visible to customers, etc.)
CREATE POLICY "Public read access" ON public.users 
FOR SELECT 
USING (true);

-- Policy 3: Allow users to insert during registration
CREATE POLICY "Users can insert own data" ON public.users 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy 4: Allow users to update their own data
CREATE POLICY "Users can update own data" ON public.users 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Step 3: Verify the user exists
SELECT id, name, email, role, seller_status 
FROM public.users 
WHERE email = 'viktalkvikrant05@gmail.com';