import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, spacing } from '../../constants/Designsystem';
import { haptics as hapticsHelper } from '../../utils/feedback';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: ViewStyle;
}

const variantContainerStyle: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.backgroundLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  danger: { backgroundColor: colors.error },
  ghost: { backgroundColor: 'transparent' },
};

const variantLabelStyle: Record<Variant, { color: string }> = {
  primary: { color: '#fff' },
  secondary: { color: colors.primary },
  danger: { color: '#fff' },
  ghost: { color: colors.primary },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  haptic = true,
  disabled,
  style,
  onPress,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={isDisabled}
      onPressIn={() => {
        scale.value = withTiming(0.96, { duration: 80 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      onPress={(event) => {
        if (haptic) hapticsHelper.light();
        onPress?.(event);
      }}
      style={[
        styles.base,
        variantContainerStyle[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary}
        />
      ) : (
        <Text style={[styles.label, variantLabelStyle[variant]]}>{label}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.45 },
  label: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
});
