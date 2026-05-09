import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/Designsystem';

interface StarRatingProps {
  rating?: number;
  onRate?: (rating: number) => void;
  size?: 'small' | 'medium' | 'large';
  readonly?: boolean;
}

const SIZE_MAP = { small: 16, medium: 20, large: 24 };

export function StarRating({ rating = 0, onRate, size = 'medium', readonly = false }: StarRatingProps) {
  const sz = SIZE_MAP[size];
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Pressable
          key={s}
          onPress={() => !readonly && onRate?.(s)}
          disabled={readonly}
        >
          <Ionicons
            name={s <= rating ? 'star' : 'star-outline'}
            size={sz}
            color={s <= rating ? colors.tertiary : colors.textLight}
          />
        </Pressable>
      ))}
      {rating > 0 && (
        <Text style={{ fontSize: 12, color: colors.textLight, marginLeft: 8 }}>
          {rating.toFixed(1)}/5
        </Text>
      )}
    </View>
  );
}
