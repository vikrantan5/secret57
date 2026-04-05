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
      setRecentTransactions(transactions.slice(0, 10)); // Show only 10 most recent

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

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Revenue</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading revenue data...</Text>
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
        <Text style={styles.title}>Revenue</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Revenue Summary */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, shadows.md]}>
            <Ionicons name="today" size={24} color={colors.primary} style={styles.summaryIcon} />
            <Text style={styles.summaryLabel}>Today</Text>
            <Text style={styles.summaryValue}>₹{revenueData.today.toFixed(2)}</Text>
          </View>
        
          <View style={[styles.summaryCard, shadows.md]}>
            <Ionicons name="calendar-outline" size={24} color={colors.success} style={styles.summaryIcon} />
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryValue}>₹{revenueData.month.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardPrimary, shadows.md]}>
            <Ionicons name="wallet" size={28} color={colors.white} style={styles.summaryIcon} />
            <Text style={[styles.summaryLabel, styles.summaryLabelWhite]}>Total Revenue</Text>
            <Text style={[styles.summaryValue, styles.summaryValueWhite]}>₹{revenueData.total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={60} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>
                Your sales transactions will appear here once customers complete payments
              </Text>
            </View>
          ) : (
            <View>
              {recentTransactions.map((transaction, index) => (
                <View key={index} style={[styles.transactionCard, shadows.sm]}>
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: transaction.type === 'order' ? colors.primary + '20' : colors.secondary + '20' }
                  ]}>
                    <Ionicons 
                      name={transaction.type === 'order' ? 'cart' : 'calendar'} 
                      size={24} 
                      color={transaction.type === 'order' ? colors.primary : colors.secondary} 
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle}>{transaction.description}</Text>
                    <Text style={styles.transactionDate}>{transaction.date}</Text>
                  </View>
                  <Text style={styles.transactionAmount}>₹{transaction.amount.toFixed(2)}</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  refreshButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
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
  summaryContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  summaryCardPrimary: {
    backgroundColor: colors.primary,
  },
  summaryIcon: {
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryLabelWhite: {
    color: colors.white,
    opacity: 0.9,
  },
  summaryValue: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  summaryValueWhite: {
    color: colors.white,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
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
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  transactionDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  transactionAmount: {
    ...typography.h4,
    color: colors.success,
    fontWeight: '700',
  },
});