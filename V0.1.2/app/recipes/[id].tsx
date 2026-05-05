/**
 * 🎨 RECEPT DETAIL — magazine layout met dotted leaders + italic stappen
 *
 * Vervang: V0.1.2/app/recipes/[id].tsx
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useRecipes } from '../../features/recipes/hooks';
import { LoadingScreen } from '../../components/LoadingScreen';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';

const PAPER = colors.background;

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes, isLoading, update } = useRecipes();

  const recipe = recipes.find((r) => r.id === id);

  if (isLoading) return <LoadingScreen />;
  if (!recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={[typography.bodyItalic, { textAlign: 'center', marginTop: 40 }]}>
          Recept niet gevonden.
        </Text>
      </SafeAreaView>
    );
  }

  const splitTitle = (title: string) => {
    const words = title.trim().split(' ');
    if (words.length === 1) return { lead: '', tail: title };
    return { lead: words.slice(0, -1).join(' '), tail: words[words.length - 1] };
  };
  const { lead, tail } = splitTitle(recipe.title);

  const stats = [
    { icon: 'time-outline', v: String(recipe.totalTime ?? 45), u: 'min' },
    { icon: 'people-outline', v: String(recipe.servings ?? 4), u: 'pers' },
    { icon: 'flame-outline', v: String(recipe.calories ?? 520), u: 'kcal' },
    { icon: 'star-outline', v: String(recipe.rating ?? '4.8'), u: 'top' },
  ] as const;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={typography.folio}>recept · {recipe.category ?? 'pasta'}</Text>
        <TouchableOpacity
          onPress={() => update(recipe.id, { isFavorite: !recipe.isFavorite })}
        >
          <Ionicons
            name={recipe.isFavorite ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={colors.textDark}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Title block */}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Text style={typography.label12}>nummer 01 · klassieker</Text>
          {lead.length > 0 && (
            <Text style={[typography.hero32Bold, { fontSize: 42, marginTop: 8 }]}>
              {lead}
            </Text>
          )}
          <Text style={[typography.heroItalic, { fontSize: 42 }]}>{tail}</Text>
          {recipe.description && (
            <Text style={[typography.bodyItalic, { marginTop: 14 }]}>
              "{recipe.description}"
            </Text>
          )}
        </View>

        {/* Hero photo */}
        <View style={{ marginTop: spacing.lg }}>
          {recipe.imageUri ? (
            <Image source={{ uri: recipe.imageUri }} style={styles.hero} />
          ) : (
            <View style={[styles.hero, styles.placeholder]} />
          )}
        </View>

        {/* Stats — typografisch, geen kaders */}
        <View style={styles.stats}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statCol}>
              <Ionicons name={s.icon as any} size={16} color={colors.textLight} />
              <Text style={styles.statValue}>{s.v}</Text>
              <Text style={typography.label12}>{s.u}</Text>
            </View>
          ))}
        </View>

        {/* Ingrediënten */}
        <Section title="i. ingrediënten" count={recipe.ingredients?.length ?? 0} />
        <View style={{ paddingHorizontal: spacing.lg, gap: 10 }}>
          {(recipe.ingredients ?? []).map((ing: any, i: number) => (
            <View key={i} style={styles.ingRow}>
              <Text style={styles.ingNum}>{ing.quantity ?? ''}</Text>
              <Text style={styles.ingUnit}>{ing.unit ?? ''}</Text>
              <Text style={styles.ingName}>{ing.name}</Text>
            </View>
          ))}
        </View>

        {/* Werkwijze */}
        <Section title="ii. werkwijze" count={recipe.steps?.length ?? 0} suffix="stappen" />
        <View style={{ paddingHorizontal: spacing.lg, gap: 16 }}>
          {(recipe.steps ?? []).map((step: any, i: number) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <Text style={styles.stepText}>
                {typeof step === 'string' ? step : step.text}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.ctaBar}>
        <TouchableOpacity style={styles.cta} activeOpacity={0.85}>
          <Text style={typography.buttonLabel}>begin met koken</Text>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={PAPER}
            style={{ marginLeft: 10 }}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctaIcon} activeOpacity={0.7}>
          <Ionicons name="add" size={20} color={colors.textDark} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Section({
  title,
  count,
  suffix,
}: {
  title: string;
  count: number;
  suffix?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={typography.folioBold}>{title}</Text>
      <View style={styles.rule} />
      <Text style={typography.folio}>
        {count} {suffix ?? ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAPER },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  hero: { width: '100%', height: 240, backgroundColor: colors.backgroundLight },
  placeholder: { backgroundColor: colors.backgroundLight },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    justifyContent: 'space-between',
  },
  statCol: { alignItems: 'center', flex: 1 },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textDark,
    marginTop: 6,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  rule: { flex: 1, height: 1, backgroundColor: colors.borderColor },
  ingRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  ingNum: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.primary,
    width: 38,
    textAlign: 'right',
  },
  ingUnit: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.textLight,
    textTransform: 'uppercase',
    width: 56,
  },
  ingName: { flex: 1, fontFamily: fonts.display, fontSize: 15 },
  stepRow: { flexDirection: 'row', gap: 10 },
  stepNum: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 22,
    color: colors.primary,
    width: 28,
  },
  stepText: { flex: 1, fontFamily: fonts.display, fontSize: 15, lineHeight: 22 },
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: PAPER,
    borderTopWidth: 1,
    borderTopColor: colors.borderColor,
    flexDirection: 'row',
    padding: spacing.md,
    gap: 10,
    alignItems: 'center',
  },
  cta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textDark,
    paddingVertical: 14,
    borderRadius: 999,
  },
  ctaIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.textDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
