import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  ImageBackground,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Particle animations
  const particle1X = useRef(new Animated.Value(0)).current;
  const particle1Y = useRef(new Animated.Value(0)).current;
  const particle2X = useRef(new Animated.Value(0)).current;
  const particle2Y = useRef(new Animated.Value(0)).current;
  const particle3X = useRef(new Animated.Value(0)).current;
  const particle3Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Main entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsing glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();

    // Particle floating animations
    const createParticleAnimation = (xAnim, yAnim) => {
      return Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(xAnim, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(xAnim, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(yAnim, {
              toValue: 1,
              duration: 4000,
              useNativeDriver: true,
            }),
            Animated.timing(yAnim, {
              toValue: 0,
              duration: 4000,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    const particle1Anim = createParticleAnimation(particle1X, particle1Y);
    const particle2Anim = createParticleAnimation(particle2X, particle2Y);
    const particle3Anim = createParticleAnimation(particle3X, particle3Y);

    particle1Anim.start();
    particle2Anim.start();
    particle3Anim.start();

    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

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
    
    return () => {
      particle1Anim.stop();
      particle2Anim.stop();
      particle3Anim.stop();
    };
  }, [loading, isAuthenticated, user, seller]);

  // Interpolations
  const glowIntensity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.9],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const particle1Transform = {
    transform: [
      { translateX: particle1X.interpolate({ inputRange: [0, 1], outputRange: [-25, 25] }) },
      { translateY: particle1Y.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] }) },
    ],
  };
  
  const particle2Transform = {
    transform: [
      { translateX: particle2X.interpolate({ inputRange: [0, 1], outputRange: [30, -30] }) },
      { translateY: particle2Y.interpolate({ inputRange: [0, 1], outputRange: [-15, 15] }) },
    ],
  };
  
  const particle3Transform = {
    transform: [
      { translateX: particle3X.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] }) },
      { translateY: particle3Y.interpolate({ inputRange: [0, 1], outputRange: [25, -25] }) },
    ],
  };

  return (
    <>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1653549893166-f8b256078b60?q=80&w=627&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
          style={styles.backgroundImage}
          blurRadius={20}
        >
          <LinearGradient
            colors={[
              'rgba(40, 37, 79, 0.95)',
              'rgba(32, 18, 63, 0.92)',
              'rgba(60, 30, 45, 0.88)',
              'rgba(2, 32, 79, 0.95)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.particleContainer}>
              <Animated.View style={[styles.particle, styles.particle1, particle1Transform, { opacity: glowIntensity }]} />
              <Animated.View style={[styles.particle, styles.particle2, particle2Transform, { opacity: glowIntensity * 0.7 }]} />
              <Animated.View style={[styles.particle, styles.particle3, particle3Transform, { opacity: glowIntensity * 0.5 }]} />
              <Animated.View style={[styles.particle, styles.particle4, particle2Transform, { opacity: glowIntensity * 0.6 }]} />
              <Animated.View style={[styles.particle, styles.particle5, particle3Transform, { opacity: glowIntensity * 0.4 }]} />
            </View>

            <View style={styles.content}>
              <Animated.View
                style={[
                  styles.glowRing,
                  {
                    opacity: glowIntensity,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              />

              <Animated.View
                style={[
                  styles.rotatingRing,
                  {
                    transform: [{ rotate }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0)']}
                  style={styles.rotatingRingGradient}
                />
              </Animated.View>

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
                  colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
                  style={styles.logoGlow}
                >
                  <View style={styles.logoInner}>
                    <Text style={styles.logo}>✨</Text>
                  </View>
                </LinearGradient>
              </Animated.View>

              <Animated.View
                style={[
                  styles.titleContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
              
                  <Text style={styles.title}>
                    Service
                    <Text style={styles.titleHub}>Hub</Text>
                    {/* <Text style={styles.titleDot}>®</Text> */}
                  </Text>
              

                <View style={styles.underlineContainer}>
                  <LinearGradient
                    colors={['#FF6B9D', '#C5E4FF', '#E0C3FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.underline}
                  />
                  <LinearGradient
                    colors={['#E0C3FF', '#FF6B9D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.underline, styles.underlineShort]}
                  />
                </View>
              </Animated.View>

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

              <Animated.View
                style={[
                  styles.loaderContainer,
                  {
                    opacity: fadeAnim,
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
                  style={styles.loaderGradient}
                >
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>

              <Animated.View
                style={[
                  styles.taglineContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <Text style={styles.tagline}>⚡ Your one-stop solution for everything ⚡</Text>
                <View style={styles.decorativeLine}>
                  <LinearGradient colors={['#FF6B9D', '#C5E4FF']} style={styles.smallLine} />
                  <View style={styles.dot} />
                  <LinearGradient colors={['#C5E4FF', '#E0C3FF']} style={styles.smallLine} />
                  <View style={styles.dot} />
                  <LinearGradient colors={['#E0C3FF', '#FF6B9D']} style={styles.smallLine} />
                </View>
              </Animated.View>
            </View>

            <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
              <Text style={styles.footerText}>© 2026 ServiceHub • Premium Experience</Text>
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
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  particle1: {
    top: '15%',
    left: '20%',
  },
  particle2: {
    top: '70%',
    left: '80%',
    width: 3,
    height: 3,
  },
  particle3: {
    top: '45%',
    left: '85%',
    width: 5,
    height: 5,
  },
  particle4: {
    top: '30%',
    left: '75%',
    width: 2,
    height: 2,
  },
  particle5: {
    top: '80%',
    left: '25%',
    width: 3,
    height: 3,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  rotatingRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
  },
  rotatingRingGradient: {
    width: '100%',
    height: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    zIndex: 1,
  },
  logoGlow: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 15,
  },
  logoInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 70,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
    zIndex: 1,
  },
  titleGradient: {
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
    color: '#FFFFFF',
  },
  titleHub: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
    color: '#FFFFFF',
    backgroundClip: 'text',
  },
  titleDot: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFD700',
  },
  underlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  underline: {
    width: 50,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 4,
  },
  underlineShort: {
    width: 30,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.95)',
    marginBottom: spacing.xl,
    letterSpacing: 1.5,
    fontWeight: '600',
    textAlign: 'center',
    zIndex: 1,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  loaderContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    zIndex: 1,
  },
  loaderGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  taglineContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
    zIndex: 1,
  },
  tagline: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  decorativeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD700',
    marginHorizontal: 8,
    opacity: 0.9,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  smallLine: {
    width: 40,
    height: 2,
    borderRadius: 1,
    opacity: 0.8,
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: '#FFFFFF',
    opacity: 0.7,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600',
  },
});