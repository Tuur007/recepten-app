import React, { useMemo, useState, useCallback } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRecipes } from '../../features/recipes/hooks'
import { RecipeCard } from '../../features/recipes/components/RecipeCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingScreen } from '../../components/LoadingScreen'
import { ErrorBoundary } from '../../components/ErrorBoundary'

import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../../constants/Designsystem'

const { width } = Dimensions.get('window')

export default function RecipesScreen() {
  const router = useRouter()
  const { filter } = useLocalSearchParams()
  const { recipes, isLoading, update } = useRecipes()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const isFavoritesMode = filter === 'favorites'

  const categories = useMemo(() => {
    const cats = new Set(recipes.map((r) => r.category).filter(Boolean))
    return Array.from(cats).sort()
  }, [recipes])

  const filteredRecipes = useMemo(() => {
    let filtered = recipes

    if (isFavoritesMode) {
      filtered = filtered.filter((r) => r.isFavorite)
    }

    if (selectedCategory) {
      filtered = filtered.filter((r) => r.category === selectedCategory)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter((r) =>
        r.title.toLowerCase().includes(search) ||
        r.category.toLowerCase().includes(search)
      )
    }

    return filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })
  }, [recipes, isFavoritesMode, selectedCategory, searchTerm])

  const handleCategorySelect = useCallback((category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category)
  }, [selectedCategory])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={typography.hero32Bold}>
            {isFavoritesMode ? '❤️ Favorieten' : '📖 Recepten'}
          </Text>
          {filteredRecipes.length > 0 && (
            <Text style={[typography.caption14, { color: colors.textLight }]}>
              {filteredRecipes.length} recept{filteredRecipes.length !== 1 ? 'en' : ''}
            </Text>
          )}
        </View>

        <ScrollView
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.searchSection}>
            <View style={styles.searchInput}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <Text
                onPress={() => setSearchTerm('')}
                style={styles.searchPlaceholder}
              >
                {searchTerm || 'Zoek recepten...'}
              </Text>
              {searchTerm && (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {!isFavoritesMode && categories.length > 0 && (
            <View style={styles.categoriesSection}>
              <Text style={[typography.caption14Medium, { color: colors.textSecondary }]}>
                CATEGORIEËN
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesList}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryTag,
                      selectedCategory === cat && styles.categoryTagActive,
                    ]}
                    onPress={() => handleCategorySelect(cat)}
                  >
                    <Text
                      style={[
                        typography.caption14,
                        {
                          color:
                            selectedCategory === cat
                              ? colors.white
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {filteredRecipes.length > 0 ? (
            <FlatList
              scrollEnabled={false}
              data={filteredRecipes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <RecipeCard
                  recipe={item}
                  onPress={() => router.push(`/recipes/${item.id}`)}
                  onToggleFavorite={() =>
                    update(item.id, { isFavorite: !item.isFavorite })
                  }
                />
              )}
              contentContainerStyle={styles.recipesList}
              gap={spacing.md}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <EmptyState
                icon={isFavoritesMode ? '❤️' : '📖'}
                title={isFavoritesMode ? 'Geen favorieten' : 'Geen recepten'}
                description={
                  isFavoritesMode
                    ? 'Markeer recepten als favoriet'
                    : searchTerm || selectedCategory
                      ? 'Geen recepten gevonden'
                      : 'Voeg je eerste recept toe'
                }
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },

  searchSection: {
    marginBottom: spacing.lg,
  },

  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },

  searchPlaceholder: {
    flex: 1,
    ...typography.caption14,
    color: colors.textSecondary,
  },

  categoriesSection: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },

  categoriesList: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },

  categoryTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  categoryTagActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  recipesList: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 400,
  },
})
