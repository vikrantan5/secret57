import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/authStore';
import { useReviewStore, Review } from '../../src/store/reviewStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function ReviewsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { reviews, loading } = useReviewStore();
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (user?.id) {
      const filtered = reviews.filter(r => r.customer_id === user.id);
      setUserReviews(filtered);
    }
  }, [user, reviews]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={14}
            color={star <= rating ? '#F59E0B' : '#D1D5DB'}
          />
        ))}
      </View>
    );
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return '#10B981';
    if (rating >= 3) return '#F59E0B';
    return '#EF4444';
  };

  const getRatingText = (rating: number) => {
    if (rating >= 4) return 'Excellent';
    if (rating >= 3) return 'Good';
    if (rating >= 2) return 'Average';
    return 'Poor';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={['#F9FAFB', '#FFFFFF']}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading your reviews...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Premium Header */}
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
          <Text style={styles.headerTitle}>My Reviews</Text>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="options-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {userReviews.length === 0 ? (
        <Animated.View 
          style={[styles.emptyContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <LinearGradient
            colors={['#F3F4F6', '#E5E7EB']}
            style={styles.emptyIconContainer}
          >
            <Ionicons name="star-outline" size={48} color="#9CA3AF" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No reviews yet</Text>
          <Text style={styles.emptySubtitle}>
            Share your experience by reviewing products and services you've purchased
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/(tabs)/categories')}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shopGradient}
            >
              <Ionicons name="storefront-outline" size={20} color="#FFFFFF" />
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          style={[styles.scrollView, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Stats Summary */}
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={['#FFFFFF', '#F9FAFB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statsCard}
            >
              <View style={styles.statsLeft}>
                <Text style={styles.statsCount}>{userReviews.length}</Text>
                <Text style={styles.statsLabel}>Total Reviews</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsRight}>
                <Text style={styles.statsAverage}>
                  {(userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length).toFixed(1)}
                </Text>
                <Text style={styles.statsLabel}>Average Rating</Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.reviewsList}>
            {userReviews.map((review, index) => (
              <Animated.View
                key={review.id}
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateX: slideAnim }],
                }}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F9FAFB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.reviewCard}
                >
                  {/* Rating & Date */}
                  <View style={styles.reviewHeader}>
                    <View style={styles.ratingContainer}>
                      {renderStars(review.rating)}
                      <LinearGradient
                        colors={[getRatingColor(review.rating) + '20', getRatingColor(review.rating) + '10']}
                        style={styles.ratingBadge}
                      >
                        <Text style={[styles.ratingText, { color: getRatingColor(review.rating) }]}>
                          {getRatingText(review.rating)}
                        </Text>
                      </LinearGradient>
                    </View>
                    <View style={styles.dateContainer}>
                      <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
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
                      {review.images.map((image, imgIndex) => (
                        <View key={imgIndex} style={styles.imageWrapper}>
                          <Image
                            source={{ uri: image }}
                            style={styles.reviewImage}
                          />
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.3)']}
                            style={styles.imageOverlay}
                          />
                        </View>
                      ))}
                    </ScrollView>
                  )}

                  {/* Verified Purchase Badge */}
                  {review.is_verified_purchase && (
                    <View style={styles.verifiedBadge}>
                      <LinearGradient
                        colors={['#D1FAE5', '#A7F3D0']}
                        style={styles.verifiedGradient}
                      >
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.verifiedText}>Verified Purchase</Text>
                      </LinearGradient>
                    </View>
                  )}

                  {/* Seller Reply */}
                  {review.seller_reply && (
                    <LinearGradient
                      colors={['#F3F4F6', '#E5E7EB']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.sellerReply}
                    >
                      <View style={styles.sellerReplyHeader}>
                        <LinearGradient
                          colors={['#8B5CF6', '#7C3AED']}
                          style={styles.sellerReplyIcon}
                        >
                          <Ionicons name="chatbubble-outline" size={12} color="#FFFFFF" />
                        </LinearGradient>
                        <Text style={styles.sellerReplyLabel}>Seller's Response</Text>
                      </View>
                      <Text style={styles.sellerReplyText}>{review.seller_reply}</Text>
                      {review.seller_reply_date && (
                        <Text style={styles.sellerReplyDate}>
                          {new Date(review.seller_reply_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                      )}
                    </LinearGradient>
                  )}
                </LinearGradient>
              </Animated.View>
            ))}
          </View>
          <View style={{ height: spacing.xxl }} />
        </Animated.ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  shopButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  shopGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
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
  statsLeft: {
    flex: 1,
    alignItems: 'center',
  },
  statsCount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  statsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statsDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  statsRight: {
    flex: 1,
    alignItems: 'center',
  },
  statsAverage: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F59E0B',
  },
  reviewsList: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  reviewCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
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
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: spacing.xs,
  },
  reviewComment: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  imagesContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  verifiedBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  verifiedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  sellerReply: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  sellerReplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sellerReplyIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerReplyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  sellerReplyText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  sellerReplyDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
});