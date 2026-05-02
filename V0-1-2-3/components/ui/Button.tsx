import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import { Colors } from './colors';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantContainerStyle: Record<Variant, object> = {
  primary: { 
    background: 'linear-gradient(135deg, #d4a574 0%, #8B7B6B 100%)',
    backgroundColor: '#8B7B6B'
  },
  secondary: { 
    backgroundColor: Colors.primaryLight, 
    borderWidth: 1.5, 
    borderColor: Colors.primary 
  },
  danger: { backgroundColor: Colors.danger },
  ghost: { backgroundColor: 'transparent' },
};

const variantLabelStyle: Record<Variant, object> = {
  primary: { color: '#fff' },
  secondary: { color: Colors.primary },
  danger: { color: '#fff' },
  ghost: { color: Colors.primary },
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
          color={variant === 'primary' || variant === 'danger' ? '#fff' : Colors.primary}
        />
      ) : (
        <Text style={[styles.label, variantLabelStyle[variant]]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.45 },
  label: { fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
});