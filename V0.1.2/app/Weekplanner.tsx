/**
 * 📅 WEEKPLANNER COMPONENT (SIMPLE)
 * 
 * Shows 7 days (Mon-Sun)
 * Each day can have meals added
 * Click to add recipe to specific day
 * Super simple implementation as requested
 * 
 * Usage:
 * <WeekPlanner
 *   weekMeals={weekMeals}
 *   onAddMeal={(day, recipeId) => handleAdd(day, recipeId)}
 *   onRemoveMeal={(day, recipeId) => handleRemove(day, recipeId)}
 * />
 */

import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  Modal,
  SafeAreaView,
} from 'react-native'
import { colors, spacing, typography, shadows, borderRadius } from '../constants/Designsystem'

// Types
export interface MealPlan {
  [day: string]: string[] // day: ["recipe-1", "recipe-2"]
}

interface Recipe {
  id: string
  title: string
  category: string
  cookingTime: number
  image?: string
}

interface WeekPlannerProps {
  weekMeals: MealPlan
  recipes: Recipe[]
  onAddMeal: (day: string, recipeId: string) => Promise<void>
  onRemoveMeal: (day: string, recipeId: string) => Promise<void>
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WeekPlanner({
  weekMeals,
  recipes,
  onAddMeal,
  onRemoveMeal,
}: WeekPlannerProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAddRecipe = async (recipeId: string) => {
    if (!selectedDay) return

    setLoading(true)
    try {
      await onAddMeal(selectedDay, recipeId)
      setModalVisible(false)
      setSelectedDay(null)
    } catch (error) {
      console.error('Error adding meal:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveRecipe = async (day: string, recipeId: string) => {
    setLoading(true)
    try {
      await onRemoveMeal(day, recipeId)
    } catch (error) {
      console.error('Error removing meal:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={typography.title24}>Plan your week</Text>
          <Text style={[typography.caption14, { color: colors.textLight }]}>
            {getWeekDateRange()}
          </Text>
        </View>

        {/* Days */}
        {DAYS.map((day, index) => (
          <DayCard
            key={day}
            day={day}
            dayIndex={index}
            meals={weekMeals[day] || []}
            recipes={recipes}
            onAddMeal={() => {
              setSelectedDay(day)
              setModalVisible(true)
            }}
            onRemoveMeal={(recipeId) => handleRemoveRecipe(day, recipeId)}
          />
        ))}

        {/* Spacer */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Add Recipe Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false)
          setSelectedDay(null)
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setModalVisible(false)}>
              <Text style={[typography.body16Medium, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
            <Text style={typography.title20}>Add meal for {selectedDay}</Text>
            <View style={{ width: 50 }} />
          </View>

          <FlatList
            data={recipes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.recipeOption}
                onPress={() => handleAddRecipe(item.id)}
                disabled={loading}
              >
                <View style={styles.recipeInfo}>
                  <Text style={typography.title18}>{item.title}</Text>
                  <Text style={[typography.caption14, { color: colors.textLight }]}>
                    {item.category} • ⏱️ {item.cookingTime} min
                  </Text>
                </View>
                <Text style={styles.addButton}>+</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  )
}

// ============================================================================
// DAY CARD COMPONENT
// ============================================================================

interface DayCardProps {
  day: string
  dayIndex: number
  meals: string[]
  recipes: Recipe[]
  onAddMeal: () => void
  onRemoveMeal: (recipeId: string) => void
}

function DayCard({
  day,
  dayIndex,
  meals,
  recipes,
  onAddMeal,
  onRemoveMeal,
}: DayCardProps) {
  const mealRecipes = useMemo(
    () => recipes.filter((r) => meals.includes(r.id)),
    [meals, recipes]
  )

  // Get color for the day (different colors for variety)
  const dayColors = [
    colors.primary,
    '#FF8551',
    colors.secondary,
    '#40916C',
    colors.tertiary,
    '#FFA500',
    colors.primary,
  ]
  const borderColor = dayColors[dayIndex]

  return (
    <View style={[styles.dayCard, { borderLeftColor: borderColor }]}>
      {/* Day Header */}
      <View style={styles.dayHeader}>
        <View>
          <Text style={[typography.title18, { color: borderColor }]}>
            {day}
          </Text>
          <Text style={[typography.caption14, { color: colors.textLight }]}>
            {getDayDate(dayIndex)}
          </Text>
        </View>
        <Text style={[typography.caption14, { color: colors.textLight }]}>
          {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
        </Text>
      </View>

      {/* Meals List */}
      <View style={styles.mealsList}>
        {mealRecipes.length > 0 ? (
          mealRecipes.map((recipe) => (
            <View key={recipe.id} style={styles.mealItem}>
              <View style={styles.mealContent}>
                <Text style={typography.body16Medium}>{recipe.title}</Text>
                <Text style={[typography.caption14, { color: colors.textLight }]}>
                  {recipe.category} • {recipe.cookingTime} min
                </Text>
              </View>
              <Pressable
                style={styles.removeMealButton}
                onPress={() => onRemoveMeal(recipe.id)}
              >
                <Text style={{ color: colors.error }}>✕</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={[typography.caption14, { color: colors.textLight, fontStyle: 'italic' }]}>
            No meals planned
          </Text>
        )}
      </View>

      {/* Add Meal Button */}
      <Pressable style={styles.addMealButton} onPress={onAddMeal}>
        <Text style={[typography.body16Medium, { color: colors.primary }]}>
          + Add meal
        </Text>
      </Pressable>
    </View>
  )
}

// ============================================================================
// DASHBOARD VARIANT: Shows week summary + quick stats
// ============================================================================

export function WeekPlannerDashboard({
  weekMeals,
  recipes,
}: Pick<WeekPlannerProps, 'weekMeals' | 'recipes'>) {
  const totalMeals = Object.values(weekMeals).reduce((sum, meals) => sum + meals.length, 0)
  const totalIngredients = useMemo(() => {
    const ingredientSet = new Set<string>()

    Object.values(weekMeals).forEach((dayMeals) => {
      dayMeals.forEach((recipeId) => {
        const recipe = recipes.find((r) => r.id === recipeId)
        // You'd need to add ingredients to Recipe type
        // For now, just count
      })
    })

    return ingredientSet.size
  }, [weekMeals, recipes])

  return (
    <View style={styles.dashboardContainer}>
      <Text style={typography.title20}>This week</Text>

      {/* Stat Cards */}
      <View style={styles.statsRow}>
        <StatCard
          number={totalMeals}
          label="Meals planned"
          color={colors.primary}
        />
        <StatCard
          number={DAYS.filter((d) => (weekMeals[d] || []).length > 0).length}
          label="Days covered"
          color={colors.secondary}
        />
      </View>
    </View>
  )
}

interface StatCardProps {
  number: number
  label: string
  color: string
}

function StatCard({ number, label, color }: StatCardProps) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: color,
        },
      ]}
    >
      <Text style={[typography.hero32Bold, { color: colors.white }]}>
        {number}
      </Text>
      <Text style={[typography.caption14, { color: colors.white }]}>
        {label}
      </Text>
    </View>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getWeekDateRange(): string {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const format = (date: Date) => {
    return `${date.getDate()}/${date.getMonth() + 1}`
  }

  return `${format(monday)} - ${format(sunday)}`
}

function getDayDate(dayIndex: number): string {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))

  const targetDate = new Date(monday)
  targetDate.setDate(monday.getDate() + dayIndex)

  return `${targetDate.getDate()}/${targetDate.getMonth() + 1}`
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  contentContainer: {
    paddingVertical: spacing.md,
  },

  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },

  // Day Card
  dayCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    padding: spacing.md,
    ...shadows.sm,
  },

  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },

  mealsList: {
    marginVertical: spacing.sm,
  },

  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundLight,
    marginVertical: spacing.xs,
  },

