import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { getCategoryImage, hasCategoryImage } from '../../constants/categoryImages';


interface CategoryBoxProps {
  id: string;
  name: string;
  icon: string;
  slug: string;
  itemCount?: number;
  onPress: () => void;
}

const getIconName = (icon: string): any => {
  const iconMap: { [key: string]: any } = {
    'hand-left': 'hand-left-outline',
    'color-palette': 'color-palette-outline',
    'shirt': 'shirt-outline',
    'pizza': 'pizza-outline',
    'gift': 'gift-outline',
    'calendar': 'calendar-outline',
    'book': 'book-outline',
    'construct': 'construct-outline',
    'home': 'home-outline',
    'fitness': 'fitness-outline',
  };
  return iconMap[icon] || 'apps-outline';
};

const getCategoryGradient = (index: number): string[] => {
  const gradients = [
    ['#5B7CFF', '#7B95FF'],
    ['#8B5CF6', '#A78BFA'],
    ['#F59E0B', '#FCD34D'],
    ['#10B981', '#34D399'],
    ['#EF4444', '#F87171'],
    ['#3B82F6', '#60A5FA'],
    ['#EC4899', '#F472B6'],
    ['#14B8A6', '#2DD4BF'],
  ];
  return gradients[index % gradients.length];
};

export const CategoryBox: React.FC<CategoryBoxProps & { index: number }> = ({
  name,
  icon,
  slug,
  itemCount,
  onPress,
  index,
}) => {
  // Check if category has a custom image
  const categoryImage = getCategoryImage(slug) || getCategoryImage(name);
  const hasImage = hasCategoryImage(slug) || hasCategoryImage(name);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={getCategoryGradient(index)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconContainer}
      >
        {hasImage && categoryImage ? (
          <Image 
            source={{ uri: categoryImage }} 
            style={styles.categoryImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name={getIconName(icon)} size={28} color={colors.surface} />
        )}
      </LinearGradient>
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
      {itemCount !== undefined && itemCount > 0 && (
        <Text style={styles.count}>{itemCount} items</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 90,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.sm,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.lg,
  },
  name: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  count: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
  },
});
