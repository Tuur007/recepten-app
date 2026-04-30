import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../components/ui/colors';
import { Recipe } from '../../../types/recipe';

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
  onToggleFavorite: () => void;
}

export function RecipeCard({ recipe, onPress, onToggleFavorite }: RecipeCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{recipe.title}</Text>
          <TouchableOpacity onPress={onToggleFavorite} hitSlop={10} style={styles.favoriteBtn}>
            <Ionicons
              name={recipe.isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={recipe.isFavorite ? Colors.danger : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.meta}>
          {recipe.category ? (
            <View style={[styles.badge, styles.categoryBadge]}>
              <Text style={styles.categoryBadgeText}>{recipe.category}</Text>
            </View>
          ) : null}
          <View style={styles.badge}>
            <Ionicons name="restaurant-outline" size={11} color={Colors.primary} />
            <Text style={styles.badgeText}>
              {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 'en' : ''}
            </Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="list-outline" size={11} color={Colors.primary} />
            <Text style={styles.badgeText}>
              {recipe.steps.length} {recipe.steps.length !== 1 ? 'stappen' : 'stap'}
            </Text>
          </View>
          {recipe.sourceUrl ? (
            <View style={styles.badge}>
              <Ionicons name="link-outline" size={11} color={Colors.primary} />
              <Text style={styles.badgeText}>Geïmporteerd</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.date}>
          {new Date(recipe.createdAt).toLocaleDateString('nl-NL', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  body: { gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1, lineHeight: 22 },
  favoriteBtn: { paddingTop: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
  },
  categoryBadge: {
    backgroundColor: Colors.accentLight,
  },
  categoryBadgeText: { fontSize: 11, color: Colors.accent, fontWeight: '600' },
  badgeText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  date: { fontSize: 12, color: Colors.textSecondary },
});
