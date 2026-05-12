import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ToastConfigParams } from 'react-native-toast-message';
import { colors, fonts, shadows, spacing } from '../../constants/Designsystem';

interface ToastBodyProps {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  text1?: string;
  text2?: string;
  accent: string;
}

function ToastBody({ iconName, iconColor, text1, text2, accent }: ToastBodyProps) {
  return (
    <View style={[styles.container, { borderLeftColor: accent }]}>
      <Ionicons name={iconName} size={20} color={iconColor} />
      <View style={styles.textCol}>
        {text1 ? <Text style={styles.title}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
      </View>
    </View>
  );
}

export const toastConfig = {
  success: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <ToastBody
      iconName="checkmark-circle"
      iconColor={colors.secondary}
      accent={colors.secondary}
      text1={text1}
      text2={text2}
    />
  ),
  error: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <ToastBody
      iconName="alert-circle"
      iconColor={colors.error}
      accent={colors.error}
      text1={text1}
      text2={text2}
    />
  ),
  info: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <ToastBody
      iconName="information-circle"
      iconColor={colors.tertiary}
      accent={colors.tertiary}
      text1={text1}
      text2={text2}
    />
  ),
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
    minWidth: '85%',
    ...shadows.medium,
  },
  textCol: { flex: 1, gap: 2 },
  title: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textDark,
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMedium,
    lineHeight: 17,
  },
});
