import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
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
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRefundStore, RefundRequest } from '../../src/store/refundStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { useAuthStore } from '../../src/store/authStore';
import { supabase } from '../../src/services/supabase';
import { spacing, borderRadius } from '../../src/constants/theme';

// ---------- Status helpers ----------
type UiStatus = 'pending' | 'approved' | 'rejected' | 'processed';

const uiStatus = (raw?: string): UiStatus => {
  const s = String(raw || '').toLowerCase();
  if (s === 'approved' || s === 'processing' || s === 'under_review') return 'approved';
  if (s === 'rejected' || s === 'cancelled') return 'rejected';
  if (s === 'processed' || s === 'refunded') return 'processed';
  return 'pending';
};

const statusGradient = (s: UiStatus): [string, string] => {
  switch (s) {
    case 'pending':   return ['#F59E0B', '#D97706'];
    case 'approved':  return ['#3B82F6', '#2563EB'];
    case 'rejected':  return ['#EF4444', '#DC2626'];
    case 'processed': return ['#10B981', '#059669'];
  }
};

const statusLabel = (s: UiStatus): string => {
  switch (s) {
    case 'pending':   return 'Pending';
    case 'approved':  return 'Approved';
    case 'rejected':  return 'Rejected';
    case 'processed': return 'Processed';
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---------- Filter types ----------
type TypeFilter = 'all' | 'product' | 'service';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'processed';

// ---------- Refund card ----------
function RefundCard({
  refund,
  index,
  onPress,
}: {
  refund: RefundRequest;
  index: number;
  onPress: () => void;
}) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 360, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 360, delay: index * 60, useNativeDriver: true }),
    ]).start();
    return () => { fade.stopAnimation(); slide.stopAnimation(); };
  }, []);

  const ui = uiStatus(refund.status);
  const isProduct = refund.refund_type === 'product';
  const customerName =
    refund.user?.name ||
    refund.order?.shipping_name ||
    refund.booking?.address?.split(',')[0] ||
    'Customer';

  const itemName = isProduct
    ? (refund.refund_items?.[0]?.product_name || refund.refund_items?.[0]?.product?.name || 'Product')
    : (refund.service_refunds?.[0]?.service_name || refund.booking?.service?.name || 'Service');

  const itemImage = isProduct
    ? (refund.refund_items?.[0]?.product_image || refund.refund_items?.[0]?.product?.images?.[0])
    : (refund.service_refunds?.[0]?.service_image || refund.booking?.service?.images?.[0]);

  return (
    <Animated.View
      style={{ opacity: fade, transform: [{ translateY: slide }] }}
      testID={`refund-card-${refund.id}`}
    >
      <TouchableOpacity
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
        activeOpacity={0.85}
        style={styles.card}
        testID={`refund-card-touch-${refund.id}`}
      >
        {/* Top row: type pill + status */}
        <View style={styles.cardTopRow}>
          <LinearGradient
            colors={isProduct ? ['#0EA5E9', '#0284C7'] : ['#A855F7', '#7C3AED']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.typePill}
          >
            <Ionicons name={isProduct ? 'cube' : 'briefcase'} size={11} color="#FFF" />
            <Text style={styles.typePillText}>{isProduct ? 'PRODUCT' : 'SERVICE'}</Text>
          </LinearGradient>

          <LinearGradient colors={statusGradient(ui)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{statusLabel(ui).toUpperCase()}</Text>
          </LinearGradient>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.itemRow}>
            {itemImage ? (
              <View style={styles.thumbWrap}>
                {/* Using <Animated.Image> would force native driver issues; use inline image. */}
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Animated.Image source={{ uri: itemImage }} style={styles.thumb} />
              </View>
            ) : (
              <LinearGradient colors={['#1F2937', '#111827']} style={styles.thumbWrap}>
                <Ionicons name={isProduct ? 'cube-outline' : 'briefcase-outline'} size={22} color="#9CA3AF" />
              </LinearGradient>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.itemName} numberOfLines={1}>{itemName}</Text>
              <Text style={styles.customer}>{customerName}</Text>

              <Text style={styles.reason} numberOfLines={2}>
                {refund.reason || 'No reason provided'}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.amountPill}>
              <Ionicons name="cash-outline" size={14} color="#A855F7" />
              <Text style={styles.amountPillText}>{inr(refund.amount)}</Text>
            </View>
            <View style={styles.refIdPill}>
              <Ionicons name="finger-print-outline" size={12} color="#6B7280" />
              <Text style={styles.refIdText}>#{(refund.id || '').slice(0, 8)}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(refund.created_at)}</Text>
          </View>

          {refund.refund_transaction_id && (
            <View style={styles.txRow}>
              <Ionicons name="checkmark-done" size={12} color="#10B981" />
              <Text style={styles.txText} numberOfLines={1}>
                {refund.refund_payment_method || 'Refund'} • {refund.refund_transaction_id}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---------- Page ----------
export default function SellerRefundsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { seller } = useSellerStore();
  const { refunds, loading, fetchSellerRefunds } = useRefundStore();

  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  // Realtime subscriptions — refetch on any refund-related table change
  useEffect(() => {
    if (!seller?.id) return;

    const handle = () => {
      console.log('[seller-refunds] realtime tick → refetching');
      fetchSellerRefunds(seller.id);
    };

    const ch1 = supabase
      .channel(`seller-${seller.id}-refund-requests`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refund_requests', filter: `seller_id=eq.${seller.id}` }, handle)
      .subscribe();

    const ch2 = supabase
      .channel(`seller-${seller.id}-refund-items`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refund_items', filter: `seller_id=eq.${seller.id}` }, handle)
      .subscribe();

    const ch3 = supabase
      .channel(`seller-${seller.id}-service-refunds`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_refunds', filter: `seller_id=eq.${seller.id}` }, handle)
      .subscribe();

    // Polling fallback (every 25s) — protects against Realtime publication misconfig
    const poll = setInterval(() => fetchSellerRefunds(seller.id), 25000);

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
      clearInterval(poll);
    };
  }, [seller?.id]);

  useEffect(() => {
    if (seller?.id) fetchSellerRefunds(seller.id);
  }, [seller?.id, fetchSellerRefunds]);

  // Refetch when screen regains focus
  useFocusEffect(
    useCallback(() => {
      if (seller?.id) fetchSellerRefunds(seller.id);
    }, [seller?.id])
  );

  const onRefresh = async () => {
    if (!seller?.id) return;
    setRefreshing(true);
    await fetchSellerRefunds(seller.id);
    setRefreshing(false);
  };

  // ---------- Filtering & analytics ----------
  const filtered = useMemo(() => {
    let list = refunds || [];
    if (typeFilter !== 'all') list = list.filter(r => r.refund_type === typeFilter);
    if (statusFilter !== 'all') list = list.filter(r => uiStatus(r.status) === statusFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(r =>
        (r.id || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q) ||
        (r.order?.order_number || '').toLowerCase().includes(q) ||
        (r.user?.name || r.order?.shipping_name || '').toLowerCase().includes(q) ||
        (r.refund_items?.[0]?.product_name || r.booking?.service?.name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [refunds, typeFilter, statusFilter, query]);

  const analytics = useMemo(() => {
    const total      = refunds.length;
    const pending    = refunds.filter(r => uiStatus(r.status) === 'pending').length;
    const approved   = refunds.filter(r => uiStatus(r.status) === 'approved').length;
    const rejected   = refunds.filter(r => uiStatus(r.status) === 'rejected').length;
    const processed  = refunds.filter(r => uiStatus(r.status) === 'processed').length;
    const totalRefunded = refunds
      .filter(r => uiStatus(r.status) === 'processed')
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return { total, pending, approved, rejected, processed, totalRefunded };
  }, [refunds]);

  // ---------- UI ----------
  if (loading && refunds.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={styles.loadingText}>Loading refund transactions…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top'] as any}>
      <LinearGradient
        colors={['#0F172A', '#1E1B4B', '#312E81']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            testID="seller-refunds-back"
          >
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Refund Transactions</Text>
            <Text style={styles.headerSub}>
              {analytics.total} requests • {analytics.pending} pending
            </Text>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            style={styles.backButton}
            testID="seller-refunds-refresh"
          >
            <Ionicons name="refresh" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        renderItem={({ item, index }) => (
          <RefundCard
            refund={item}
            index={index}
            onPress={() => router.push(`/seller/refund-detail/${item.id}` as any)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A855F7"
            colors={['#A855F7']}
          />
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        ListHeaderComponent={
          <View>
            {/* Analytics cards */}
            <View style={styles.analyticsWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.analyticsRow}
              >
                <AnalyticsCard
                  testID="analytics-total"
                  icon="layers"
                  label="Total Refunds"
                  value={String(analytics.total)}
                  gradient={['#2463EB', '#1A4FCC']}
                />
                <AnalyticsCard
                  testID="analytics-pending"
                  icon="time"
                  label="Pending"
                  value={String(analytics.pending)}
                  gradient={['#F59E0B', '#D97706']}
                />
                <AnalyticsCard
                  testID="analytics-approved"
                  icon="checkmark-circle"
                  label="Approved"
                  value={String(analytics.approved)}
                  gradient={['#3B82F6', '#2563EB']}
                />
                <AnalyticsCard
                  testID="analytics-processed"
                  icon="cash"
                  label="Processed"
                  value={String(analytics.processed)}
                  gradient={['#10B981', '#059669']}
                />
                <AnalyticsCard
                  testID="analytics-total-amount"
                  icon="wallet"
                  label="Total Refunded"
                  value={inr(analytics.totalRefunded)}
                  gradient={['#A855F7', '#7C3AED']}
                  wide
                />
              </ScrollView>
            </View>

            {/* Search */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#9CA3AF" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by ID, customer, product or service…"
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
                testID="refunds-search-input"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} testID="refunds-search-clear">
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Type filter */}
            <Text style={styles.filterTitle}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['all','product','service'] as TypeFilter[]).map(t => (
                <FilterChip
                  key={t}
                  active={typeFilter === t}
                  label={t === 'all' ? 'All Refunds' : t === 'product' ? 'Product Refunds' : 'Service Refunds'}
                  onPress={() => setTypeFilter(t)}
                  testID={`type-filter-${t}`}
                />
              ))}
            </ScrollView>

            {/* Status filter */}
            <Text style={styles.filterTitle}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['all','pending','approved','rejected','processed'] as StatusFilter[]).map(s => (
                <FilterChip
                  key={s}
                  active={statusFilter === s}
                  label={s === 'all' ? 'All' : statusLabel(s as UiStatus)}
                  onPress={() => setStatusFilter(s)}
                  testID={`status-filter-${s}`}
                />
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>
              {filtered.length} {filtered.length === 1 ? 'refund' : 'refunds'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer} testID="refunds-empty">
            <LinearGradient colors={['#1F2937', '#111827']} style={styles.emptyIconCircle}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color="#10B981" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No refund transactions</Text>
            <Text style={styles.emptyText}>
              {refunds.length === 0
                ? 'You have no refund requests yet.'
                : 'No refunds match the selected filters.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ---------- Sub components ----------
function AnalyticsCard({
  icon, label, value, gradient, wide, testID,
}: { icon: any; label: string; value: string; gradient: [string, string]; wide?: boolean; testID?: string; }) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.analyticsCard, wide && { minWidth: 200 }]}
    >
      <View style={styles.analyticsIconBox}>
        <Ionicons name={icon} size={18} color="#FFFFFF" />
      </View>
      <Text style={styles.analyticsValue} testID={testID}>{value}</Text>
      <Text style={styles.analyticsLabel}>{label}</Text>
    </LinearGradient>
  );
}

function FilterChip({
  active, label, onPress, testID,
}: { active: boolean; label: string; onPress: () => void; testID?: string; }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} testID={testID}>
      {active ? (
        <LinearGradient
          colors={['#7C3AED', '#A855F7']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.chip, styles.chipActive]}
        >
          <Text style={[styles.chipText, styles.chipTextActive]}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.chip}>
          <Text style={styles.chipText}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0C10' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { fontSize: 14, color: '#9CA3AF', marginTop: 12 },
  headerGradient: {
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  backButton: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  listContent: { paddingBottom: spacing.xl },

  // Analytics
  analyticsWrap: { marginTop: spacing.md },
  analyticsRow: { paddingHorizontal: spacing.lg, gap: 10 },
  analyticsCard: {
    minWidth: 130,
    padding: 14,
    borderRadius: 14,
    gap: 6,
    justifyContent: 'space-between',
  },
  analyticsIconBox: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  analyticsValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginTop: 6 },
  analyticsLabel: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.xs,
    backgroundColor: '#13151A', borderColor: '#1E222A', borderWidth: 1,
    paddingHorizontal: spacing.md, borderRadius: 12, height: 44, gap: 8,
  },
  searchInput: { flex: 1, color: '#F1F5F9', fontSize: 13 },

  // Filters
  filterTitle: {
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    fontSize: 11, color: '#8E95A9', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase',
  },
  filterRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#13151A', borderColor: '#1E222A', borderWidth: 1,
  },
  chipActive: { borderColor: 'transparent' },
  chipText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },

  sectionLabel: {
    marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm,
    fontSize: 12, color: '#9CA3AF',
  },

  // Card
  card: {
    backgroundColor: '#13151A',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#1E222A',
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  typePillText: { fontSize: 9, color: '#FFF', fontWeight: '800', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 9, color: '#FFF', fontWeight: '800', letterSpacing: 0.5 },

  cardBody: { gap: 10 },
  itemRow: { flexDirection: 'row', gap: 12 },
  thumbWrap: {
    width: 56, height: 56, borderRadius: 12, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0B0C10',
  },
  thumb: { width: 56, height: 56 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#F1F5F9' },
  customer: { fontSize: 12, color: '#A5B0C8', marginTop: 2 },
  reason: { fontSize: 12, color: '#8E95A9', marginTop: 6, lineHeight: 18 },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  amountPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1F1B36', borderColor: '#2D2658', borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  amountPillText: { fontSize: 12, fontWeight: '700', color: '#C4B5FD' },
  refIdPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0B0C10', borderColor: '#1E222A', borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10,
  },
  refIdText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  dateText: { fontSize: 11, color: '#6B7280', marginLeft: 'auto' },

  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#06251A', borderColor: '#0F3F2A', borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  txText: { color: '#34D399', fontSize: 11, fontWeight: '600', flex: 1 },

  emptyContainer: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl, paddingTop: 60,
  },
  emptyIconCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1, borderColor: '#1E222A',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#F1F5F9', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#8E95A9', textAlign: 'center' },
});
