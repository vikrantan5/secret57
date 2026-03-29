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
      
      // First, get pending sellers from sellers table
      const { data: sellersData, error: sellersError } = await supabase
        .from('sellers')
        .select(`
          *,
          user:users(*),
          category:categories(id, name, slug, type, icon)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (sellersError) {
        console.error('Error loading pending sellers:', sellersError);
        throw sellersError;
      }
      
      // Also get users who registered as sellers but haven't completed company setup
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'seller')
        .eq('seller_status', 'pending')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error loading pending users:', usersError);
      }

      // Filter out users who already have a seller profile
      const sellerUserIds = new Set((sellersData || []).map(s => s.user_id));
      const usersWithoutSellerProfile = (usersData || []).filter(
        user => !sellerUserIds.has(user.id)
      );

      // Combine both lists
      const combinedPending = [
        ...(sellersData || []),
        ...usersWithoutSellerProfile.map(user => ({
          id: user.id,
          user_id: user.id,
          company_name: user.name + ' (Setup Incomplete)',
          status: 'pending',
          city: 'N/A',
          state: 'N/A',
          created_at: user.created_at,
          user: user,
          category: null,
          isIncomplete: true
        }))
      ];
      
      console.log('Pending sellers loaded:', sellersData?.length || 0);
      console.log('Pending users (no profile):', usersWithoutSellerProfile.length);
      console.log('Total pending:', combinedPending.length);
      
      setSellers(combinedPending);
    } catch (error: any) {
      console.error('Error loading pending sellers:', error);
      Alert.alert('Error', error.message || 'Failed to load pending sellers');
    } finally {
      setLoading(false);
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await loadPendingSellers();
    setRefreshing(false);
  };

  const handleApprove = async (sellerId: string, companyName: string, seller: any) => {
    Alert.alert(
      'Approve Seller',
      `Approve ${companyName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              // If seller hasn't completed company setup
              if (seller.isIncomplete) {
                // Update user's seller_status
                const { error: userError } = await supabase
                  .from('users')
                  .update({ seller_status: 'approved' })
                  .eq('id', sellerId);

                if (userError) throw userError;
              } else {
                // Normal seller approval
                const { error } = await supabase
                  .from('sellers')
                  .update({ status: 'approved' })
                  .eq('id', sellerId);

                if (error) throw error;

                // Also update user's seller_status
                const { error: userError } = await supabase
                  .from('users')
                  .update({ seller_status: 'approved' })
                  .eq('id', seller.user_id);

                if (userError) console.error('Error updating user status:', userError);
              }
              
              Alert.alert('Success', 'Seller approved successfully');
              loadPendingSellers();
            } catch (error) {
              console.error('Approval error:', error);
              Alert.alert('Error', 'Failed to approve seller');
            }
          },
        },
      ]
    );
  };

   const handleReject = async (sellerId: string, companyName: string, seller: any) => {
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
              // If seller hasn't completed company setup
              if (seller.isIncomplete) {
                // Update user's seller_status
                const { error: userError } = await supabase
                  .from('users')
                  .update({ 
                    seller_status: 'rejected'
                  })
                  .eq('id', sellerId);

                if (userError) throw userError;
              } else {
                // Normal seller rejection
                const { error } = await supabase
                  .from('sellers')
                  .update({ 
                    status: 'rejected',
                    rejection_reason: reason || 'Not specified'
                  })
                  .eq('id', sellerId);

                if (error) throw error;

                // Also update user's seller_status
                const { error: userError } = await supabase
                  .from('users')
                  .update({ seller_status: 'rejected' })
                  .eq('id', seller.user_id);

                if (userError) console.error('Error updating user status:', userError);
              }
              
              Alert.alert('Success', 'Seller rejected');
              loadPendingSellers();
            } catch (error) {
              console.error('Rejection error:', error);
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
                {seller.isIncomplete && (
                  <View style={[styles.incompleteBadge]}>
                    <Ionicons name="alert-circle" size={16} color={colors.warning} />
                    <Text style={styles.incompleteText}>Company Setup Incomplete</Text>
                  </View>
                )}
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
                {!seller.isIncomplete && (
                  <>
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.infoText}>{seller.city}, {seller.state}</Text>
                    </View>
                    {seller.description && (
                      <Text style={styles.description} numberOfLines={2}>
                        {seller.description}
                      </Text>
                    )}
                  </>
                )}
                <Text style={styles.dateText}>
                  Applied: {new Date(seller.created_at).toLocaleDateString()}
                </Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(seller.id, seller.company_name, seller)}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.white} />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(seller.id, seller.company_name, seller)}
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
   incompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.xs / 2,
  },
  incompleteText: {
    ...typography.caption,
    color: '#F59E0B',
    fontWeight: '600',
  },
});