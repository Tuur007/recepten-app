import React, { useRef, useState } from 'react'
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, shadows } from '../../../constants/Designsystem'
import { Recipe } from '../../../types/recipe'
import { RecipeShareCard } from '../../../components/ui/RecipeShareCard'
import { shareRecipeCard } from '../../../utils/shareRecipe'
import { haptics, toast } from '../../../utils/feedback'

interface RecipeCardProps {
  recipe: Recipe
  onPress: () => void
  onToggleFavorite: (newFavorite: boolean) => void
}

function toDisplayUri(uri: string): string {
  if (uri.startsWith('file://') || uri.startsWith('data:') || uri.startsWith('http')) return uri;
  return `file://${uri}`;
}

export function RecipeCard({
  recipe,
  onPress,
  onToggleFavorite,
}: RecipeCardProps) {
  const bgColor = recipe.isFavorite ? '#d4a574' : '#9dd4c3'
  const shareRef = useRef<View>(null)
  const [sharing, setSharing] = useState(false)

  const handleShare = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    if (sharing) return
    setSharing(true)
    haptics.light()
    await new Promise((r) => setTimeout(r, 100))
    try {
      await shareRecipeCard(
        shareRef,
        `recept-${recipe.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('Delen mislukt', msg)
    } finally {
      setSharing(false)
    }
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View
        ref={shareRef}
        collapsable={false}
        style={styles.offscreen}
        pointerEvents="none"
      >
        <RecipeShareCard recipe={recipe} />
      </View>
      <View style={styles.imageContainer}>
        {recipe.imageUri ? (
          <Image source={{ uri: toDisplayUri(recipe.imageUri) }} style={styles.image} />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: bgColor }]} />
        )}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation()
            onToggleFavorite(!recipe.isFavorite)
          }}
          hitSlop={10}
          style={styles.favoriteBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name={recipe.isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={recipe.isFavorite ? colors.error : '#fff'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{recipe.title}</Text>

        <View style={styles.meta}>
          {recipe.preparationTime != null || recipe.cookingTime != null ? (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={colors.primary} />
              <Text style={styles.metaText}>
                {recipe.preparationTime != null ? `${recipe.preparationTime}p` : '—'}
                {' · '}
                {recipe.cookingTime != null ? `${recipe.cookingTime}k` : '—'}
              </Text>
            </View>
          ) : recipe.duration ? (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={colors.primary} />
              <Text style={styles.metaText}>{recipe.duration} min</Text>
            </View>
          ) : null}
          {recipe.servings ? (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={12} color={colors.primary} />
              <Text style={styles.metaText}>{recipe.servings}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="restaurant-outline" size={12} color={colors.primary} />
            <Text style={styles.metaText}>{recipe.ingredients.length}</Text>
          </View>
        </View>

        {recipe.rating && recipe.rating > 0 ? (
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons
                key={s}
                name={s <= recipe.rating! ? 'star' : 'star-outline'}
                size={10}
                color={colors.primary}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.bottomRow}>
          <Text style={styles.date}>
            {new Date(recipe.createdAt).toLocaleDateString('nl-NL', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          <TouchableOpacity
            onPress={handleShare}
            hitSlop={8}
            disabled={sharing}
            style={styles.shareBtn}
          >
            <Ionicons
              name="share-social-outline"
              size={14}
              color={sharing ? colors.textFaint : colors.textLight}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderColor,
    ...shadows.sm,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 110,
  },
  image: {
    width: '100%',
    height: '100%',
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
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  date: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  shareBtn: { padding: 2 },
  offscreen: { position: 'absolute', left: -9999, top: -9999 },
})
