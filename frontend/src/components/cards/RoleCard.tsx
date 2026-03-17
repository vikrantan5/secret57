import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing, typography, shadows } from '../../constants/theme';

interface RoleCardProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  title,
  description,
  icon,
  color,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, shadows.md]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={40} color={color} />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      
      <View style={[styles.arrow, { backgroundColor: color }]}>
        <Ionicons name="arrow-forward" size={20} color={colors.surface} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  arrow: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
