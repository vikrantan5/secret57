import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { supabase } from '../../src/services/supabase';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';

export default function AllOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [searchQuery, selectedFilter, orders]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          user:users(id, name, email),
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
    let filtered = orders;

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(order => order.status === selectedFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => {
        const sellerMatch = order.order_items?.some(item => 
          item.seller?.company_name?.toLowerCase().includes(query)
        );
        return order.id?.toLowerCase().includes(query) ||
          order.user?.name?.toLowerCase().includes(query) ||
          sellerMatch;
      });
    }

    setFilteredOrders(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return colors.success;
      case 'shipped': return colors.primary;
      case 'processing': return colors.warning;
      case 'pending': return colors.info;
      case 'cancelled': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const calculateStats = () => {
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + o.total_amount, 0);
    const pending = orders.filter(o => o.status === 'pending').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;

    return { totalOrders, totalRevenue, pending, delivered };
  };

  const stats = calculateStats();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>All Orders</Text>
            <Text style={styles.headerSubtitle}>{stats.totalOrders} total orders</Text>
          </View>
          <TouchableOpacity onPress={loadOrders} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, shadows.sm]}>
          <Ionicons name="search" size={20} color={colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order ID, customer, or seller"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textLight}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                selectedFilter === filter && styles.filterTabActive
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === filter && styles.filterTabTextActive
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <LinearGradient
            colors={[colors.primaryVeryLight, colors.primaryLight]}
            style={[styles.statCard, shadows.md]}
          >
            <View style={styles.statIconBox}>
              <Ionicons name="receipt" size={24} color={colors.primaryDark} />
            </View>
            <Text style={styles.statValue}>{stats.totalOrders}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#34D39920', '#34D39940']}
            style={[styles.statCard, shadows.md]}
          >
            <View style={[styles.statIconBox, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="cash" size={24} color={colors.success} />
            </View>
            <Text style={[styles.statValue, { color: colors.success }]}>
              ₹{(stats.totalRevenue / 1000).toFixed(1)}k
            </Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#FBBF2420', '#FBBF2440']}
            style={[styles.statCard, shadows.md]}
          >
            <View style={[styles.statIconBox, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="time" size={24} color={colors.warning} />
            </View>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {stats.pending}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </LinearGradient>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="receipt-outline" size={60} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try a different search term' : 'No orders available'}
              </Text>
            </View>
          ) : (
            <View style={styles.orderList}>
              {filteredOrders.map((order) => (
                <View key={order.id} style={[styles.orderCard, shadows.sm]}>
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                      <Text style={styles.orderDate}>
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(order.status) + '20' }
                    ]}>
                      <Ionicons 
                        name={order.status === 'delivered' ? 'checkmark-circle' : 
                              order.status === 'shipped' ? 'airplane' : 
                              order.status === 'cancelled' ? 'close-circle' : 'time'} 
                        size={14} 
                        color={getStatusColor(order.status)} 
                      />
                      <Text style={[
                        styles.statusText,
                        { color: getStatusColor(order.status) }
                      ]}>
                        {order.status?.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderBody}>
                    <View style={styles.infoRow}>
                      <Ionicons name="person" size={16} color={colors.primary} />
                      <Text style={styles.infoText}>{order.user?.name || 'Unknown Customer'}</Text>
                    </View>
                    {order.order_items && order.order_items.length > 0 && (
                      <>
                        <View style={styles.infoRow}>
                          <Ionicons name="business" size={16} color={colors.primary} />
                          <Text style={styles.infoText}>
                            {order.order_items[0].seller?.company_name || 'Unknown Seller'}
                            {order.order_items.length > 1 ? ` (+${order.order_items.length - 1} more)` : ''}
                          </Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Ionicons name="cube" size={16} color={colors.primary} />
                          <Text style={styles.infoText}>
                            {order.order_items.length} item{order.order_items.length > 1 ? 's' : ''}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>

                  <View style={styles.orderFooter}>
                    <View>
                      <Text style={styles.amountLabel}>Total Amount</Text>
                      <Text style={styles.amountValue}>₹{order.total_amount.toLocaleString()}</Text>
                    </View>
                    <View style={[
                      styles.paymentBadge,
                      { backgroundColor: order.payment_status === 'paid' ? colors.success + '20' : colors.warning + '20' }
                    ]}>
                      <Text style={[
                        styles.paymentText,
                        { color: order.payment_status === 'paid' ? colors.success : colors.warning }
                      ]}>
                        {order.payment_status === 'paid' ? 'PAID' : 'PENDING'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.primaryVeryLight,
    marginTop: spacing.xs / 2,
  },
  refreshButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    marginTop: -spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
filterContainer: {
  paddingHorizontal: spacing.lg,
  marginBottom: spacing.sm,     // smaller
  maxHeight: 44,                // fixed & neat
},
filterTab: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',

  height: 36,                      // 🔥 Slim & perfect
  paddingHorizontal: spacing.md,   // reduced
  paddingVertical: 0,              // 🔥 remove extra padding

  borderRadius: 18,                // not full → better UI
  marginRight: spacing.sm,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  marginBottom: spacing.lg,         // smaller gap from search bar
},
filterTabActive: {
  backgroundColor: colors.primary,
  borderColor: colors.primary,
},
filterTabText: {
  fontSize: 13,                     // smaller
  color: colors.textSecondary,
  fontWeight: '600',
},
filterTabTextActive: {
  color: colors.white,
},
  statsGrid: {
    
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h3,
    color: colors.primaryDark,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyIconBox: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  orderList: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  orderId: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
  },
  orderDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs / 2,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
  },
  orderBody: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  amountLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  amountValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.xs / 2,
  },
  paymentBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  paymentText: {
    ...typography.caption,
    fontWeight: '600',
  },
});