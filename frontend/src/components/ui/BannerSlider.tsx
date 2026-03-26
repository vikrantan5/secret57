import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '../../constants/theme';

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - spacing.lg * 2;
const BANNER_HEIGHT = 180;

interface Banner {
  id: string;
  image: string;
  link?: string;
}

interface BannerSliderProps {
  banners: Banner[];
  autoScroll?: boolean;
  autoScrollInterval?: number;
}

export const BannerSlider: React.FC<BannerSliderProps> = ({
  banners,
  autoScroll = true,
  autoScrollInterval = 4000,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!autoScroll || banners.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % banners.length;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * (BANNER_WIDTH + spacing.md),
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [activeIndex, banners.length, autoScroll, autoScrollInterval]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / (BANNER_WIDTH + spacing.md));
    setActiveIndex(index);
  };

  if (banners.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        decelerationRate="fast"
        snapToInterval={BANNER_WIDTH + spacing.md}
        snapToAlignment="start"
        contentContainerStyle={styles.scrollContent}
      >
        {banners.map((banner, index) => (
          <TouchableOpacity
            key={banner.id}
            style={[
              styles.bannerContainer,
              index === banners.length - 1 && styles.lastBanner,
            ]}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: banner.image }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)']}
              style={styles.gradient}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      {banners.length > 1 && (
        <View style={styles.pagination}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === activeIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  bannerContainer: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    marginRight: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  lastBanner: {
    marginRight: 0,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
});
