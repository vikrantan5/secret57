import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/authStore';
import { useAddressStore, UserAddress } from '../../src/store/addressStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function ManageAddressesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { 
    addresses, 
    loading, 
    addAddress, 
    updateAddress, 
    deleteAddress, 
    setDefaultAddress, 
    fetchUserAddresses,
    error 
  } = useAddressStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [label, setLabel] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Fetch addresses on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      loadAddresses();
    }
  }, [user]);

  const loadAddresses = async () => {
    try {
      await fetchUserAddresses(user?.id || '');
    } catch (err) {
      console.error('Error loading addresses:', err);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAddresses();
    setRefreshing(false);
  };

  const openAddModal = () => {
    resetForm();
    setEditingAddress(null);
    setModalVisible(true);
  };

  const openEditModal = (address: UserAddress) => {
    setEditingAddress(address);
    setLabel(address.label || '');
    setFullName(address.full_name || '');
    setPhone(address.phone || '');
    setAddressLine1(address.address_line1 || '');
    setAddressLine2(address.address_line2 || '');
    setCity(address.city || '');
    setState(address.state || '');
    setPincode(address.pincode || '');
    setIsDefault(address.is_default || false);
    setModalVisible(true);
  };

  const resetForm = () => {
    setLabel('');
    setFullName('');
    setPhone('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setState('');
    setPincode('');
    setIsDefault(false);
  };

  const handleSave = async () => {
    if (!label.trim() || !fullName.trim() || !phone.trim() || !addressLine1.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const addressData = {
      label: label.trim(),
      full_name: fullName.trim(),
      phone: phone.trim(),
      address_line1: addressLine1.trim(),
      address_line2: addressLine2.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      is_default: isDefault,
    };

    let result;
    if (editingAddress) {
      result = await updateAddress(editingAddress.id, addressData);
    } else {
      result = await addAddress(addressData);
    }

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
      resetForm();
      // Refresh addresses after save
      await loadAddresses();
    } else {
      Alert.alert('Error', result.error || 'Failed to save address');
    }
  };

  const handleDelete = (address: UserAddress) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteAddress(address.id);
            if (result.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // Refresh addresses after delete
              await loadAddresses();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete address');
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (addressId: string) => {
    const result = await setDefaultAddress(addressId);
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Refresh addresses after setting default
      await loadAddresses();
    } else {
      Alert.alert('Error', result.error || 'Failed to set default address');
    }
  };

  const getLabelIcon = (labelText: string) => {
    const lowerLabel = labelText?.toLowerCase() || '';
    if (lowerLabel === 'home') return 'home-outline';
    if (lowerLabel === 'work') return 'briefcase-outline';
    if (lowerLabel === 'office') return 'business-outline';
    return 'location-outline';
  };

  // Debug logging
  console.log('Addresses count:', addresses?.length);
  console.log('Loading state:', loading);

  if (loading && addresses.length === 0) {
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
              <Ionicons name="arrow-back" size={24} color="#161515" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manage Addresses</Text>
            <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={['#F3F4F6', '#E5E7EB']}
            style={styles.loadingCard}
          >
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading addresses...</Text>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Premium Header */}
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
          <Text style={styles.headerTitle}>Manage Addresses</Text>
          <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadAddresses}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && (!addresses || addresses.length === 0) ? (
        <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={['#F3F4F6', '#E5E7EB']}
            style={styles.emptyIconContainer}
          >
            <Ionicons name="location-outline" size={48} color="#9CA3AF" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No addresses yet</Text>
          <Text style={styles.emptySubtitle}>Add your first address for faster checkout</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyGradient}
            >
              <Ionicons name="add-outline" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Add New Address</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          style={[styles.scrollView, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8B5CF6"
              colors={['#8B5CF6']}
            />
          }
        >
          <View style={styles.addressList}>
            {addresses && addresses.map((address, index) => (
              <Animated.View
                key={address.id || index}
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateX: slideAnim }],
                }}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F9FAFB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.addressCard}
                >
                  <View style={styles.addressHeader}>
                    <View style={styles.addressLabelContainer}>
                      <LinearGradient
                        colors={['#8B5CF6', '#7C3AED']}
                        style={styles.addressIcon}
                      >
                        <Ionicons name={getLabelIcon(address.label)} size={16} color="#FFFFFF" />
                      </LinearGradient>
                      <Text style={styles.addressLabel}>{address.label || 'Address'}</Text>
                      {address.is_default && (
                        <LinearGradient
                          colors={['#D1FAE5', '#A7F3D0']}
                          style={styles.defaultBadge}
                        >
                          <Text style={styles.defaultText}>Default</Text>
                        </LinearGradient>
                      )}
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        onPress={() => openEditModal(address)} 
                        style={styles.editButton}
                      >
                        <Ionicons name="pencil-outline" size={18} color="#3B82F6" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleDelete(address)} 
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.addressName}>{address.full_name || 'N/A'}</Text>
                  <View style={styles.phoneContainer}>
                    <Ionicons name="call-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.addressPhone}>{address.phone || 'N/A'}</Text>
                  </View>
                  <Text style={styles.addressText}>
                    {address.address_line1 || ''}
                    {address.address_line2 ? `, ${address.address_line2}` : ''}
                  </Text>
                  <Text style={styles.addressText}>
                    {address.city || ''}, {address.state || ''} - {address.pincode || ''}
                  </Text>
                  
                  {!address.is_default && (
                    <TouchableOpacity
                      style={styles.setDefaultButton}
                      onPress={() => handleSetDefault(address.id)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#F3F4F6', '#E5E7EB']}
                        style={styles.setDefaultGradient}
                      >
                        <Ionicons name="checkmark-circle-outline" size={14} color="#8B5CF6" />
                        <Text style={styles.setDefaultText}>Set as Default</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </LinearGradient>
              </Animated.View>
            ))}
          </View>
          <View style={{ height: spacing.xxl }} />
        </Animated.ScrollView>
      )}

      {/* Premium Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <BlurView intensity={90} tint="dark" style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#1E1B4B', '#312E81', '#4C1D95']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalForm}>
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.modalInput}
                >
                  <Ionicons name="pricetag-outline" size={18} color="#8B5CF6" />
                  <TextInput
                    style={styles.modalInputField}
                    value={label}
                    onChangeText={setLabel}
                    placeholder="Label (e.g., Home, Work)"
                    placeholderTextColor="#9CA3AF"
                  />
                </LinearGradient>

                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.modalInput}
                >
                  <Ionicons name="person-outline" size={18} color="#8B5CF6" />
                  <TextInput
                    style={styles.modalInputField}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Full Name"
                    placeholderTextColor="#9CA3AF"
                  />
                </LinearGradient>

                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.modalInput}
                >
                  <Ionicons name="call-outline" size={18} color="#10B981" />
                  <TextInput
                    style={styles.modalInputField}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Phone Number"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                  />
                </LinearGradient>

                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.modalInput}
                >
                  <Ionicons name="home-outline" size={18} color="#F59E0B" />
                  <TextInput
                    style={styles.modalInputField}
                    value={addressLine1}
                    onChangeText={setAddressLine1}
                    placeholder="Address Line 1"
                    placeholderTextColor="#9CA3AF"
                  />
                </LinearGradient>

                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.modalInput}
                >
                  <Ionicons name="home-outline" size={18} color="#F59E0B" />
                  <TextInput
                    style={styles.modalInputField}
                    value={addressLine2}
                    onChangeText={setAddressLine2}
                    placeholder="Address Line 2 (Optional)"
                    placeholderTextColor="#9CA3AF"
                  />
                </LinearGradient>

                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.modalInput}
                >
                  <Ionicons name="business-outline" size={18} color="#3B82F6" />
                  <TextInput
                    style={styles.modalInputField}
                    value={city}
                    onChangeText={setCity}
                    placeholder="City"
                    placeholderTextColor="#9CA3AF"
                  />
                </LinearGradient>

                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.modalInput}
                >
                  <Ionicons name="map-outline" size={18} color="#3B82F6" />
                  <TextInput
                    style={styles.modalInputField}
                    value={state}
                    onChangeText={setState}
                    placeholder="State"
                    placeholderTextColor="#9CA3AF"
                  />
                </LinearGradient>

                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.modalInput}
                >
                  <Ionicons name="mail-outline" size={18} color="#EC4899" />
                  <TextInput
                    style={styles.modalInputField}
                    value={pincode}
                    onChangeText={setPincode}
                    placeholder="Pincode"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </LinearGradient>

                <TouchableOpacity
                  style={styles.defaultCheckbox}
                  onPress={() => {
                    setIsDefault(!isDefault);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isDefault ? ['#8B5CF6', '#7C3AED'] : ['#F3F4F6', '#E5E7EB']}
                    style={styles.checkboxIcon}
                  >
                    <Ionicons
                      name={isDefault ? 'checkmark' : 'square-outline'}
                      size={16}
                      color={isDefault ? '#FFFFFF' : '#9CA3AF'}
                    />
                  </LinearGradient>
                  <Text style={styles.defaultCheckboxText}>Set as default address</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButtonSave}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.saveGradient}
                  >
                    <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.modalButtonText}>Save Address</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    width: 200,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  emptyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addressList: {
    padding: spacing.lg,
  },
  addressCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
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
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addressLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addressIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  defaultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  addressPhone: {
    fontSize: 13,
    color: '#6B7280',
  },
  addressText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  setDefaultButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  setDefaultGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  setDefaultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalForm: {
    padding: spacing.lg,
  },
  modalInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modalInputField: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: '#1F2937',
  },
  defaultCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  checkboxIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultCheckboxText: {
    fontSize: 14,
    color: '#1F2937',
  },
  modalButtons: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  modalButtonTextCancel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalButtonSave: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});