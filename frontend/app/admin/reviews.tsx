import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { useProductReviewStore, ProductReview } from '../../src/store/productReviewStore';
import { useServiceReviewStore, ServiceReview } from '../../src/store/serviceReviewStore';
import StarRating from '../../src/components/reviews/StarRating';

type Tab = 'all' | 'product' | 'service';

export default function AdminReviewsScreen() {
  const router = useRouter();
  const productStore = useProductReviewStore();
  const serviceStore = useServiceReviewStore();

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    await Promise.all([
      productStore.fetchAllProductReviews(),
      serviceStore.fetchAllServiceReviews(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const productReviews = productStore.reviews;
  const serviceReviews = serviceStore.reviews;

  const allReviews = useMemo(() => {
    const p = productReviews.map(r => ({ ...r, _kind: 'product' as const }));
    const s = serviceReviews.map(r => ({ ...r, _kind: 'service' as const }));
    return [...p, ...s].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [productReviews, serviceReviews]);

  const filtered = useMemo(() => {
    let list: any[] = [];
    if (tab === 'all') list = allReviews;
    else if (tab === 'product') list = productReviews.map(r => ({ ...r, _kind: 'product' as const }));
    else list = serviceReviews.map(r => ({ ...r, _kind: 'service' as const }));

    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(r =>
      r.user?.name?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q) ||
      r.product?.name?.toLowerCase().includes(q) ||
      r.service?.name?.toLowerCase().includes(q) ||
      r.review?.toLowerCase().includes(q),
    );
  }, [allReviews, productReviews, serviceReviews, tab, search]);

  const stats = {
    total: productReviews.length + serviceReviews.length,
    products: productReviews.length,
    services: serviceReviews.length,
    avg:
      productReviews.length + serviceReviews.length === 0
        ? 0
        : (
            (productReviews.reduce((a, r: any) => a + r.rating, 0) +
              serviceReviews.reduce((a, r: any) => a + r.rating, 0)) /
            (productReviews.length + serviceReviews.length)
          ).toFixed(1),
  };

  const handleDelete = (item: any) => {
    Alert.alert(
      'Delete Review',
      `Are you sure you want to delete this ${item._kind} review?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res =
              item._kind === 'product'
                ? await productStore.deleteProductReview(item.id)
                : await serviceStore.deleteServiceReview(item.id);
            if (res.success) {
              Alert.alert('Deleted', 'Review removed');
              await load();
            } else {
              Alert.alert('Error', res.error || 'Failed to delete review');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            testID="admin-reviews-back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Manage Reviews</Text>
            <Text style={styles.headerSubtitle}>{stats.total} reviews</Text>
          </View>
          <TouchableOpacity
            onPress={load}
            style={styles.refreshButton}
            testID="admin-reviews-refresh"
          >
            <Ionicons name="refresh" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Search */}
        <View style={[styles.searchBox, shadows.sm]}>
          <Ionicons name="search" size={18} color={colors.primary} />
          <TextInput
            placeholder="Search by user, product, service, content"
            placeholderTextColor={colors.textLight}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            testID="admin-reviews-search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.statValue, { color: '#047857' }]}>{stats.products}</Text>
            <Text style={styles.statLabel}>Product</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statValue, { color: '#B45309' }]}>{stats.services}</Text>
            <Text style={styles.statLabel}>Service</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FCE7F3' }]}>
            <Text style={[styles.statValue, { color: '#9D174D' }]}>{stats.avg}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {(['all', 'product', 'service'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}
              testID={`admin-reviews-tab-${t}`}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'all' ? 'All' : t === 'product' ? 'Products' : 'Services'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator
            color={colors.primary}
            size="large"
            style={{ marginTop: 40 }}
          />
        ) : (
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: 80 }}
          >
            {filtered.length === 0 ? (
              <View style={styles.emptyBox} testID="admin-reviews-empty">
                <Ionicons name="chatbubbles-outline" size={48} color={colors.textLight} />
                <Text style={styles.emptyTitle}>No reviews found</Text>
              </View>
            ) : (
              filtered.map((r: any) => (
                <View
                  key={`${r._kind}-${r.id}`}
                  style={[styles.reviewCard, shadows.sm]}
                  testID={`admin-review-${r.id}`}
                >
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.kindBadge,
                        {
                          backgroundColor:
                            r._kind === 'product' ? '#ECFDF5' : '#FEF3C7',
                        },
                      ]}
                    >
                      <Ionicons
                        name={r._kind === 'product' ? 'cube' : 'construct'}
                        size={12}
                        color={r._kind === 'product' ? '#047857' : '#B45309'}
                      />
                      <Text
                        style={[
                          styles.kindText,
                          { color: r._kind === 'product' ? '#047857' : '#B45309' },
                        ]}
                      >
                        {r._kind === 'product' ? 'PRODUCT' : 'SERVICE'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(r)}
                      style={styles.deleteBtn}
                      testID={`admin-review-delete-${r.id}`}
                    >
                      <Ionicons name="trash" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.userRow}>
                    {r.user?.avatar_url ? (
                      <Image source={{ uri: r.user.avatar_url }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Text style={styles.avatarText}>
                          {(r.user?.name || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{r.user?.name || 'Anonymous'}</Text>
                      <Text style={styles.userMeta}>{r.user?.email || '-'}</Text>
                    </View>
                    <StarRating rating={r.rating} size={14} />
                  </View>

                  {(r.product?.name || r.service?.name) && (
                    <Text style={styles.subject} numberOfLines={1}>
                      {r._kind === 'product'
                        ? `On product: ${r.product?.name}`
                        : `On service: ${r.service?.name}`}
                    </Text>
                  )}

                  <Text style={styles.reviewText} numberOfLines={4}>
                    {r.review}
                  </Text>
                  <Text style={styles.dateText}>
                    {new Date(r.created_at).toLocaleString('en-IN')}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  backButton: { padding: spacing.sm, marginRight: spacing.md },
  headerTextContainer: { flex: 1 },
  headerTitle: { ...typography.h3, color: colors.white, fontWeight: '700' },
  headerSubtitle: { ...typography.bodySmall, color: colors.primaryVeryLight },
  refreshButton: { padding: spacing.sm },
  content: { flex: 1, marginTop: -spacing.lg },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.white },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { marginTop: 10, color: colors.textSecondary, fontSize: 14 },
  reviewCard: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: borderRadius.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  kindText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  deleteBtn: { padding: 6 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarFallback: {
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '700' },
  userName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  userMeta: { fontSize: 11, color: '#9CA3AF' },
  subject: { fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginBottom: 6 },
  reviewText: { fontSize: 13, color: '#374151', lineHeight: 19 },
  dateText: { marginTop: 8, fontSize: 11, color: '#9CA3AF' },
});
