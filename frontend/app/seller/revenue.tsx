import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { LineChart } from 'react-native-chart-kit';
import { useSellerStore } from '../../src/store/sellerStore';
import { supabase } from '../../src/services/supabase';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

interface RevenueData {
  today: number;
  week: number;
  month: number;
  total: number;
}

interface Transaction {
  id: string;
  description: string;
  date: string;
  amount: number;
  type: 'order' | 'booking';
}

export default function SellerRevenueScreen() {
  const router = useRouter();
  const { seller } = useSellerStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revenueData, setRevenueData] = useState<RevenueData>({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (seller?.id) {
      fetchRevenueData();
    }
  }, [seller?.id]);

  const fetchRevenueData = async () => {
    if (!seller?.id) return;

    try {
      setLoading(true);

      // Fetch revenue from orders
      const { data: orderRevenue, error: orderError } = await supabase
        .from('order_items')
        .select(`
          total,
          created_at,
          product_name,
          order:orders!inner(
            id,
            order_number,
            payment_status,
            created_at
          )
        `)
        .eq('seller_id', seller.id)
        .eq('order.payment_status', 'paid');

      if (orderError) {
        console.error('Error fetching order revenue:', orderError);
      }

      // Fetch revenue from bookings
      const { data: bookingRevenue, error: bookingError } = await supabase
        .from('bookings')
        .select('id, total_amount, created_at, status, service_id')
        .eq('seller_id', seller.id)
        .in('status', ['completed', 'confirmed']);

      if (bookingError) {
        console.error('Error fetching booking revenue:', bookingError);
      }

      // Calculate revenues
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let todayRev = 0;
      let weekRev = 0;
      let monthRev = 0;
      let totalRev = 0;
      const transactions: Transaction[] = [];

      // Process order revenue
      if (orderRevenue) {
        orderRevenue.forEach((item: any) => {
          const itemDate = new Date(item.created_at);
          const amount = item.total || 0;

          totalRev += amount;
          if (itemDate >= monthStart) monthRev += amount;
          if (itemDate >= weekStart) weekRev += amount;
          if (itemDate >= todayStart) todayRev += amount;

          transactions.push({
            id: item.order.id,
            description: `Order ${item.order.order_number} - ${item.product_name}`,
            date: formatTransactionDate(item.created_at),
            amount: amount,
            type: 'order',
          });
        });
      }

      // Process booking revenue
      if (bookingRevenue) {
        bookingRevenue.forEach((booking: any) => {
          const bookingDate = new Date(booking.created_at);
          const amount = booking.total_amount || 0;

          totalRev += amount;
          if (bookingDate >= monthStart) monthRev += amount;
          if (bookingDate >= weekStart) weekRev += amount;
          if (bookingDate >= todayStart) todayRev += amount;

          transactions.push({
            id: booking.id,
            description: `Booking - Service`,
            date: formatTransactionDate(booking.created_at),
            amount: amount,
            type: 'booking',
          });
        });
      }

      // Sort transactions by date (newest first)
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRevenueData({
        today: todayRev,
        week: weekRev,
        month: monthRev,
        total: totalRev,
      });
      setRecentTransactions(transactions.slice(0, 10));

    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTransactionDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRevenueData();
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  if (loading && !refreshing) {
    return (
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <BlurView intensity={80} tint="dark" style={styles.headerBlur}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.title}>Revenue</Text>
              <View style={{ width: 40 }} />
            </View>
          </BlurView>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading revenue data...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <BlurView intensity={80} tint="dark" style={styles.headerBlur}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Revenue Analytics</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton} activeOpacity={0.7}>
              <Ionicons name="refresh" size={22} color="#a78bfa" />
            </TouchableOpacity>
          </View>
        </BlurView>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#6366f1"
              colors={['#6366f1']}
            />
          }
        >
          {/* Hero Section - Total Revenue */}
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.heroCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIconContainer}>
                <Ionicons name="trending-up" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.heroLabel}>Total Revenue</Text>
              <Text style={styles.heroValue}>{formatCurrency(revenueData.total)}</Text>
              <View style={styles.heroBadge}>
                <Ionicons name="calendar" size={12} color="#FFFFFF" />
                <Text style={styles.heroBadgeText}>Lifetime</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <LinearGradient
              colors={['#1e1e1e', '#161616']}
              style={styles.statCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Ionicons name="today" size={22} color="#a78bfa" />
              </View>
              <Text style={styles.statLabel}>Today</Text>
              <Text style={styles.statValue}>{formatCurrency(revenueData.today)}</Text>
            </LinearGradient>

            <LinearGradient
              colors={['#1e1e1e', '#161616']}
              style={styles.statCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="calendar-outline" size={22} color="#10b981" />
              </View>
              <Text style={styles.statLabel}>This Week</Text>
              <Text style={styles.statValue}>{formatCurrency(revenueData.week)}</Text>
            </LinearGradient>

            <LinearGradient
              colors={['#1e1e1e', '#161616']}
              style={styles.statCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.statIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="calendar" size={22} color="#f59e0b" />
              </View>
              <Text style={styles.statLabel}>This Month</Text>
              <Text style={styles.statValue}>{formatCurrency(revenueData.month)}</Text>
            </LinearGradient>
          </View>

          {/* Recent Transactions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#a78bfa" />
              </TouchableOpacity>
            </View>

            {recentTransactions.length === 0 ? (
              <LinearGradient
                colors={['#1e1e1e', '#161616']}
                style={styles.emptyStateCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="receipt-outline" size={60} color="#6366f1" />
                </View>
                <Text style={styles.emptyTitle}>No transactions yet</Text>
                <Text style={styles.emptySubtitle}>
                  Your sales transactions will appear here once customers complete payments
                </Text>
              </LinearGradient>
            ) : (
              <View>
                {recentTransactions.map((transaction, index) => (
                  <LinearGradient
                    key={index}
                    colors={['#1e1e1e', '#161616']}
                    style={styles.transactionCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={[
                      styles.transactionIcon,
                      { 
                        backgroundColor: transaction.type === 'order' 
                          ? 'rgba(99, 102, 241, 0.15)' 
                          : 'rgba(139, 92, 246, 0.15)' 
                      }
                    ]}>
                      <Ionicons 
                        name={transaction.type === 'order' ? 'cart-outline' : 'calendar-outline'} 
                        size={24} 
                        color={transaction.type === 'order' ? '#a78bfa' : '#c084fc'} 
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionTitle}>{transaction.description}</Text>
                      <View style={styles.transactionMeta}>
                        <Ionicons name="time-outline" size={12} color="#6b7280" />
                        <Text style={styles.transactionDate}>{transaction.date}</Text>
                      </View>
                    </View>
                    <View style={styles.transactionAmountContainer}>
                      <Text style={[
                        styles.transactionAmount,
                        { color: transaction.type === 'order' ? '#10b981' : '#f59e0b' }
                      ]}>
                        +{formatCurrency(transaction.amount)}
                      </Text>
                      <View style={styles.transactionTypeBadge}>
                        <Text style={styles.transactionTypeText}>
                          {transaction.type === 'order' ? 'Order' : 'Booking'}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                ))}
              </View>
            )}
          </View>

          {/* Insights Section */}
          {recentTransactions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Insights</Text>
              <LinearGradient
                colors={['#1e1e1e', '#161616']}
                style={styles.insightCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.insightRow}>
                  <View style={styles.insightItem}>
                    <Text style={styles.insightLabel}>Avg. Transaction</Text>
                    <Text style={styles.insightValue}>
                      {formatCurrency(recentTransactions.reduce((sum, t) => sum + t.amount, 0) / recentTransactions.length)}
                    </Text>
                  </View>
                  <View style={styles.insightDivider} />
                  <View style={styles.insightItem}>
                    <Text style={styles.insightLabel}>Total Transactions</Text>
                    <Text style={styles.insightValue}>{recentTransactions.length}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
  },
  loadingText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: spacing.md,
  },
  heroCard: {
    margin: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  heroValue: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: spacing.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.full,
  },
  heroBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: (width - spacing.lg * 2 - spacing.md * 2) / 3,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  viewAllText: {
    fontSize: 14,
    color: '#a78bfa',
    fontWeight: '600',
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionDate: {
    fontSize: 11,
    color: '#6b7280',
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  transactionTypeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.sm,
  },
  transactionTypeText: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '600',
  },
  insightCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightItem: {
    flex: 1,
    alignItems: 'center',
  },
  insightDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: spacing.lg,
  },
  insightLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: spacing.xs,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});