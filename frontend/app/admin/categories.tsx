"import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../src/constants/theme';
import { supabase } from '../../src/services/supabase';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<'booking' | 'ecommerce' | 'both'>('booking');
  const [icon, setIcon] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  };

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setType('booking');
    setIcon('briefcase');
    setShowAddModal(true);
  };

  const handleOpenEdit = (category: any) => {
    setEditingCategory(category);
    setName(category.name);
    setSlug(category.slug);
    setType(category.type);
    setIcon(category.icon);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!name || !slug || !type || !icon) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({
            name,
            slug,
            type,
            icon,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        Alert.alert('Success', 'Category updated successfully');
      } else {
        // Create new category
        const { error } = await supabase
          .from('categories')
          .insert([{
            name,
            slug,
            type,
            icon,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]);

        if (error) throw error;
        Alert.alert('Success', 'Category created successfully');
      }

      setShowAddModal(false);
      loadCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      Alert.alert('Error', error.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (category: any) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete \"${category.name}\"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', category.id);

              if (error) throw error;
              Alert.alert('Success', 'Category deleted successfully');
              loadCategories();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  const getTypeColor = (categoryType: string) => {
    switch (categoryType) {
      case 'booking': return colors.warning;
      case 'ecommerce': return colors.success;
      case 'both': return colors.secondary;
      default: return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name=\"arrow-back\" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Categories</Text>
        <TouchableOpacity onPress={handleOpenAdd}>
          <Ionicons name=\"add-circle\" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{categories.length}</Text>
          <Text style={styles.statLabel}>Total Categories</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {categories.filter(c => c.type === 'booking').length}
          </Text>
          <Text style={styles.statLabel}>Booking</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {categories.filter(c => c.type === 'ecommerce').length}
          </Text>
          <Text style={styles.statLabel}>E-commerce</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name=\"apps-outline\" size={80} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No categories found</Text>
            <Text style={styles.emptySubtitle}>Tap + to add a new category</Text>
          </View>
        ) : (
          <View style={styles.categoryList}>
            {categories.map((category) => (
              <View key={category.id} style={[styles.categoryCard, shadows.sm]}>
                <View style={styles.categoryHeader}>
                  <View style={[
                    styles.iconBox,
                    { backgroundColor: getTypeColor(category.type) + '15' }
                  ]}>
                    <Ionicons
                      name={category.icon as any}
                      size={28}
                      color={getTypeColor(category.type)}
                    />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categorySlug}>{category.slug}</Text>
                  </View>
                </View>

                <View style={[
                  styles.typeBadge,
                  { backgroundColor: getTypeColor(category.type) + '15' }
                ]}>
                  <Text style={[
                    styles.typeText,
                    { color: getTypeColor(category.type) }
                  ]}>
                    {category.type.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleOpenEdit(category)}
                  >
                    <Ionicons name=\"pencil\" size={18} color={colors.white} />
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(category)}
                  >
                    <Ionicons name=\"trash\" size={18} color={colors.white} />
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType=\"slide\"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, shadows.lg]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name=\"close\" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label=\"Category Name\"
                value={name}
                onChangeText={setName}
                placeholder=\"e.g., Mehndi Artist\"
              />

              <Input
                label=\"Slug (URL-friendly)\"
                value={slug}
                onChangeText={setSlug}
                placeholder=\"e.g., mehndi-artist\"
                autoCapitalize=\"none\"
              />

              <Input
                label=\"Icon Name (Ionicons)\"
                value={icon}
                onChangeText={setIcon}
                placeholder=\"e.g., color-palette, cut, briefcase\"
              />

              <Text style={styles.inputLabel}>Category Type</Text>
              <View style={styles.typeSelector}>
                {(['booking', 'ecommerce', 'both'] as const).map((typeOption) => (
                  <TouchableOpacity
                    key={typeOption}
                    style={[
                      styles.typeOption,
                      type === typeOption && styles.typeOptionActive
                    ]}
                    onPress={() => setType(typeOption)}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      type === typeOption && styles.typeOptionTextActive
                    ]}>
                      {typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Button
                  title=\"Cancel\"
                  onPress={() => setShowAddModal(false)}
                  variant=\"outline\"
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <Button
                  title={editingCategory ? 'Update' : 'Create'}
                  onPress={handleSave}
                  loading={loading}
                  variant=\"primary\"
                  style={{ flex: 1 }}
                />
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
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  categoryList: {
    padding: spacing.lg,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    ...typography.h4,
    color: colors.text,
  },
  categorySlug: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  typeText: {
    ...typography.caption,
    fontWeight: '600',
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
  editButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },
  inputLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeOption: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: colors.primary,
  },
  typeOptionText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  typeOptionTextActive: {
    color: colors.white,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
"