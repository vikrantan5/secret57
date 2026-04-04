import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { useServiceStore } from '../../src/store/serviceStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function SellerServicesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { seller } = useSellerStore();
  const { services, fetchSellerServices, deleteService, loading } = useServiceStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (seller?.id) {
      loadServices();
    }
  }, [seller?.id]);

  const loadServices = async () => {
    if (seller?.id) {
      await fetchSellerServices(seller.id);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  };

  const handleDeleteService = (serviceId: string, serviceName: string) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${serviceName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteService(serviceId);
            if (result.success) {
              Alert.alert('Success', 'Service deleted successfully');
              loadServices(); // Reload services
            } else {
              Alert.alert('Error', result.error || 'Failed to delete service');
            }
          },
        },
      ]
    );
  };

  const getLocationTypeLabel = (locationType: string) => {
    switch (locationType) {
      case 'visit_customer':
        return 'Visits Customer';
      case 'customer_visits':
        return 'At Provider Location';
      case 'both':
        return 'Both Options';
      default:
        return locationType;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>My Services</Text>
        <TouchableOpacity
          onPress={() => router.push('/seller/add-service' as any)}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {services.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={80} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No services yet</Text>
            <Text style={styles.emptySubtitle}>
              Start adding services to showcase your offerings
            </Text>
            <TouchableOpacity
              style={[styles.addServiceButton, shadows.md]}
              onPress={() => router.push('/seller/add-service' as any)}
            >
              <Text style={styles.addServiceButtonText}>Add First Service</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.servicesList}>
            {services.map((service) => (
              <View key={service.id} style={[styles.serviceCard, shadows.sm]}>
                {/* Service Image */}
                {service.images && service.images.length > 0 && (
                  <Image
                    source={{ uri: service.images[0] }}
                    style={styles.serviceImage}
                    resizeMode="cover"
                  />
                )}

                {/* Service Info */}
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName} numberOfLines={2}>
                    {service.name}
                  </Text>

                  {/* Price and Duration */}
                  <View style={styles.priceRow}>
                    <Text style={styles.servicePrice}>₹{service.price.toFixed(2)}</Text>
                    {service.duration && (
                      <Text style={styles.serviceDuration}>• {service.duration} mins</Text>
                    )}
                  </View>

                  {/* Location Type */}
                  <View style={styles.locationBadge}>
                    <Ionicons 
                      name={service.location_type === 'visit_customer' ? 'home' : 'location'} 
                      size={12} 
                      color={colors.primary} 
                    />
                    <Text style={styles.locationText}>
                      {getLocationTypeLabel(service.location_type)}
                    </Text>
                  </View>

                                  {/* Status */}
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            service.is_active
                              ? colors.success + '20'
                              : colors.textSecondary + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              service.is_active ? colors.success : colors.textSecondary,
                          },
                        ]}
                      >
                        {service.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => router.push(`/seller/services/edit?id=${service.id}` as any)}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteService(service.id, service.name)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.viewButton]}
                      onPress={() => router.push(`/service/${service.id}` as any)}
                    >
                      <Ionicons name="eye-outline" size={18} color={colors.text} />
                    </TouchableOpacity>
                  </View>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  addButton: {
    padding: spacing.xs,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  addServiceButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  addServiceButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  servicesList: {
    padding: spacing.lg,
  },
  serviceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.border,
  },
  serviceInfo: {
    padding: spacing.md,
  },
  serviceName: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  servicePrice: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  serviceDuration: {
    ...typography.body,
    color: colors.textSecondary,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  locationText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  statusRow: {
    marginBottom: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  editButton: {
    flex: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  editButtonText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    borderColor: colors.error,
    backgroundColor: colors.error + '10',
  },
  deleteButtonText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '600',
  },
  viewButton: {
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
});
