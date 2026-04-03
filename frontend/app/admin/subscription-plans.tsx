import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore, SubscriptionPlan } from '../../src/store/subscriptionStore';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';

export default function SubscriptionPlansAdmin() {
  const router = useRouter();
  const { plans, loading, fetchPlans, createPlan, updatePlan } = useSubscriptionStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    duration_type: 'monthly' as 'monthly' | 'yearly',
    price: '',
    duration_days: '',
    features: '',
    is_active: true,
    sort_order: '1',
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    await fetchPlans();
  };

  const handleAddPlan = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      duration_type: 'monthly',
      price: '',
      duration_days: '',
      features: '',
      is_active: true,
      sort_order: '1',
    });
    setModalVisible(true);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      duration_type: plan.duration_type,
      price: plan.price.toString(),
      duration_days: plan.duration_days.toString(),
      features: plan.features.join(', '),
      is_active: plan.is_active,
      sort_order: plan.sort_order.toString(),
    });
    setModalVisible(true);
  };

  const handleSavePlan = async () => {
    if (!formData.name || !formData.price || !formData.duration_days) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const planData = {
      name: formData.name,
      duration_type: formData.duration_type,
      price: parseFloat(formData.price),
      duration_days: parseInt(formData.duration_days),
      features: formData.features.split(',').map(f => f.trim()).filter(f => f),
      is_active: formData.is_active,
      sort_order: parseInt(formData.sort_order),
    };

    let result;
    if (editingPlan) {
      result = await updatePlan(editingPlan.id, planData);
    } else {
      result = await createPlan(planData);
    }

    if (result.success) {
      Alert.alert('Success', `Plan ${editingPlan ? 'updated' : 'created'} successfully`);
      setModalVisible(false);
      loadPlans();
    } else {
      Alert.alert('Error', result.error || 'Failed to save plan');
    }
  };

  const togglePlanStatus = async (plan: SubscriptionPlan) => {
    const result = await updatePlan(plan.id, { is_active: !plan.is_active });
    if (result.success) {
      loadPlans();
    } else {
      Alert.alert('Error', result.error || 'Failed to update plan status');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <TouchableOpacity onPress={handleAddPlan} style={styles.addButton}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {plans.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No subscription plans yet</Text>
            <TouchableOpacity onPress={handleAddPlan} style={styles.createFirstButton}>
              <Text style={styles.createFirstText}>Create First Plan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          plans.map((plan) => (
            <View key={plan.id} style={[styles.planCard, shadows.sm]}>
              <View style={styles.planHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planType}>
                    {plan.duration_type} • {plan.duration_days} days
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => togglePlanStatus(plan)}
                  style={[
                    styles.statusToggle,
                    { backgroundColor: plan.is_active ? colors.success + '20' : colors.error + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: plan.is_active ? colors.success : colors.error },
                    ]}
                  >
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.planPrice}>₹{plan.price}</Text>

              {plan.features && plan.features.length > 0 && (
                <View style={styles.featuresContainer}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Ionicons name="checkmark" size={16} color={colors.success} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                onPress={() => handleEditPlan(plan)}
                style={styles.editButton}
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
                <Text style={styles.editButtonText}>Edit Plan</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Edit/Create Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </Text>
            <TouchableOpacity onPress={handleSavePlan}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            <Text style={styles.label}>Plan Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="e.g., Basic Plan"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Duration Type *</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                onPress={() => setFormData({ ...formData, duration_type: 'monthly' })}
                style={styles.radioOption}
              >
                <Ionicons
                  name={formData.duration_type === 'monthly' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.radioLabel}>Monthly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFormData({ ...formData, duration_type: 'yearly' })}
                style={styles.radioOption}
              >
                <Ionicons
                  name={formData.duration_type === 'yearly' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.radioLabel}>Yearly</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Price (₹) *</Text>
            <TextInput
              style={styles.input}
              value={formData.price}
              onChangeText={(text) => setFormData({ ...formData, price: text })}
              placeholder="e.g., 499"
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Duration (Days) *</Text>
            <TextInput
              style={styles.input}
              value={formData.duration_days}
              onChangeText={(text) => setFormData({ ...formData, duration_days: text })}
              placeholder="e.g., 30"
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Features (comma separated)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.features}
              onChangeText={(text) => setFormData({ ...formData, features: text })}
              placeholder="Unlimited products, Direct payments, etc."
              multiline
              numberOfLines={4}
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Sort Order</Text>
            <TextInput
              style={styles.input}
              value={formData.sort_order}
              onChangeText={(text) => setFormData({ ...formData, sort_order: text })}
              placeholder="1"
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
            />

            <TouchableOpacity
              onPress={() => setFormData({ ...formData, is_active: !formData.is_active })}
              style={styles.checkbox}
            >
              <Ionicons
                name={formData.is_active ? 'checkbox' : 'square-outline'}
                size={24}
                color={colors.primary}
              />
              <Text style={styles.checkboxLabel}>Active</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  addButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  createFirstButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  createFirstText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  planName: {
    ...typography.h4,
    color: colors.text,
  },
  planType: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  statusToggle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  planPrice: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  featuresContainer: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  featureText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  editButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
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
    ...typography.h4,
    color: colors.text,
  },
  saveText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  form: {
    flex: 1,
    padding: spacing.lg,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  radioLabel: {
    ...typography.body,
    color: colors.text,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  checkboxLabel: {
    ...typography.body,
    color: colors.text,
  },
});
