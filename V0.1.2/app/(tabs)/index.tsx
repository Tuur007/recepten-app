/**
 * 🎨 RECEPTEN APP — DASHBOARD SCREEN v1.0
 * 
 * FILE: app/(tabs)/index.tsx
 * STATUS: Production Ready
 * 
 * INSTRUCTIONS:
 * 1. Backup je huidge bestand: cp app/(tabs)/index.tsx app/(tabs)/index.tsx.backup
 * 2. Vervang dit bestand volledig met deze code
 * 3. Zorg dat alle imports beschikbaar zijn
 * 4. Run: npm start
 * 
 * REQUIRED IMPORTS (already in your project):
 * - react-native (ScrollView, View, Text, TouchableOpacity, etc.)
 * - expo-router (useRouter)
 * - react-native-safe-area-context (SafeAreaView)
 * - @expo/vector-icons (Ionicons)
 * - Your existing hooks: useRecipes, useRecipeStore, useGroceryStore
 * - Your design system: constants/Designsystem
 * - Your components: features/recipes/components/RecipeCard, etc.
 */

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

// ============================================================================
// IMPORTS: Your existing hooks and components
// ============================================================================

import { useRecipes } from '../../features/recipes/hooks'
import { useRecipeStore } from '../../store/recipeStore'
import { useGroceryStore } from '../../store/groceryStore'
import { RecipeCard } from '../../features/recipes/components/RecipeCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingScreen } from '../../components/LoadingScreen'
import { ErrorBoundary } from '../../components/ErrorBoundary'

// Design system (completely ready to use)
import {
  colors,
  spacing,
  shadows,
  typography,
  borderRadius,
} from '../../constants/Designsystem'

// ============================================================================
// CONSTANTS
// ============================================================================

const { width } = Dimensions.get('window')
const STAT_CARD_WIDTH = (width - spacing.md * 2 - spacing.sm) / 2

// ============================================================================
// MAIN COMPONENT: DashboardScreen
// ============================================================================

