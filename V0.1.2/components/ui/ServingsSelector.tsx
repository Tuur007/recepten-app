import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../../constants/Designsystem';

const PRESETS = [1, 2, 3, 4, 6, 8, 12];

interface Props {
  current: number;
  defaultServings: number;
  onChange: (servings: number) => void;
}

/**
 * Horizontal preset row + custom ±1 controls for choosing servings.
 * Highlights the active preset; tapping it again resets to defaultServings.
 */
export function ServingsSelector({ current, defaultServings, onChange }: Props) {
  const dec = () => onChange(Math.max(1, current - 1));
  const inc = () => onChange(current + 1);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>personen</Text>

      <View style={styles.row}>
        {/* Preset chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presets}
        >
          {PRESETS.map((n) => {
            const active = n === current;
            return (
              <TouchableOpacity
                key={n}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onChange(n === current ? defaultServings : n)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Custom ± controls */}
        <View style={styles.stepper}>
          <TouchableOpacity onPress={dec} hitSlop={6} activeOpacity={0.7} disabled={current <= 1}>
            <Ionicons
              name="remove"
              size={16}
              color={current <= 1 ? colors.textFaint : colors.primary}
            />
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{current}</Text>
          <TouchableOpacity onPress={inc} hitSlop={6} activeOpacity={0.7}>
            <Ionicons name="add" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderColor,
    gap: 8,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  presets: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.textLight,
  },
  chipTextActive: {
    color: colors.background,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 1,
    borderLeftColor: colors.borderColor,
    paddingLeft: 12,
  },
  stepperValue: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.textDark,
    minWidth: 24,
    textAlign: 'center',
  },
});
