import { create } from 'zustand';
import { supabase, supabaseAdmin } from '../services/supabase';
import { notificationService } from '../services/notificationService';
import { uploadMultipleImages } from '../utils/imageUpload';

async function uploadRefundImages(localUris: string[], userId: string): Promise<string[]> {
  const remote = (localUris || []).filter(u => u?.startsWith('http'));
  const local = (localUris || []).filter(u => u && !u.startsWith('http'));
  const uploaded = local.length ? await uploadMultipleImages(local, 'report-images', `refund/${userId}`, 5) : [];
  return [...remote, ...uploaded];
}
export interface RefundRequest {
  id: string;
  user_id: string;
  seller_id?: string;
  order_id?: string;
  booking_id?: string;
  payment_id?: string;
  amount: number;
  reason: string;
  description?: string;
  images?: string[];
  status: 'pending' | 'requested' | 'approved' | 'rejected' | 'processing' | 'refunded';
  seller_response?: string;
  seller_response_at?: string;
  razorpay_refund_id?: string;
  refund_processed_at?: string;
  admin_notes?: string;
  upi_id?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_name?: string;
  account_holder_name?: string;
  // Refund payment tracking
  refund_transaction_id?: string;
  refund_payment_method?: string;
  // Custom UI field — 'product' when refund has order_id, 'service' when booking_id
  refund_type?: 'product' | 'service';
  created_at: string;
  updated_at: string;
  // Joined data
  user?: any;
  order?: any;
  booking?: any;
  refund_items?: any[];
  service_refunds?: any[];
}

interface RefundState {
  refunds: RefundRequest[];
  selectedRefund: RefundRequest | null;
  loading: boolean;
  
