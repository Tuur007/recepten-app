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
      <View style={styles.imageContainer}>
        <View style={[styles.imagePlaceholder, { 
          backgroundColor: recipe.isFavorite ? '#d4a574' : '#9dd4c3'
        }]} />
        <TouchableOpacity 
          onPress={onToggleFavorite} 
          hitSlop={10} 
          style={styles.favoriteBtn}
        >
          <Ionicons
            name={recipe.isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={recipe.isFavorite ? Colors.danger : '#fff'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{recipe.title}</Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="restaurant-outline" size={12} color={Colors.primary} />
            <Text style={styles.metaText}>{recipe.ingredients.length}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="timer-outline" size={12} color={Colors.primary} />
            <Text style={styles.metaText}>30m</Text>
          </View>
        </View>

        <Text style={styles.date}>
          {new Date(recipe.createdAt).toLocaleDateString('nl-NL', {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 110,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { 
    padding: 12,
    gap: 6,
  },
  title: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: Colors.text,
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  date: { 
    fontSize: 11, 
    color: Colors.textSecondary,
    marginTop: 2,
  },
});