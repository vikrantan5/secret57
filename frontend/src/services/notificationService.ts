import { supabase, supabaseAdmin } from './supabase';

export const notificationService = {
  // Send notification to database
  async sendNotification(
    userId: string,
    type: 'order' | 'booking' | 'payment' | 'review' | 'seller_approval' | 'general' | 'order_status' | 'issue' | 'refund',
    title: string,
    message: string,
    data?: any
  ) {
    try {
      const { error } = await supabaseAdmin
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

  // Send order status notification to customer
  async sendOrderStatusNotification(
    customerId: string,
    orderId: string,
    orderNumber: string,
    newStatus: string,
    notes?: string
  ) {
    const statusLabels: Record<string, string> = {
      pending: 'Order Placed',
      processing: 'Processing',
      processed: 'Processed',
      shipped: 'Shipped',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
    };

    const statusLabel = statusLabels[newStatus] || newStatus;
    const message = notes 
      ? `Order #${orderNumber} is now ${statusLabel}. ${notes}`
      : `Order #${orderNumber} status updated to: ${statusLabel}`;

    return this.sendNotification(
      customerId,
      'order_status',
      `Order ${statusLabel}`,
      message,
      {
        order_id: orderId,
        order_number: orderNumber,
        new_status: newStatus,
        timestamp: new Date().toISOString(),
        type: 'order_status_update'
      }
    );
  },

  // Send payment received notification to seller
  async sendPaymentNotification(
    sellerUserId: string,
    amount: number,
    orderId: string,
    orderNumber: string
  ) {
    return this.sendNotification(
      sellerUserId,
      'refund',
      'Payment Received',
      `₹${amount.toFixed(2)} received for Order #${orderNumber}`,
      {
        order_id: orderId,
        order_number: orderNumber,
        amount,
        type: 'payment_received'
      }
    );
  },

  // Send refund request notification to seller
  async sendRefundRequestNotification(
    sellerUserId: string,
    orderId: string,
    orderNumber: string,
    amount: number,
    refundId: string
  ) {
    return this.sendNotification(
      sellerUserId,
   'refund',
      'Refund Requested',
      `Refund of ₹${amount.toFixed(2)} requested for Order #${orderNumber}`,
      {
        order_id: orderId,
        refund_id: refundId,
        amount,
        type: 'refund_request'
      }
    );
  },

  // Send refund status update to customer
  async sendRefundStatusNotification(
    customerId: string,
    refundId: string,
    orderId: string,
    status: string,
    amount: number
  ) {
    const statusLabels: Record<string, string> = {
      approved: 'Approved',
      rejected: 'Rejected',
      processed: 'Being Processed',
      refunded: 'Completed',
    };
    const statusLabel = statusLabels[status] || status;

    return this.sendNotification(
      customerId,
      'payment',
      `Refund ${statusLabel}`,
      `Your refund request of ₹${amount.toFixed(2)} has been ${statusLabel.toLowerCase()}.`,
      {
        refund_id: refundId,
        order_id: orderId,
        status,
        amount,
        type: 'refund_status_update'
      }
    );
  },

  // Send issue report notification to seller
  async sendIssueReportNotification(
    sellerUserId: string,
    issueId: string,
    orderId: string,
    orderNumber: string,
    subject: string
  ) {
    return this.sendNotification(
      sellerUserId,
      'issue',  
      'Customer Reported an Issue',
      `Order #${orderNumber} - ${subject}. Tap to view details.`,
      {
        issue_id: issueId,
        order_id: orderId,
        type: 'issue_report'
      }
    );
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
