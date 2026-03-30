import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RoleCard } from '../../src/components/cards/RoleCard';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function RoleSelectionScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section with Gradient Background */}
        <View style={styles.headerSection}>
          <LinearGradient
            colors={[colors.primaryVeryLight, 'rgba(184, 227, 233, 0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.headerGradient}
          >
            <Text style={styles.title}>Welcome to ServiceHub</Text>
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
              colors={['#60A5FA', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.roleCardGradient, shadows.lg]}
            >
              <View style={styles.roleIconBox}>
                <Ionicons name="cart" size={40} color={colors.white} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleTitle}>Customer</Text>
                <Text style={styles.roleDescription}>
                  Browse products and book services from trusted vendors
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/auth/login?role=seller')}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.roleCardGradient, shadows.lg]}
            >
              <View style={styles.roleIconBox}>
                <Ionicons name="storefront" size={40} color={colors.white} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleTitle}>Seller</Text>
                <Text style={styles.roleDescription}>
                  Sell your products or offer your services to customers
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Why choose us?</Text>
          <View style={styles.featuresGrid}>
            <View style={[styles.featureCard, shadows.sm]}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
              </View>
              <Text style={styles.featureText}>Secure Platform</Text>
            </View>
            <View style={[styles.featureCard, shadows.sm]}>
              <View style={[styles.featureIcon, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="flash" size={24} color={colors.success} />
              </View>
              <Text style={styles.featureText}>Fast Service</Text>
            </View>
            <View style={[styles.featureCard, shadows.sm]}>
              <View style={[styles.featureIcon, { backgroundColor: colors.warning + '15' }]}>
                <Ionicons name="star" size={24} color={colors.warning} />
              </View>
              <Text style={styles.featureText}>Top Rated</Text>
            </View>
            <View style={[styles.featureCard, shadows.sm]}>
              <View style={[styles.featureIcon, { backgroundColor: colors.info + '15' }]}>
                <Ionicons name="people" size={24} color={colors.info} />
              </View>
              <Text style={styles.featureText}>24/7 Support</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerSection}>
          <Text style={styles.footer}>
            By continuing, you agree to our Terms & Privacy Policy
          </Text>
          
          {/* Admin Login Button */}
          <TouchableOpacity
            style={[styles.adminButton, shadows.sm]}
            onPress={() => router.push('/auth/login?role=admin')}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-checkmark" size={18} color={colors.primaryDark} />
            <Text style={styles.adminButtonText}>Admin Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  headerSection: {
    marginBottom: spacing.xl,
  },
  headerGradient: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cardsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  roleCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  roleIconBox: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  roleDescription: {
    ...typography.bodySmall,
    color: colors.white,
    opacity: 0.95,
  },
  featuresSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  featuresTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '600',
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
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
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  footer: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primaryDark + '20',
    gap: spacing.xs,
  },
  adminButtonText: {
    ...typography.body,
    color: colors.primaryDark,
    fontWeight: '600',
  },
});
