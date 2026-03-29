import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface AddressState {
  addresses: UserAddress[];
  loading: boolean;
  
  addAddress: (data: Partial<UserAddress>) => Promise<{ success: boolean; error?: string; address?: UserAddress }>;
  updateAddress: (id: string, data: Partial<UserAddress>) => Promise<{ success: boolean; error?: string }>;
  deleteAddress: (id: string) => Promise<{ success: boolean; error?: string }>;
  setDefaultAddress: (id: string) => Promise<{ success: boolean; error?: string }>;
  fetchUserAddresses: (userId: string) => Promise<void>;
  getDefaultAddress: () => UserAddress | null;
}

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: [],
  loading: false,

  addAddress: async (data) => {
    try {
      set({ loading: true });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // If this is the first address or is_default is true, unset other defaults
      if (data.is_default || get().addresses.length === 0) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const addressData = {
        ...data,
        user_id: user.id,
        is_default: data.is_default || get().addresses.length === 0,
      };

      const { data: newAddress, error } = await supabase
        .from('user_addresses')
        .insert([addressData])
        .select()
        .single();

      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      set({ 
        addresses: [...get().addresses, newAddress],
        loading: false 
      });
      
      return { success: true, address: newAddress };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  updateAddress: async (id, data) => {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      // If setting as default, unset other defaults
      if (data.is_default) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_addresses')
            .update({ is_default: false })
            .eq('user_id', user.id);
        }
      }

      const { error } = await supabase
        .from('user_addresses')
        .update(updateData)
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      const updatedAddresses = get().addresses.map(addr =>
        addr.id === id ? { ...addr, ...updateData } : 
        (data.is_default ? { ...addr, is_default: false } : addr)
      );
      set({ addresses: updatedAddresses });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  deleteAddress: async (id) => {
    try {
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      const filteredAddresses = get().addresses.filter(addr => addr.id !== id);
      
      // If deleted address was default and there are other addresses, set first as default
      const deletedAddress = get().addresses.find(addr => addr.id === id);
      if (deletedAddress?.is_default && filteredAddresses.length > 0) {
        await get().setDefaultAddress(filteredAddresses[0].id);
      }

      set({ addresses: filteredAddresses });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  setDefaultAddress: async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Unset all defaults
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set new default
      const { error } = await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      const updatedAddresses = get().addresses.map(addr => ({
        ...addr,
        is_default: addr.id === id,
      }));
      set({ addresses: updatedAddresses });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  fetchUserAddresses: async (userId: string) => {
    try {
      set({ loading: true });

      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ addresses: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching user addresses:', error);
      set({ loading: false });
    }
  },

  getDefaultAddress: () => {
    return get().addresses.find(addr => addr.is_default) || null;
  },
}));
