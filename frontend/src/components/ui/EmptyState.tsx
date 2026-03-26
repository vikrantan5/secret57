import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { colors, spacing, typography } from '../../constants/theme';

interface EmptyStateProps {
  title: string;
  message: string;
  type?: 'cart' | 'bookings' | 'products' | 'notifications' | 'wishlist' | 'search';
}

// For now, we'll use Ionicons as placeholders for Lottie animations
// You can replace these with actual Lottie JSON files later
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  type = 'products',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.emoji}>{getEmoji(type)}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const getEmoji = (type: string): string => {
  const emojiMap: { [key: string]: string } = {
    cart: '🛒',
    bookings: '📅',
    products: '📦',
    notifications: '🔔',
    wishlist: '❤️',
    search: '🔍',
  };
  return emojiMap[type] || '📦';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  emoji: {
    fontSize: 80,
    opacity: 0.5,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
