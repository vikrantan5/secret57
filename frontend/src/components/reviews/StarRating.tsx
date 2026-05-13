import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;
  size?: number;
  onChange?: (value: number) => void;
  color?: string;
  emptyColor?: string;
  showLabel?: boolean;
}

export default function StarRating({
  rating,
  size = 18,
  onChange,
  color = '#F59E0B',
  emptyColor = '#D1D5DB',
  showLabel = false,
}: StarRatingProps) {
  const interactive = !!onChange;
  return (
    <View style={styles.row} testID="star-rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const Container: any = interactive ? TouchableOpacity : View;
        return (
          <Container
            key={star}
            onPress={() => onChange?.(star)}
            style={styles.starWrap}
            testID={`star-${star}`}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={size}
              color={star <= rating ? color : emptyColor}
            />
          </Container>
        );
      })}
      {showLabel && (
        <Text style={styles.label}>
          {rating > 0 ? rating.toFixed(1) : '0.0'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  starWrap: { padding: 1 },
  label: { marginLeft: 6, fontWeight: '700', color: '#1F2937', fontSize: 13 },
});
