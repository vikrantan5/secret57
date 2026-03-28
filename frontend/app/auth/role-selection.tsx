import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RoleCard } from '../../src/components/cards/RoleCard';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function RoleSelectionScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to ServiceHub</Text>
          <Text style={styles.subtitle}>
            Choose how you want to continue
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          <RoleCard
            title="Customer"
            description="Browse products and book services from trusted vendors"
            icon="cart"
            color={colors.customer}
            onPress={() => router.push('/auth/login?role=customer')}
          />

          <RoleCard
            title="Seller"
            description="Sell your products or offer your services to customers"
            icon="storefront"
            color={colors.seller}
            onPress={() => router.push('/auth/login?role=seller')}
          />
        </View>

        <Text style={styles.footer}>
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
         {/* Admin Login Button */}
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => router.push('/auth/login?role=admin')}
        >
          <Ionicons name="shield-checkmark" size={16} color={colors.admin} />
          <Text style={styles.adminButtonText}>Admin Login</Text>
        </TouchableOpacity>
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
    padding: spacing.lg,
  },
  header: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  footer: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xl,
      marginBottom: spacing.md,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.admin + '10',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.admin + '30',
  },
  adminButtonText: {
    ...typography.bodySmall,
    color: colors.admin,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
});
