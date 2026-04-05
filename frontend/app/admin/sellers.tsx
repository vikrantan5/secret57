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
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { supabase } from '../../src/services/supabase';

export default function AllSellersScreen() {
  const router = useRouter();
  const [sellers, setSellers] = useState<any[]>([]);
  const [filteredSellers, setFilteredSellers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');

  useEffect(() => {
    loadSellers();
  }, []);

  useEffect(() => {
    filterSellers();
  }, [searchQuery, selectedFilter, sellers]);

  const loadSellers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sellers')
        .select(`
          *,
          user:users(*),
          category:categories(id, name, slug, type, icon)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSellers(data || []);
    } catch (error) {
      console.error('Error loading sellers:', error);
      Alert.alert('Error', 'Failed to load sellers');
    } finally {
      setLoading(false);
    }
  };

  const filterSellers = () => {
    let filtered = sellers;

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(seller => seller.status === selectedFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(seller =>
        seller.company_name?.toLowerCase().includes(query) ||
        seller.city?.toLowerCase().includes(query) ||
        seller.user?.name?.toLowerCase().includes(query)
      );
    }

    setFilteredSellers(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSellers();
    setRefreshing(false);
  };

  const handleStatusChange = async (sellerId: string, newStatus: 'approved' | 'rejected') => {
    Alert.alert(
      `${newStatus === 'approved' ? 'Approve' : 'Reject'} Seller`,
      `Are you sure you want to ${newStatus === 'approved' ? 'approve' : 'reject'} this seller?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus === 'approved' ? 'Approve' : 'Reject',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('sellers')
                .update({ status: newStatus })
                .eq('id', sellerId);

              if (error) throw error;
              Alert.alert('Success', `Seller ${newStatus} successfully`);
              loadSellers();
            } catch (error) {
              Alert.alert('Error', `Failed to ${newStatus} seller`);
            }
          },
        },
      ]
    );
  };



    const handleBlockSeller = async (sellerId: string, isBlocked: boolean) => {
    Alert.prompt(
      isBlocked ? 'Unblock Seller' : 'Block Seller',
      isBlocked 
        ? 'Unblocking will allow the seller to login and their listings will be visible again.' 
        : 'Please provide a reason for blocking this seller:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBlocked ? 'Unblock' : 'Block',
          onPress: async (reason?: string) => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              
              const updates: any = {
                is_blocked: !isBlocked,
                updated_at: new Date().toISOString()
              };

              if (!isBlocked && reason) {
                updates.block_reason = reason;
                updates.blocked_at = new Date().toISOString();
                updates.blocked_by = user?.id;
              } else if (isBlocked) {
                updates.block_reason = null;
                updates.blocked_at = null;
                updates.blocked_by = null;
              }

              const { error } = await supabase
                .from('sellers')
                .update(updates)
                .eq('id', sellerId);

              if (error) throw error;
              
              Alert.alert('Success', `Seller ${isBlocked ? 'unblocked' : 'blocked'} successfully`);
              loadSellers();
            } catch (error: any) {
              console.error('Block/Unblock error:', error);
              Alert.alert('Error', error.message || `Failed to ${isBlocked ? 'unblock' : 'block'} seller`);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return colors.success;
      case 'pending': return colors.warning;
      case 'rejected': return colors.error;
      default: return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>All Sellers</Text>
        <TouchableOpacity onPress={loadSellers}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by company, city, or owner"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {['all', 'approved', 'pending', 'rejected'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              selectedFilter === filter && styles.filterTabActive
            ]}
            onPress={() => setSelectedFilter(filter as any)}
          >
            <Text style={[
              styles.filterTabText,
              selectedFilter === filter && styles.filterTabTextActive
            ]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{filteredSellers.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {sellers.filter(s => s.status === 'approved').length}
          </Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {sellers.filter(s => s.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredSellers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={80} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No sellers found</Text>
          </View>
        ) : (
          <View style={styles.sellerList}>
            {filteredSellers.map((seller) => (
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
                      {seller.category.name}
                    </Text>
                  </View>
                )}

                <View style={styles.badgeContainer}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(seller.status) + '15' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(seller.status) }
                    ]}>
                      {seller.status.toUpperCase()}
                    </Text>
                  </View>
                  
                  {seller.is_blocked && (
                    <View style={[styles.statusBadge, { backgroundColor: colors.error + '15' }]}>
                      <Ionicons name="ban" size={12} color={colors.error} />
                      <Text style={[styles.statusText, { color: colors.error, marginLeft: 4 }]}>
                        BLOCKED
                      </Text>
                    </View>
                  )}
                </View>

                {seller.is_blocked && seller.block_reason && (
                  <View style={styles.blockReasonContainer}>
                    <Ionicons name="information-circle" size={16} color={colors.error} />
                    <Text style={styles.blockReasonText}>
                      Blocked: {seller.block_reason}
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
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{seller.phone}</Text>
                </View>

                {seller.status === 'pending' && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleStatusChange(seller.id, 'rejected')}
                    >
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleStatusChange(seller.id, 'approved')}
                    >
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
                   {seller.status === 'approved' && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionButton, seller.is_blocked ? styles.approveButton : styles.blockButton]}
                      onPress={() => handleBlockSeller(seller.id, seller.is_blocked)}
                      data-testid={seller.is_blocked ? "unblock-seller-button" : "block-seller-button"}
                    >
                      <Ionicons 
                        name={seller.is_blocked ? "checkmark-circle-outline" : "ban-outline"} 
                        size={18} 
                        color={colors.white} 
                      />
                      <Text style={styles.actionButtonText}>
                        {seller.is_blocked ? 'Unblock Seller' : 'Block Seller'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
filterTab: {
  height: 50,             // 🔥 FIX
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 20,
  borderRadius: 12,
  marginRight: 10,
  backgroundColor: colors.surface,
},
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: colors.white,
  },
statsContainer: {
  flexDirection: 'row',
  paddingHorizontal: spacing.lg,
  marginBottom: spacing.md,
  gap: spacing.sm,

  
},
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  blockReasonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.error + '10',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  blockReasonText: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
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
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  blockButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
});