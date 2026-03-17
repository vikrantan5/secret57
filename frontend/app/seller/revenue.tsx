import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSellerStore } from '../../src/store/sellerStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

export default function SellerRevenueScreen() {
  const router = useRouter();
  const { seller } = useSellerStore();

  // Mock data for now - will be replaced with real data in later phases
  const revenueData = {
    today: 0,
    week: 0,
    month: 0,
    total: 0,
  };

  const recentTransactions = [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Revenue</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Revenue Summary */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, shadows.md]}>
            <Text style={styles.summaryLabel}>Today</Text>
            <Text style={styles.summaryValue}>₹{revenueData.today}</Text>
          </View>
          <View style={[styles.summaryCard, shadows.md]}>
            <Text style={styles.summaryLabel}>This Week</Text>
            <Text style={styles.summaryValue}>₹{revenueData.week}</Text>
          </View>
          <View style={[styles.summaryCard, shadows.md]}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryValue}>₹{revenueData.month}</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardPrimary, shadows.md]}>
            <Text style={[styles.summaryLabel, styles.summaryLabelWhite]}>Total Revenue</Text>
            <Text style={[styles.summaryValue, styles.summaryValueWhite]}>₹{revenueData.total}</Text>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={60} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>
                Your sales transactions will appear here
              </Text>
            </View>
          ) : (
            <View>
              {recentTransactions.map((transaction: any, index: number) => (
                <View key={index} style={[styles.transactionCard, shadows.sm]}>
                  <View style={styles.transactionIcon}>
                    <Ionicons name="cash" size={24} color={colors.success} />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle}>{transaction.description}</Text>
                    <Text style={styles.transactionDate}>{transaction.date}</Text>
                  </View>
                  <Text style={styles.transactionAmount}>₹{transaction.amount}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Coming Soon Features */}
        <View style={styles.comingSoonCard}>
          <Ionicons name="analytics" size={48} color={colors.textSecondary} />
          <Text style={styles.comingSoonTitle}>Advanced Analytics Coming Soon!</Text>
          <Text style={styles.comingSoonText}>
            Detailed revenue charts, payment breakdowns, and financial reports will be available in the next phase.
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  summaryContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  summaryCardPrimary: {
    backgroundColor: colors.primary,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryLabelWhite: {
    color: colors.white,
    opacity: 0.9,
  },
  summaryValue: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  summaryValueWhite: {
    color: colors.white,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  transactionDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  transactionAmount: {
    ...typography.h4,
    color: colors.success,
    fontWeight: '700',
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