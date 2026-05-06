import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface Company {
  id: string;
  user_id: string;
  company_name: string;
  description: string | null;
  company_logo: string | null;
  city: string;
  state: string;
  pincode: string;
  address: string;
  status: 'pending' | 'approved' | 'rejected';
  category_id: string | null;
  // Aggregated counts (filled in via select join)
  services_count: number;
  products_count: number;
  category?: {
    id: string;
    name: string;
    slug: string;
    type: 'ecommerce' | 'booking' | 'hybrid';
    icon: string;
  };
}

interface CompanyState {
  companies: Company[];
  selectedCompany: Company | null;
  loading: boolean;
  error: string | null;

  fetchCompaniesByCategory: (categoryId: string) => Promise<void>;
  fetchCompanyById: (id: string) => Promise<void>;
  setSelectedCompany: (company: Company | null) => void;
}

export const useCompanyStore = create<CompanyState>((set) => ({
  companies: [],
  selectedCompany: null,
  loading: false,
  error: null,

  fetchCompaniesByCategory: async (categoryId: string) => {
    try {
      set({ loading: true, error: null });

      // Use Supabase aggregate counts on related tables filtered by approved sellers
      const { data, error } = await supabase
        .from('sellers')
        .select(
          `
          id,
          user_id,
          company_name,
          description,
          company_logo,
          city,
          state,
          pincode,
          address,
          status,
          category_id,
          category:categories(id, name, slug, type, icon),
          services:services!seller_id(count),
          products:products!seller_id(count)
        `
        )
        .eq('category_id', categoryId)
        .eq('status', 'approved')
        .order('company_name', { ascending: true });

      if (error) {
        console.error('Error fetching companies:', error);
        set({ error: error.message, loading: false, companies: [] });
        return;
      }

      const companies: Company[] = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        company_name: row.company_name,
        description: row.description,
        company_logo: row.company_logo,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        address: row.address,
        status: row.status,
        category_id: row.category_id,
        category: row.category,
        services_count: Array.isArray(row.services) && row.services[0]?.count ? row.services[0].count : 0,
        products_count: Array.isArray(row.products) && row.products[0]?.count ? row.products[0].count : 0,
      }));

      set({ companies, loading: false });
    } catch (error: any) {
      console.error('Error in fetchCompaniesByCategory:', error);
      set({ error: error.message, loading: false, companies: [] });
    }
  },

  fetchCompanyById: async (id: string) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from('sellers')
        .select(
          `
          id,
          user_id,
          company_name,
          description,
          company_logo,
          city,
          state,
          pincode,
          address,
          status,
          category_id,
          category:categories(id, name, slug, type, icon)
        `
        )
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching company:', error);
        set({ error: error.message, loading: false, selectedCompany: null });
        return;
      }

      const company: Company = {
        id: data.id,
        user_id: data.user_id,
        company_name: data.company_name,
        description: data.description,
        company_logo: data.company_logo,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        address: data.address,
        status: data.status,
        category_id: data.category_id,
        category: data.category as any,
        services_count: 0,
        products_count: 0,
      };

      set({ selectedCompany: company, loading: false });
    } catch (error: any) {
      console.error('Error in fetchCompanyById:', error);
      set({ error: error.message, loading: false });
    }
  },

  setSelectedCompany: (company) => set({ selectedCompany: company }),
}));
