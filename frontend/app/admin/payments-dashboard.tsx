import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { exportRowsToCsv, csvDate } from '../../src/utils/exportCsv';
import { supabase } from '../../src/services/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

interface PaymentData {
  id: string;
  type: 'product' | 'service';
  order_id?: string;
  booking_id?: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  seller_name?: string;
  customer_name?: string;
  customer_email?: string;
  category_name?: string;
}

const COMMISSION_RATE = 0.1;

function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function AdminPaymentsDashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [selectedTab, setSelectedTab] = useState<'all' | 'product' | 'service'>('all');
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          payment_status,
          created_at,
          users:customer_id (name, email),
          order_items (
            seller:sellers (
              id,
              company_name,
              category:categories (name)
            )
          )
        `)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          customer:users!customer_id (name, email),
          seller:sellers (id, company_name, category:categories (name)),
          service:services (name)
        `)
        .in('status', ['confirmed', 'completed'])
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      const productPayments: PaymentData[] = (orders || []).map((order: any) => ({
        id: order.id,
        type: 'product' as const,
        order_id: order.id,
        amount: order.total_amount,
        payment_method: 'cashfree',
        status: order.payment_status,
        created_at: order.created_at,
        customer_name: order.users?.name || 'Unknown',
        customer_email: order.users?.email || '',
        seller_name: order.order_items?.[0]?.seller?.company_name || 'Unknown',
        category_name: order.order_items?.[0]?.seller?.category?.name || 'Uncategorized',
      }));

      const servicePayments: PaymentData[] = (bookings || []).map((booking: any) => ({
        id: booking.id,
        type: 'service' as const,
        booking_id: booking.id,
        amount: booking.total_amount,
        payment_method: 'cashfree',
        status: booking.status === 'completed' ? 'paid' : 'processing',
        created_at: booking.created_at,
        customer_name: booking.customer?.name || 'Unknown',
        customer_email: booking.customer?.email || '',
        seller_name: booking.seller?.company_name || 'Unknown',
        category_name: booking.seller?.category?.name || 'Uncategorized',
      }));

      const all = [...productPayments, ...servicePayments].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setPayments(all);
    } catch (error: any) {
      console.error('Error loading payments:', error);
      Alert.alert('Error', 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  }, []);

  const filteredPayments = useMemo(() => {
    let filtered = [...payments];

    if (selectedTab !== 'all') {
      filtered = filtered.filter((p) => p.type === selectedTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.customer_name?.toLowerCase().includes(q) ||
          p.seller_name?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
      );
    }
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((p) => p.status === selectedStatus);
    }
    filtered = filtered.filter((p) => {
      const d = new Date(p.created_at);
      return d >= dateFrom && d <= new Date(dateTo.getTime() + 24 * 60 * 60 * 1000 - 1);
    });
    return filtered;
  }, [payments, selectedTab, searchQuery, selectedStatus, dateFrom, dateTo]);

  const analytics = useMemo(() => {
    const list = filteredPayments;
    const totalRevenue = list.reduce((s, p) => s + (p.amount || 0), 0);
    const platformCommission = totalRevenue * COMMISSION_RATE;
    const sellerPayouts = totalRevenue - platformCommission;
    const productRevenue = list.filter((p) => p.type === 'product').reduce((s, p) => s + p.amount, 0);
    const serviceRevenue = list.filter((p) => p.type === 'service').reduce((s, p) => s + p.amount, 0);
    return {
      totalRevenue,
      platformCommission,
      sellerPayouts,
      productRevenue,
      serviceRevenue,
      totalTransactions: list.length,
    };
  }, [filteredPayments]);

  const buildCsv = (rows: PaymentData[]) => {
    const header = [
      'Type',
      'Transaction ID',
      'Order/Booking ID',
      'Customer Name',
      'Customer Email',
      'Seller',
      'Category',
      'Amount (INR)',
      'Commission (INR)',
      'Seller Payout (INR)',
      'Payment Method',
      'Status',
      'Created At',
    ];
    const lines = rows.map((p) => {
      const commission = +(p.amount * COMMISSION_RATE).toFixed(2);
      const payout = +(p.amount - commission).toFixed(2);
      return [
        p.type,
        p.id,
        p.order_id || p.booking_id || '',
        p.customer_name || '',
        p.customer_email || '',
        p.seller_name || '',
        p.category_name || '',
        p.amount?.toFixed(2),
        commission.toFixed(2),
        payout.toFixed(2),
        p.payment_method || '',
        p.status || '',
        new Date(p.created_at).toISOString(),
      ]
        .map(csvEscape)
        .join(',');
    });
return ['\uFEFF' + header.join(','), ...lines].join('\n');
  };

  const downloadFile = async (csv: string, fileName: string) => {
    try {
      // Web fallback
      if (Platform.OS === 'web') {
        // @ts-ignore - browser globals
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        // @ts-ignore
        const url = URL.createObjectURL(blob);
        // @ts-ignore
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        // @ts-ignore
        document.body.appendChild(a);
        a.click();
        a.remove();
        // @ts-ignore
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'CSV download started.');
        return;
      }

      const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      const fileUri = `${dir}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Payment Data',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Saved', `File saved to ${fileUri}`);
      }
    } catch (err: any) {
      console.error('Export error:', err);
      Alert.alert('Export failed', err?.message || 'Unable to export CSV.');
    }
  };

  const exportFiltered = async () => {
    if (filteredPayments.length === 0) {
      Alert.alert('No data', 'There are no payments matching your filters to export.');
      return;
    }
    setExporting(true);
    try {
      const csv = buildCsv(filteredPayments);
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      await downloadFile(csv, `payments_filtered_${ts}.csv`);
    } finally {
      setExporting(false);
    }
  };

  const exportAll = async () => {
    if (payments.length === 0) {
      Alert.alert('No data', 'No payment records available.');
      return;
    }
    Alert.alert(
      'Download All Data',
      `Export all ${payments.length} payment records as CSV?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            setExporting(true);
            try {
              const csv = buildCsv(payments);
              const ts = new Date().toISOString().replace(/[:.]/g, '-');
              await downloadFile(csv, `payments_all_${ts}.csv`);
            } finally {
              setExporting(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return colors.success;
      case 'processing':
        return colors.info;
      case 'pending':
        return colors.warning;
      case 'failed':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const cardWidth = isDesktop ? '23%' : isTablet ? '31%' : '47%';
  const quickWidth = isDesktop ? '23%' : isTablet ? '31%' : '47%';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconButton}
            testID="payments-dashboard-back"
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Payments Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              {analytics.totalTransactions} transactions • ₹{analytics.totalRevenue.toFixed(0)} revenue
            </Text>
          </View>
          <TouchableOpacity
            onPress={loadPayments}
            style={styles.iconButton}
            testID="payments-dashboard-refresh"
          >
            <Ionicons name="refresh" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={exportAll}
            disabled={exporting || loading}
            activeOpacity={0.85}
            style={[styles.primaryAction, exporting && { opacity: 0.7 }]}
            testID="download-all-data-button"
          >
            <LinearGradient colors={['#10B981', '#059669']} style={styles.actionGradient}>
              {exporting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="cloud-download-outline" size={18} color="#fff" />
              )}
              <Text style={styles.actionText}>Download All Data</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={exportFiltered}
            disabled={exporting || loading}
            activeOpacity={0.85}
            style={styles.secondaryAction}
            testID="download-filtered-button"
          >
            <Ionicons name="filter-outline" size={16} color="#fff" />
            <Text style={styles.actionTextLight}>Filtered ({filteredPayments.length})</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      >
        {/* KPI Cards */}
        <View style={[styles.kpiGrid, { paddingHorizontal: spacing.lg }]}>
          <KpiCard
            width={cardWidth}
            icon="cash-outline"
            label="Total Revenue"
            value={`₹${analytics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            sub={`${analytics.totalTransactions} txns`}
            gradient={['#4F46E5', '#7C3AED']}
          />
          <KpiCard
            width={cardWidth}
            icon="trending-up-outline"
            label="Commission"
            value={`₹${analytics.platformCommission.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            sub={`${(COMMISSION_RATE * 100).toFixed(0)}% of revenue`}
            gradient={['#10B981', '#059669']}
          />
          <KpiCard
            width={cardWidth}
            icon="people-outline"
            label="Seller Payouts"
            value={`₹${analytics.sellerPayouts.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            sub={`${(100 - COMMISSION_RATE * 100).toFixed(0)}% of revenue`}
            gradient={['#F59E0B', '#D97706']}
          />
          <KpiCard
            width={cardWidth}
            icon="layers-outline"
            label="Avg. Transaction"
            value={`₹${
              analytics.totalTransactions
                ? (analytics.totalRevenue / analytics.totalTransactions).toFixed(0)
                : '0'
            }`}
            sub="Per payment"
            gradient={['#06B6D4', '#0284C7']}
          />
        </View>

        {/* Split Revenue */}
        <View style={[styles.splitRow, { paddingHorizontal: spacing.lg }]}>
          <View style={[styles.splitCard, shadows.sm]}>
            <View style={[styles.splitIcon, { backgroundColor: colors.info + '15' }]}>
              <Ionicons name="cube-outline" size={20} color={colors.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.splitLabel}>Product Sales</Text>
              <Text style={styles.splitValue}>
                ₹{analytics.productRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
          <View style={[styles.splitCard, shadows.sm]}>
            <View style={[styles.splitIcon, { backgroundColor: colors.admin + '15' }]}>
              <Ionicons name="construct-outline" size={20} color={colors.admin} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.splitLabel}>Service Bookings</Text>
              <Text style={styles.splitValue}>
                ₹{analytics.serviceRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Access */}
        <View style={styles.quickAccessContainer}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickAccessGrid}>
            <QuickCard
              width={quickWidth}
              onPress={() => router.push('/admin/orders')}
              icon="cube-outline"
              label="Orders"
              tint={colors.info}
              testID="quick-orders-button"
            />
            <QuickCard
              width={quickWidth}
              onPress={() => router.push('/admin/payouts')}
              icon="cash-outline"
              label="Payouts"
              tint={colors.primary}
              testID="quick-payouts-button"
            />
            <QuickCard
              width={quickWidth}
              onPress={() => router.push('/admin/refunds')}
              icon="return-down-back-outline"
              label="Refunds"
              tint={colors.error}
              testID="quick-refunds-button"
            />
            <QuickCard
              width={quickWidth}
              onPress={() => router.push('/admin/complaints')}
              icon="flag-outline"
              label="Complaints"
              tint={colors.warning}
              testID="quick-complaints-button"
            />
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { marginHorizontal: spacing.lg }]}>
          {(['all', 'product', 'service'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, selectedTab === t && styles.tabActive]}
              onPress={() => setSelectedTab(t)}
              testID={`payments-tab-${t}`}
            >
              <Text style={[styles.tabText, selectedTab === t && styles.tabTextActive]}>
                {t === 'all' ? 'All' : t === 'product' ? 'Products' : 'Services'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search & Filter Toggle */}
        <View style={[styles.searchContainer, shadows.sm, { marginHorizontal: spacing.lg }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customer, seller, or ID..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="payments-search-input"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowFilters((s) => !s)}
            style={[styles.filterToggle, showFilters && { backgroundColor: colors.primary }]}
            testID="payments-filter-toggle"
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={showFilters ? '#fff' : colors.primary}
            />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={[styles.filtersPanel, shadows.sm, { marginHorizontal: spacing.lg }]}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.statusChips}>
              {['all', 'paid', 'processing', 'pending', 'failed'].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSelectedStatus(s)}
                  style={[
                    styles.chip,
                    selectedStatus === s && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedStatus === s && { color: '#fff' },
                    ]}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.filterLabel, { marginTop: spacing.md }]}>Date Range</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDateFromPicker(true)}
              >
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <Text style={styles.dateButtonText}>{dateFrom.toLocaleDateString()}</Text>
              </TouchableOpacity>
              <Text style={styles.dateRangeSeparator}>to</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDateToPicker(true)}
              >
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <Text style={styles.dateButtonText}>{dateTo.toLocaleDateString()}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showDateFromPicker && (
          <DateTimePicker
            value={dateFrom}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowDateFromPicker(false);
              if (date) setDateFrom(date);
            }}
          />
        )}
        {showDateToPicker && (
          <DateTimePicker
            value={dateTo}
            mode="date"
            display="default"
            onChange={(_, date) => {
              setShowDateToPicker(false);
              if (date) setDateTo(date);
            }}
          />
        )}

        {/* List */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>
              {filteredPayments.length} Payment{filteredPayments.length !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.listSubtle}>Showing filtered results</Text>
          </View>

          {loading ? (
            <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>
                Loading payments...
              </Text>
            </View>
          ) : filteredPayments.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="receipt-outline" size={48} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No payments found</Text>
              <Text style={styles.emptySubtitle}>Adjust your filters or refresh data</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {filteredPayments.map((p) => (
                <View key={p.id} style={[styles.paymentCard, shadows.sm]}>
                  <View style={styles.paymentHeader}>
                    <View style={styles.paymentType}>
                      <View
                        style={[
                          styles.typeIcon,
                          {
                            backgroundColor:
                              p.type === 'product' ? colors.info + '20' : colors.admin + '20',
                          },
                        ]}
                      >
                        <Ionicons
                          name={p.type === 'product' ? 'cube' : 'construct'}
                          size={16}
                          color={p.type === 'product' ? colors.info : colors.admin}
                        />
                      </View>
                      <View>
                        <Text style={styles.paymentTypeText}>
                          {p.type === 'product' ? 'Product' : 'Service'}
                        </Text>
                        <Text style={styles.paymentIdSmall}>#{p.id.slice(0, 8).toUpperCase()}</Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(p.status) + '20' },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: getStatusColor(p.status) }]}>
                        {p.status?.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailsGrid}>
                    <Detail icon="person-outline" label="Customer" value={p.customer_name || '—'} />
                    <Detail
                      icon="storefront-outline"
                      label="Seller"
                      value={p.seller_name || '—'}
                    />
                    <Detail
                      icon="pricetag-outline"
                      label="Category"
                      value={p.category_name || '—'}
                    />
                    <Detail
                      icon="card-outline"
                      label="Method"
                      value={(p.payment_method || '—').toUpperCase()}
                    />
                  </View>

                  <View style={styles.paymentFooter}>
                    <View>
                      <Text style={styles.amountLabel}>Total Amount</Text>
                      <Text style={styles.amountValue}>
                        ₹{p.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <Text style={styles.paymentDate}>
                      {new Date(p.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function KpiCard({
  width,
  icon,
  label,
  value,
  sub,
  gradient,
}: {
  width: any;
  icon: any;
  label: string;
  value: string;
  sub: string;
  gradient: string[];
}) {
  return (
    <View style={[styles.kpiCard, shadows.sm, { width }]}>
      <LinearGradient colors={gradient} style={styles.kpiIcon}>
        <Ionicons name={icon} size={18} color="#fff" />
      </LinearGradient>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiSub}>{sub}</Text>
    </View>
  );
}

function QuickCard({
  width,
  onPress,
  icon,
  label,
  tint,
  testID,
}: {
  width: any;
  onPress: () => void;
  icon: any;
  label: string;
  tint: string;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.quickAccessCard, shadows.sm, { width }]}
      onPress={onPress}
      activeOpacity={0.85}
      testID={testID}
    >
      <View style={[styles.quickAccessIcon, { backgroundColor: tint + '15' }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <Text style={styles.quickAccessLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Detail({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon} size={14} color={colors.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerGradient: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 0.2 },
  headerSubtitle: { color: '#fff', opacity: 0.85, fontSize: 12, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
  primaryAction: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondaryAction: {
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
  },
  actionTextLight: { color: '#fff', fontWeight: '600', fontSize: 13 },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.lg,
  },
  kpiCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  kpiValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  kpiSub: { color: colors.textTertiary, fontSize: 11, marginTop: 4 },

  splitRow: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  splitCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  splitIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  splitValue: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 2 },

  quickAccessContainer: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.md,
  },
  quickAccessCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  quickAccessIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickAccessLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },

  tabs: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 4,
  },
  filterToggle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filtersPanel: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  statusChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateButtonText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  dateRangeSeparator: { color: colors.textSecondary, fontSize: 12 },

  section: { marginTop: spacing.lg },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  listSubtle: { color: colors.textTertiary, fontSize: 12 },

  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptySubtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },

  list: { gap: 12 },
  paymentCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  paymentType: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTypeText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  paymentIdSmall: { color: colors.textTertiary, fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },

  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 8 },
  detailItem: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  detailLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  detailValue: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 2 },

  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  amountLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  amountValue: { color: colors.primary, fontSize: 18, fontWeight: '800', marginTop: 2 },
  paymentDate: { color: colors.textSecondary, fontSize: 12 },
});
