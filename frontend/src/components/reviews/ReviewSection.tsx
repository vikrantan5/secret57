import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useProductReviewStore, ProductReview } from '../../store/productReviewStore';
import { useServiceReviewStore, ServiceReview } from '../../store/serviceReviewStore';
import StarRating from './StarRating';
import WriteReviewModal from './WriteReviewModal';

type ReviewKind = 'product' | 'service';

interface ReviewSectionProps {
  kind: ReviewKind;
  subjectId: string;
  subjectName?: string;
}

export default function ReviewSection({ kind, subjectId, subjectName }: ReviewSectionProps) {
  const { user } = useAuthStore();
  const productStore = useProductReviewStore();
  const serviceStore = useServiceReviewStore();

  const [reviews, setReviews] = useState<Array<ProductReview | ServiceReview>>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [eligibility, setEligibility] = useState<{
    eligible: boolean;
    orderId?: string;
    bookingId?: string;
    reason?: string;
  }>({ eligible: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (kind === 'product') {
        const list = await productStore.fetchProductReviews(subjectId);
        setReviews(list);
      } else {
        const list = await serviceStore.fetchServiceReviews(subjectId);
        setReviews(list);
      }
    } finally {
      setLoading(false);
    }
  }, [kind, subjectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const checkEligibility = async () => {
      if (!user?.id) {
        setEligibility({ eligible: false, reason: 'Login required to write a review' });
        return;
      }
      if (kind === 'product') {
        const res = await productStore.canUserReview(subjectId, user.id);
        setEligibility(res);
      } else {
        const res = await serviceStore.canUserReview(subjectId, user.id);
        setEligibility(res);
      }
    };
    checkEligibility();
  }, [user?.id, subjectId, kind, reviews.length]);

  const avgRating =
    reviews.length === 0
      ? 0
      : Number(
          (reviews.reduce((acc, r: any) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1),
        );

  const distribution = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: reviews.filter((r: any) => r.rating === s).length,
  }));

  const visibleReviews = showAll ? reviews : reviews.slice(0, 3);

  const handleSubmit = async (rating: number, review: string) => {
    if (!user?.id) return { success: false, error: 'Not logged in' };
    if (kind === 'product') {
      if (!eligibility.orderId) return { success: false, error: 'Not eligible' };
      const res = await productStore.createProductReview({
        product_id: subjectId,
        user_id: user.id,
        order_id: eligibility.orderId,
        rating,
        review,
      });
      if (res.success) await load();
      return res;
    } else {
      if (!eligibility.bookingId) return { success: false, error: 'Not eligible' };
      const res = await serviceStore.createServiceReview({
        service_id: subjectId,
        user_id: user.id,
        booking_id: eligibility.bookingId,
        rating,
        review,
      });
      if (res.success) await load();
      return res;
    }
  };

  return (
    <View style={styles.container} testID={`review-section-${kind}`}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Ratings & Reviews</Text>
        <TouchableOpacity onPress={load} testID="reviews-refresh-button" style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color="#8B5CF6" style={{ marginVertical: 18 }} />
      ) : reviews.length === 0 ? (
        <View style={styles.emptyBox} testID="no-reviews-state">
          <Ionicons name="chatbubble-ellipses-outline" size={36} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No reviews yet</Text>
          <Text style={styles.emptySubtitle}>Be the first to share your experience</Text>
        </View>
      ) : (
        <View style={styles.summaryCard} testID="review-summary">
          <View style={styles.summaryLeft}>
            <Text style={styles.avgValue}>{avgRating.toFixed(1)}</Text>
            <StarRating rating={Math.round(avgRating)} size={18} />
            <Text style={styles.countText}>{reviews.length} reviews</Text>
          </View>
          <View style={styles.summaryRight}>
            {distribution.map(d => {
              const pct = reviews.length === 0 ? 0 : (d.count / reviews.length) * 100;
              return (
                <View key={d.star} style={styles.barRow}>
                  <Text style={styles.barStar}>{d.star}★</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.barCount}>{d.count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Write Review CTA */}
      <View style={styles.ctaRow}>
        {eligibility.eligible ? (
          <TouchableOpacity
            style={styles.writeBtn}
            onPress={() => setShowModal(true)}
            testID="open-write-review"
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.writeBtnText}>Write a Review</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.disabledBox} testID="review-disabled-reason">
            <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" />
            <Text style={styles.disabledText}>
              {eligibility.reason ||
                (kind === 'product'
                  ? 'You can review only purchased products'
                  : 'You can review only completed services')}
            </Text>
          </View>
        )}
      </View>

      {/* Review list */}
      {visibleReviews.map((r: any) => (
        <View key={r.id} style={styles.reviewCard} testID={`review-card-${r.id}`}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewerInfo}>
              {r.user?.avatar_url ? (
                <Image source={{ uri: r.user.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>
                    {(r.user?.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.reviewerName}>{r.user?.name || 'Anonymous'}</Text>
                <Text style={styles.reviewDate}>
                  {new Date(r.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.verifiedBadge} testID="verified-purchase-badge">
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <StarRating rating={r.rating} size={14} />
          </View>
          <Text style={styles.reviewText}>{r.review}</Text>
        </View>
      ))}

      {reviews.length > 3 && (
        <TouchableOpacity
          style={styles.showMoreBtn}
          onPress={() => setShowAll(s => !s)}
          testID="reviews-toggle-show-more"
        >
          <Text style={styles.showMoreText}>
            {showAll ? 'Show less' : `Show all ${reviews.length} reviews`}
          </Text>
          <Ionicons
            name={showAll ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#8B5CF6"
          />
        </TouchableOpacity>
      )}

      <WriteReviewModal
        visible={showModal}
        title={kind === 'product' ? 'Review this Product' : 'Review this Service'}
        subjectName={subjectName}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 24, paddingHorizontal: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heading: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  refreshBtn: { padding: 6 },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    marginBottom: 12,
  },
  emptyTitle: { marginTop: 8, fontSize: 15, fontWeight: '600', color: '#374151' },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  summaryLeft: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingRight: 6,
  },
  avgValue: { fontSize: 30, fontWeight: '800', color: '#1F2937' },
  countText: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  summaryRight: { flex: 1, justifyContent: 'center', gap: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barStar: { width: 22, fontSize: 12, color: '#6B7280' },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: 8, backgroundColor: '#F59E0B', borderRadius: 4 },
  barCount: { width: 22, textAlign: 'right', fontSize: 12, color: '#6B7280' },
  ctaRow: { marginBottom: 14 },
  writeBtn: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  writeBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  disabledBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  disabledText: { flex: 1, color: '#6B7280', fontSize: 13 },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: '700' },
  reviewerName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  reviewDate: { fontSize: 11, color: '#9CA3AF' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: { color: '#047857', fontSize: 11, fontWeight: '700' },
  reviewText: { marginTop: 8, color: '#374151', lineHeight: 20, fontSize: 14 },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  showMoreText: { color: '#8B5CF6', fontWeight: '600', fontSize: 13 },
});