  createRefundRequest: (data: Partial<RefundRequest>) => Promise<{ success: boolean; error?: string }>;
  fetchUserRefunds: (userId: string) => Promise<void>;
  fetchSellerRefunds: (sellerId: string) => Promise<void>;
  fetchRefundById: (id: string) => Promise<void>;
  updateRefundStatus: (id: string, status: string, response?: string) => Promise<{ success: boolean; error?: string }>;
  markRefundProcessed: (
    id: string,
    payload: { refund_transaction_id: string; refund_payment_method: string; seller_notes?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  processRefund: (id: string) => Promise<{ success: boolean; error?: string }>;
  setSelectedRefund: (refund: RefundRequest | null) => void;
}

export const useRefundStore = create<RefundState>((set, get) => ({
  refunds: [],
  selectedRefund: null,
  loading: false,

  createRefundRequest: async (data) => {
    try {
      set({ loading: true });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ loading: false });
        return { success: false, error: 'User not authenticated' };
      }

      // ✅ Guard: order must exist, belong to this user, and be 'delivered'
      if (data.order_id) {
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .select('id, status, customer_id, payment_status')
          .eq('id', data.order_id)
          .single();
        if (orderErr || !order) {
          set({ loading: false });
          return { success: false, error: 'Order not found' };
        }
        if (order.customer_id !== user.id) {
          set({ loading: false });
          return { success: false, error: 'You can only request refund for your own orders' };
        }
        // Allow also when order was already marked refund_requested (retry), but
        // primary rule: must be delivered (or was delivered and now refund_requested).
        const allowed = ['delivered', 'refund_requested'];
        if (!allowed.includes(order.status)) {
          set({ loading: false });
          return { success: false, error: 'Refund can only be requested after delivery' };
        }
      }

      // Upload any local images
      let imageUrls: string[] = [];
      if (data.images && data.images.length > 0) {
        imageUrls = await uploadRefundImages(data.images, user.id);
      }

      const refundData: any = {
        ...data,
        images: imageUrls.length ? imageUrls : (data.images || []),
        user_id: user.id,
     status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newRefund, error } = await supabaseAdmin
        .from('refund_requests')
        .insert([refundData])
        .select()
        .single();

      if (error) {
        console.error('[refund_requests] insert error:', error);
        set({ loading: false });
        return { success: false, error: error.message };
      }



      
      // ✅ Product-level tracking — create refund_items per order_item belonging
      // to the same seller. This allows the seller dashboard to show product info
      // and supports orders that contain items from multiple sellers.
      try {
        if (data.order_id) {
          const { data: orderItems, error: oiErr } = await supabaseAdmin
            .from('order_items')
            .select('id, product_id, seller_id, quantity, price, total, product:products(name, images)')
            .eq('order_id', data.order_id);

          if (oiErr) {
            console.warn('[refund_items] order_items lookup failed:', oiErr.message);
          } else if (orderItems && orderItems.length) {
            const filtered = data.seller_id
              ? orderItems.filter((oi: any) => oi.seller_id === data.seller_id)
              : orderItems;

            const subTotal = filtered.reduce((sum: number, oi: any) => sum + Number(oi.total || 0), 0) || 1;
            const totalAmount = Number(refundData.amount) || subTotal;

            const itemsPayload = filtered.map((oi: any) => {
              const share = Number(oi.total || 0) / subTotal;
              return {
                refund_id: newRefund.id,
                order_id: data.order_id,
                order_item_id: oi.id,
                product_id: oi.product_id,
                seller_id: oi.seller_id,
                customer_id: user.id,
                product_name: oi.product?.name || 'Product',
                product_image: oi.product?.images?.[0] || null,
                reason: refundData.reason,
                quantity: oi.quantity || 1,
                refund_amount: Math.round(totalAmount * share * 100) / 100,
                refund_status: 'requested',
                evidence_urls: imageUrls.length ? imageUrls : null,
              };
            });

            if (itemsPayload.length) {
              const { error: itemsErr } = await supabaseAdmin
                .from('refund_items')
                .insert(itemsPayload);
              if (itemsErr) {
                console.warn('[refund_items] insert failed (table may not exist yet):', itemsErr.message);
              } else {
                console.log(`[refund_items] inserted ${itemsPayload.length} product-level rows`);
              }
            }
          }
        }
      } catch (refundItemsErr) {
        console.warn('[refund_items] non-fatal error:', refundItemsErr);
      }

         // ✅ Service-level tracking — if booking_id present, also insert a
      // matching row in service_refunds so seller dashboard can list it.
      try {
        if (data.booking_id) {
          const { data: bookingRow } = await supabase
            .from('bookings')
            .select('id, service_id, seller_id, total_amount, service:services(name, images)')
            .eq('id', data.booking_id)
            .single();

          if (bookingRow) {
            const srvSeller = data.seller_id || bookingRow.seller_id;
            const srvAmount = Number(refundData.amount || bookingRow.total_amount || 0);

            const payload: any = {
              refund_id: newRefund.id,
              booking_id: data.booking_id,
              service_id: bookingRow.service_id,
              seller_id: srvSeller,
              customer_id: user.id,
              service_name: (bookingRow.service as any)?.name || 'Service',
              service_image: (bookingRow.service as any)?.images?.[0] || null,
              refund_reason: refundData.reason,
              refund_amount: srvAmount,
              refund_status: 'requested',
              evidence_urls: imageUrls.length ? imageUrls : null,
            };

            const { error: srvErr } = await supabaseAdmin
              .from('service_refunds')
              .insert([payload]);
            if (srvErr) {
              console.warn('[service_refunds] insert failed (table may not exist yet):', srvErr.message);
            } else {
              console.log('[service_refunds] inserted row for booking', data.booking_id);
            }
          }
        }
      } catch (srvErr) {
        console.warn('[service_refunds] non-fatal error:', srvErr);
      }


      // Send notification to seller
      if (data.seller_id) {
        try {
          const { data: seller } = await supabase
            .from('sellers')
            .select('user_id')
            .eq('id', data.seller_id)
            .single();

          if (seller?.user_id) {
            // Get order number
            let orderNumber = data.order_id?.slice(0, 8) || '';
            if (data.order_id) {
              const { data: orderData } = await supabase
                .from('orders')
                .select('order_number')
                .eq('id', data.order_id)
                .single();
              if (orderData) orderNumber = orderData.order_number;
            }

            await notificationService.sendRefundRequestNotification(
              seller.user_id,
              data.order_id || '',
              orderNumber,
              data.amount || 0,
              newRefund.id
            );
          }
        } catch (notifError) {
          console.error('Failed to send refund notification:', notifError);
        }
      }

      set({ 
        refunds: [newRefund, ...get().refunds],
        loading: false 
      });
      
      return { success: true };
    } catch (error: any) {
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  fetchUserRefunds: async (userId: string) => {
    try {
      set({ loading: true });

      const { data, error } = await supabase
        .from('refund_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ refunds: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching user refunds:', error);
      set({ loading: false });
    }
  },

    fetchSellerRefunds: async (sellerId: string) => {
    try {
      set({ loading: true });

      const { data, error } = await supabaseAdmin
        .from('refund_requests')
        .select(`
          *,
          order:orders(id, order_number, total_amount, status, shipping_name),
          booking:bookings(id, booking_date, booking_time, total_amount, status, service:services(id, name, images, price)),
          user:users!refund_requests_user_id_fkey(id, name, email, phone),
          refund_items(
            id,
            product_id,
            product_name,
            product_image,
            quantity,
            refund_amount,
            refund_status,
            seller_notes,
            product:products(id, name, images, price)
          ),
          service_refunds(
            id,
            service_id,
            service_name,
            service_image,
            refund_amount,
            refund_status,
            seller_notes,
            refund_transaction_id,
            refund_payment_method,
            refund_processed_at,
            service:services(id, name, images, price)
          )
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const list: RefundRequest[] = (data || []).map((r: any) => ({
        ...r,
        refund_type: r.order_id ? 'product' : r.booking_id ? 'service' : 'product',
      }));

      console.log(`[refund_requests] fetched ${list.length} refunds for seller ${sellerId}`);
      set({ refunds: list, loading: false });
    } catch (error) {
      console.error('Error fetching seller refunds:', error);
      set({ loading: false });
    }
  },

  fetchRefundById: async (id: string) => {
    try {
      set({ loading: true });

      const { data, error } = await supabaseAdmin
        .from('refund_requests')
        .select(`
          *,
          order:orders(id, order_number, total_amount, status, shipping_name, shipping_phone, created_at),
               booking:bookings(id, booking_date, booking_time, total_amount, status, address, service:services(id, name, images, price)),
          user:users!refund_requests_user_id_fkey(id, name, email, phone),
          refund_items(
            id,
            product_id,
            product_name,
            product_image,
            quantity,
            refund_amount,
            refund_status,
            seller_notes,
            refund_transaction_id,
            refund_payment_method,
            refund_processed_at,
            product:products(id, name, images, price)
          ),
          service_refunds(
            id,
            service_id,
            service_name,
            service_image,
            refund_amount,
            refund_status,
            seller_notes,
            refund_transaction_id,
            refund_payment_method,
            refund_processed_at,
            service:services(id, name, images, price)
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching refund:', error);
        set({ loading: false });
        return;
      }

      const enriched: RefundRequest = {
        ...(data as any),
        refund_type: (data as any).order_id ? 'product' : (data as any).booking_id ? 'service' : 'product',
      };

      set({ selectedRefund: enriched, loading: false });
    } catch (error) {
      console.error('Error in fetchRefundById:', error);
      set({ loading: false });
    }
  },
  updateRefundStatus: async (id, status, response) => {
    try {
      // ✅ FIX: Only allow whitelisted status values matching DB check constraint
      const ALLOWED = new Set([
        'pending',
        'requested',
        'approved',
        'rejected',
        'processing',
        'processed',
        'refunded',
        'cancelled',
      ]);
      // Normalise to lowercase + trim, to avoid UI-label mismatches
      const normalised = String(status || '').trim().toLowerCase();
      const safeStatus = ALLOWED.has(normalised) ? normalised : 'pending';

      const updateData: any = {
        status: safeStatus,
        updated_at: new Date().toISOString(),
      };

      if (response) {
        updateData.seller_response = response;
        updateData.seller_response_at = new Date().toISOString();
      }

      if (safeStatus === 'processed' || safeStatus === 'refunded') {
        updateData.refund_processed_at = new Date().toISOString();
      }

      console.log('[refund_requests] update payload:', { id, payload: updateData });

      const { error, data } = await supabaseAdmin
        .from('refund_requests')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('[refund_requests] update error:', error);
        return { success: false, error: error.message };
      }

      console.log('[refund_requests] update success:', data);
         // ✅ Cascade refund status to refund_items so seller view stays in sync
      try {
        const itemStatusMap: Record<string, string> = {
          requested: 'requested',
          pending: 'requested',
          approved: 'approved',
          rejected: 'rejected',
          processing: 'approved',
          processed: 'processed',
          refunded: 'processed',
          cancelled: 'rejected',
        };
        const itemStatus = itemStatusMap[safeStatus] || 'requested';
        const itemUpdate: any = {
          refund_status: itemStatus,
          updated_at: new Date().toISOString(),
        };
        if (response) itemUpdate.seller_notes = response;
        const { error: itemsErr } = await supabaseAdmin
          .from('refund_items')
          .update(itemUpdate)
          .eq('refund_id', id);
        if (itemsErr) {
          console.warn('[refund_items] cascade update failed:', itemsErr.message);
        }
      } catch (cascadeErr) {
        console.warn('[refund_items] cascade update exception:', cascadeErr);
      }



         // ✅ Cascade refund status to service_refunds too
      try {
        const itemStatusMap2: Record<string, string> = {
          requested: 'requested',
          pending: 'requested',
          approved: 'approved',
          rejected: 'rejected',
          processing: 'approved',
          processed: 'processed',
          refunded: 'processed',
          cancelled: 'rejected',
        };
        const srvStatus = itemStatusMap2[safeStatus] || 'requested';
        const srvUpdate: any = {
          refund_status: srvStatus,
          updated_at: new Date().toISOString(),
        };
        if (response) srvUpdate.seller_notes = response;
        const { error: srvErr } = await supabaseAdmin
          .from('service_refunds')
          .update(srvUpdate)
          .eq('refund_id', id);
        if (srvErr) {
          console.warn('[service_refunds] cascade update failed:', srvErr.message);
        }
      } catch (srvCascadeErr) {
        console.warn('[service_refunds] cascade update exception:', srvCascadeErr);
      }


      // Send notification to customer about refund status update
      const refund = get().refunds.find(r => r.id === id) || get().selectedRefund;
      if (refund?.user_id) {
        try {
          await notificationService.sendRefundStatusNotification(
            refund.user_id,
            id,
            refund.order_id || '',
            status,
            refund.amount || 0
          );
        } catch (notifError) {
          console.error('Failed to send refund status notification:', notifError);
        }
      }

      const updatedRefunds = get().refunds.map(r =>
        r.id === id ? { ...r, ...updateData } : r
      );
      set({ refunds: updatedRefunds });

      if (get().selectedRefund?.id === id) {
        set({ selectedRefund: { ...get().selectedRefund!, ...updateData } });
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
    markRefundProcessed: async (id, payload) => {
    try {
      const ts = new Date().toISOString();
      const updateData: any = {
        status: 'refunded',
        refund_transaction_id: payload.refund_transaction_id,
        refund_payment_method: payload.refund_payment_method,
        refund_processed_at: ts,
        updated_at: ts,
      };
      if (payload.seller_notes) {
        updateData.seller_response = payload.seller_notes;
        updateData.seller_response_at = ts;
      }

      console.log('[refund_requests] mark processed payload:', { id, payload });

      const { error } = await supabaseAdmin
        .from('refund_requests')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('[refund_requests] mark processed error:', error);
        return { success: false, error: error.message };
      }

      // Cascade to refund_items and service_refunds
      const cascade: any = {
        refund_status: 'processed',
        refund_transaction_id: payload.refund_transaction_id,
        refund_payment_method: payload.refund_payment_method,
        refund_processed_at: ts,
        updated_at: ts,
      };
      try {
        await supabaseAdmin.from('refund_items').update(cascade).eq('refund_id', id);
      } catch (e) {
        console.warn('[refund_items] mark processed cascade failed:', e);
      }
      try {
        await supabaseAdmin.from('service_refunds').update(cascade).eq('refund_id', id);
      } catch (e) {
        console.warn('[service_refunds] mark processed cascade failed:', e);
      }

      // Notify customer
      const refund = get().refunds.find(r => r.id === id) || get().selectedRefund;
      if (refund?.user_id) {
        try {
          await notificationService.sendRefundStatusNotification(
            refund.user_id,
            id,
            refund.order_id || refund.booking_id || '',
            'refunded',
            refund.amount || 0
          );
        } catch (notifError) {
          console.error('Failed to send refund processed notification:', notifError);
        }
      }

      const updatedRefunds = get().refunds.map(r =>
        r.id === id ? { ...r, ...updateData } : r
      );
      set({ refunds: updatedRefunds });
      if (get().selectedRefund?.id === id) {
        set({ selectedRefund: { ...get().selectedRefund!, ...updateData } });
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  processRefund: async (id) => {
    try {
      const updateData = {
        status: 'refunded',
        refund_processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from('refund_requests')
        .update(updateData)
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      // Send notification to customer
      const refund = get().refunds.find(r => r.id === id) || get().selectedRefund;
      if (refund?.user_id) {
        await notificationService.sendRefundStatusNotification(
          refund.user_id,
          id,
          refund.order_id || '',
          'refunded',
          refund.amount || 0
        );
      }

      const updatedRefunds = get().refunds.map(r =>
        r.id === id ? { ...r, ...updateData } : r
      );
      set({ refunds: updatedRefunds });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  setSelectedRefund: (refund) => set({ selectedRefund: refund }),
}));
