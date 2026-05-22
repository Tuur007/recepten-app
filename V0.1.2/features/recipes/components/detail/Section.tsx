import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../../constants/Designsystem';

interface Props {
  title: string;
  count: number;
  suffix?: string;
}

export function Section({ title, count, suffix }: Props) {
  return (
    <View style={styles.header}>
      <Text style={typography.folioBold}>{title}</Text>
      <View style={styles.rule} />
      <Text style={typography.folio}>
        {count} {suffix ?? ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  rule: { flex: 1, height: 1, backgroundColor: colors.borderColor },
});
