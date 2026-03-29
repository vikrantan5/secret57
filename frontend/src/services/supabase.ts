import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Access environment variables directly
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';


// Debug logging
console.log('Supabase Config:', {
  url: supabaseUrl ? 'SET' : 'MISSING',
  anonKey: supabaseAnonKey ? 'SET' : 'MISSING',
  serviceKey: supabaseServiceKey ? 'SET' : 'MISSING',
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase credentials not configured!');
}

if (!supabaseServiceKey) {
  console.warn('WARNING: Service role key not found - registration may fail!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Service role client for admin operations (like user creation during registration)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Types for database tables
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'seller' | 'admin';
  seller_status?: 'pending' | 'approved' | 'rejected';
  avatar_url?: string; // Added for user avatars
  created_at: string;
}

export interface AuthResponse {
  user: User | null;
  error: string | null;
}

