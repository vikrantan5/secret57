import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useReviewStore, Review } from '../../src/store/reviewStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function ReviewsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { reviews, loading } = useReviewStore();
  const [userReviews, setUserReviews] = useState<Review[]>([]);

  useEffect(() => {
    // In a real app, fetch user's reviews from backend
    // For now, we'll filter reviews by customer_id
    if (user?.id) {
      const filtered = reviews.filter(r => r.customer_id === user.id);
      setUserReviews(filtered);
    }
  }, [user, reviews]);

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color={star <= rating ? colors.warning : colors.textLight}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : userReviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="star-outline" size={80} color={colors.textLight} />
          <Text style={styles.emptyText}>No reviews yet</Text>
          <Text style={styles.emptySubtext}>
            Share your experience by reviewing products and services you've purchased
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.reviewsList}>
            {userReviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                {/* Rating & Date */}
                <View style={styles.reviewHeader}>
                  {renderStars(review.rating)}
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </Text>
                </View>

                {/* Title */}
                {review.title && (
                  <Text style={styles.reviewTitle}>{review.title}</Text>
                )}

                {/* Comment */}
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}

                {/* Images */}
                {review.images && review.images.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.imagesContainer}
                  >
                    {review.images.map((image, index) => (
                      <Image
                        key={index}
                        source={{ uri: image }}
                        style={styles.reviewImage}
                      />
                    ))}
                  </ScrollView>
                )}

                {/* Verified Purchase Badge */}
                {review.is_verified_purchase && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.verifiedText}>Verified Purchase</Text>
                  </View>
                )}

                {/* Seller Reply */}
                {review.seller_reply && (
                  <View style={styles.sellerReply}>
                    <View style={styles.sellerReplyHeader}>
                      <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                      <Text style={styles.sellerReplyLabel}>Seller's Response</Text>
                    </View>
                    <Text style={styles.sellerReplyText}>{review.seller_reply}</Text>
                    {review.seller_reply_date && (
                      <Text style={styles.sellerReplyDate}>
                        {new Date(review.seller_reply_date).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}
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
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  reviewsList: {
    padding: spacing.lg,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  reviewDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  reviewTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  reviewComment: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  imagesContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  verifiedText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  sellerReply: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  sellerReplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sellerReplyLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  sellerReplyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sellerReplyDate: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
});