  mealContent: {
    flex: 1,
  },

  removeMealButton: {
    padding: spacing.sm,
  },

  addMealButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },

  recipeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },

  recipeInfo: {
    flex: 1,
  },

  addButton: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.md,
  },

  // Dashboard
  dashboardContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },

  statCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.md,
  },
})

// ============================================================================
// USAGE IN APP
// ============================================================================

/*
// In your app/(tabs)/weekplanner.tsx:

import { WeekPlanner, MealPlan } from '@/components/WeekPlanner'
import { useRecipes } from '@/hooks/useRecipes'

export default function WeekPlannerScreen() {
  const { recipes } = useRecipes()
  const [weekMeals, setWeekMeals] = useState<MealPlan>({
    MON: [],
    TUE: [],
    WED: [],
    THU: [],
    FRI: [],
    SAT: [],
    SUN: [],
  })

  const handleAddMeal = async (day: string, recipeId: string) => {
    setWeekMeals((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), recipeId],
    }))
    // Also save to Firebase/database
  }

  const handleRemoveMeal = async (day: string, recipeId: string) => {
    setWeekMeals((prev) => ({
      ...prev,
      [day]: (prev[day] || []).filter((id) => id !== recipeId),
    }))
    // Also save to Firebase/database
  }

  return (
    <WeekPlanner
      weekMeals={weekMeals}
      recipes={recipes}
      onAddMeal={handleAddMeal}
      onRemoveMeal={handleRemoveMeal}
    />
  )
}
*/
