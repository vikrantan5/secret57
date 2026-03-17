import { create } from 'zustand';
import { supabase } from '../services/supabase';

interface PlatformStats {
  total_users: number;
  total_sellers: number;
  total_products: number;
  total_orders: number;
  total_bookings: number;
  total_revenue: number;
  pending_sellers: number;
}

interface AdminState {
  stats: PlatformStats | null;
  pendingSellers: any[];
  allUsers: any[];
  allOrders: any[];
  loading: boolean;
  
  fetchPlatformStats: () => Promise<void>;
  fetchPendingSellers: () => Promise<void>;
  fetchAllUsers: () => Promise<void>;
  fetchAllOrders: () => Promise<void>;
  approveSeller: (sellerId: string) => Promise<{ success: boolean; error?: string }>;
  rejectSeller: (sellerId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  suspendUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (productId: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  stats: null,
  pendingSellers: [],
  allUsers: [],
  allOrders: [],
  loading: false,

  fetchPlatformStats: async () => {
    try {
      set({ loading: true });
      
      // Fetch counts from different tables
      const [usersCount, sellersCount, productsCount, ordersCount, bookingsCount] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('sellers').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
      ]);

      // Fetch revenue
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('payment_status', 'paid');

      const totalRevenue = ordersData?.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0) || 0;

      // Fetch pending sellers count
      const { count: pendingSellersCount } = await supabase
        .from('sellers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const stats: PlatformStats = {
        total_users: usersCount.count || 0,
        total_sellers: sellersCount.count || 0,
        total_products: productsCount.count || 0,
        total_orders: ordersCount.count || 0,
        total_bookings: bookingsCount.count || 0,
        total_revenue: totalRevenue,
        pending_sellers: pendingSellersCount || 0,
      };

      set({ stats, loading: false });
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      set({ loading: false });
    }
  },

  fetchPendingSellers: async () => {
    try {
      set({ loading: true });
      
      const { data, error } = await supabase
        .from('sellers')
        .select(`
          *,
          user:users(*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending sellers:', error);
        set({ loading: false });
        return;
      }

      set({ pendingSellers: data || [], loading: false });
    } catch (error) {
      console.error('Error in fetchPendingSellers:', error);
      set({ loading: false });
    }
  },

  fetchAllUsers: async () => {
    try {
      set({ loading: true });
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        set({ loading: false });
        return;
      }

      set({ allUsers: data || [], loading: false });
    } catch (error) {
      console.error('Error in fetchAllUsers:', error);
      set({ loading: false });
    }
  },

  fetchAllOrders: async () => {
    try {
      set({ loading: true });
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching orders:', error);
        set({ loading: false });
        return;
      }

      set({ allOrders: data || [], loading: false });
    } catch (error) {
      console.error('Error in fetchAllOrders:', error);
      set({ loading: false });
    }
  },

  approveSeller: async (sellerId: string) => {
    try {
      const { error } = await supabase
        .from('sellers')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sellerId);

      if (error) {
        console.error('Error approving seller:', error);
        return { success: false, error: error.message };
      }

      // Update local state
      set(state => ({
        pendingSellers: state.pendingSellers.filter(s => s.id !== sellerId),
      }));

      // Create notification for seller
      const seller = get().pendingSellers.find(s => s.id === sellerId);
      if (seller?.user_id) {
        await supabase.from('notifications').insert([{
          user_id: seller.user_id,
          type: 'seller_approval',
          title: 'Seller Account Approved',
          message: 'Congratulations! Your seller account has been approved. You can now start selling on ServiceHub.',
          data: { seller_id: sellerId },
          is_read: false,
          created_at: new Date().toISOString(),
        }]);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in approveSeller:', error);
      return { success: false, error: error.message };
    }
  },

  rejectSeller: async (sellerId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('sellers')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sellerId);

      if (error) {
        console.error('Error rejecting seller:', error);
        return { success: false, error: error.message };
      }

      // Update local state
      set(state => ({
        pendingSellers: state.pendingSellers.filter(s => s.id !== sellerId),
      }));

      // Create notification for seller
      const seller = get().pendingSellers.find(s => s.id === sellerId);
      if (seller?.user_id) {
        await supabase.from('notifications').insert([{
          user_id: seller.user_id,
          type: 'seller_approval',
          title: 'Seller Account Rejected',
          message: `Your seller account application has been rejected. Reason: ${reason}`,
          data: { seller_id: sellerId, reason },
          is_read: false,
          created_at: new Date().toISOString(),
        }]);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in rejectSeller:', error);
      return { success: false, error: error.message };
    }
  },

  suspendUser: async (userId: string) => {
    try {
      // For now, we'll just mark the user
      // In production, you might want to use a separate 'status' field
      const { error } = await supabase
        .from('users')
        .update({ 
          updated_at: new Date().toISOString(),
          // Add a suspended field in your schema if needed
        })
        .eq('id', userId);

      if (error) {
        console.error('Error suspending user:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in suspendUser:', error);
      return { success: false, error: error.message };
    }
  },

  deleteProduct: async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId);

      if (error) {
        console.error('Error deleting product:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in deleteProduct:', error);
      return { success: false, error: error.message };
    }
  },
}));
