import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function SellerDashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { seller } = useSellerStore();

  const dashboardItems = [
    {
      id: '1',
      title: 'Products',
      icon: 'cube' as const,
      count: '0',
      color: colors.primary,
      route: '/seller/products',
    },
    {
      id: '2',
      title: 'Orders',
      icon: 'receipt' as const,
      count: '0',
      color: colors.success,
      route: '/seller/orders',
    },
    {
      id: '3',
      title: 'Bookings',
      icon: 'calendar' as const,
      count: '0',
      color: colors.warning,
      route: '/seller/bookings',
    },
    {
      id: '4',
      title: 'Revenue',
      icon: 'trending-up' as const,
      count: '₹0',
      color: colors.secondary,
      route: '/seller/revenue',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.companyName}>{seller?.company_name || 'Seller'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          {dashboardItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.statCard, shadows.md]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.statCount}>{item.count}</Text>
              <Text style={styles.statTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={() => router.push('/seller/add-product' as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Add New Product</Text>
              <Text style={styles.actionSubtitle}>List a new product for sale</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, shadows.sm]}
            onPress={() => router.push('/seller/add-service' as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="briefcase" size={28} color={colors.success} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Add New Service</Text>
              <Text style={styles.actionSubtitle}>Create a new service offering</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Placeholder for Phase 5+ */}
        <View style={styles.comingSoonCard}>
          <Ionicons name="construct" size={48} color={colors.textSecondary} />
          <Text style={styles.comingSoonTitle}>More features coming soon!</Text>
          <Text style={styles.comingSoonText}>
            Product management, order tracking, analytics, and more will be available in the next phase.
          </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  greeting: {
    ...typography.body,
    color: colors.textSecondary,
  },
  companyName: {
    ...typography.h3,
    color: colors.text,
  },
  profileButton: {
    padding: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    backgroundColor: colors.surface,
    width: '47%',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  statCount: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statTitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  actionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  comingSoonCard: {
    margin: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  comingSoonTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  comingSoonText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});