export default function DashboardScreen() {
  const router = useRouter()
  const { recipes, isLoading, update } = useRecipes()
  const groceryItems = useGroceryStore((state) => state.items)

  // 📊 Calculate statistics for this week
  const stats = useMemo(() => {
    const now = new Date()
    const thisWeekStart = new Date(now)
    // Set to Monday of this week
    thisWeekStart.setDate(now.getDate() - now.getDay())

    // Count recipes created this week
    const thisWeekRecipes = recipes.filter((r) => {
      if (!r.createdAt) return false
      const recipeDate = new Date(r.createdAt)
      return recipeDate >= thisWeekStart && recipeDate <= now
    }).length

    // Count new favorites this week
    const newFavorites = recipes.filter(
      (r) => r.isFavorite && r.createdAt && new Date(r.createdAt) >= thisWeekStart,
    ).length

    // Count ingredients to buy (not checked)
    const ingredientsToBuy = groceryItems.filter((i) => !i.checked).length

    // Total recipes in collection
    const totalRecipes = recipes.length

    return {
      thisWeekRecipes: thisWeekRecipes || 0,
      newFavorites: newFavorites || 0,
      ingredientsToBuy: ingredientsToBuy || 0,
      totalRecipes: totalRecipes || 0,
    }
  }, [recipes, groceryItems])

  // 📝 Get recent recipes (last 4, sorted by date)
  const recentRecipes = useMemo(() => {
    return recipes
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA // Newest first
      })
      .slice(0, 4) // Only top 4
  }, [recipes])

  // 🎯 Get time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return '🌅 Goedemorgen'
    if (hour < 18) return '☀️ Goedemiddag'
    return '🌙 Goedenavond'
  }, [])

  // Show loading state while data loads
  if (isLoading) {
    return <LoadingScreen />
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ============================================================ */}
          {/* 👋 GREETING SECTION */}
          {/* ============================================================ */}

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

          {/* ============================================================ */}
          {/* 📊 STATISTICS SECTION - This Week Overview */}
          {/* ============================================================ */}

          <View style={styles.section}>
            <Text style={typography.title20}>Deze week</Text>

            <View style={styles.statsGrid}>
              {/* Card 1: Recipes Planned This Week */}
              <StatCard
                icon="📖"
                number={stats.thisWeekRecipes}
                label="Recepten"
                sublabel={
                  stats.thisWeekRecipes === 1 ? 'gepland' : 'gepland'
                }
                gradientStart={colors.primary}
                gradientEnd={colors.primaryDark}
              />

              {/* Card 2: New Favorites This Week */}
              <StatCard
                icon="❤️"
                number={stats.newFavorites}
                label="Favorieten"
                sublabel={stats.newFavorites === 1 ? 'nieuw' : 'nieuw'}
                gradientStart={colors.secondary}
                gradientEnd="#1B5E3F"
              />

              {/* Card 3: Ingredients Still To Buy */}
              <StatCard
                icon="🛒"
                number={stats.ingredientsToBuy}
                label="Ingrediënten"
                sublabel={
                  stats.ingredientsToBuy === 1 ? 'nog nodig' : 'nog nodig'
                }
                gradientStart={colors.tertiary}
                gradientEnd="#E6A500"
              />

              {/* Card 4: Total Recipe Collection */}
              <StatCard
                icon="📚"
                number={stats.totalRecipes}
                label="Recepten"
                sublabel={stats.totalRecipes === 1 ? 'totaal' : 'totaal'}
                gradientStart="#5DADE2"
                gradientEnd="#2874A6"
              />
            </View>
          </View>

          {/* ============================================================ */}
          {/* ⚡ QUICK ACTIONS SECTION */}
          {/* ============================================================ */}

          <View style={styles.section}>
            <Text style={typography.title20}>Snelle acties</Text>

            <View style={styles.actionsRow}>
              {/* Action 1: Add New Recipe */}
              <QuickActionButton
                icon="plus"
                label="Recept"
                color={colors.primary}
                onPress={() => router.push('/recipes/new')}
              />

              {/* Action 2: Week Planner */}
              <QuickActionButton
                icon="calendar"
                label="Week plan"
                color={colors.secondary}
                onPress={() => router.push('/(tabs)/weekplanner')}
              />

              {/* Action 3: Grocery List */}
              <QuickActionButton
                icon="cart"
                label="Boodschap"
                color={colors.tertiary}
                onPress={() => router.push('/(tabs)/grocery')}
              />

              {/* Action 4: Favorites */}
              <QuickActionButton
                icon="heart"
                label="Favorieten"
                color="#E63946"
                onPress={() => router.push('/(tabs)/recipes')}
              />
            </View>
          </View>

          {/* ============================================================ */}
          {/* 📝 RECENT RECIPES SECTION */}
          {/* ============================================================ */}

          {recentRecipes.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={typography.title20}>Recent toegevoegd</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/recipes')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      typography.caption14,
                      { color: colors.primary },
                    ]}
                  >
                    Alles zien
                  </Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={recentRecipes}
                scrollEnabled={false}
                keyExtractor={(r) => r.id}
                renderItem={({ item }) => (
                  <RecipeCard
                    recipe={item}
                    onPress={() => router.push(`/recipes/${item.id}`)}
                    onToggleFavorite={() =>
                      update(item.id, {
                        isFavorite: !item.isFavorite,
                      })
                    }
                  />
                )}
              />
            </View>
          ) : (
            <View style={styles.section}>
              <EmptyState
                icon="📖"
                title="Nog geen recepten"
                message="Voeg je eerste recept toe via de snelle acties hierboven"
              />
            </View>
          )}

          {/* Spacing for FAB button */}
          <View style={{ height: spacing.xl }} />
        </ScrollView>

        {/* ============================================================ */}
        {/* ➕ FLOATING ACTION BUTTON (FAB) */}
        {/* ============================================================ */}

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

// ============================================================================
// SUB-COMPONENT 1: StatCard
// ============================================================================

/**
 * StatCard Component
 * Displays a single statistic with icon, number, label, and sublabel.
 * Uses gradient background for visual appeal.
 *
 * Props:
 * - icon: Emoji or text to display as icon
 * - number: The statistic number (e.g., 24 recipes)
 * - label: Main label (e.g., "Recepten")
 * - sublabel: Secondary label (e.g., "gepland")
 * - gradientStart: Start color of gradient (e.g., colors.primary)
 * - gradientEnd: End color of gradient (darker shade)
 */

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
      {/* Icon */}
      <Text style={styles.statIcon}>{icon}</Text>

      {/* Number (e.g., "24") */}
      <Text style={styles.statNumber}>{number}</Text>

      {/* Label (e.g., "Recepten") */}
      <Text style={styles.statLabel}>{label}</Text>

      {/* Sublabel (e.g., "gepland") */}
      <Text style={styles.statSublabel}>{sublabel}</Text>
    </View>
  )
}

