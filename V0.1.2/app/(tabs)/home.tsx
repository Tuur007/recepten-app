import React, { useMemo } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { useRecipes } from '../../features/recipes/hooks'
import { useRecipeStore } from '../../store/recipeStore'
import { useGroceryStore } from '../../store/groceryStore'
import { RecipeCard } from '../../features/recipes/components/RecipeCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingScreen } from '../../components/LoadingScreen'
import { ErrorBoundary } from '../../components/ErrorBoundary'

import {
  colors,
  spacing,
  shadows,
  typography,
  borderRadius,
} from '../../constants/Designsystem'

const { width } = Dimensions.get('window')
const STAT_CARD_WIDTH = (width - spacing.md * 2 - spacing.sm) / 2

export default function HomeScreen() {
  const router = useRouter()
  const { recipes, isLoading, update } = useRecipes()
  const groceryItems = useGroceryStore((state) => state.items)

  const stats = useMemo(() => {
    const now = new Date()
    const thisWeekStart = new Date(now)
    thisWeekStart.setDate(now.getDate() - now.getDay())

    const thisWeekRecipes = recipes.filter((r) => {
      if (!r.createdAt) return false
      const recipeDate = new Date(r.createdAt)
      return recipeDate >= thisWeekStart && recipeDate <= now
    }).length

    const newFavorites = recipes.filter(
      (r) => r.isFavorite && r.createdAt && new Date(r.createdAt) >= thisWeekStart,
    ).length

    const ingredientsToBuy = groceryItems.filter((i) => !i.checked).length
    const totalRecipes = recipes.length

    return {
      thisWeekRecipes: thisWeekRecipes || 0,
      newFavorites: newFavorites || 0,
      ingredientsToBuy: ingredientsToBuy || 0,
      totalRecipes: totalRecipes || 0,
    }
  }, [recipes, groceryItems])

  const recentRecipes = useMemo(() => {
    return recipes
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })
      .slice(0, 4)
  }, [recipes])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return '🌅 Goedemorgen'
    if (hour < 18) return '☀️ Goedemiddag'
    return '🌙 Goedenavond'
  }, [])

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.greeting}>
            <Text style={typography.hero32Bold}>
              {greeting}
            </Text>
            <Text
              style={[
                typography.caption14,
                { color: colors.textLight, marginTop: spacing.xs },
              ]}
            >
              Veel kookplezier!
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={typography.title20}>Deze week</Text>

            <View style={styles.statsGrid}>
              <StatCard
                icon="📖"
                number={stats.thisWeekRecipes}
                label="Recepten"
                sublabel="gepland"
                gradientStart={colors.primary}
                gradientEnd={colors.primaryDark}
              />

              <StatCard
                icon="❤️"
                number={stats.newFavorites}
                label="Favorieten"
                sublabel="nieuw"
                gradientStart={colors.secondary}
                gradientEnd="#1B5E3F"
              />

              <StatCard
                icon="🛒"
                number={stats.ingredientsToBuy}
                label="Ingrediënten"
                sublabel="nog nodig"
                gradientStart={colors.tertiary}
                gradientEnd="#E6A500"
              />

              <StatCard
                icon="📚"
                number={stats.totalRecipes}
                label="Recepten"
                sublabel="totaal"
                gradientStart="#5DADE2"
                gradientEnd="#2874A6"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={typography.title20}>Snelle acties</Text>

            <View style={styles.actionsRow}>
              <QuickActionButton
                icon="plus"
                label="Recept"
                color={colors.primary}
                onPress={() => router.push('/recipes/new')}
              />

              <QuickActionButton
                icon="calendar"
                label="Week plan"
                color={colors.secondary}
                onPress={() => router.push('/(tabs)/weekplanner')}
              />

              <QuickActionButton
                icon="cart"
                label="Boodschap"
                color={colors.tertiary}
                onPress={() => router.push('/(tabs)/grocery')}
              />

              <QuickActionButton
                icon="heart"
                label="Favorieten"
                color="#E63946"
                onPress={() => router.push('/(tabs)/recipes?filter=favorites')}
              />
            </View>
          </View>

          {recentRecipes.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={typography.title20}>Recent toegevoegd</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/recipes')}>
                  <Text style={[typography.caption14, { color: colors.primary }]}>
                    Alles zien
                  </Text>
                </TouchableOpacity>
              </View>

              <FlatList
                scrollEnabled={false}
                data={recentRecipes}
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
                contentContainerStyle={styles.recipeList}
                gap={spacing.md}
              />
            </View>
          ) : (
            <EmptyState
              icon="📖"
              title="Geen recepten"
              description="Voeg je eerste recept toe om aan de slag te gaan"
            />
          )}
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/recipes/new')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      </SafeAreaView>
    </ErrorBoundary>
  )
}

interface StatCardProps {
  icon: string
  number: number
  label: string
  sublabel: string
  gradientStart: string
  gradientEnd: string
}

function StatCard({
  icon,
  number,
  label,
  sublabel,
  gradientStart,
  gradientEnd,
}: StatCardProps) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: gradientStart,
          borderColor: gradientEnd,
        },
      ]}
    >
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statNumber}>{number}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSublabel}>{sublabel}</Text>
    </View>
  )
}

interface QuickActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  color: string
  onPress: () => void
}

function QuickActionButton({
  icon,
  label,
  color,
  onPress,
}: QuickActionButtonProps) {
  return (
    <TouchableOpacity
      style={styles.quickActionButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.quickActionCircle,
          {
            backgroundColor: `${color}15`,
          },
        ]}
      >
        <Ionicons name={icon} size={24} color={color} />
      </View>

      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },

  greeting: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },

  section: {
    marginVertical: spacing.lg,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  statCard: {
    width: STAT_CARD_WIDTH,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderBottomWidth: 3,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.medium,
  },

  statIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },

  statNumber: {
    ...typography.hero32Bold,
    color: colors.white,
  },

  statLabel: {
    ...typography.caption14Medium,
    color: colors.white,
  },

  statSublabel: {
    ...typography.small12,
    color: 'rgba(255, 255, 255, 0.75)',
  },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },

  quickActionButton: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    flex: 1,
  },

  quickActionCircle: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  quickActionLabel: {
    ...typography.caption14,
    color: colors.textDark,
    textAlign: 'center',
  },

  recipeList: {
    gap: spacing.md,
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
})
