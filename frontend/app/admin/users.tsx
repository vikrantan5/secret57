import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { supabase } from '../../src/services/supabase';

export default function AllUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'customer' | 'seller' | 'admin'>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, selectedFilter, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(user => user.role === selectedFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return colors.admin;
      case 'seller': return colors.seller;
      case 'customer': return colors.customer;
      default: return colors.textSecondary;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return 'shield-checkmark';
      case 'seller': return 'storefront';
      case 'customer': return 'cart';
      default: return 'person';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>All Users</Text>
            <Text style={styles.headerSubtitle}>{users.length} registered users</Text>
          </View>
          <TouchableOpacity onPress={loadUsers} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, shadows.sm]}>
          <Ionicons name="search" size={20} color={colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or phone"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textLight}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['all', 'customer', 'seller', 'admin'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                selectedFilter === filter && styles.filterTabActive
              ]}
              onPress={() => setSelectedFilter(filter as any)}
            >
              <Ionicons 
                name={getRoleIcon(filter)} 
                size={16} 
                color={selectedFilter === filter ? colors.white : colors.textSecondary} 
              />
              <Text style={[
                styles.filterTabText,
                selectedFilter === filter && styles.filterTabTextActive
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <LinearGradient
            colors={[colors.primaryVeryLight, colors.primaryLight]}
            style={[styles.statCard, shadows.md]}
          >
            <View style={styles.statIconBox}>
              <Ionicons name="people" size={24} color={colors.primaryDark} />
            </View>
            <Text style={styles.statValue}>{filteredUsers.length}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#4F7C8220', '#4F7C8240']}
            style={[styles.statCard, shadows.md]}
          >
            <View style={[styles.statIconBox, { backgroundColor: colors.customer + '20' }]}>
              <Ionicons name="cart" size={24} color={colors.customer} />
            </View>
            <Text style={[styles.statValue, { color: colors.customer }]}>
              {users.filter(u => u.role === 'customer').length}
            </Text>
            <Text style={styles.statLabel}>Customers</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#5B9BA520', '#5B9BA540']}
            style={[styles.statCard, shadows.md]}
          >
            <View style={[styles.statIconBox, { backgroundColor: colors.seller + '20' }]}>
              <Ionicons name="storefront" size={24} color={colors.seller} />
            </View>
            <Text style={[styles.statValue, { color: colors.seller }]}>
              {users.filter(u => u.role === 'seller').length}
            </Text>
            <Text style={styles.statLabel}>Sellers</Text>
          </LinearGradient>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="people-outline" size={60} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try a different search query' : 'No users in the system yet'}
              </Text>
            </View>
          ) : (
            <View style={styles.userList}>
              {filteredUsers.map((user) => (
                <View key={user.id} style={[styles.userCard, shadows.sm]}>
                  <View style={styles.userHeader}>
                    <LinearGradient
                      colors={[getRoleColor(user.role) + '20', getRoleColor(user.role) + '40']}
                      style={styles.userIcon}
                    >
                      <Ionicons
                        name={getRoleIcon(user.role) as any}
                        size={24}
                        color={getRoleColor(user.role)}
                      />
                    </LinearGradient>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <View style={[
                        styles.roleBadge,
                        { backgroundColor: getRoleColor(user.role) + '15' }
                      ]}>
                        <Ionicons 
                          name={getRoleIcon(user.role) as any} 
                          size={12} 
                          color={getRoleColor(user.role)} 
                        />
                        <Text style={[
                          styles.roleText,
                          { color: getRoleColor(user.role) }
                        ]}>
                          {user.role.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.userDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="mail" size={16} color={colors.primary} />
                      <Text style={styles.detailText}>{user.email}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="call" size={16} color={colors.primary} />
                      <Text style={styles.detailText}>{user.phone || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={16} color={colors.primary} />
                      <Text style={styles.detailText}>
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </View>
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
    color: colors.primaryVeryLight,
    marginTop: spacing.xs / 2,
  },
  refreshButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    marginTop: -spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    ...typography.body,
    color: colors.text,
  },
filterContainer: {
  paddingHorizontal: spacing.lg,
  marginBottom: spacing.sm,
  maxHeight: 44, // slimmer
  paddingBottom:35,
},

filterTab: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',

  height: 36,                 // 🔥 fixed clean height
  paddingHorizontal: spacing.md,
  paddingVertical: 0,         // 🔥 remove vertical padding

  borderRadius: 18,           // not too circular
  marginRight: spacing.sm,

  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,

  gap: 4,
},

filterTabActive: {
  backgroundColor: colors.primary,
  borderColor: colors.primary,
},

filterTabText: {
  fontSize: 13,               // smaller, clean
  color: colors.textSecondary,
  fontWeight: '600',
},

filterTabTextActive: {
  color: colors.white,
},
statsGrid: {
  flexDirection: 'row',
  paddingHorizontal: spacing.lg,
  
  marginTop: spacing.lg,   // 🔥🔥 ADD THIS
  marginBottom: spacing.lg,
  
  gap: spacing.sm,
},
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h3,
    color: colors.primaryDark,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
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
    backgroundColor: colors.primaryVeryLight,
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
  userList: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
    gap: spacing.xs / 2,
  },
  roleText: {
    ...typography.caption,
    fontWeight: '700',
  },
  userDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});