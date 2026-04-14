import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.42;

interface RecommendationItem {
  id: string;
  name: string;
  price: number;
  images?: string[] | null;
  image?: string;
}

interface SellerRecommendationsProps {
  title: string;
  items: RecommendationItem[];
  type: 'product' | 'service';
  currentItemId: string;
}

export default function SellerRecommendations({
  title,
  items,
  type,
  currentItemId,
}: SellerRecommendationsProps) {
  const router = useRouter();

  // Filter out current item and limit to 6 items
  const recommendations = items
    .filter(item => item.id !== currentItemId)
    .slice(0, 6);

  if (recommendations.length === 0) {
    return null;
  }

  const handleItemPress = (itemId: string) => {
    if (type === 'product') {
      router.push(`/product/${itemId}`);
    } else {
      router.push(`/service/${itemId}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.badge}>
          <Ionicons 
            name={type === 'product' ? 'cube-outline' : 'construct-outline'} 
            size={14} 
            color={colors.primary} 
          />
          <Text style={styles.badgeText}>{recommendations.length}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        data-testid="seller-recommendations-scroll"
      >
        {recommendations.map((item) => {
          const imageUrl = item.images?.[0] || item.image;
          
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => handleItemPress(item.id)}
              activeOpacity={0.7}
              data-testid={`recommendation-item-${item.id}`}
            >
              <View style={styles.imageContainer}>
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Ionicons
                      name={type === 'product' ? 'cube' : 'construct'}
                      size={32}
                      color={colors.textSecondary}
                    />
                  </View>
                )}
                {/* Type badge */}
                <View style={[
                  styles.typeBadge,
                  { backgroundColor: type === 'product' ? colors.primary : colors.accentGold }
                ]}>
                  <Ionicons
                    name={type === 'product' ? 'pricetag' : 'calendar'}
                    size={10}
                    color={colors.white}
                  />
                </View>
              </View>

              <View style={styles.content}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>₹{item.price.toFixed(2)}</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h4,
    color: colors.text,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryVeryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  content: {
    padding: spacing.md,
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
    minHeight: 44, // 2 lines
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    ...typography.h5,
    color: colors.primary,
    fontWeight: '700',
  },
});
