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
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, typography, shadows, borderRadius } from '../constants/Designsystem'

export interface MealPlan {
  [day: string]: string[]
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

export function WeekPlanner({
  weekMeals,
  recipes,
  onAddMeal,
  onRemoveMeal,
}: WeekPlannerProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAddMeal = async (recipeId: string) => {
    if (!selectedDay) return
    setLoading(true)
    try {
      await onAddMeal(selectedDay, recipeId)
      setModalVisible(false)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMeal = async (day: string, recipeId: string) => {
    setLoading(true)
    try {
      await onRemoveMeal(day, recipeId)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Week Planner</Text>

      <ScrollView contentContainerStyle={styles.content}>
        {DAYS.map((day) => (
          <View key={day} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{day}</Text>
              <Pressable
                onPress={() => {
                  setSelectedDay(day)
                  setModalVisible(true)
                }}
                style={styles.addBtn}
              >
                <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
              </Pressable>
            </View>

            {(weekMeals[day] || []).length > 0 ? (
              <View style={styles.mealList}>
                {(weekMeals[day] || []).map((recipeId) => {
                  const recipe = recipes.find((r) => r.id === recipeId)
                  return recipe ? (
                    <View key={recipeId} style={styles.meal}>
                      <Text style={styles.mealTitle}>{recipe.title}</Text>
                      <Pressable
                        onPress={() => handleRemoveMeal(day, recipeId)}
                        disabled={loading}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.danger} />
                      </Pressable>
                    </View>
                  ) : null
                })}
              </View>
            ) : (
              <Text style={styles.emptyText}>Geen recepten gepland</Text>
            )}
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecteer recept voor {selectedDay}</Text>
            <Pressable onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <FlatList
            data={recipes}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <Pressable
                style={styles.recipeOption}
                onPress={() => handleAddMeal(item.id)}
                disabled={loading}
              >
                <Text style={styles.recipeOptionTitle}>{item.title}</Text>
                <Text style={styles.recipeOptionCategory}>{item.category}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  addBtn: {
    padding: spacing.sm,
  },
  mealList: {
    gap: spacing.sm,
  },
  meal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  mealTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  modal: {
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
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalList: {
    padding: spacing.md,
    gap: spacing.md,
  },
  recipeOption: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  recipeOptionCategory: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
})
