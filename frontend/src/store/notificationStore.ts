import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: 'order' | 'booking' | 'payment' | 'review' | 'seller_approval' | 'general';
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (userId: string) => {
    try {
      set({ loading: true });
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const unreadCount = data?.filter(n => !n.is_read).length || 0;
      set({ notifications: data || [], unreadCount, loading: false });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      set({ loading: false });
    }
  },

  markAsRead: async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: async (userId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },

  deleteNotification: async (id: string) => {
    await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id),
      unreadCount: state.notifications.find(n => n.id === id && !n.is_read) 
        ? state.unreadCount - 1 
        : state.unreadCount,
    }));
  },
}));
