import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/authStore';
import { useAddressStore, UserAddress } from '../../src/store/addressStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function ManageAddressesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addresses, loading, addAddress, updateAddress, deleteAddress, setDefaultAddress, fetchUserAddresses } = useAddressStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);

  const [label, setLabel] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchUserAddresses(user.id);
    }
  }, [user]);

  const openAddModal = () => {
    resetForm();
    setEditingAddress(null);
    setModalVisible(true);
  };

  const openEditModal = (address: UserAddress) => {
    setEditingAddress(address);
    setLabel(address.label);
    setFullName(address.full_name);
    setPhone(address.phone);
    setAddressLine1(address.address_line1);
    setAddressLine2(address.address_line2 || '');
    setCity(address.city);
    setState(address.state);
    setPincode(address.pincode);
    setIsDefault(address.is_default);
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
    } else {
      Alert.alert('Error', result.error || 'Failed to set default address');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Addresses</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={80} color={colors.textLight} />
          <Text style={styles.emptyText}>No addresses yet</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
            <Text style={styles.emptyButtonText}>Add Your First Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.addressList}>
            {addresses.map((address) => (
              <View key={address.id} style={styles.addressCard}>
                <View style={styles.addressHeader}>
                  <View style={styles.addressLabelContainer}>
                    <Ionicons name="location" size={20} color={colors.primary} />
                    <Text style={styles.addressLabel}>{address.label}</Text>
                    {address.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={() => openEditModal(address)}>
                      <Ionicons name="pencil" size={20} color={colors.info} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(address)}>
                      <Ionicons name="trash" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.addressName}>{address.full_name}</Text>
                <Text style={styles.addressPhone}>{address.phone}</Text>
                <Text style={styles.addressText}>
                  {address.address_line1}
                  {address.address_line2 ? `, ${address.address_line2}` : ''}
                </Text>
                <Text style={styles.addressText}>
                  {address.city}, {address.state} - {address.pincode}
                </Text>
                {!address.is_default && (
                  <TouchableOpacity
                    style={styles.setDefaultButton}
                    onPress={() => handleSetDefault(address.id)}
                  >
                    <Text style={styles.setDefaultText}>Set as Default</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalForm}>
                <TextInput
                  style={styles.modalInput}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="Label (e.g., Home, Work)"
                  placeholderTextColor={colors.textLight}
                />
                <TextInput
                  style={styles.modalInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full Name"
                  placeholderTextColor={colors.textLight}
                />
                <TextInput
                  style={styles.modalInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone Number"
                  placeholderTextColor={colors.textLight}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={styles.modalInput}
                  value={addressLine1}
                  onChangeText={setAddressLine1}
                  placeholder="Address Line 1"
                  placeholderTextColor={colors.textLight}
                />
                <TextInput
                  style={styles.modalInput}
                  value={addressLine2}
                  onChangeText={setAddressLine2}
                  placeholder="Address Line 2 (Optional)"
                  placeholderTextColor={colors.textLight}
                />
                <TextInput
                  style={styles.modalInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor={colors.textLight}
                />
                <TextInput
                  style={styles.modalInput}
                  value={state}
                  onChangeText={setState}
                  placeholder="State"
                  placeholderTextColor={colors.textLight}
                />
                <TextInput
                  style={styles.modalInput}
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="Pincode"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.defaultCheckbox}
                  onPress={() => {
                    setIsDefault(!isDefault);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons
                    name={isDefault ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={isDefault ? colors.primary : colors.textLight}
                  />
                  <Text style={styles.defaultCheckboxText}>Set as default address</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleSave}
                >
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
  addressList: {
    padding: spacing.lg,
  },
  addressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
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
  addressLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  defaultBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  defaultText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  addressName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  addressPhone: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  addressText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  setDefaultButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  setDefaultText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  modalForm: {
    padding: spacing.lg,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  defaultCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  defaultCheckboxText: {
    ...typography.body,
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonSave: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  modalButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
  },
});