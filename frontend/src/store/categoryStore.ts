import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  image_url?: string; // New field for category logo images
  type: 'ecommerce' | 'booking' | 'hybrid';
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface CategoryState {
  categories: Category[];
  selectedCategory: Category | null;
  loading: boolean;
  error: string | null;
  
  fetchCategories: () => Promise<void>;
  selectCategory: (category: Category) => void;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryBySlug: (slug: string) => Category | undefined;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  selectedCategory: null,
  loading: false,
  error: null,

  fetchCategories: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        set({ error: error.message, loading: false });
        return;
      }

      set({ categories: data || [], loading: false });
    } catch (error: any) {
      console.error('Error in fetchCategories:', error);
      set({ error: error.message, loading: false });
    }
  },

  selectCategory: (category) => set({ selectedCategory: category }),

  getCategoryById: (id) => {
    return get().categories.find(cat => cat.id === id);
  },

  getCategoryBySlug: (slug) => {
    return get().categories.find(cat => cat.slug === slug);
  },
}));
