import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/store/authStore';

interface SellerSubscription {
  id: string;
  seller_id: string;
  plan_id: string;
  amount: number | null;  // Allow null
  payment_status: 'pending' | 'completed' | 'failed';
  cashfree_order_id: string;
  payment_date: string;
  expires_at: string;
  created_at: string;
  seller: {
    company_name: string;
    user: {
      name: string;
      email: string;
      phone: string;
    };
  };
  subscription_plan: {
    name: string;
    duration_days: number;
  };
}

export default function SellerSubscriptionsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [subscriptions, setSubscriptions] = useState<SellerSubscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<SellerSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      Alert.alert('Access Denied', 'You do not have admin privileges', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }
    loadSubscriptions();
  }, [user]);

  useEffect(() => {
    filterSubscriptions();
  }, [subscriptions, searchQuery, selectedStatus]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('seller_subscriptions')
        .select(`
          *,
          seller:sellers!inner(
            company_name,
            user:users!inner(name, email, phone)
          ),
          subscription_plan:subscription_plans(name, duration_days)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading subscriptions:', error);
        throw error;
      }

      setSubscriptions(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to load subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (data: SellerSubscription[]) => {
    const total = data.length;
    const completed = data.filter(s => s.payment_status === 'completed').length;
    const pending = data.filter(s => s.payment_status === 'pending').length;
    const failed = data.filter(s => s.payment_status === 'failed').length;
    const totalRevenue = data
      .filter(s => s.payment_status === 'completed')
      .reduce((sum, s) => sum + (s.amount || 0), 0); // FIX: Handle null/undefined amount

    setStats({ total, completed, pending, failed, totalRevenue });
  };

  const filterSubscriptions = () => {
    let filtered = subscriptions;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(s => s.payment_status === selectedStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        s =>
          s.seller?.company_name?.toLowerCase().includes(query) ||
          s.seller?.user?.email?.toLowerCase().includes(query) ||
          s.seller?.user?.name?.toLowerCase().includes(query) ||
          s.cashfree_order_id?.toLowerCase().includes(query)
      );
    }

    setFilteredSubscriptions(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSubscriptions();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'failed':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'failed':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  // Safe number formatter
  const formatAmount = (amount: number | null | undefined) => {
    if (!amount) return '₹0';
    return `₹${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seller Subscriptions</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading subscriptions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seller Subscriptions</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.backButton}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, shadows.sm]}>
            <View style={[styles.statIconBox, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="card" size={24} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={[styles.statCard, shadows.sm]}>
            <View style={[styles.statIconBox, { backgroundColor: colors.success + '15' }]}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            </View>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={[styles.statCard, shadows.sm]}>
            <View style={[styles.statIconBox, { backgroundColor: colors.warning + '15' }]}>
              <Ionicons name="time" size={24} color={colors.warning} />
            </View>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={[styles.statCard, shadows.sm]}>
            <View style={[styles.statIconBox, { backgroundColor: colors.error + '15' }]}>
              <Ionicons name="close-circle" size={24} color={colors.error} />
            </View>
            <Text style={styles.statValue}>{stats.failed}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>

        {/* Revenue Card */}
        <View style={[styles.revenueCard, shadows.md]}>
          <View style={styles.revenueIconBox}>
            <Ionicons name="trending-up" size={28} color={colors.primary} />
          </View>
          <View style={styles.revenueContent}>
            <Text style={styles.revenueLabel}>Total Revenue</Text>
            <Text style={styles.revenueValue}>
              {formatAmount(stats.totalRevenue)} {/* FIX: Use safe formatter */}
            </Text>
            <Text style={styles.revenueNote}>From completed subscriptions</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, shadows.sm]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by seller, email, or order ID..."
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

        {/* Status Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          {(['all', 'completed', 'pending', 'failed'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                selectedStatus === status && styles.filterChipActive,
              ]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatus === status && styles.filterChipTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Subscriptions List */}
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Subscriptions</Text>
            <Text style={styles.listCount}>
              {filteredSubscriptions.length} {filteredSubscriptions.length === 1 ? 'result' : 'results'}
            </Text>
          </View>

          {filteredSubscriptions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyStateTitle}>No Subscriptions Found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery || selectedStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No subscription payments yet'}
              </Text>
            </View>
          ) : (
            filteredSubscriptions.map((subscription) => (
              <View key={subscription.id} style={[styles.subscriptionCard, shadows.sm]}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.sellerInfo}>
                    <View style={styles.sellerIconBox}>
                      <Ionicons name="business" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.sellerDetails}>
                      <Text style={styles.sellerName}>
                        {subscription.seller?.company_name || 'Unknown Seller'}
                      </Text>
                      <Text style={styles.sellerEmail}>
                        {subscription.seller?.user?.email || 'No email'}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(subscription.payment_status) + '15' },
                    ]}
                  >
                    <Ionicons
                      name={getStatusIcon(subscription.payment_status)}
                      size={14}
                      color={getStatusColor(subscription.payment_status)}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(subscription.payment_status) },
                      ]}
                    >
                      {subscription.payment_status}
                    </Text>
                  </View>
                </View>

                {/* Details Grid */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Plan</Text>
                    <Text style={styles.detailValue}>
                      {subscription.subscription_plan?.name || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={[styles.detailValue, { color: colors.primary }]}>
                      {formatAmount(subscription.amount)} {/* FIX: Use safe formatter */}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>
                      {subscription.subscription_plan?.duration_days || 0} days
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Payment Date</Text>
                    <Text style={styles.detailValue}>
                      {subscription.payment_date ? formatDate(subscription.payment_date) : 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.orderIdBox}>
                    <Ionicons name="receipt-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.orderIdText}>
                      {subscription.cashfree_order_id || 'No Order ID'}
                    </Text>
                  </View>
                  {subscription.expires_at && (
                    <Text style={styles.expiryText}>
                      Expires: {formatDate(subscription.expires_at)}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: spacing.xl }} />
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  revenueCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.lg,
  },
  revenueIconBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revenueContent: {
    flex: 1,
    gap: spacing.xs,
  },
  revenueLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  revenueValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  revenueNote: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  filterScroll: {
    marginBottom: spacing.lg,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  listTitle: {
    ...typography.h4,
    color: colors.text,
  },
  listCount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.md,
  },
  emptyStateTitle: {
    ...typography.h4,
    color: colors.text,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  subscriptionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  sellerIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerDetails: {
    flex: 1,
    gap: spacing.xs,
  },
  sellerName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  sellerEmail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  detailItem: {
    width: '47%',
    gap: spacing.xs,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  orderIdBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  orderIdText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  expiryText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});