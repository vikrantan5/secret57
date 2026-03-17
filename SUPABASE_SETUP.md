# Supabase Database Setup Guide

## ServiceHub Database Schema

This guide will help you set up the Supabase database for ServiceHub Phase 1.

---

## Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the SQL scripts below

---

## Step 2: Create Users Table

Run this SQL script to create the users table:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'seller', 'admin')),
  seller_status TEXT CHECK (seller_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users(role);
CREATE INDEX IF NOT EXISTS users_seller_status_idx ON public.users(seller_status);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can insert their own data during registration
CREATE POLICY "Users can insert own data"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Admin can read all users (for Phase 2)
CREATE POLICY "Admin can read all users"
ON public.users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

## Step 3: Verify Table Creation

Run this query to verify the table was created successfully:

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_name = 'users'
ORDER BY 
  ordinal_position;
```

Expected output should show:
- id (uuid)
- name (text)
- email (text)
- phone (text)
- role (text)
- seller_status (text)
- created_at (timestamp with time zone)

---

## Step 4: Create Test Admin User (Optional)

To test seller approval functionality in Phase 2, create an admin user:

```sql
-- First, register an admin account through the app, then run:
UPDATE public.users
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

---

## Step 5: Approve Test Seller (If Needed)

If you register as a seller and want to test immediately:

```sql
-- Approve a seller account
UPDATE public.users
SET seller_status = 'approved'
WHERE email = 'your-seller-email@example.com' AND role = 'seller';
```

---

## Step 6: Configure Authentication Settings

1. Go to Authentication > Settings in Supabase dashboard
2. Ensure "Enable email confirmations" is OFF for development (optional)
3. Set minimum password length to 6 characters
4. Configure email templates if needed

---

## Database Schema Overview

### Users Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, references auth.users |
| name | TEXT | User's full name |
| email | TEXT | User's email (unique) |
| phone | TEXT | User's phone number |
| role | TEXT | User role: customer, seller, or admin |
| seller_status | TEXT | Seller approval status: pending, approved, rejected |
| created_at | TIMESTAMP | Account creation timestamp |

---

## Row Level Security (RLS) Policies

### Current Policies:

1. **Users can read own data:** Users can view their own profile
2. **Users can insert own data:** Users can create their profile during registration
3. **Users can update own data:** Users can update their own profile
4. **Admin can read all users:** Admin users can view all user profiles (Phase 2)

---

## Phase 2 Tables (Coming Soon)

These tables will be created in Phase 2:

### Categories Table
```sql
-- Categories (Mehndi, Makeup, Fashion, etc.)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  type TEXT CHECK (type IN ('ecommerce', 'service', 'hybrid')),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Products Table
```sql
-- Products for ecommerce categories
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES users(id),
  category_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  images TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Bookings Table
```sql
-- Bookings for service categories
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  service_id UUID,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Orders Table
```sql
-- Orders for product purchases
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES users(id),
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Backup and Restore

### Create Backup

Supabase automatically backs up your database. You can also:

1. Go to Database > Backups in Supabase dashboard
2. Click "Create Backup"
3. Name your backup

### Restore Backup

1. Go to Database > Backups
2. Find your backup
3. Click "Restore"

---

## Testing Database Connection

Test the connection from your app:

1. Register a new customer account
2. Check Supabase Table Editor to see the new user
3. Try logging in with the account
4. Verify user data appears in the profile screen

---

## Troubleshooting

### Issue: Can't insert user data

**Solution:**
- Check RLS policies are correctly applied
- Verify auth user ID matches the user table ID
- Check for unique constraint violations (duplicate email)

### Issue: Can't read user data

**Solution:**
- Verify user is authenticated
- Check RLS policies allow reading
- Verify user ID in auth matches user table

### Issue: Seller can't login

**Solution:**
- Check seller_status is 'approved'
- Run: `UPDATE users SET seller_status = 'approved' WHERE email = 'seller@example.com'`

---

## Security Best Practices

1. **Always use RLS:** Enable Row Level Security on all tables
2. **Validate inputs:** Check data types and constraints
3. **Use policies:** Create granular access control policies
4. **Monitor logs:** Check Supabase logs for suspicious activity
5. **Regular backups:** Schedule regular database backups

---

## Support

For Supabase-specific issues:
- Documentation: https://supabase.com/docs
- Community: https://github.com/supabase/supabase/discussions
- Discord: https://discord.supabase.com

---

**Last Updated:** Phase 1 - Foundation
