import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import { colors, spacing, shadows } from '../../constants/Designsystem'; // ✅ FIXED

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantContainerStyle: Record<Variant, object> = {
  primary: {
    backgroundColor: colors.primary, // ✅ #FF6B35 ORANGE
  },
  secondary: { 
    backgroundColor: colors.backgroundLight,
    borderWidth: 1.5, 
    borderColor: colors.primary,
  },
  danger: { backgroundColor: colors.error },
  ghost: { backgroundColor: 'transparent' },
};

const variantLabelStyle: Record<Variant, object> = {
  primary: { color: '#fff' },
  secondary: { color: colors.primary },
  danger: { color: '#fff' },
  ghost: { color: colors.primary },
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantContainerStyle[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style as ViewStyle,
      ]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary}
        />
      ) : (
        <Text style={[styles.label, variantLabelStyle[variant]]}>{label}</Text>
      )}
    </TouchableOpacity>
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
