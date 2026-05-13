import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../../src/services/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../../src/constants/theme';

interface OrderData {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  delivery_charges: number;
  gst_amount?: number;
  total_amount: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;
  customer?: any;
  order_items?: any[];
}

const buildInvoiceHTML = (order: OrderData): string => {
  const items = order.order_items || [];
  const itemsRows = items
    .map(
      (it: any, idx: number) => `
        <tr>
          <td class="num">${idx + 1}</td>
          <td>
            <div class="prod-name">${escapeHtml(it.product_name || it.product?.name || 'Item')}</div>
          </td>
          <td class="num">${it.quantity}</td>
          <td class="num">₹${Number(it.price || 0).toFixed(2)}</td>
          <td class="num">₹${Number(it.total || it.price * it.quantity || 0).toFixed(2)}</td>
        </tr>`,
    )
    .join('');

  const dateStr = new Date(order.created_at).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Invoice ${escapeHtml(order.order_number)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, sans-serif;
    background: #F3F4F6;
    color: #1F2937;
    padding: 20px;
    line-height: 1.5;
  }
  .container {
    background: #FFFFFF;
    border-radius: 14px;
    padding: 24px;
    max-width: 720px;
    margin: 0 auto;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #4F46E5;
    padding-bottom: 16px;
    margin-bottom: 20px;
  }
  .brand {
    font-size: 22px;
    font-weight: 800;
    color: #4F46E5;
    letter-spacing: 0.4px;
  }
  .brand-sub { font-size: 12px; color: #6B7280; margin-top: 4px; }
  .invoice-meta { text-align: right; }
  .invoice-meta .label { font-size: 11px; color: #9CA3AF; text-transform: uppercase; }
  .invoice-meta .value { font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px; }
  .status-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    background: #DCFCE7;
    color: #15803D;
    margin-top: 6px;
  }
  .status-badge.pending { background: #FEF3C7; color: #B45309; }
  .status-badge.failed  { background: #FEE2E2; color: #B91C1C; }

  .section-title {
    font-size: 12px;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 8px;
    font-weight: 700;
  }
  .grid-2 { display: flex; gap: 20px; margin-bottom: 18px; }
  .grid-2 > div { flex: 1; padding: 12px 14px; background: #F9FAFB; border-radius: 10px; }
  .grid-2 .name { font-weight: 700; margin-bottom: 6px; }

  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  thead th { background: #F3F4F6; padding: 10px; text-align: left; font-size: 12px; color: #374151; }
  thead th.num, tbody td.num { text-align: right; }
  tbody td {
    padding: 10px;
    border-bottom: 1px solid #F3F4F6;
    font-size: 13px;
    color: #1F2937;
  }
  .prod-name { font-weight: 600; }

  .totals { margin-top: 14px; margin-left: auto; width: 280px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #374151; }
  .totals .row.total {
    border-top: 1px dashed #D1D5DB;
    margin-top: 6px;
    padding-top: 10px;
    font-size: 16px;
    font-weight: 800;
    color: #111827;
  }
  .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #9CA3AF; }
  @media print { body { background: #FFFFFF; padding: 0; } .container { box-shadow: none; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div>
      <div class="brand">ServiceHub</div>
      <div class="brand-sub">Order Invoice / Tax Receipt</div>
    </div>
    <div class="invoice-meta">
      <div class="label">Invoice No.</div>
      <div class="value">#${escapeHtml(order.order_number || order.id?.slice(0, 8))}</div>
      <div class="label" style="margin-top:6px">Date</div>
      <div class="value">${escapeHtml(dateStr)}</div>
      <div class="status-badge ${order.payment_status === 'paid' ? '' : order.payment_status}">
        ${escapeHtml(order.payment_status?.toUpperCase() || 'PENDING')}
      </div>
    </div>
  </div>

  <div class="grid-2">
    <div>
      <div class="section-title">Billed To</div>
      <div class="name">${escapeHtml(order.shipping_name || order.customer?.name || '—')}</div>
      <div>${escapeHtml(order.shipping_phone || '')}</div>
      <div>${escapeHtml(order.shipping_address || '')}</div>
      <div>${escapeHtml([order.shipping_city, order.shipping_state, order.shipping_pincode].filter(Boolean).join(', '))}</div>
    </div>
    <div>
      <div class="section-title">Order Details</div>
      <div><strong>Order #:</strong> ${escapeHtml(order.order_number)}</div>
      <div><strong>Status:</strong> ${escapeHtml(order.status?.toUpperCase() || '—')}</div>
      <div><strong>Payment:</strong> ${escapeHtml(order.payment_status?.toUpperCase() || '—')}</div>
    </div>
  </div>

  <div class="section-title">Items</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th class="num">Qty</th>
        <th class="num">Price</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows || '<tr><td colspan="5" style="text-align:center;color:#9CA3AF">No items</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>₹${Number(order.subtotal || 0).toFixed(2)}</span></div>
    <div class="row"><span>Discount</span><span>-₹${Number(order.discount || 0).toFixed(2)}</span></div>
    <div class="row"><span>Delivery</span><span>₹${Number(order.delivery_charges || 0).toFixed(2)}</span></div>
    <div class="row"><span>GST</span><span>₹${Number(order.gst_amount || 0).toFixed(2)}</span></div>
    <div class="row total"><span>Grand Total</span><span>₹${Number(order.total_amount || 0).toFixed(2)}</span></div>
  </div>

  <div class="footer">
    This is a computer-generated invoice. Thank you for shopping with ServiceHub.
  </div>
</div>
</body>
</html>`;
};

const escapeHtml = (s: any) => {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export default function InvoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        console.log('[Invoice] Fetching order for invoice:', orderId);
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            customer:users!orders_customer_id_fkey(id, name, email, phone),
            order_items(*)
          `)
          .eq('id', orderId)
          .single();

        if (error) {
          console.error('[Invoice] fetch error:', error);
          setError(error.message);
        } else {
          setOrder(data as OrderData);
          console.log('[Invoice] order loaded:', data?.order_number);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    if (orderId) load();
  }, [orderId]);

  const handleDownload = async () => {
    if (!order) return;
    try {
      const html = buildInvoiceHTML(order);
      const filename = `invoice_${order.order_number || order.id.slice(0, 8)}.html`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      console.log('[Invoice] HTML saved at', fileUri);
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/html',
          dialogTitle: 'Download / Share Invoice',
          UTI: 'public.html',
        });
      } else {
        Alert.alert('Saved', `Invoice saved to: ${fileUri}`);
      }
    } catch (e: any) {
      console.error('[Invoice] download error:', e);
      Alert.alert('Error', e.message || 'Could not export invoice');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} title="Invoice" />
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Loading invoice...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} title="Invoice" />
        <View style={styles.loaderBox}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error || 'Order not found'}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const html = buildInvoiceHTML(order);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        onBack={() => router.back()}
        title="Invoice"
        right={
          <TouchableOpacity
            onPress={handleDownload}
            style={styles.downloadBtn}
            testID="invoice-download-button"
          >
            <Ionicons name="download" size={20} color="#FFFFFF" />
            <Text style={styles.downloadBtnText}>Download</Text>
          </TouchableOpacity>
        }
      />

      {Platform.OS === 'web' ? (
        <ScrollView style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
          <View
            testID="invoice-web-view"
            style={{ minHeight: '100%' }}
            // @ts-ignore web-only div
            dangerouslySetInnerHTML={{ __html: html } as any}
          />
        </ScrollView>
      ) : (
        <WebView
          testID="invoice-webview"
          originWhitelist={['*']}
          source={{ html }}
          style={{ flex: 1, backgroundColor: '#F3F4F6' }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const Header: React.FC<{
  onBack: () => void;
  title: string;
  right?: React.ReactNode;
}> = ({ onBack, title, right }) => (
  <View style={styles.header}>
    <TouchableOpacity
      onPress={onBack}
      style={styles.headerBack}
      testID="invoice-back-button"
    >
      <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={styles.headerRight}>{right}</View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  headerBack: { padding: 6 },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 17,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: { minWidth: 110, alignItems: 'flex-end' },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  downloadBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  loaderBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { color: colors.textSecondary },
  errorText: { color: colors.error, fontSize: 14, textAlign: 'center', paddingHorizontal: 30 },
  retryBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
