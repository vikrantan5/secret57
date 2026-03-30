import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,

  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/services/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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
  category_name?: string;
}

export default function AdminPaymentsDashboardScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<'all' | 'product' | 'service'>('all');
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);
  
  // Data for filters
  const [sellers, setSellers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Analytics
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    platformCommission: 0,
    sellerPayouts: 0,
    productRevenue: 0,
    serviceRevenue: 0,
    totalTransactions: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedTab, selectedSeller, selectedCategory, selectedStatus, dateFrom, dateTo, payments]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPayments(),
        loadSellers(),
        loadCategories(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      // Fetch product payments (from orders)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          payment_status,
          created_at,
          users:customer_id (name),
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

      // Fetch service payments (from bookings)
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          customer:users!customer_id (name),
          seller:sellers (
            id,
            company_name,
            category:categories (name)
          ),
          service:services (name)
        `)
        .in('status', ['confirmed', 'completed'])
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Transform orders to payment data
      const productPayments: PaymentData[] = (orders || []).map(order => ({
        id: order.id,
        type: 'product' as const,
        order_id: order.id,
        amount: order.total_amount,
        payment_method: 'razorpay',
        status: order.payment_status,
        created_at: order.created_at,
        customer_name: order.users?.name || 'Unknown',
        seller_name: order.order_items?.[0]?.seller?.company_name || 'Unknown',
        category_name: order.order_items?.[0]?.seller?.category?.name || 'Uncategorized',
      }));

      // Transform bookings to payment data
      const servicePayments: PaymentData[] = (bookings || []).map(booking => ({
        id: booking.id,
        type: 'service' as const,
        booking_id: booking.id,
        amount: booking.total_amount,
        payment_method: 'razorpay',
        status: booking.status === 'completed' ? 'paid' : 'processing',
        created_at: booking.created_at,
        customer_name: booking.customer?.name || 'Unknown',
        seller_name: booking.seller?.company_name || 'Unknown',
        category_name: booking.seller?.category?.name || 'Uncategorized',
      }));

      const allPayments = [...productPayments, ...servicePayments].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setPayments(allPayments);
      calculateAnalytics(allPayments);
    } catch (error: any) {
      console.error('Error loading payments:', error);
      Alert.alert('Error', 'Failed to load payments');
    }
  };

  const loadSellers = async () => {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('id, company_name')
        .order('company_name');

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error('Error loading sellers:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const calculateAnalytics = (paymentData: PaymentData[]) => {
    const totalRevenue = paymentData.reduce((sum, p) => sum + p.amount, 0);
    const platformCommission = totalRevenue * 0.10; // 10% commission
    const sellerPayouts = totalRevenue - platformCommission;
    
    const productRevenue = paymentData
      .filter(p => p.type === 'product')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const serviceRevenue = paymentData
      .filter(p => p.type === 'service')
      .reduce((sum, p) => sum + p.amount, 0);

    setAnalytics({
      totalRevenue,
      platformCommission,
      sellerPayouts,
      productRevenue,
      serviceRevenue,
      totalTransactions: paymentData.length,
    });
  };

  const applyFilters = () => {
    let filtered = [...payments];

    // Filter by tab
    if (selectedTab !== 'all') {
      filtered = filtered.filter(p => p.type === selectedTab);
    }

    // Filter by search query (customer name, seller name, order/booking ID)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.customer_name?.toLowerCase().includes(query) ||
        p.seller_name?.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
      );
    }

    // Filter by seller
    if (selectedSeller !== 'all') {
      filtered = filtered.filter(p => p.seller_name === selectedSeller);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category_name === selectedCategory);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(p => p.status === selectedStatus);
    }

    // Filter by date range
    filtered = filtered.filter(p => {
      const paymentDate = new Date(p.created_at);
      return paymentDate >= dateFrom && paymentDate <= dateTo;
    });

    setFilteredPayments(filtered);
    calculateAnalytics(filtered);
  };

  const exportToCSV = async () => {
    try {
      const csvHeader = 'Type,ID,Customer,Seller,Category,Amount,Status,Date';
      const csvRows = filteredPayments.map(p =>
        `${p.type},${p.id},${p.customer_name},${p.seller_name},${p.category_name},₹${p.amount.toFixed(2)},${p.status},${new Date(p.created_at).toLocaleDateString()}`
      ).join('');

      const csvContent = csvHeader + csvRows;
      const filename = `payments_${Date.now()}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Success', `File saved to ${fileUri}`);
      }
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return colors.success;
      case 'processing':
        return colors.primary;
      case 'pending':
        return colors.warning;
      case 'failed':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Payment Dashboard</Text>
        <TouchableOpacity onPress={exportToCSV}>
          <Ionicons name="download-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
             {/* Quick Access Cards */}
        <View style={styles.quickAccessContainer}>
          <Text style={styles.quickAccessTitle}>Quick Access</Text>
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity
              style={[styles.quickAccessCard, shadows.sm]}
              onPress={() => router.push('/admin/payouts')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="cash-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.quickAccessLabel}>Payouts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAccessCard, shadows.sm]}
              onPress={() => router.push('/admin/refunds')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.error + '15' }]}>
                <Ionicons name="return-down-back-outline" size={24} color={colors.error} />
              </View>
              <Text style={styles.quickAccessLabel}>Refunds</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAccessCard, shadows.sm]}
              onPress={() => router.push('/admin/complaints')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.warning + '15' }]}>
                <Ionicons name="flag-outline" size={24} color={colors.warning} />
              </View>
              <Text style={styles.quickAccessLabel}>Complaints</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAccessCard, shadows.sm]}
              onPress={() => router.push('/admin/orders')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.info + '15' }]}>
                <Ionicons name="cube-outline" size={24} color={colors.info} />
              </View>
              <Text style={styles.quickAccessLabel}>Orders</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Analytics Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.analyticsScroll}
          contentContainerStyle={styles.analyticsContainer}
        >
          <View style={[styles.analyticsCard, shadows.sm]}>
            <View style={styles.analyticsIcon}>
              <Ionicons name="cash-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.analyticsLabel}>Total Revenue</Text>
            <Text style={styles.analyticsValue}>₹{analytics.totalRevenue.toFixed(2)}</Text>
            <Text style={styles.analyticsSubtext}>{analytics.totalTransactions} transactions</Text>
          </View>

          <View style={[styles.analyticsCard, shadows.sm]}>
            <View style={[styles.analyticsIcon, { backgroundColor: colors.success + '15' }]}>
              <Ionicons name="trending-up-outline" size={24} color={colors.success} />
            </View>
            <Text style={styles.analyticsLabel}>Commission Earned</Text>
            <Text style={[styles.analyticsValue, { color: colors.success }]}>
              ₹{analytics.platformCommission.toFixed(2)}
            </Text>
            <Text style={styles.analyticsSubtext}>10% of revenue</Text>
          </View>

          <View style={[styles.analyticsCard, shadows.sm]}>
            <View style={[styles.analyticsIcon, { backgroundColor: colors.warning + '15' }]}>
              <Ionicons name="people-outline" size={24} color={colors.warning} />
            </View>
            <Text style={styles.analyticsLabel}>Seller Payouts</Text>
            <Text style={[styles.analyticsValue, { color: colors.warning }]}>
              ₹{analytics.sellerPayouts.toFixed(2)}
            </Text>
            <Text style={styles.analyticsSubtext}>90% of revenue</Text>
          </View>

          <View style={[styles.analyticsCard, shadows.sm]}>
            <View style={[styles.analyticsIcon, { backgroundColor: colors.info + '15' }]}>
              <Ionicons name="cube-outline" size={24} color={colors.info} />
            </View>
            <Text style={styles.analyticsLabel}>Product Sales</Text>
            <Text style={[styles.analyticsValue, { color: colors.info }]}>
              ₹{analytics.productRevenue.toFixed(2)}
            </Text>
          </View>

          <View style={[styles.analyticsCard, shadows.sm]}>
            <View style={[styles.analyticsIcon, { backgroundColor: colors.purple + '15' }]}>
              <Ionicons name="construct-outline" size={24} color={colors.purple} />
            </View>
            <Text style={styles.analyticsLabel}>Service Bookings</Text>
            <Text style={[styles.analyticsValue, { color: colors.purple }]}>
              ₹{analytics.serviceRevenue.toFixed(2)}
            </Text>
          </View>
        </ScrollView>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
            onPress={() => setSelectedTab('all')}
          >
            <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'product' && styles.tabActive]}
            onPress={() => setSelectedTab('product')}
          >
            <Text style={[styles.tabText, selectedTab === 'product' && styles.tabTextActive]}>
              Products
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'service' && styles.tabActive]}
            onPress={() => setSelectedTab('service')}
          >
            <Text style={[styles.tabText, selectedTab === 'service' && styles.tabTextActive]}>
              Services
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer, seller, or ID..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
        >
          {/* Date Range Filter */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Date Range</Text>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDateFromPicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={styles.dateButtonText}>
                  {dateFrom.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              <Text style={styles.dateRangeSeparator}>to</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDateToPicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={styles.dateButtonText}>
                  {dateTo.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {showDateFromPicker && (
          <DateTimePicker
            value={dateFrom}
            mode="date"
            display="default"
            onChange={(event, date) => {
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
            onChange={(event, date) => {
              setShowDateToPicker(false);
              if (date) setDateTo(date);
            }}
          />
        )}

        {/* Payment List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {filteredPayments.length} Payment{filteredPayments.length !== 1 ? 's' : ''}
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : filteredPayments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={60} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No payments found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
            </View>
          ) : (
            <View style={styles.paymentsList}>
              {filteredPayments.map((payment) => (
                <View key={payment.id} style={[styles.paymentCard, shadows.sm]}>
                  <View style={styles.paymentHeader}>
                    <View style={styles.paymentType}>
                      <Ionicons
                        name={payment.type === 'product' ? 'cube' : 'construct'}
                        size={20}
                        color={payment.type === 'product' ? colors.info : colors.purple}
                      />
                      <Text style={styles.paymentTypeText}>
                        {payment.type === 'product' ? 'Product' : 'Service'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(payment.status) + '20' }
                      ]}
                    >
                      <Text style={[styles.statusText, { color: getStatusColor(payment.status) }]}>
                        {payment.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.paymentDetails}>
                    <View style={styles.paymentRow}>
                      <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.paymentLabel}>Customer:</Text>
                      <Text style={styles.paymentValue}>{payment.customer_name}</Text>
                    </View>

                    <View style={styles.paymentRow}>
                      <Ionicons name="storefront-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.paymentLabel}>Seller:</Text>
                      <Text style={styles.paymentValue}>{payment.seller_name}</Text>
                    </View>

                    <View style={styles.paymentRow}>
                      <Ionicons name="pricetag-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.paymentLabel}>Category:</Text>
                      <Text style={styles.paymentValue}>{payment.category_name}</Text>
                    </View>
                  </View>

                  <View style={styles.paymentFooter}>
                    <View>
                      <Text style={styles.paymentAmountLabel}>Amount</Text>
                      <Text style={styles.paymentAmount}>₹{payment.amount.toFixed(2)}</Text>
                    </View>
                    <Text style={styles.paymentDate}>
                      {new Date(payment.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>

                  <Text style={styles.paymentId}>ID: {payment.id.slice(0, 8)}...</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  analyticsScroll: {
    marginTop: spacing.lg,
  },
  analyticsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  analyticsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: 180,
  },
  analyticsIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  analyticsLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  analyticsValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  analyticsSubtext: {
    ...typography.caption,
    color: colors.textLight,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.surface,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
  filtersScroll: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  filterGroup: {
    marginRight: spacing.md,
  },
  filterLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  dateButtonText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  dateRangeSeparator: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.h4,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  paymentsList: {
    gap: spacing.md,
  },
  paymentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  paymentType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  paymentTypeText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
  },
  paymentDetails: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  paymentLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  paymentValue: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paymentAmountLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  paymentAmount: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  paymentDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  paymentId: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
    quickAccessContainer: {
    padding: spacing.lg,
  },
  quickAccessTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  quickAccessCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    width: '47%',
  },
  quickAccessIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickAccessLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
});
