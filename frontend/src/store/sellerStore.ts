import React from 'react';
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToSupabase } from '../utils/imageUpload';

export interface Seller {
  id: string;
  user_id: string;
  company_name: string;
  business_registration_number: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  company_logo: string | null;
  verification_documents: string[];
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    type: 'ecommerce' | 'booking' | 'hybrid';
    icon: string;
  };
}

interface SellerState {
  seller: Seller | null;
  loading: boolean;
  setSeller: (seller: Seller | null) => void;
  setLoading: (loading: boolean) => void;
  fetchSellerProfile: (userId: string) => Promise<void>;
  createSellerProfile: (data: {
    user_id: string;
    company_name: string;
    business_registration_number?: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    description?: string;
     category_id?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  uploadCompanyLogo: (sellerId: string, imageUri: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  uploadVerificationDocument: (sellerId: string, imageUri: string) => Promise<{ success: boolean; url?: string; error?: string }>;
}

export const useSellerStore = create<SellerState>((set, get) => ({
  seller: null,
  loading: false,

  setSeller: (seller) => set({ seller }),

  setLoading: (loading) => set({ loading }),

  fetchSellerProfile: async (userId: string) => {
    try {
      set({ loading: true });
      
      const { data, error } = await supabase
        .from('sellers')
        .select(`
          *,
          category:categories(id, name, slug, type, icon)
        `)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching seller profile:', error);
        set({ seller: null, loading: false });
        return;
      }

      set({ seller: data, loading: false });
    } catch (error) {
      console.error('Error in fetchSellerProfile:', error);
      set({ loading: false });
    }
  },

  createSellerProfile: async (data) => {
    try {
      set({ loading: true });

      const sellerData = {
        ...data,
        status: 'pending',
        company_logo: null,
        verification_documents: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newSeller, error } = await supabase
        .from('sellers')
        .insert([sellerData])
        .select()
        .single();

      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      set({ seller: newSeller, loading: false });
      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message || 'Failed to create seller profile' };
    }
  },

  uploadCompanyLogo: async (sellerId: string, imageUri: string) => {
    try {
      const result = await uploadImageToSupabase(
        imageUri,
        'company-logos',
        sellerId
      );

      if (!result.success || !result.url) {
        return {
          success: false,
          error: result.error || 'Failed to upload logo'
        };
      }

      const publicUrl = result.url;

      const { error: updateError } = await supabase
        .from('sellers')
        .update({ company_logo: publicUrl })
        .eq('id', sellerId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      const currentSeller = get().seller;
      if (currentSeller) {
        set({ seller: { ...currentSeller, company_logo: publicUrl } });
      }

      return { success: true, url: publicUrl };
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      return { success: false, error: error.message || 'Failed to upload logo' };
    }
  },

  uploadVerificationDocument: async (sellerId: string, imageUri: string) => {
    try {
      const result = await uploadImageToSupabase(
        imageUri,
        'seller-documents',
        sellerId
      );

      if (!result.success || !result.url) {
        return {
          success: false,
          error: result.error || 'Failed to upload document'
        };
      }

      const publicUrl = result.url;

      const currentSeller = get().seller;
      if (currentSeller) {
        const updatedDocs = [
          ...(currentSeller.verification_documents || []),
          publicUrl,
        ];

        const { error: updateError } = await supabase
          .from('sellers')
          .update({ verification_documents: updatedDocs })
          .eq('id', sellerId);

        if (updateError) {
          return { success: false, error: updateError.message };
        }

        set({ seller: { ...currentSeller, verification_documents: updatedDocs } });
      }

      return { success: true, url: publicUrl };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to upload document' };
    }
  },
})); // <-- FIXED: Closing Zustand store