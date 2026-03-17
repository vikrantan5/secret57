import React from 'react';
import { create } from 'zustand';
import { router } from 'expo-router';
import { supabase, supabaseAdmin, User } from '../services/supabase';

interface AuthState {
  user: User | null;
  session: any;
  loading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: any) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string, role: 'customer' | 'seller') => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, phone: string, role: 'customer' | 'seller') => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setSession: (session) => set({ session }),
  
  setLoading: (loading) => set({ loading }),

  login: async (email, password, role) => {
    try {
      set({ loading: true });
      
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        set({ loading: false });
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        set({ loading: false });
        return { success: false, error: 'Login failed' };
      }

      // Fetch user data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError || !userData) {
        set({ loading: false });
        return { success: false, error: 'User not found' };
      }

      // Check if role matches
      if (userData.role !== role) {
        await supabase.auth.signOut();
        set({ loading: false });
        return { success: false, error: `This account is not registered as a ${role}` };
      }



      set({ 
        user: userData, 
        session: authData.session, 
        isAuthenticated: true,
        loading: false 
      });

       // Handle routing based on user role
      if (role === 'seller') {
        // Check if seller has a company profile
        const { data: sellerData } = await supabase
          .from('sellers')
          .select('*')
          .eq('user_id', userData.id)
          .single();

        if (!sellerData) {
          // No seller profile - redirect to company setup
          router.replace('/seller/company-setup');
        } else if (sellerData.status === 'pending' || sellerData.status === 'rejected') {
          // Seller pending approval - redirect to pending page
          router.replace('/seller/pending-approval');
        } else if (sellerData.status === 'approved') {
          // Approved seller - redirect to dashboard
          router.replace('/seller/dashboard');
        }
      } else {
        // Customer - redirect to home
        router.replace('/(tabs)/home');
      }

      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message || 'Login failed' };
    }
  },

  register: async (name, email, password, phone, role) => {
    try {
      set({ loading: true });

      console.log('=== REGISTRATION START ===');
      console.log('Name:', name);
      console.log('Email:', email);
      console.log('Phone:', phone);
      console.log('Role:', role);

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        set({ loading: false });
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        console.error('No user returned from auth.signUp');
        set({ loading: false });
        return { success: false, error: 'Registration failed' };
      }

      console.log('Auth user created successfully:', authData.user.id);

      // Create user record using service role to bypass RLS
      const newUser = {
        id: authData.user.id,
        name,
        email,
        phone,
        role,
        seller_status: role === 'seller' ? 'pending' : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('Inserting user record into public.users:', newUser);

      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('users')
        .insert([newUser])
        .select();

      if (insertError) {
        console.error('User insert error:', insertError);
        console.error('Error details:', JSON.stringify(insertError, null, 2));
        set({ loading: false });
        return { success: false, error: insertError.message };
      }

      console.log('User record created successfully:', insertData);
      console.log('=== REGISTRATION COMPLETE ===');

      set({ loading: false });
      return { success: true };
    } catch (error: any) {
      console.error('Registration exception:', error);
      set({ loading: false });
      return { success: false, error: error.message || 'Registration failed' };
    }
  },
  logout: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null, isAuthenticated: false });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  checkSession: async () => {
    try {
      set({ loading: true });
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userData) {
          set({ 
            user: userData, 
            session, 
            isAuthenticated: true,
            loading: false 
          });
          return;
        }
      }
      
      set({ user: null, session: null, isAuthenticated: false, loading: false });
    } catch (error) {
      console.error('Session check error:', error);
      set({ loading: false });
    }
  },
}));