// ============================================================================
// SUB-COMPONENT 2: QuickActionButton
// ============================================================================

/**
 * QuickActionButton Component
 * Fast access button for common app actions.
 * Displays icon in colored circle with label below.
 *
 * Props:
 * - icon: Ionicon name (e.g., "plus", "calendar", "cart")
 * - label: Button label text
 * - color: Icon color (matches action type)
 * - onPress: Callback function when pressed
 */

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
      {/* Icon container with semi-transparent background */}
      <View
        style={[
          styles.quickActionCircle,
          {
            backgroundColor: `${color}15`, // 15 = ~0.08 opacity
          },
        ]}
      >
        <Ionicons name={icon} size={24} color={color} />
      </View>

      {/* Label text */}
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

// ============================================================================
// STYLES: Complete StyleSheet
// ============================================================================

const styles = StyleSheet.create({
  // ====== MAIN LAYOUT ======

  container: {
    flex: 1,
    backgroundColor: colors.background, // Warm cream #FEF9E7
  },

  scrollContent: {
    paddingHorizontal: spacing.md, // 16px horizontal padding
    paddingBottom: spacing.lg, // 24px bottom padding for FAB
  },

  // ====== GREETING SECTION ======

  greeting: {
    paddingVertical: spacing.lg, // 24px top/bottom
    paddingHorizontal: spacing.sm, // 8px left/right
  },

  // ====== SECTION LAYOUT ======

  section: {
    marginVertical: spacing.lg, // 24px spacing between sections
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md, // 16px below header
  },

  // ====== STATISTICS GRID ======

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow cards to wrap to next row
    gap: spacing.sm, // 8px gap between cards
  },

  statCard: {
    width: STAT_CARD_WIDTH,
    paddingVertical: spacing.lg, // 24px top/bottom
    paddingHorizontal: spacing.md, // 16px left/right
    borderRadius: borderRadius.lg, // 16px rounded corners
    borderWidth: 1,
    borderBottomWidth: 3, // Thicker bottom border for depth
    alignItems: 'center', // Center all content
    gap: spacing.xs, // 4px between elements
    ...shadows.medium, // Shadow for elevation
  },

  statIcon: {
    fontSize: 28,
    marginBottom: spacing.xs, // 4px space below icon
  },

  statNumber: {
    ...typography.hero32Bold, // 32px bold white text
    color: colors.white,
  },

  statLabel: {
    ...typography.caption14Medium, // 14px medium weight
    color: colors.white,
  },

  statSublabel: {
    ...typography.small12, // 12px regular
    color: 'rgba(255, 255, 255, 0.75)', // Semi-transparent white
  },

  // ====== QUICK ACTIONS ======

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Distribute evenly
    paddingVertical: spacing.md, // 16px top/bottom
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg, // 16px rounded
    ...shadows.sm, // Subtle shadow
  },

  quickActionButton: {
    alignItems: 'center',
    gap: spacing.sm, // 8px between icon and label
    paddingVertical: spacing.sm, // 8px top/bottom
    paddingHorizontal: spacing.sm, // 8px left/right
    flex: 1, // Take equal space
  },

  quickActionCircle: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.full, // Circular (9999)
    justifyContent: 'center',
    alignItems: 'center',
  },

  quickActionLabel: {
    ...typography.caption14, // 14px regular
    color: colors.textDark,
    textAlign: 'center',
  },

  // ====== FAB (FLOATING ACTION BUTTON) ======

  fab: {
    position: 'absolute',
    // Android and iOS have different safe areas, so adjust positioning
    bottom:
      Platform.OS === 'android'
        ? spacing.lg + 10 // 34px from bottom on Android
        : spacing.lg + 20, // 44px from bottom on iOS (notch safety)
    right: spacing.lg, // 24px from right edge
    width: 56,
    height: 56,
    borderRadius: 28, // Fully rounded square = circle
    backgroundColor: colors.primary, // Orange #FF6B35
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.xl, // Strong shadow for prominence
  },
})

// ============================================================================
// EXPORT
// ============================================================================

export { DashboardScreen as default }
