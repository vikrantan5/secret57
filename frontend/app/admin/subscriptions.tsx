import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function SellerSubscriptionsAdmin() {
  const router = useRouter();
  const { subscriptions, loading, fetchAllSubscriptions } = useSubscriptionStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    await fetchAllSubscriptions();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptions();
    setRefreshing(false);
  };

  const getFilteredSubscriptions = () => {
    const now = new Date();
    switch (filter) {
      case 'active':
        return subscriptions.filter(
          (sub) => sub.status === 'active' && new Date(sub.expires_at) > now
        );
      case 'expired':
        return subscriptions.filter(
          (sub) => sub.status === 'expired' || (sub.status === 'active' && new Date(sub.expires_at) <= now)
        );
      default:
        return subscriptions;
    }
  };

  const getTotalRevenue = () => {
    return subscriptions.reduce((sum, sub) => sum + sub.amount_paid, 0);
  };

  const getActiveCount = () => {
    const now = new Date();
    return subscriptions.filter(
      (sub) => sub.status === 'active' && new Date(sub.expires_at) > now
    ).length;
  };

  const getStatusColor = (subscription: any) => {
    const now = new Date();
    const expiryDate = new Date(subscription.expires_at);
    
    if (subscription.status === 'active' && expiryDate > now) {
      return colors.success;
    } else if (subscription.status === 'expired' || expiryDate <= now) {
      return colors.error;
    } else {
      return colors.textSecondary;
    }
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const filteredSubscriptions = getFilteredSubscriptions();

  if (loading && subscriptions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading subscriptions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seller Subscriptions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, shadows.sm]}>
            <Ionicons name="checkmark-circle" size={32} color={colors.success} />
            <Text style={styles.statValue}>{getActiveCount()}</Text>
            <Text style={styles.statLabel}>Active Subscriptions</Text>
          </View>

          <View style={[styles.statCard, shadows.sm]}>
            <Ionicons name="cash" size={32} color={colors.primary} />
            <Text style={styles.statValue}>₹{getTotalRevenue().toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All ({subscriptions.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
            onPress={() => setFilter('active')}
          >
            <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
              Active ({getActiveCount()})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'expired' && styles.filterTabActive]}
            onPress={() => setFilter('expired')}
          >
            <Text style={[styles.filterText, filter === 'expired' && styles.filterTextActive]}>
              Expired
            </Text>
          </TouchableOpacity>
        </View>

        {/* Subscriptions List */}
        <View style={styles.subscriptionsContainer}>
          {filteredSubscriptions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No subscriptions found</Text>
            </View>
          ) : (
            filteredSubscriptions.map((subscription: any) => {
              const daysRemaining = getDaysRemaining(subscription.expires_at);
              const statusColor = getStatusColor(subscription);

              return (
                <View key={subscription.id} style={[styles.subscriptionCard, shadows.sm]}>
                  <View style={styles.subscriptionHeader}>
                    <View style={styles.sellerInfo}>
                      <Text style={styles.sellerName}>
                        {subscription.seller?.company_name || 'Seller'}
                      </Text>
                      <Text style={styles.sellerEmail}>
                        {subscription.seller?.users?.email || ''}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {subscription.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.subscriptionDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="pricetag" size={18} color={colors.textSecondary} />
                      <Text style={styles.detailLabel}>Plan:</Text>
                      <Text style={styles.detailValue}>{subscription.plan?.name}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="cash" size={18} color={colors.textSecondary} />
                      <Text style={styles.detailLabel}>Amount:</Text>
                      <Text style={styles.detailValue}>₹{subscription.amount_paid.toFixed(2)}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={18} color={colors.textSecondary} />
                      <Text style={styles.detailLabel}>Started:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(subscription.started_at).toLocaleDateString()}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                      <Text style={styles.detailLabel}>Expires:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(subscription.expires_at).toLocaleDateString()}
                      </Text>
                    </View>

                    {daysRemaining > 0 && subscription.status === 'active' && (
                      <View style={styles.detailRow}>
                        <Ionicons name="time" size={18} color={colors.primary} />
                        <Text style={styles.detailLabel}>Remaining:</Text>
                        <Text style={[styles.detailValue, { color: colors.primary }]}>
                          {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                        </Text>
                      </View>
                    )}

                    {subscription.cashfree_order_id && (
                      <View style={styles.detailRow}>
                        <Ionicons name="receipt" size={18} color={colors.textSecondary} />
                        <Text style={styles.detailLabel}>Order ID:</Text>
                        <Text style={[styles.detailValue, styles.orderId]} numberOfLines={1}>
                          {subscription.cashfree_order_id}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.white,
  },
  subscriptionsContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  subscriptionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  sellerEmail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  subscriptionDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 0.4,
  },
  detailValue: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
  },
  orderId: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
