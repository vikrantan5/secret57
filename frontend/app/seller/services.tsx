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
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../../src/store/authStore';
import { useSellerStore } from '../../src/store/sellerStore';
import { useServiceStore } from '../../src/store/serviceStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

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
              loadServices();
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
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <BlurView intensity={80} tint="dark" style={styles.headerBlur}>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Text style={styles.title}>My Services</Text>
            
            <TouchableOpacity
              onPress={() => router.push('/seller/add-service' as any)}
              style={styles.addButton}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                style={styles.addButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#6366f1"
              colors={['#6366f1']}
            />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {services.length === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['#1a1a1a', '#0a0a0a']}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="briefcase-outline" size={80} color="#6366f1" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No services yet</Text>
              <Text style={styles.emptySubtitle}>
                Start adding services to showcase your offerings
              </Text>
              <TouchableOpacity
                style={styles.addServiceButton}
                onPress={() => router.push('/seller/add-service' as any)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.addServiceGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.addServiceButtonText}>Add First Service</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.servicesList}>
              {services.map((service, index) => (
                <TouchableOpacity
                  key={service.id}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/service/${service.id}` as any)}
                >
                  <LinearGradient
                    colors={['#1e1e1e', '#161616']}
                    style={[styles.serviceCard, shadows.lg]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {/* Service Image */}
                    {service.images && service.images.length > 0 && (
                      <View style={styles.imageContainer}>
                        <Image
                          source={{ uri: service.images[0] }}
                          style={styles.serviceImage}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.8)']}
                          style={styles.imageOverlay}
                        />
                        <View style={styles.statusOverlay}>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  service.is_active
                                    ? 'rgba(16, 185, 129, 0.2)'
                                    : 'rgba(107, 114, 128, 0.2)',
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.statusDot,
                                {
                                  backgroundColor:
                                    service.is_active ? '#10b981' : '#6b7280',
                                },
                              ]}
                            />
                            <Text
                              style={[
                                styles.statusText,
                                {
                                  color:
                                    service.is_active ? '#10b981' : '#9ca3af',
                                },
                              ]}
                            >
                              {service.is_active ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                        </View>
                      </View>
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
                          <View style={styles.durationBadge}>
                            <Ionicons name="time-outline" size={14} color="#9ca3af" />
                            <Text style={styles.serviceDuration}>{service.duration} mins</Text>
                          </View>
                        )}
                      </View>

                      {/* Location Type */}
                      <View style={styles.locationBadge}>
                        <Ionicons 
                          name={service.location_type === 'visit_customer' ? 'home' : 'location'} 
                          size={12} 
                          color="#8b5cf6" 
                        />
                        <Text style={styles.locationText}>
                          {getLocationTypeLabel(service.location_type)}
                        </Text>
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => router.push(`/seller/services/edit/${service.id}` as any)}
                          activeOpacity={0.7}
                        >
                          <LinearGradient
                            colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.15)']}
                            style={styles.actionGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Ionicons name="create-outline" size={18} color="#a78bfa" />
                            <Text style={styles.editButtonText}>Edit</Text>
                          </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDeleteService(service.id, service.name)}
                          activeOpacity={0.7}
                        >
                          <LinearGradient
                            colors={['rgba(239, 68, 68, 0.15)', 'rgba(220, 38, 38, 0.15)']}
                            style={styles.actionGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Ionicons name="trash-outline" size={18} color="#f87171" />
                            <Text style={styles.deleteButtonText}>Delete</Text>
                          </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.viewButton}
                          onPress={() => router.push(`/service/${service.id}` as any)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="eye-outline" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: spacing.xxl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  addServiceButton: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },
  addServiceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  addServiceButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  servicesList: {
    padding: spacing.lg,
  },
  serviceCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  statusOverlay: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backdropFilter: 'blur(10px)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  serviceInfo: {
    padding: spacing.md,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
    lineHeight: 24,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  servicePrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#a78bfa',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.sm,
  },
  serviceDuration: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  locationText: {
    fontSize: 12,
    color: '#a78bfa',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: borderRadius.md,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  editButtonText: {
    fontSize: 13,
    color: '#a78bfa',
    fontWeight: '600',
  },
  deleteButtonText: {
    fontSize: 13,
    color: '#f87171',
    fontWeight: '600',
  },
  viewButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});