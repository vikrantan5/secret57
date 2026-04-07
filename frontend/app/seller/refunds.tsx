import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRefundStore } from '../../src/store/refundStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function SellerRefundsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { seller } = useSellerStore();
  const { refunds, loading, fetchSellerRefunds } = useRefundStore();
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (seller?.id) {
      fetchSellerRefunds(seller.id);
    }
  }, [seller]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = async () => {
    if (!seller?.id) return;
    setRefreshing(true);
    await fetchSellerRefunds(seller.id);
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested':
        return ['#F59E0B', '#D97706'];
      case 'approved':
        return ['#3B82F6', '#2563EB'];
      case 'rejected':
        return ['#EF4444', '#DC2626'];
      case 'processed':
        return ['#8B5CF6', '#7C3AED'];
      case 'refunded':
        return ['#10B981', '#059669'];
      default:
        return ['#6B7280', '#4B5563'];
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderRefundCard = ({ item, index }: { item: any; index: number }) => {
    const statusGradient = getStatusColor(item.status);

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          style={styles.refundCard}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/seller/refund-detail/${item.id}` as any);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.refundHeader}>
            <View style={styles.refundTopRow}>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.refundIcon}
              >
                <Ionicons name="return-down-back-outline" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.refundInfo}>
                <Text style={styles.refundOrderNumber} numberOfLines={1}>
                  Order #{item.order?.order_number?.slice(0, 12) || item.order_id?.slice(0, 8)}
                </Text>
                <Text style={styles.refundCustomer}>
                  {item.order?.shipping_name || 'Customer'}
                </Text>
              </View>
              <LinearGradient
                colors={statusGradient}
                style={styles.statusBadge}
              >
                <Text style={styles.statusText}>
                  {item.status.toUpperCase()}
                </Text>
              </LinearGradient>
            </View>
          </View>

          <Text style={styles.refundReason} numberOfLines={2}>
            {item.reason}
          </Text>

          <View style={styles.refundFooter}>
            <View style={styles.amountContainer}>
              <Ionicons name="cash-outline" size={16} color="#8B5CF6" />
              <Text style={styles.amountText}>₹{item.amount?.toFixed(2)}</Text>
            </View>
            <Text style={styles.refundDate}>{formatDate(item.created_at)}</Text>
          </View>

          {/* Payment Method Badge */}
          {(item.upi_id || item.bank_account_number) && (
            <View style={styles.paymentMethodBadge}>
              <Ionicons 
                name={item.upi_id ? "phone-portrait-outline" : "business-outline"} 
                size={12} 
                color="#6B7280" 
              />
              <Text style={styles.paymentMethodText}>
                {item.upi_id ? 'UPI' : 'Bank Transfer'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading && refunds.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F9FAFB', '#FFFFFF']}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading refund requests...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4C1D95']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refund Requests</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {refunds.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.emptyIconContainer}
            >
              <Ionicons name="checkmark-done-circle-outline" size={64} color="#10B981" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Refund Requests</Text>
            <Text style={styles.emptyText}>You have no refund requests at the moment.</Text>
          </View>
        ) : (
          <FlatList
            data={refunds}
            renderItem={renderRefundCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#8B5CF6"
                colors={['#8B5CF6']}
              />
            }
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerGradient: {
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  listContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  refundCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  refundHeader: {
    marginBottom: spacing.sm,
  },
  refundTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refundIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundInfo: {
    flex: 1,
  },
  refundOrderNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  refundCustomer: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refundReason: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  refundFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  amountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  refundDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  paymentMethodText: {
    fontSize: 11,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
