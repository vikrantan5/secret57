import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface BrandedSplashProps {
  companyName: string;
  companyLogo?: string | null;
  type: 'product' | 'service';
  onFinish: () => void;
  duration?: number;
}

// Premium Gradient Colors (as per requirements)
const PRODUCT_GRADIENT: [string, string, string] = ['#2563EB', '#4F46E5', '#1E3A8A'];
const SERVICE_GRADIENT: [string, string, string] = ['#F97316', '#FB923C', '#F59E0B'];

const PRODUCT_ACCENT = '#818CF8';
const SERVICE_ACCENT = '#FBBF24';

export default function BrandedSplash({
  companyName,
  companyLogo,
  type,
  onFinish,
  duration = 3500,
}: BrandedSplashProps) {
  // Shared values for animations
  const containerOpacity = useSharedValue(0);
  const containerScale = useSharedValue(0.95);
  
  const ringScale = useSharedValue(0.5);
  const ringOpacity = useSharedValue(0);
  
  const logoScale = useSharedValue(0.3);
  const logoRotate = useSharedValue(0);
  const logoPulse = useSharedValue(1);
  
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.8);
  
  const nameOpacity = useSharedValue(0);
  const nameTranslateY = useSharedValue(40);
  
  const tagOpacity = useSharedValue(0);
  const tagTranslateY = useSharedValue(20);
  
  const shimmerOpacity = useSharedValue(0);
  
  const exitOpacity = useSharedValue(1);
  const exitScale = useSharedValue(1);

  const gradient = type === 'product' ? PRODUCT_GRADIENT : SERVICE_GRADIENT;
  const accent = type === 'product' ? PRODUCT_ACCENT : SERVICE_ACCENT;
  const icon = type === 'product' ? 'cube' : 'construct';
  const tagText = type === 'product' ? 'PRODUCT' : 'SERVICE';

  useEffect(() => {
    // Phase 1: Container fade in (0-400ms)
    containerOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.exp) });
    containerScale.value = withSpring(1, { damping: 12, stiffness: 100 });

    // Phase 2: Ring expand + fade in (200ms delay)
    setTimeout(() => {
      ringScale.value = withSpring(1, { damping: 10, stiffness: 80 });
      ringOpacity.value = withTiming(0.4, { duration: 500 });
    }, 200);

    // Phase 3: Logo zoom in with rotation (400ms delay)
    setTimeout(() => {
      logoScale.value = withSpring(1, { damping: 8, stiffness: 100 });
      logoRotate.value = withSpring(360, { damping: 10, stiffness: 90 });
      
      // Glow effect
      glowOpacity.value = withTiming(0.6, { duration: 600 });
      glowScale.value = withSpring(1, { damping: 10 });
    }, 400);

    // Phase 4: Logo pulse effect (continuous subtle heartbeat) (800ms delay)
    setTimeout(() => {
      logoPulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }, 800);

    // Phase 5: Company name slides up (700ms delay)
    setTimeout(() => {
      nameOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
      nameTranslateY.value = withSpring(0, { damping: 12, stiffness: 90 });
    }, 700);

    // Phase 6: Tag appears (1100ms delay)
    setTimeout(() => {
      tagOpacity.value = withTiming(1, { duration: 500 });
      tagTranslateY.value = withSpring(0, { damping: 10, stiffness: 90 });
    }, 1100);

    // Phase 7: Shimmer effect (1300ms delay)
    setTimeout(() => {
      shimmerOpacity.value = withTiming(1, { duration: 400 });
    }, 1300);

    // Phase 8: Exit animation
    const exitTimer = setTimeout(() => {
      exitOpacity.value = withTiming(0, { duration: 500, easing: Easing.in(Easing.exp) });
      exitScale.value = withTiming(1.1, { duration: 500, easing: Easing.in(Easing.exp) }, () => {
        runOnJS(onFinish)();
      });
    }, duration - 500);

    return () => clearTimeout(exitTimer);
  }, []);

  // Animated Styles
  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value * exitOpacity.value,
    transform: [
      { scale: containerScale.value * exitScale.value }
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const logoContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value * logoPulse.value },
      { rotate: `${logoRotate.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const nameStyle = useAnimatedStyle(() => ({
    opacity: nameOpacity.value,
    transform: [{ translateY: nameTranslateY.value }],
  }));

  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOpacity.value,
    transform: [{ translateY: tagTranslateY.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative circles with premium glow */}
        <View style={[styles.decorCircle, styles.decorCircle1, { borderColor: accent + '15' }]} />
        <View style={[styles.decorCircle, styles.decorCircle2, { borderColor: accent + '10' }]} />
        <View style={[styles.decorCircle, styles.decorCircle3, { borderColor: accent + '08' }]} />

        <View style={styles.content}>
          {/* Outer ring animation */}
          <Animated.View
            style={[
              styles.outerRing,
              { borderColor: accent + '40' },
              ringStyle,
            ]}
          />

          {/* Glow effect behind logo */}
          <Animated.View
            style={[
              styles.glowContainer,
              {
                shadowColor: accent,
                shadowOpacity: 0.8,
                shadowRadius: 40,
                shadowOffset: { width: 0, height: 0 },
              },
              glowStyle,
            ]}
          >
            <View style={[styles.glowInner, { backgroundColor: accent + '30' }]} />
          </Animated.View>

          {/* Logo container with premium animations */}
          <Animated.View style={[styles.logoContainer, logoContainerStyle]}>
            <LinearGradient
              colors={[accent + '50', accent + '20']}
              style={styles.logoGlow}
            >
              <View style={[styles.logoInner, { backgroundColor: accent + '25', borderColor: accent + '40' }]}>
                {companyLogo ? (
                  <Image
                    source={{ uri: companyLogo }}
                    style={styles.logoImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name={icon as any} size={56} color={accent} />
                )}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Company name with premium styling */}
          <Animated.View style={[styles.nameContainer, nameStyle]}>
            <Text style={[styles.companyName, { color: '#FFFFFF' }]} numberOfLines={2}>
              {companyName}
            </Text>
            <LinearGradient
              colors={[accent + '00', accent, accent + '00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.underline}
            />
          </Animated.View>

          {/* Type tag with premium border */}
          <Animated.View
            style={[
              styles.tagContainer,
              {
                borderColor: accent + '50',
                backgroundColor: accent + '15',
              },
              tagStyle,
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

        {/* Bottom shimmer with premium effect */}
        <Animated.View style={[styles.bottomShimmer, shimmerStyle]}>
          <View style={[styles.shimmerDot, { backgroundColor: accent }]} />
          <LinearGradient
            colors={[accent + '00', accent + '80', accent + '00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shimmerLine}
          />
          <View style={[styles.shimmerDot, { backgroundColor: accent }]} />
        </Animated.View>

        {/* Subtle grain texture overlay for premium feel */}
        <View style={styles.grainOverlay} />
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
    borderWidth: 1.5,
    borderRadius: 9999,
  },
  decorCircle1: {
    width: width * 1.3,
    height: width * 1.3,
    top: -width * 0.4,
    right: -width * 0.4,
  },
  decorCircle2: {
    width: width * 0.9,
    height: width * 0.9,
    bottom: -width * 0.3,
    left: -width * 0.3,
  },
  decorCircle3: {
    width: width * 0.6,
    height: width * 0.6,
    top: height * 0.1,
    left: -width * 0.2,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2.5,
  },
  glowContainer: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 20,
  },
  glowInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    zIndex: 10,
  },
  logoGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 15,
  },
  logoInner: {
    width: 115,
    height: 115,
    borderRadius: 57.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  nameContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  companyName: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  underline: {
    width: 60,
    height: 4,
    borderRadius: 2,
    marginTop: 14,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2.5,
  },
  bottomShimmer: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shimmerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  shimmerLine: {
    width: 50,
    height: 2,
  },
  grainOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    opacity: 0.5,
  },
});
