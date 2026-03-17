import { supabase } from './supabase';

export const notificationService = {
  // Send notification to database
  async sendNotification(
    userId: string,
    type: 'order' | 'booking' | 'payment' | 'review' | 'seller_approval' | 'general',
    title: string,
    message: string,
    data?: any
  ) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          type,
          title,
          message,
          data: data || {},
          is_read: false,
        }]);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error sending notification:', error);
      return { success: false, error: error.message };
    }
  },

  // Mark as read
  async markAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    return !error;
  },

  // Get user notifications
  async getUserNotifications(userId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  },

  // Delete notification
  async deleteNotification(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    return !error;
  },

  // Mark all as read
  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return !error;
  },
};
