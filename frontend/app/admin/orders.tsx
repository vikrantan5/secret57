import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { supabase } from '../../src/services/supabase';

interface Order {
  id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  customer: { id: string; name: string; email: string; phone: string };
  cancelledBy: { id: string; name: string; email: string } | null;
  deliveryVerifiedBy: { id: string; name: string; email: string } | null;
  order_items: Array<{
    id: string;
    product: { id: string; name: string; images: string[] };
    seller: { id: string; company_name: string };
  }>;
}

export default function AllOrdersScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [searchQuery, selectedStatus, dateFrom, dateTo, orders]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:users!orders_customer_id_fkey(id, name, email, phone),
          cancelledBy:users!orders_cancelled_by_fkey(id, name, email),
          deliveryVerifiedBy:users!orders_delivery_verified_by_fkey(id, name, email),
          order_items(
            *,
            product:products(id, name, images),
            seller:sellers(id, company_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => {
        const sellerMatch = order.order_items?.some(item => 
          item.seller?.company_name?.toLowerCase().includes(query)
        );
        return order.id?.toLowerCase().includes(query) ||
          order.customer?.name?.toLowerCase().includes(query) ||
          sellerMatch;
      });
    }

    filtered = filtered.filter(order => {
      const d = new Date(order.created_at);
      return d >= dateFrom && d <= new Date(dateTo.getTime() + 24 * 60 * 60 * 1000 - 1);
    });

    setFilteredOrders(filtered);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return colors.success;
      case 'shipped': return colors.primary;
      case 'processing': return colors.info;
      case 'pending': return colors.warning;
      case 'cancelled': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return 'checkmark-circle';
      case 'shipped': return 'airplane';
      case 'processing': return 'sync';
      case 'pending': return 'hourglass';
      case 'cancelled': return 'close-circle';
      default: return 'ellipse';
    }
  };

  const analytics = useMemo(() => {
    const list = filteredOrders;
    const totalRevenue = list.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const paidRevenue = list
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + o.total_amount, 0);
    const pendingCount = list.filter(o => o.status === 'pending').length;
    const deliveredCount = list.filter(o => o.status === 'delivered').length;
    const processingCount = list.filter(o => o.status === 'processing').length;
    const shippedCount = list.filter(o => o.status === 'shipped').length;
    const cancelledCount = list.filter(o => o.status === 'cancelled').length;

    return {
      totalRevenue,
      paidRevenue,
      pendingCount,
      deliveredCount,
      processingCount,
      shippedCount,
      cancelledCount,
      totalOrders: list.length,
    };
  }, [filteredOrders]);

  const isTablet = width >= 768;
  const cardWidth = isTablet ? '31%' : '47%';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>All Orders</Text>
            <Text style={styles.headerSubtitle}>
              {analytics.totalOrders} orders • ₹{analytics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} revenue
            </Text>
          </View>
          <TouchableOpacity onPress={loadOrders} style={styles.iconButton}>
            <Ionicons name="refresh" size={22} color="#fff" />
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
          <View style={[styles.kpiCard, shadows.sm, { width: cardWidth }]}>
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.kpiIcon}>
              <Ionicons name="receipt-outline" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.kpiLabel}>Total Orders</Text>
            <Text style={styles.kpiValue}>{analytics.totalOrders}</Text>
            <Text style={styles.kpiSub}>{analytics.pendingCount} pending</Text>
          </View>

          <View style={[styles.kpiCard, shadows.sm, { width: cardWidth }]}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.kpiIcon}>
              <Ionicons name="cash-outline" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.kpiLabel}>Revenue</Text>
            <Text style={styles.kpiValue}>
              ₹{analytics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.kpiSub}>₹{analytics.paidRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} paid</Text>
          </View>

          <View style={[styles.kpiCard, shadows.sm, { width: cardWidth }]}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.kpiIcon}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.kpiLabel}>Delivered</Text>
            <Text style={styles.kpiValue}>{analytics.deliveredCount}</Text>
            <Text style={styles.kpiSub}>Completed orders</Text>
          </View>
        </View>

        {/* Status Breakdown */}
        <View style={[styles.statusContainer, { paddingHorizontal: spacing.lg }]}>
          <StatusChip 
            label="Pending" 
            count={analytics.pendingCount} 
            color={colors.warning}
            icon="hourglass-outline"
          />
          <StatusChip 
            label="Processing" 
            count={analytics.processingCount} 
            color={colors.info}
            icon="sync-outline"
          />
          <StatusChip 
            label="Shipped" 
            count={analytics.shippedCount} 
            color={colors.primary}
            icon="airplane-outline"
          />
          <StatusChip 
            label="Delivered" 
            count={analytics.deliveredCount} 
            color={colors.success}
            icon="checkmark-circle-outline"
          />
          <StatusChip 
            label="Cancelled" 
            count={analytics.cancelledCount} 
            color={colors.error}
            icon="close-circle-outline"
          />
        </View>

        {/* Search & Filter */}
        <View style={[styles.searchContainer, shadows.sm, { marginHorizontal: spacing.lg }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order ID, customer, or seller..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[styles.filterToggle, showFilters && { backgroundColor: colors.primary }]}
          >
            <Ionicons name="options-outline" size={16} color={showFilters ? '#fff' : colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Filters Panel */}
        {showFilters && (
          <View style={[styles.filtersPanel, shadows.sm, { marginHorizontal: spacing.lg }]}>
            <Text style={styles.filterLabel}>Order Status</Text>
            <View style={styles.statusChips}>
              {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => setSelectedStatus(status)}
                  style={[
                    styles.chip,
                    selectedStatus === status && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, selectedStatus === status && { color: '#fff' }]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.filterLabel, { marginTop: spacing.md }]}>Date Range</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDateFromPicker(true)}>
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <Text style={styles.dateButtonText}>{dateFrom.toLocaleDateString()}</Text>
              </TouchableOpacity>
              <Text style={styles.dateRangeSeparator}>to</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDateToPicker(true)}>
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

        {/* Orders List */}
        <View style={[styles.section, { paddingHorizontal: spacing.lg }]}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>
              {filteredOrders.length} Order{filteredOrders.length !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.listSubtle}>Showing filtered results</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading orders...</Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="receipt-outline" size={48} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try a different search term' : 'No orders match your filters'}
              </Text>
            </View>
          ) : (
            <View style={styles.orderList}>
              {filteredOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={[styles.orderCard, shadows.sm]}
                  onPress={() => router.push(`/admin/orders/${order.id}`)}
                  activeOpacity={0.9}
                >
                  <View style={styles.orderHeader}>
                    <View style={styles.orderType}>
                      <View style={[styles.typeIcon, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="cart-outline" size={16} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                        <Text style={styles.orderDate}>
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '15' }]}>
                      <Ionicons name={getStatusIcon(order.status)} size={12} color={getStatusColor(order.status)} />
                      <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                        {order.status?.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailLabel}>Customer</Text>
                        <Text style={styles.detailValue} numberOfLines={1}>
                          {order.customer?.name || 'Unknown'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailLabel}>Seller</Text>
                        <Text style={styles.detailValue} numberOfLines={1}>
                          {order.order_items?.[0]?.seller?.company_name || 'Unknown'}
                          {order.order_items?.length > 1 ? ` +${order.order_items.length - 1}` : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="cube-outline" size={14} color={colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailLabel}>Items</Text>
                        <Text style={styles.detailValue}>
                          {order.order_items?.length || 0} item{order.order_items?.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="card-outline" size={14} color={colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailLabel}>Payment</Text>
                        <Text style={[styles.detailValue, { 
                          color: order.payment_status === 'paid' ? colors.success : colors.warning 
                        }]}>
                          {order.payment_status?.toUpperCase() || 'UNKNOWN'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.orderFooter}>
                    <View>
                      <Text style={styles.amountLabel}>Total Amount</Text>
                      <Text style={styles.amountValue}>
                        ₹{order.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <View style={styles.viewButton}>
                      <Text style={styles.viewButtonText}>View Details</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components
function StatusChip({ label, count, color, icon }: { label: string; count: number; color: string; icon: string }) {
  return (
    <View style={styles.statusChip}>
      <View style={[styles.statusChipIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <Text style={[styles.statusChipCount, { color }]}>{count}</Text>
      <Text style={styles.statusChipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? spacing.md : spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: '#fff',
    opacity: 0.85,
    fontSize: 12,
    marginTop: 2,
  },
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
  kpiLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  kpiValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  kpiSub: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.md,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statusChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipCount: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusChipLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
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
  filterLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
  dateButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  dateRangeSeparator: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  section: {
    marginTop: spacing.lg,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  listSubtle: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  orderList: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderId: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  orderDate: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 8,
  },
  detailItem: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  detailValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  amountLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  amountValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryVeryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});