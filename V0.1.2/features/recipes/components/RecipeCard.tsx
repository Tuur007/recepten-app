import React from 'react';
import {
  Alert,
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
  onDelete: () => void;
}

export function RecipeCard({ recipe, onPress, onDelete }: RecipeCardProps) {
  const handleDelete = () => {
    Alert.alert(
      'Delete Recipe',
      `Delete "${recipe.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  const date = new Date(recipe.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{recipe.title}</Text>
        <View style={styles.meta}>
          <View style={styles.badge}>
            <Ionicons name="restaurant-outline" size={12} color={Colors.primary} />
            <Text style={styles.badgeText}>
              {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="list-outline" size={12} color={Colors.primary} />
            <Text style={styles.badgeText}>
              {recipe.steps.length} step{recipe.steps.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {recipe.sourceUrl ? (
            <View style={styles.badge}>
              <Ionicons name="link-outline" size={12} color={Colors.primary} />
              <Text style={styles.badgeText}>Imported</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.date}>{date}</Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} hitSlop={8}>
        <Ionicons name="trash-outline" size={18} color={Colors.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  body: { flex: 1, gap: 6 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.text },
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
  badgeText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  date: { fontSize: 12, color: Colors.textSecondary },
  deleteBtn: { padding: 4, marginLeft: 8 },
});
