import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface BrandedSplashProps {
  companyName: string;
  companyLogo?: string | null;
  type: 'product' | 'service';
  onFinish: () => void;
  duration?: number;
}

const PRODUCT_GRADIENT: [string, string, string, string] = [
  '#1e1b4b',
  '#312e81',
  '#3730a3',
  '#1e3a5f',
];

const SERVICE_GRADIENT: [string, string, string, string] = [
  '#451a03',
  '#78350f',
  '#92400e',
  '#713f12',
];

const PRODUCT_ACCENT = '#818CF8';
const SERVICE_ACCENT = '#FCD34D';

export default function BrandedSplash({
  companyName,
  companyLogo,
  type,
  onFinish,
  duration = 3500,
}: BrandedSplashProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const nameSlide = useRef(new Animated.Value(40)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const tagSlide = useRef(new Animated.Value(20)).current;
  const exitAnim = useRef(new Animated.Value(1)).current;

  const gradient = type === 'product' ? PRODUCT_GRADIENT : SERVICE_GRADIENT;
  const accent = type === 'product' ? PRODUCT_ACCENT : SERVICE_ACCENT;
  const icon = type === 'product' ? 'cube' : 'construct';
  const tagText = type === 'product' ? 'PRODUCT' : 'SERVICE';

  useEffect(() => {
    // Phase 1: Ring expand + fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(ringScale, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: 0.3,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 2: Logo zoom in (after 200ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, 200);

    // Phase 3: Company name slides up (after 600ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(nameOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(nameSlide, {
          toValue: 0,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }, 600);

    // Phase 4: Tag line appears (after 1000ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(tagOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(tagSlide, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1000);

    // Phase 5: Exit animation
    const exitTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(exitAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onFinish();
      });
    }, duration);

    return () => clearTimeout(exitTimer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: Animated.multiply(fadeAnim, exitAnim),
        },
      ]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.decorCircle1, { borderColor: accent + '15' }]} />
        <View style={[styles.decorCircle, styles.decorCircle2, { borderColor: accent + '10' }]} />

        <View style={styles.content}>
          {/* Outer ring animation */}
          <Animated.View
            style={[
              styles.outerRing,
              {
                borderColor: accent + '30',
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              },
            ]}
          />

          {/* Logo container with scale animation */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={[accent + '40', accent + '15']}
              style={styles.logoGlow}
            >
              <View style={[styles.logoInner, { backgroundColor: accent + '20' }]}>
                {companyLogo ? (
                  <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                    <Image
                      source={{ uri: companyLogo }}
                      style={styles.logoImage}
                      resizeMode="cover"
                    />
                  </Animated.View>
                ) : (
                  <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                    <Ionicons name={icon as any} size={50} color={accent} />
                  </Animated.View>
                )}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Company name */}
          <Animated.View
            style={[
              styles.nameContainer,
              {
                opacity: nameOpacity,
                transform: [{ translateY: nameSlide }],
              },
            ]}
          >
            <Text style={[styles.companyName, { color: '#FFFFFF' }]} numberOfLines={2}>
              {companyName}
            </Text>
            <View style={[styles.underline, { backgroundColor: accent }]} />
          </Animated.View>

          {/* Type tag */}
          <Animated.View
            style={[
              styles.tagContainer,
              {
                opacity: tagOpacity,
                transform: [{ translateY: tagSlide }],
                borderColor: accent + '40',
              },
            ]}
          >
            <Ionicons
              name={type === 'product' ? 'pricetag' : 'calendar'}
              size={14}
              color={accent}
            />
            <Text style={[styles.tagText, { color: accent }]}>{tagText}</Text>
          </Animated.View>
        </View>

        {/* Bottom shimmer */}
        <Animated.View style={[styles.bottomShimmer, { opacity: tagOpacity }]}>
          <View style={[styles.shimmerDot, { backgroundColor: accent + '60' }]} />
          <View style={[styles.shimmerLine, { backgroundColor: accent + '30' }]} />
          <View style={[styles.shimmerDot, { backgroundColor: accent + '60' }]} />
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 9999,
  },
  decorCircle1: {
    width: width * 1.2,
    height: width * 1.2,
    top: -width * 0.3,
    right: -width * 0.3,
  },
  decorCircle2: {
    width: width * 0.8,
    height: width * 0.8,
    bottom: -width * 0.2,
    left: -width * 0.2,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logoGlow: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoInner: {
    width: 105,
    height: 105,
    borderRadius: 52.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  nameContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  companyName: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 6,
  },
  underline: {
    width: 50,
    height: 3,
    borderRadius: 2,
    marginTop: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  bottomShimmer: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shimmerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  shimmerLine: {
    width: 40,
    height: 1.5,
  },
});
