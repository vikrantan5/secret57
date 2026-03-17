import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Access environment variables directly
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Warning: Supabase credentials not configured');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types for database tables
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'seller' | 'admin';
  seller_status?: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface AuthResponse {
  user: User | null;
  error: string | null;
}
