// components/ui/NutritionPanel.tsx
//
// Toont nutritie per portie als 4-cellen grid + italic context-regel. Wanneer
// er nog geen data is, wordt een primary-knop getoond die de berekening start.
// Tijdens berekening laten we een ActivityIndicator zien — geen toast — omdat
// de OFF-lookups merkbaar duren (5-15s voor een doorsnee recept).

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { NutritionInfo } from '../../types/recipe';
import { colors, spacing, fonts } from '../../constants/Designsystem';

interface Props {
  nutrition?: NutritionInfo;
  loading?: boolean;
  onCompute: () => void;
}

function Cell({ value, unit, label }: { value: number | undefined; unit: string; label: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellValue}>
        {value != null ? `${value}` : '—'}
        {value != null && unit ? <Text style={styles.cellUnit}>{unit}</Text> : null}
      </Text>
      <Text style={styles.cellLabel}>{label}</Text>
    </View>
  );
}

function formatComputedAt(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString('nl-BE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function NutritionPanel({ nutrition, loading, onCompute }: Props) {
  if (!nutrition && !loading) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyHint}>
          Nog geen nutritiewaarden berekend. We zoeken elk ingrediënt op via
          Open Food Facts en schalen naar één portie.
        </Text>
        <TouchableOpacity style={styles.cta} onPress={onCompute} activeOpacity={0.8}>
          <Text style={styles.ctaLabel}>bereken nutritie</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.emptyWrap}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.emptyHint, { marginTop: spacing.sm }]}>
          Ingrediënten opzoeken in Open Food Facts…
        </Text>
      </View>
    );
  }

  const n = nutrition!;
  const matchedNote =
    n.matchedIngredients != null && n.totalIngredients != null
      ? `${n.matchedIngredients} van ${n.totalIngredients} ingrediënten gematcht`
      : undefined;
  const dateNote = formatComputedAt(n.computedAt);

  return (
    <View>
      <View style={styles.grid}>
        <Cell value={n.calories} unit=" kcal" label="energie" />
        <Cell value={n.protein}  unit="g"    label="eiwit" />
        <Cell value={n.carbs}    unit="g"    label="koolhydr." />
        <Cell value={n.fat}      unit="g"    label="vet" />
      </View>
      {(n.fiber != null || n.sugar != null || n.salt != null) && (
        <View style={[styles.grid, { borderTopWidth: 0 }]}>
          <Cell value={n.fiber} unit="g" label="vezels" />
          <Cell value={n.sugar} unit="g" label="suiker" />
          <Cell value={n.salt}  unit="g" label="zout" />
          <View style={styles.cell} />
        </View>
      )}
      <Text style={styles.footnote}>
        {matchedNote ? matchedNote : null}
        {matchedNote && dateNote ? ' · ' : null}
        {dateNote ? `berekend op ${dateNote}` : null}
      </Text>
      <TouchableOpacity onPress={onCompute} activeOpacity={0.7} style={styles.recomputeBtn}>
        <Text style={styles.recomputeLabel}>opnieuw berekenen</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  emptyHint: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  cta: {
    marginTop: spacing.md,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.textDark,
  },
  ctaLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.background,
  },
  grid: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: colors.borderColor,
    marginHorizontal: spacing.lg,
  },
  cell: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderLeftWidth: 0.5,
    borderLeftColor: colors.borderSoft,
  },
  cellValue: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.textDark,
  },
  cellUnit: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textLight,
  },
  cellLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
    marginTop: 4,
  },
  footnote: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 11,
    color: colors.textLight,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  recomputeBtn: {
    alignSelf: 'center',
    marginTop: 6,
    paddingVertical: 6,
  },
  recomputeLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.primary,
  },
});
