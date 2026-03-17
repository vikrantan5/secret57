import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { Category } from '../../store/categoryStore';

interface CategoryCardProps {
  category: Category;
  onPress: () => void;
}

// Map category icons to Ionicons
const getIconName = (icon: string): any => {
  const iconMap: { [key: string]: any } = {
    'hand-left': 'hand-left-outline',
    'color-palette': 'color-palette-outline',
    'shirt': 'shirt-outline',
    'pizza': 'pizza-outline',
    'gift': 'gift-outline',
    'calendar': 'calendar-outline',
    'book': 'book-outline',
  };
  return iconMap[icon] || 'apps-outline';
};

// Map category type to badge color
const getTypeBadge = (type: string) => {
  const badges = {
    ecommerce: { label: 'Shop', color: colors.success },
    booking: { label: 'Book', color: colors.primary },
    hybrid: { label: 'Shop & Book', color: colors.info },
  };
  return badges[type as keyof typeof badges] || badges.booking;
};

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onPress }) => {
  const typeBadge = getTypeBadge(category.type);
  
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: typeBadge.color + '15' }]}>
        <Ionicons 
          name={getIconName(category.icon)} 
          size={32} 
          color={typeBadge.color} 
        />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {category.name}
        </Text>
        {category.description && (
          <Text style={styles.description} numberOfLines={2}>
            {category.description}
          </Text>
        )}
      </View>

      <View style={[styles.badge, { backgroundColor: typeBadge.color + '20' }]}>
        <Text style={[styles.badgeText, { color: typeBadge.color }]}>
          {typeBadge.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  name: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
