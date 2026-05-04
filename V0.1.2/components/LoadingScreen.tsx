import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { colors, typography, spacing } from '../constants/Designsystem'; // ✅ FIXED

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Laden...' }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator 
        size="large" 
        color={colors.primary} // ✅ ORANGE
      />
      <Text style={[typography.body16, styles.message]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // ✅ WARM CREAM
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  message: {
    color: colors.textMedium,
    marginTop: spacing.md,
  },
});
