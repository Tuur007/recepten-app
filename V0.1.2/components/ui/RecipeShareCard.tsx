// components/ui/RecipeShareCard.tsx
//
// Off-screen renderbare receptkaart, bedoeld om gecaptured te worden via
// react-native-view-shot. Vaste 360px breedte zodat de gegenereerde PNG
// voorspelbaar afmeet, ongeacht het toestelformaat.

import React from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, spacing } from '../../constants/Designsystem';
import type { Recipe } from '../../types/recipe';

const CARD_WIDTH = 360;
const IMAGE_HEIGHT = 220;
const MAX_INGREDIENT_LINES = 5;

const DIFFICULTY_LABEL: Record<NonNullable<Recipe['difficulty']>, string> = {
  easy: 'eenvoudig',
  medium: 'middel',
  hard: 'pittig',
};

function toDisplayUri(uri: string): string {
  if (uri.startsWith('file://') || uri.startsWith('data:') || uri.startsWith('http')) {
    return uri;
  }
  return `file://${uri}`;
}

function splitTitle(title: string): { lead: string; tail: string } {
  const words = title.trim().split(/\s+/);
  if (words.length <= 1) return { lead: '', tail: title.trim() };
  return { lead: words.slice(0, -1).join(' '), tail: words[words.length - 1] };
}

function formatIngredient(name: string, quantity: number, unit: string): string {
  const qty =
    Number.isFinite(quantity) && quantity > 0
      ? Number.isInteger(quantity)
        ? String(quantity)
        : quantity.toFixed(1)
      : '';
  const u = unit?.trim() ?? '';
  const prefix = [qty, u].filter(Boolean).join(' ');
  return prefix ? `${prefix} ${name}` : name;
}

export interface RecipeShareCardProps {
  recipe: Recipe;
  style?: ViewStyle;
}

export function RecipeShareCard({ recipe, style }: RecipeShareCardProps) {
  const { lead, tail } = splitTitle(recipe.title);
  const sumTime = (recipe.preparationTime ?? 0) + (recipe.cookingTime ?? 0);
  const totalTime = recipe.duration ?? (sumTime > 0 ? sumTime : null);
  const visibleIngredients = recipe.ingredients.slice(0, MAX_INGREDIENT_LINES);
  const overflowCount = Math.max(0, recipe.ingredients.length - MAX_INGREDIENT_LINES);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.imageWrap}>
        {recipe.imageUri ? (
          <Image source={{ uri: toDisplayUri(recipe.imageUri) }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Ionicons name="restaurant-outline" size={48} color={colors.textFaint} />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.kickerRow}>
          <Text style={styles.kicker}>
            · {(recipe.category || 'recept').toLowerCase()} ·
          </Text>
          {recipe.difficulty ? (
            <Text style={styles.difficulty}>{DIFFICULTY_LABEL[recipe.difficulty]}</Text>
          ) : null}
        </View>

        <View style={styles.titleBlock}>
          {lead.length > 0 ? <Text style={styles.titleLead}>{lead}</Text> : null}
          <Text style={styles.titleTail}>{tail}.</Text>
        </View>

        <View style={styles.metaRow}>
          {totalTime ? (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={colors.primary} />
              <Text style={styles.metaText}>{totalTime} min</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={12} color={colors.primary} />
            <Text style={styles.metaText}>{recipe.servings ?? 4} pers</Text>
          </View>
          {recipe.rating && recipe.rating > 0 ? (
            <View style={styles.metaItem}>
              <Ionicons name="star" size={12} color={colors.primary} />
              <Text style={styles.metaText}>{recipe.rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>ingrediënten</Text>
        <View style={styles.ingredientsBlock}>
          {visibleIngredients.map((ing) => (
            <Text key={ing.id} style={styles.ingredient} numberOfLines={1}>
              • {formatIngredient(ing.name, ing.quantity, ing.unit)}
            </Text>
          ))}
          {overflowCount > 0 ? (
            <Text style={styles.overflow}>+ {overflowCount} meer</Text>
          ) : null}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerLabel}>· recepten app ·</Text>
          <View style={styles.footerLine} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.background,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
    overflow: 'hidden',
  },
  imageWrap: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: colors.backgroundLight,
  },
  image: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },

  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },

  kickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kicker: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  difficulty: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.textLight,
  },

  titleBlock: { marginTop: 6 },
  titleLead: {
    fontFamily: fonts.display,
    fontWeight: '300',
    fontSize: 30,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: colors.textDark,
  },
  titleTail: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontWeight: '300',
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: colors.primary,
  },

  metaRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMedium,
  },

  divider: {
    height: 0.5,
    backgroundColor: colors.borderColor,
    marginVertical: spacing.sm,
  },

  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textLight,
    marginBottom: 6,
  },
  ingredientsBlock: { gap: 3 },
  ingredient: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.textDark,
    lineHeight: 18,
  },
  overflow: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.md,
  },
  footerLine: { flex: 1, height: 0.5, backgroundColor: colors.borderColor },
  footerLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
});
