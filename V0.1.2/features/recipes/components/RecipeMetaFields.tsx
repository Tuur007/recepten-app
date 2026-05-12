import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, fonts, spacing } from '../../../constants/Designsystem';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface Props {
  preparationTime?: number;
  cookingTime?: number;
  servings?: number;
  difficulty?: Difficulty;
  onPrepChange: (mins: number | undefined) => void;
  onCookChange: (mins: number | undefined) => void;
  onServingsChange: (servings: number | undefined) => void;
  onDifficultyChange: (d: Difficulty | undefined) => void;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Makkelijk',
  medium: 'Gemiddeld',
  hard: 'Moeilijk',
};
const DIFFICULTY_OPTIONS: Difficulty[] = ['easy', 'medium', 'hard'];

function parseIntOrUndefined(s: string): number | undefined {
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function RecipeMetaFields({
  preparationTime,
  cookingTime,
  servings,
  difficulty,
  onPrepChange,
  onCookChange,
  onServingsChange,
  onDifficultyChange,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Voorbereiden (min)</Text>
          <TextInput
            style={styles.input}
            value={preparationTime != null ? String(preparationTime) : ''}
            onChangeText={(t) => onPrepChange(parseIntOrUndefined(t))}
            placeholder="15"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            returnKeyType="next"
          />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Koken (min)</Text>
          <TextInput
            style={styles.input}
            value={cookingTime != null ? String(cookingTime) : ''}
            onChangeText={(t) => onCookChange(parseIntOrUndefined(t))}
            placeholder="30"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            returnKeyType="next"
          />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Porties</Text>
          <TextInput
            style={styles.input}
            value={servings != null ? String(servings) : ''}
            onChangeText={(t) => onServingsChange(parseIntOrUndefined(t))}
            placeholder="4"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            returnKeyType="done"
          />
        </View>
      </View>

      <View style={styles.diffRow}>
        <Text style={styles.label}>Moeilijkheid</Text>
        <View style={styles.diffChips}>
          {DIFFICULTY_OPTIONS.map((d) => {
            const active = difficulty === d;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onDifficultyChange(active ? undefined : d)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {DIFFICULTY_LABEL[d]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1, gap: 6 },
  diffRow: { gap: 6 },
  diffChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  input: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    paddingVertical: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderColor,
    backgroundColor: colors.background,
  },
  chipActive: {
    backgroundColor: colors.textDark,
    borderColor: colors.textDark,
  },
  chipText: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.textLight,
  },
  chipTextActive: { color: colors.background },
});
