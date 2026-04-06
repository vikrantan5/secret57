// src/components/cards/CategoryCard.tsx
import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { Category } from '../../store/categoryStore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface CategoryCardProps {
  category: Category;
  onPress: () => void;
  variant?: 'grid' | 'list';
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
    'electronics': 'hardware-chip-outline',
    'fashion': 'woman-outline',
    'groceries': 'basket-outline',
    'beauty': 'rose-outline',
    'furniture': 'bed-outline',
    'toys': 'game-controller-outline',
    'sports': 'bicycle-outline',
    'automotive': 'car-outline',
    'health': 'fitness-outline',
    'education': 'school-outline',
    'consulting': 'people-outline',
    'repair': 'construct-outline',
    'cleaning': 'sparkles-outline',
    'delivery': 'rocket-outline',
  };
  return iconMap[icon] || 'apps-outline';
};

// Map category type to gradient colors
const getTypeGradient = (type: string) => {
  const gradients = {
    ecommerce: {
      colors: ['#8B5CF6', '#7C3AED', '#6D28D9'],
      label: 'Shop',
      icon: 'cart-outline',
    },
    booking: {
      colors: ['#10B981', '#059669', '#047857'],
      label: 'Book',
      icon: 'calendar-outline',
    },
    hybrid: {
      colors: ['#F59E0B', '#D97706', '#B45309'],
      label: 'Shop & Book',
      icon: 'swap-horizontal-outline',
    },
  };
  return gradients[type as keyof typeof gradients] || gradients.ecommerce;
};

export const CategoryCard: React.FC<CategoryCardProps> = ({ 
  category, 
  onPress, 
  variant = 'list' 
}) => {
  const typeGradient = getTypeGradient(category.type);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  if (variant === 'grid') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={styles.gridCard}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          {/* Gradient Border Effect */}
          <LinearGradient
            colors={typeGradient.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gridGradientBorder}
          />
          
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            style={styles.gridContent}
          >
            <View style={[styles.gridIconContainer, { backgroundColor: typeGradient.colors[0] + '15' }]}>
              <LinearGradient
                colors={typeGradient.colors}
                style={styles.gridIconGradient}
              >
                <Ionicons 
                  name={getIconName(category.icon)} 
                  size={28} 
                  color="#FFFFFF" 
                />
              </LinearGradient>
            </View>
            
            <Text style={styles.gridName} numberOfLines={1}>
              {category.name}
            </Text>
            
            {category.description && (
              <Text style={styles.gridDescription} numberOfLines={2}>
                {category.description}
              </Text>
            )}

            <View style={styles.gridBadgeContainer}>
              <LinearGradient
                colors={typeGradient.colors}
                style={styles.gridBadge}
              >
                <Ionicons name={typeGradient.icon} size={12} color="#FFFFFF" />
                <Text style={styles.gridBadgeText}>{typeGradient.label}</Text>
              </LinearGradient>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.listCard}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F9FAFB']}
          style={styles.listContent}
        >
          <View style={[styles.listIconContainer, { backgroundColor: typeGradient.colors[0] + '15' }]}>
            <LinearGradient
              colors={typeGradient.colors}
              style={styles.listIconGradient}
            >
              <Ionicons 
                name={getIconName(category.icon)} 
                size={28} 
                color="#FFFFFF" 
              />
            </LinearGradient>
          </View>
          
          <View style={styles.listInfo}>
            <Text style={styles.listName}>{category.name}</Text>
            {category.description && (
              <Text style={styles.listDescription} numberOfLines={1}>
                {category.description}
              </Text>
            )}
          </View>

          <View style={styles.listStats}>
            <LinearGradient
              colors={typeGradient.colors}
              style={styles.listBadge}
            >
              <Ionicons name={typeGradient.icon} size={12} color="#FFFFFF" />
              <Text style={styles.listBadgeText}>{typeGradient.label}</Text>
            </LinearGradient>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Grid Variant Styles
  gridCard: {
    width: CARD_WIDTH,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
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
  gridGradientBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  gridContent: {
    padding: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  gridIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  gridIconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  gridDescription: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  gridBadgeContainer: {
    marginTop: 'auto',
  },
  gridBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  gridBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // List Variant Styles
  listCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
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
  listContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  listIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  listIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  listDescription: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  listStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  listBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  listBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});