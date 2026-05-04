import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, spacing, shadows } from '../../constants/Designsystem'; // ✅ FIXED

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...props }: CardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundCard, // ✅ #FFF8DC CREAM
    borderRadius: 16,
    padding: spacing.md,
    marginVertical: spacing.sm,
    ...shadows.medium,
  },
});
