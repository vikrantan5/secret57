import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useIssueReportStore } from '../../src/store/issueReportStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function SellerIssuesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { seller } = useSellerStore();
  const { issues, loading, fetchSellerIssues } = useIssueReportStore();
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (seller?.id) {
      fetchSellerIssues(seller.id);
    }
  }, [seller]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = async () => {
    if (!seller?.id) return;
    setRefreshing(true);
    await fetchSellerIssues(seller.id);
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return ['#F59E0B', '#D97706'];
      case 'under_review':
        return ['#3B82F6', '#2563EB'];
      case 'resolved':
        return ['#10B981', '#059669'];
      case 'closed':
        return ['#6B7280', '#4B5563'];
      case 'rejected':
        return ['#EF4444', '#DC2626'];
      default:
        return ['#8B5CF6', '#7C3AED'];
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderIssueCard = ({ item, index }: { item: any; index: number }) => {
    const statusGradient = getStatusColor(item.status);

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          style={styles.issueCard}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/seller/issue-detail/${item.id}` as any);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.issueHeader}>
            <View style={styles.issueTopRow}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.issueIcon}
              >
                <Ionicons name="alert-circle-outline" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.issueInfo}>
                <Text style={styles.issueSubject} numberOfLines={1}>
                  {item.subject}
                </Text>
                <Text style={styles.issueOrderNumber}>
                  Order #{item.order?.order_number?.slice(0, 12) || item.order_id?.slice(0, 8)}
                </Text>
              </View>
              <LinearGradient
                colors={statusGradient}
                style={styles.statusBadge}
              >
                <Text style={styles.statusText}>
                  {item.status.toUpperCase().replace('_', ' ')}
                </Text>
              </LinearGradient>
            </View>
          </View>

          <Text style={styles.issueMessage} numberOfLines={2}>
            {item.message}
          </Text>

          <View style={styles.issueFooter}>
            <View style={styles.issueType}>
              <Ionicons name="pricetag-outline" size={14} color="#8B5CF6" />
              <Text style={styles.issueTypeText}>{item.issue_type || 'General'}</Text>
            </View>
            <Text style={styles.issueDate}>{formatDate(item.created_at)}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading && issues.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F9FAFB', '#FFFFFF']}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading issues...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4C1D95']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Issues</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {issues.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.emptyIconContainer}
            >
              <Ionicons name="checkmark-done-circle-outline" size={64} color="#10B981" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Issues Reported</Text>
            <Text style={styles.emptyText}>You're doing great! No customer issues at the moment.</Text>
          </View>
        ) : (
          <FlatList
            data={issues}
            renderItem={renderIssueCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#8B5CF6"
                colors={['#8B5CF6']}
              />
            }
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerGradient: {
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  listContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  issueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  issueHeader: {
    marginBottom: spacing.sm,
  },
  issueTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  issueIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  issueInfo: {
    flex: 1,
  },
  issueSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  issueOrderNumber: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  issueMessage: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  issueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  issueType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  issueTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  issueDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
