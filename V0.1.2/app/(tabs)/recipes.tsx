import React, { useMemo, useState, useCallback } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native'
import { useRouter } from 'expo-router'
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

export default function RecipesScreen() {
  const router = useRouter()
  const { recipes, isLoading, update } = useRecipes()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const categories = useMemo(() => {
    const cats = new Set(recipes.map((r) => r.category).filter(Boolean))
    const catArray = Array.from(cats).sort()
    return ['Favorieten', ...catArray]
  }, [recipes])

  const filteredRecipes = useMemo(() => {
    let filtered = recipes

    if (selectedCategory === 'Favorieten') {
      filtered = filtered.filter((r) => r.isFavorite)
    } else if (selectedCategory) {
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
  }, [recipes, selectedCategory, searchTerm])

  const handleCategorySelect = useCallback((category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category)
  }, [selectedCategory])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() => router.push(`/recipes/${item.id}`)}
              onToggleFavorite={(newFavorite) =>
                update(item.id, { isFavorite: newFavorite })
              }
            />
          )}
          ListHeaderComponent={
            <>
              <View style={styles.header}>
                <Text style={typography.hero32Bold}>📖 Recepten</Text>
                {filteredRecipes.length > 0 && (
                  <Text style={[typography.caption14, { color: colors.textLight }]}>
                    {filteredRecipes.length} recept{filteredRecipes.length !== 1 ? 'en' : ''}
                  </Text>
                )}
              </View>

              <View style={styles.searchSection}>
                <View style={styles.searchInput}>
                  <Ionicons name="search" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={styles.searchTextInput}
                    placeholder="Zoek recepten..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                  />
                  {searchTerm && (
                    <TouchableOpacity onPress={() => setSearchTerm('')} hitSlop={10}>
                      <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {categories.length > 0 && (
                <View style={styles.categoriesSection}>
                  <Text style={[typography.caption14Medium, { color: colors.textSecondary }]}>
                    FILTER
                  </Text>
                  <FlatList
                    horizontal
                    scrollEnabled
                    showsHorizontalScrollIndicator={false}
                    data={categories}
                    keyExtractor={(cat) => cat}
                    renderItem={({ item: cat }) => (
                      <TouchableOpacity
                        style={[
                          styles.categoryTag,
                          selectedCategory === cat && styles.categoryTagActive,
                        ]}
                        onPress={() => handleCategorySelect(cat)}
                      >
                        {cat === 'Favorieten' ? (
                          <View style={styles.categoryTagContent}>
                            <Ionicons
                              name="heart"
                              size={14}
                              color={selectedCategory === cat ? colors.white : colors.error}
                            />
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
                          </View>
                        ) : (
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
                        )}
                      </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.categoriesList}
                  />
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <EmptyState
                icon="📖"
                title="Geen recepten"
                description={
                  searchTerm || selectedCategory
                    ? 'Geen recepten gevonden'
                    : 'Voeg je eerste recept toe'
                }
              />
            </View>
          }
          contentContainerStyle={styles.recipesList}
          showsVerticalScrollIndicator={false}
        />
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

  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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

  searchTextInput: {
    flex: 1,
    ...typography.caption14,
    color: colors.text,
    paddingVertical: 0,
  },

  categoriesSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
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

  categoryTagContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  recipesList: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 400,
  },
})
