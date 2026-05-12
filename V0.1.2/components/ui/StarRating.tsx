import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../constants/Designsystem';
import { haptics } from '../../utils/feedback';

interface StarRatingProps {
  rating?: number;
  onRate?: (rating: number) => void;
  size?: 'small' | 'medium' | 'large';
  readonly?: boolean;
}

const SIZE_MAP = { small: 16, medium: 20, large: 24 };

interface StarProps {
  filled: boolean;
  size: number;
  onPress: () => void;
  disabled: boolean;
}

function Star({ filled, size, onPress, disabled }: StarProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(1.25, { duration: 90 }),
      withTiming(1, { duration: 140 }),
    );
    onPress();
  };

  return (
    <Pressable onPress={handlePress} disabled={disabled} hitSlop={4}>
      <Animated.View style={animatedStyle}>
        <Ionicons
          name={filled ? 'star' : 'star-outline'}
          size={size}
          color={filled ? colors.tertiary : colors.textLight}
        />
      </Animated.View>
    </Pressable>
  );
}

export function StarRating({ rating = 0, onRate, size = 'medium', readonly = false }: StarRatingProps) {
  const sz = SIZE_MAP[size];
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          filled={s <= rating}
          size={sz}
          disabled={readonly}
          onPress={() => {
            if (readonly) return;
            haptics.selection();
            onRate?.(s);
          }}
        />
      ))}
      {rating > 0 && (
        <Text style={{ fontSize: 12, color: colors.textLight, marginLeft: 8 }}>
          {rating.toFixed(1)}/5
        </Text>
      )}
    </View>
  );
}
