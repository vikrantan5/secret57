import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useSellerStore } from '../src/store/sellerStore';
import { colors, spacing, typography } from '../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuthStore();
  const { fetchSellerProfile, seller } = useSellerStore();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const particleXAnim = useRef(new Animated.Value(0)).current;
  const particleYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsing glow animation (using native driver compatible properties)
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Particle animations using interpolate instead of direct transform
    const particleAnimation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(particleXAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(particleXAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(particleYAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(particleYAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    
    particleAnimation.start();

    const checkUserStatus = async () => {
      if (!loading && isAuthenticated && user) {
        if (user.role === 'seller') {
          await fetchSellerProfile(user.id);
        }

        setTimeout(() => {
          if (user.role === 'admin') {
            router.replace('/admin/dashboard');
          } else if (user.role === 'seller') {
            if (!seller) {
              router.replace('/seller/company-setup');
            } else if (seller.status === 'pending' || seller.status === 'rejected') {
              router.replace('/seller/pending-approval');
            } else if (seller.status === 'approved') {
              router.replace('/seller/dashboard');
            }
          } else {
            router.replace('/(tabs)/home');
          }
        }, 2000);
      } else if (!loading && !isAuthenticated) {
        setTimeout(() => {
          router.replace('/auth/role-selection');
        }, 2000);
      }
    };

    checkUserStatus();
    
    // Cleanup animations on unmount
    return () => {
      particleAnimation.stop();
    };
  }, [loading, isAuthenticated, user, seller]);

  const glowIntensity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  // Create particle transform interpolations
  const particle1X = particleXAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 20],
  });
  
  const particle1Y = particleYAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 20],
  });

  return (
    <>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200&h=2400&fit=crop' }}
          style={styles.backgroundImage}
          blurRadius={30}
        >
          {/* Premium Gradient Overlay */}
          <LinearGradient
            colors={[
              'rgba(79, 70, 229, 0.95)',   // Indigo
              'rgba(139, 92, 246, 0.92)',  // Violet
              'rgba(236, 72, 153, 0.88)',  // Pink
              'rgba(59, 130, 246, 0.95)',  // Blue
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Animated Particle Effect */}
            <View style={styles.particleContainer}>
              <Animated.View
                style={[
                  styles.particle,
                  {
                    opacity: glowIntensity,
                    transform: [
                      { translateX: particle1X },
                      { translateY: particle1Y },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.particle,
                  styles.particle2,
                  {
                    opacity: glowIntensity,
                    transform: [
                      { translateX: Animated.multiply(particle1X, -0.5) },
                      { translateY: Animated.multiply(particle1Y, 0.7) },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.particle,
                  styles.particle3,
                  {
                    opacity: glowIntensity,
                    transform: [
                      { translateX: Animated.multiply(particle1X, 0.8) },
                      { translateY: Animated.multiply(particle1Y, -0.6) },
                    ],
                  },
                ]}
              />
            </View>

            <View style={styles.content}>
              {/* Animated Glow Ring */}
              <Animated.View
                style={[
                  styles.glowRing,
                  {
                    opacity: glowIntensity,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              />

              {/* Logo Container with Animation */}
              <Animated.View
                style={[
                  styles.logoContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                  style={styles.logoGlow}
                >
                  <Text style={styles.logo}>🛍️</Text>
                </LinearGradient>
              </Animated.View>

              {/* Title Animation */}
              <Animated.View
                style={[
                  styles.titleContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#E0E7FF', '#F3E8FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.titleGradient}
                >
                  <Text style={styles.title}>ServiceHub</Text>
                </LinearGradient>

                <View style={styles.underlineContainer}>
                  <View style={styles.underline} />
                  <View style={[styles.underline, styles.underlineShort]} />
                </View>
              </Animated.View>

              {/* Subtitle Animation */}
              <Animated.Text
                style={[
                  styles.subtitle,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                Premium Marketplace & Services
              </Animated.Text>

              {/* Animated Loader */}
              <Animated.View
                style={[
                  styles.loaderContainer,
                  {
                    opacity: fadeAnim,
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                  style={styles.loaderGradient}
                >
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>

              {/* Tagline Animation */}
              <Animated.View
                style={[
                  styles.taglineContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <Text style={styles.tagline}>✨ Your one-stop solution for everything ✨</Text>
                <View style={styles.decorativeLine}>
                  <View style={styles.dot} />
                  <View style={styles.line} />
                  <View style={styles.dot} />
                </View>
              </Animated.View>
            </View>

            {/* Footer Animation */}
            <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
              <Text style={styles.footerText}>© 2024 ServiceHub • All rights reserved</Text>
            </Animated.View>
          </LinearGradient>
        </ImageBackground>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleContainer: {
    position: 'absolute',
    width: width,
    height: height,
  },
  particle: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.6)',
    top: '20%',
    left: '15%',
  },
  particle2: {
    top: '60%',
    left: '75%',
  },
  particle3: {
    top: '40%',
    left: '85%',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  glowRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  logo: {
    fontSize: 70,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleGradient: {
    paddingHorizontal: spacing.sm,
  },
  title: {
    ...typography.h1,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  underlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  underline: {
    width: 40,
    height: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    marginHorizontal: 4,
  },
  underlineShort: {
    width: 20,
  },
  subtitle: {
    ...typography.bodyLarge,
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.95,
    marginBottom: spacing.xl,
    letterSpacing: 0.8,
    fontWeight: '500',
    textAlign: 'center',
  },
  loaderContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  loaderGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taglineContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  tagline: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    opacity: 0.85,
    textAlign: 'center',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  decorativeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 6,
    opacity: 0.6,
  },
  line: {
    width: 40,
    height: 1,
    backgroundColor: '#FFFFFF',
    opacity: 0.4,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: '#FFFFFF',
    opacity: 0.6,
    fontSize: 11,
    letterSpacing: 0.5,
  },
});