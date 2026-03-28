import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { supabase } from '../../src/services/supabase';

export default function PendingSellersScreen() {
  const router = useRouter();
  const [sellers, setSellers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPendingSellers();
  }, []);

  const loadPendingSellers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sellers')
         .select(`
          *,
          user:users(*),
          category:categories(id, name, slug, type, icon)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error('Error loading pending sellers:', error);
      Alert.alert('Error', 'Failed to load pending sellers');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPendingSellers();
    setRefreshing(false);
  };

  const handleApprove = async (sellerId: string, companyName: string) => {
    Alert.alert(
      'Approve Seller',
      `Approve ${companyName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('sellers')
                .update({ status: 'approved' })
                .eq('id', sellerId);

              if (error) throw error;
              Alert.alert('Success', 'Seller approved successfully');
              loadPendingSellers();
            } catch (error) {
              Alert.alert('Error', 'Failed to approve seller');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (sellerId: string, companyName: string) => {
    Alert.prompt(
      'Reject Seller',
      `Provide reason for rejecting ${companyName}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            try {
              const { error } = await supabase
                .from('sellers')
                .update({ 
                  status: 'rejected',
                  rejection_reason: reason || 'Not specified'
                })
                .eq('id', sellerId);

              if (error) throw error;
              Alert.alert('Success', 'Seller rejected');
              loadPendingSellers();
            } catch (error) {
              Alert.alert('Error', 'Failed to reject seller');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Pending Sellers</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {sellers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={80} color={colors.success} />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>No pending seller approvals</Text>
          </View>
        ) : (
          <View style={styles.sellerList}>
            {sellers.map((seller) => (
              <View key={seller.id} style={[styles.sellerCard, shadows.sm]}>
                {seller.company_logo && (
                  <Image source={{ uri: seller.company_logo }} style={styles.logo} />
                )}
                <Text style={styles.companyName}>{seller.company_name}</Text>
                  {seller.category && (
                  <View style={[styles.categoryBadge, { 
                    backgroundColor: seller.category.type === 'booking' ? '#F59E0B20' : 
                                     seller.category.type === 'ecommerce' ? '#10B98120' : '#8B5CF620' 
                  }]}>
                    <Ionicons 
                      name={seller.category.icon as any} 
                      size={14} 
                      color={seller.category.type === 'booking' ? '#F59E0B' : 
                             seller.category.type === 'ecommerce' ? '#10B981' : '#8B5CF6'} 
                    />
                    <Text style={[styles.categoryText, { 
                      color: seller.category.type === 'booking' ? '#F59E0B' : 
                             seller.category.type === 'ecommerce' ? '#10B981' : '#8B5CF6' 
                    }]}>
                      {seller.category.name} • {seller.category.type}
                    </Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{seller.user?.name || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{seller.city}, {seller.state}</Text>
                </View>
                {seller.description && (
                  <Text style={styles.description} numberOfLines={2}>
                    {seller.description}
                  </Text>
                )}
                <Text style={styles.dateText}>
                  Applied: {new Date(seller.created_at).toLocaleDateString()}
                </Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(seller.id, seller.company_name)}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.white} />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(seller.id, seller.company_name)}
                  >
                    <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  sellerList: {
    padding: spacing.lg,
  },
  sellerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.border,
  },
  companyName: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
    gap: spacing.xs / 2,
    marginBottom: spacing.sm,
  },
  categoryText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  description: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  dateText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
});