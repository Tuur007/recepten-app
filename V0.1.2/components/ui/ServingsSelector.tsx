import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../constants/Designsystem';

interface Props {
  current: number;
  defaultServings: number;
  onChange: (servings: number) => void;
}

export function ServingsSelector({ current, defaultServings, onChange }: Props) {
  const dec = () => onChange(Math.max(1, current - 1));
  const inc = () => onChange(current + 1);

  const label = current === 1 ? '1 persoon' : `${current} personen`;

  // Show scale factor only when different from the recipe default
  const ratio = defaultServings > 0 ? current / defaultServings : 1;
  const showFactor = current !== defaultServings;
  const factorLabel = ratio % 1 === 0
    ? `×${ratio}`
    : `×${(Math.round(ratio * 100) / 100).toFixed(2).replace(/\.?0+$/, '')}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={dec}
          hitSlop={10}
          activeOpacity={0.7}
          disabled={current <= 1}
          style={[styles.btn, current <= 1 && styles.btnDisabled]}
        >
          <Ionicons name="remove" size={18} color={current <= 1 ? colors.textFaint : colors.primary} />
        </TouchableOpacity>

        <View style={styles.center}>
          <Text style={styles.number}>{current}</Text>
          <Text style={styles.personLabel}>{label}</Text>
        </View>

        <TouchableOpacity onPress={inc} hitSlop={10} activeOpacity={0.7} style={styles.btn}>
          <Ionicons name="add" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {showFactor && (
        <Text style={styles.factor}>{factorLabel} van origineel</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderColor,
    alignItems: 'center',
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    borderColor: colors.borderSoft,
  },
  center: {
    alignItems: 'center',
    minWidth: 80,
  },
  number: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.textDark,
    lineHeight: 36,
  },
  personLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textLight,
    marginTop: 2,
  },
  factor: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.primary,
  },
});
