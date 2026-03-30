import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
      
      const { data: sellersData, error: sellersError } = await supabase
        .from('sellers')
        .select(`
          *,
          user:users(*),
          category:categories(id, name, slug, type, icon)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (sellersError) throw sellersError;
      
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'seller')
        .eq('seller_status', 'pending')
        .order('created_at', { ascending: false });

      if (usersError) console.error('Error loading pending users:', usersError);

      const sellerUserIds = new Set((sellersData || []).map(s => s.user_id));
      const usersWithoutSellerProfile = (usersData || []).filter(
        user => !sellerUserIds.has(user.id)
      );

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
              if (seller.isIncomplete) {
                const { error: userError } = await supabase
                  .from('users')
                  .update({ seller_status: 'approved' })
                  .eq('id', sellerId);
                if (userError) throw userError;
              } else {
                const { error } = await supabase
                  .from('sellers')
                  .update({ status: 'approved' })
                  .eq('id', sellerId);
                if (error) throw error;

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
              if (seller.isIncomplete) {
                const { error: userError } = await supabase
                  .from('users')
                  .update({ seller_status: 'rejected' })
                  .eq('id', sellerId);
                if (userError) throw userError;
              } else {
                const { error } = await supabase
                  .from('sellers')
                  .update({ 
                    status: 'rejected',
                    rejection_reason: reason || 'Not specified'
                  })
                  .eq('id', sellerId);
                if (error) throw error;

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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[colors.warning, '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Pending Approvals</Text>
            <Text style={styles.headerSubtitle}>{sellers.length} sellers awaiting review</Text>
          </View>
          <TouchableOpacity onPress={loadPendingSellers} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {sellers.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="checkmark-circle" size={60} color={colors.success} />
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>No pending seller approvals</Text>
          </View>
        ) : (
          <View style={styles.sellerList}>
            {sellers.map((seller) => (
              <View key={seller.id} style={[styles.sellerCard, shadows.md]}>
                {seller.isIncomplete && (
                  <View style={styles.incompleteBadge}>
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
                
                <View style={styles.infoSection}>
                  <View style={styles.infoRow}>
                    <Ionicons name="person" size={16} color={colors.primary} />
                    <Text style={styles.infoText}>{seller.user?.name || 'N/A'}</Text>
                  </View>
                  
                  {!seller.isIncomplete && (
                    <>
                      <View style={styles.infoRow}>
                        <Ionicons name="location" size={16} color={colors.primary} />
                        <Text style={styles.infoText}>{seller.city}, {seller.state}</Text>
                      </View>
                      {seller.description && (
                        <View style={styles.descriptionBox}>
                          <Text style={styles.description} numberOfLines={2}>
                            {seller.description}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                  
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar" size={14} color={colors.textLight} />
                    <Text style={styles.dateText}>
                      Applied: {new Date(seller.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton, shadows.sm]}
                    onPress={() => handleReject(seller.id, seller.company_name, seller)}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.white} />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton, shadows.sm]}
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
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.xs / 2,
  },
  refreshButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    marginTop: -spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyIconBox: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
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
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  incompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.xs / 2,
  },
  incompleteText: {
    ...typography.caption,
    color: '#F59E0B',
    fontWeight: '700',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.border,
    borderWidth: 3,
    borderColor: colors.primaryVeryLight,
  },
  companyName: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
    gap: spacing.xs / 2,
    marginBottom: spacing.md,
  },
  categoryText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  infoSection: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  descriptionBox: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.bodySmall,
    color: colors.text,
    lineHeight: 20,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  dateText: {
    ...typography.caption,
    color: colors.textLight,
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
    borderRadius: borderRadius.lg,
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
    fontWeight: '700',
  },
});