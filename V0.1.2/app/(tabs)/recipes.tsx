/**
 * 📖 RECIPES SCREEN - app/(tabs)/recipes.tsx
 * Features:
 * - Sort: Recent Added / Alphabetical A-Z / Cooking Time
 * - Duplicate prevention check
 * - Category filtering
 * - Search functionality
 */

import React, { useMemo, useState, useCallback } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Platform,
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

type SortOption = 'recent' | 'alphabetical' | 'duration'

export default function RecipesScreen() {
  const router = useRouter()
  const { recipes, isLoading, update } = useRecipes()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [fabMenuVisible, setFabMenuVisible] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [sortMenuVisible, setSortMenuVisible] = useState(false)

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
      switch (sortBy) {
        case 'alphabetical':
          return a.title.localeCompare(b.title, 'nl-NL')
        case 'duration':
          const durationA = a.duration ?? Infinity
          const durationB = b.duration ?? Infinity
          return durationA - durationB
        case 'recent':
        default:
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateB - dateA
      }
    })
  }, [recipes, selectedCategory, searchTerm, sortBy])

  const handleCategorySelect = useCallback((category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category)
  }, [selectedCategory])

  const handleAddManually = () => {
    setFabMenuVisible(false)
    router.push('/recipes/new')
  }

  const handleImportUrl = () => {
    setFabMenuVisible(false)
    router.push('/recipes/import')
  }

  const getSortLabel = () => {
    switch (sortBy) {
      case 'alphabetical':
        return 'A → Z'
      case 'duration':
        return 'Kooktijd'
      case 'recent':
      default:
        return 'Recent'
    }
  }

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
                    {filteredRecipes.length} recept
                    {filteredRecipes.length !== 1 ? 'en' : ''}
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
                    <TouchableOpacity
                      onPress={() => setSearchTerm('')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.sortButton}
                  onPress={() => setSortMenuVisible(true)}
                >
                  <Ionicons name="funnel" size={16} color={colors.primary} />
                  <Text style={[typography.small12, { color: colors.primary }]}>
                    {getSortLabel()}
                  </Text>
                </TouchableOpacity>
              </View>

              {categories.length > 0 && (
                <View style={styles.categoriesSection}>
                  <Text
                    style={[
                      typography.caption14Medium,
                      { color: colors.textSecondary },
                    ]}
                  >
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
                              color={
                                selectedCategory === cat
                                  ? colors.white
                                  : colors.error
                              }
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

        {/* ====== FAB BUTTON ====== */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setFabMenuVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>

        {/* ====== FAB MENU MODAL ====== */}
        <Modal
          visible={fabMenuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFabMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setFabMenuVisible(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Recept toevoegen</Text>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleAddManually}
              >
                <View style={styles.modalButtonIcon}>
                  <Ionicons
                    name="create-outline"
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.modalButtonContent}>
                  <Text style={styles.modalButtonTitle}>Handmatig toevoegen</Text>
                  <Text style={styles.modalButtonDescription}>
                    Voer details handmatig in
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleImportUrl}
              >
                <View style={styles.modalButtonIcon}>
                  <Ionicons name="link-outline" size={24} color={colors.secondary} />
                </View>
                <View style={styles.modalButtonContent}>
                  <Text style={styles.modalButtonTitle}>Importeren via URL</Text>
                  <Text style={styles.modalButtonDescription}>
                    Plak link van receptsite
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setFabMenuVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>Annuleren</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ====== SORT MENU MODAL ====== */}
        <Modal
          visible={sortMenuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSortMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSortMenuVisible(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Sorteren</Text>

              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortBy === 'recent' && styles.sortOptionActive,
                ]}
                onPress={() => {
                  setSortBy('recent')
                  setSortMenuVisible(false)
                }}
              >
                <View style={styles.sortOptionContent}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={sortBy === 'recent' ? colors.primary : colors.textSecondary}
                  />
                  <View>
                    <Text
                      style={[
                        typography.caption14Medium,
                        { color: sortBy === 'recent' ? colors.primary : colors.text },
                      ]}
                    >
                      Recent toegevoegd
                    </Text>
                    <Text
                      style={[
                        typography.small12,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Nieuwste eerst
                    </Text>
                  </View>
                </View>
                {sortBy === 'recent' && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortBy === 'alphabetical' && styles.sortOptionActive,
                ]}
                onPress={() => {
                  setSortBy('alphabetical')
                  setSortMenuVisible(false)
                }}
              >
                <View style={styles.sortOptionContent}>
                  <Ionicons
                    name="text-outline"
                    size={20}
                    color={sortBy === 'alphabetical' ? colors.primary : colors.textSecondary}
                  />
                  <View>
                    <Text
                      style={[
                        typography.caption14Medium,
                        { color: sortBy === 'alphabetical' ? colors.primary : colors.text },
                      ]}
                    >
                      Alfabetisch (A → Z)
                    </Text>
                    <Text
                      style={[
                        typography.small12,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Alfabetische volgorde
                    </Text>
                  </View>
                </View>
                {sortBy === 'alphabetical' && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortBy === 'duration' && styles.sortOptionActive,
                ]}
                onPress={() => {
                  setSortBy('duration')
                  setSortMenuVisible(false)
                }}
              >
                <View style={styles.sortOptionContent}>
                  <Ionicons
                    name="flame-outline"
                    size={20}
                    color={sortBy === 'duration' ? colors.primary : colors.textSecondary}
                  />
                  <View>
                    <Text
                      style={[
                        typography.caption14Medium,
                        { color: sortBy === 'duration' ? colors.primary : colors.text },
                      ]}
                    >
                      Kooktijd
                    </Text>
                    <Text
                      style={[
                        typography.small12,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Korte recepten eerst
                    </Text>
                  </View>
                </View>
                {sortBy === 'duration' && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setSortMenuVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>Sluiten</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
    gap: spacing.sm,
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
    color: colors.text,
    paddingVertical: 0,
    fontSize: 14,
  },

  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
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

  fab: {
    position: 'absolute',
    bottom:
      Platform.OS === 'android'
        ? spacing.lg + 10
        : spacing.lg + 20,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.xl,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    ...shadows.xl,
  },

  modalTitle: {
    ...typography.title20,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },

  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    gap: spacing.md,
  },

  modalButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },

  modalButtonContent: {
    flex: 1,
    gap: spacing.xs,
  },

  modalButtonTitle: {
    ...typography.caption14Medium,
    color: colors.text,
  },

  modalButtonDescription: {
    ...typography.small12,
    color: colors.textSecondary,
  },

  modalButtonCancel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
    justifyContent: 'center',
  },

  modalButtonCancelText: {
    ...typography.caption14Medium,
    color: colors.text,
    textAlign: 'center',
  },

  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
  },

  sortOptionActive: {
    backgroundColor: colors.primaryLight,
  },

  sortOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
})
