import React from 'react';
import { create } from 'zustand';
import { supabase, User } from '../services/supabase';

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

      // Check seller approval status
      if (role === 'seller' && userData.seller_status !== 'approved') {
        await supabase.auth.signOut();
        set({ loading: false });
        return { success: false, error: 'Your seller account is pending approval' };
      }

      set({ 
        user: userData, 
        session: authData.session, 
        isAuthenticated: true,
        loading: false 
      });

      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message || 'Login failed' };
    }
  },

  register: async (name, email, password, phone, role) => {
    try {
      set({ loading: true });

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        set({ loading: false });
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        set({ loading: false });
        return { success: false, error: 'Registration failed' };
      }

      // Create user record
      const newUser = {
        id: authData.user.id,
        name,
        email,
        phone,
        role,
        seller_status: role === 'seller' ? 'pending' : null,
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('users')
        .insert([newUser]);

      if (insertError) {
        // Rollback auth user creation
        await supabase.auth.admin.deleteUser(authData.user.id);
        set({ loading: false });
        return { success: false, error: insertError.message };
      }

      set({ loading: false });
      return { success: true };
    } catch (error: any) {
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
