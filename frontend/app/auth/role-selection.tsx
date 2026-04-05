import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RoleCard } from '../../src/components/cards/RoleCard';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function RoleSelectionScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section with Animated Gradient */}
          <View style={styles.headerSection}>
            <LinearGradient
              colors={['rgba(99, 102, 241, 0.3)', 'rgba(139, 92, 246, 0.15)', 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.headerGradient}
            >
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.logoGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="cube" size={40} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Welcome to{' '}
                <Text style={styles.highlightText}>ServiceHub</Text>
              </Text>
              <Text style={styles.subtitle}>
                Choose how you want to continue
              </Text>
            </LinearGradient>
          </View>

          {/* Role Cards */}
          <View style={styles.cardsContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('/auth/login?role=customer')}
            >
              <LinearGradient
                colors={['#1e1e1e', '#161616']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.roleCard, shadows.lg]}
              >
                <LinearGradient
                  colors={['#60A5FA', '#3B82F6']}
                  style={styles.roleIconBox}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="cart" size={32} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleTitle}>Customer</Text>
                  <Text style={styles.roleDescription}>
                    Browse products and book services from trusted vendors
                  </Text>
                </View>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.arrowContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="arrow-forward" size={20} color="#a78bfa" />
                </LinearGradient>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('/auth/login?role=seller')}
            >
              <LinearGradient
                colors={['#1e1e1e', '#161616']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.roleCard, shadows.lg]}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  style={styles.roleIconBox}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="storefront" size={32} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleTitle}>Seller</Text>
                  <Text style={styles.roleDescription}>
                    Sell your products or offer your services to customers
                  </Text>
                </View>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.arrowContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="arrow-forward" size={20} color="#a78bfa" />
                </LinearGradient>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Features Section */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>Why choose us?</Text>
            <View style={styles.featuresGrid}>
              <LinearGradient
                colors={['#1e1e1e', '#161616']}
                style={styles.featureCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <LinearGradient
                  colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.15)']}
                  style={styles.featureIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="shield-checkmark" size={24} color="#a78bfa" />
                </LinearGradient>
                <Text style={styles.featureText}>Secure Platform</Text>
              </LinearGradient>
              
              <LinearGradient
                colors={['#1e1e1e', '#161616']}
                style={styles.featureCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <LinearGradient
                  colors={['rgba(16, 185, 129, 0.15)', 'rgba(5, 150, 105, 0.15)']}
                  style={styles.featureIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="flash" size={24} color="#10b981" />
                </LinearGradient>
                <Text style={styles.featureText}>Fast Service</Text>
              </LinearGradient>
              
              <LinearGradient
                colors={['#1e1e1e', '#161616']}
                style={styles.featureCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <LinearGradient
                  colors={['rgba(245, 158, 11, 0.15)', 'rgba(217, 119, 6, 0.15)']}
                  style={styles.featureIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="star" size={24} color="#f59e0b" />
                </LinearGradient>
                <Text style={styles.featureText}>Top Rated</Text>
              </LinearGradient>
              
              <LinearGradient
                colors={['#1e1e1e', '#161616']}
                style={styles.featureCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <LinearGradient
                  colors={['rgba(6, 182, 212, 0.15)', 'rgba(8, 145, 178, 0.15)']}
                  style={styles.featureIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="people" size={24} color="#06b6d4" />
                </LinearGradient>
                <Text style={styles.featureText}>24/7 Support</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footerSection}>
            <Text style={styles.footer}>
              By continuing, you agree to our Terms & Privacy Policy
            </Text>
            
            {/* Admin Login Button */}
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/auth/login?role=admin')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.15)']}
                style={styles.adminGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="shield-checkmark" size={18} color="#a78bfa" />
                <Text style={styles.adminButtonText}>Admin Login</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  headerSection: {
    marginBottom: spacing.xl,
    marginTop: spacing.xl,
  },
  headerGradient: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing.lg,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  highlightText: {
    color: '#a78bfa',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
  },
  cardsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  roleIconBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  arrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  featureCard: {
    width: '47%',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  footerSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  footer: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 16,
  },
  adminButton: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  adminGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  adminButtonText: {
    fontSize: 14,
    color: '#a78bfa',
    fontWeight: '600',
  },
});