import { create } from 'zustand';
import { supabase, supabaseAdmin } from '../services/supabase';
import { generateSignedUrl } from '../utils/imageUpload';

/**
 * Seller Documents Store
 * Backing table: seller_documents (one row per uploaded verification doc)
 * Bucket: seller-documents (PRIVATE — signed URL required for preview/download)
 */

export interface SellerDocument {
  id: string;
  seller_id: string;
  document_name: string;
  document_type: string;
  document_url: string;
  storage_path?: string | null;
  mime_type?: string | null;
  uploaded_at: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface SellerDocumentsState {
  documents: SellerDocument[];
  loading: boolean;
  error: string | null;

  fetchBySeller: (sellerId: string) => Promise<void>;
  createDocument: (data: {
    seller_id: string;
    document_name: string;
    document_type: string;
    document_url: string;
    storage_path?: string;
    mime_type?: string;
  }) => Promise<{ success: boolean; error?: string; doc?: SellerDocument }>;
  updateStatus: (
    id: string,
    status: 'pending' | 'approved' | 'rejected',
    admin_notes?: string,
    reviewer_id?: string
  ) => Promise<{ success: boolean; error?: string }>;
  deleteDocument: (id: string) => Promise<{ success: boolean; error?: string }>;
  getSignedPreviewUrl: (doc: SellerDocument, expiresIn?: number) => Promise<string | null>;
}

const extractStoragePath = (url: string, storedPath?: string | null): string | null => {
  if (storedPath) return storedPath;
  const parts = url?.split('/seller-documents/');
  if (parts && parts.length >= 2) return parts[1];
  return null;
};

export const useSellerDocumentsStore = create<SellerDocumentsState>((set, get) => ({
  documents: [],
  loading: false,
  error: null,

  fetchBySeller: async (sellerId: string) => {
    try {
      set({ loading: true, error: null });
      // Use service-role client so admin can read documents regardless of RLS context
      const { data, error } = await supabaseAdmin
        .from('seller_documents')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[seller_documents] fetch error:', error);
        set({ loading: false, error: error.message, documents: [] });
        return;
      }
      console.log(`[seller_documents] fetched ${data?.length || 0} docs for seller ${sellerId}`);
      set({ documents: data || [], loading: false });
    } catch (e: any) {
      console.error('[seller_documents] fetch exception:', e);
      set({ loading: false, error: e.message, documents: [] });
    }
  },

  createDocument: async (payload) => {
    try {
      console.log('[seller_documents] inserting metadata:', {
        seller_id: payload.seller_id,
        document_name: payload.document_name,
      });
      const { data, error } = await supabaseAdmin
        .from('seller_documents')
        .insert([{ ...payload, verification_status: 'pending' }])
        .select()
        .single();

      if (error) {
        console.error('[seller_documents] insert error:', error);
        return { success: false, error: error.message };
      }
      set({ documents: [data, ...get().documents] });
      return { success: true, doc: data };
    } catch (e: any) {
      console.error('[seller_documents] insert exception:', e);
      return { success: false, error: e.message };
    }
  },

  updateStatus: async (id, status, admin_notes, reviewer_id) => {
    try {
      const updatePayload: any = {
        verification_status: status,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (admin_notes !== undefined) updatePayload.admin_notes = admin_notes;
      if (reviewer_id) updatePayload.reviewed_by = reviewer_id;

      const { error } = await supabaseAdmin
        .from('seller_documents')
        .update(updatePayload)
        .eq('id', id);

      if (error) {
        console.error('[seller_documents] update error:', error);
        return { success: false, error: error.message };
      }

      set({
        documents: get().documents.map((d) =>
          d.id === id ? { ...d, ...updatePayload } : d
        ),
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  deleteDocument: async (id) => {
    try {
      const { error } = await supabaseAdmin
        .from('seller_documents')
        .delete()
        .eq('id', id);
      if (error) return { success: false, error: error.message };
      set({ documents: get().documents.filter((d) => d.id !== id) });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  getSignedPreviewUrl: async (doc, expiresIn = 3600) => {
    try {
      const path = extractStoragePath(doc.document_url, doc.storage_path);
      if (!path) {
        console.warn('[seller_documents] could not extract storage path from', doc.document_url);
        return doc.document_url; // fall back to raw url
      }
      const signed = await generateSignedUrl('seller-documents', path, expiresIn);
      return signed || doc.document_url;
    } catch (e) {
      console.error('[seller_documents] signed url error:', e);
      return doc.document_url;
    }
  },
}));
