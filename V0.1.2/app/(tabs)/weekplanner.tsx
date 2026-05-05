/**
 * 🎨 WEEKPLANNER — typografische lijst, dotted leaders voor lege dagen
 *
 * Vervang: V0.1.2/app/(tabs)/weekplanner.tsx
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useRecipes } from '../../features/recipes/hooks';
import { LoadingScreen } from '../../components/LoadingScreen';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';

const PAPER = colors.background;

const DAYS = [
  { d: 'maandag', date: 5 },
  { d: 'dinsdag', date: 6 },
  { d: 'woensdag', date: 7 },
  { d: 'donderdag', date: 8 },
  { d: 'vrijdag', date: 9 },
  { d: 'zaterdag', date: 10 },
  { d: 'zondag', date: 11 },
];

export default function WeekPlannerScreen() {
  const router = useRouter();
  const { recipes, isLoading } = useRecipes();

  // Voor demo: koppel eerste 5 recepten aan dagen
  const week = useMemo(() => {
    return DAYS.map((d, i) => ({
      ...d,
      recipe: recipes[i] && i !== 2 && i !== 6 ? recipes[i] : null,
    }));
  }, [recipes]);

  if (isLoading) return <LoadingScreen />;

  const familyKeys = ['tuur', 'louise', 'basiel', 'jules'] as const;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Folio */}
        <View style={styles.folio}>
          <Text style={typography.folio}>p. 19</Text>
          <Text style={typography.folio}>week 19 · mei</Text>
        </View>

        {/* Title */}
        <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
          <Text style={[typography.hero32Bold, { fontSize: 38 }]}>Een week</Text>
          <Text style={[typography.heroItalic, { fontSize: 22, marginTop: 4 }]}>
            op tafel.
          </Text>
          <View style={styles.divider} />
        </View>

        {/* Days */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          {week.map((day, i) => {
            const who = familyKeys[i % familyKeys.length];
            const recipe = day.recipe;
            return (
              <TouchableOpacity
                key={day.d}
                style={styles.dayRow}
                activeOpacity={0.7}
                onPress={() => recipe && router.push(`/recipes/${recipe.id}`)}
              >
                <Text style={styles.dayName}>{day.d}</Text>

                {recipe ? (
                  <View style={styles.recipeRow}>
                    {recipe.imageUri ? (
                      <Image source={{ uri: recipe.imageUri }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbPlaceholder]} />
                    )}
                    <Text style={styles.recipeTitle} numberOfLines={1}>
                      {recipe.title}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptyRow}>
                    <Ionicons name="add" size={12} color={colors.textFaint} />
                    <Text style={styles.emptyText}>kies een recept</Text>
                  </View>
                )}

                <View style={styles.metaCol}>
                  {recipe && (
                    <View
                      style={[
                        styles.familyDot,
                        { backgroundColor: colors.family[who] },
                      ]}
                    />
                  )}
                  <Text style={styles.dateMono}>{day.date}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer hint */}
        <View style={styles.footerHint}>
          <Ionicons name="sparkles-outline" size={12} color={colors.textLight} />
          <Text style={styles.footerHintText}>laat ons de gaten vullen</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAPER },
  folio: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  divider: {
    width: 32,
    height: 1,
    backgroundColor: colors.borderColor,
    marginTop: spacing.sm,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  dayName: {
    width: 80,
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 14,
    color: 'rgba(25,22,19,0.45)',
  },
  recipeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumb: { width: 32, height: 32, borderRadius: 16 },
  thumbPlaceholder: { backgroundColor: colors.backgroundLight },
  recipeTitle: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textDark,
  },
  emptyRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.disabled,
    borderStyle: 'dashed',
    paddingBottom: 4,
  },
  emptyText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textFaint,
  },
  metaCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  familyDot: { width: 6, height: 6, borderRadius: 3 },
  dateMono: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textFaint,
    width: 16,
    textAlign: 'right',
  },
  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
  },
  footerHintText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 12,
    color: colors.textLight,
  },
});
