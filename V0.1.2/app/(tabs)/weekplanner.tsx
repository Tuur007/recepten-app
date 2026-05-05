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
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

import { useRecipes } from '../../features/recipes/hooks'
import { useWeekPlannerStore } from '../../store/weekPlannerStore'
import {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius,
} from '../../constants/Designsystem'

const DAYS = [
  { key: 'MON', label: 'Maandag' },
  { key: 'TUE', label: 'Dinsdag' },
  { key: 'WED', label: 'Woensdag' },
  { key: 'THU', label: 'Donderdag' },
  { key: 'FRI', label: 'Vrijdag' },
  { key: 'SAT', label: 'Zaterdag' },
  { key: 'SUN', label: 'Zondag' },
]

export default function WeekplannerScreen() {
  const router = useRouter()
  const { recipes } = useRecipes()
  const { mealPlan, addMeal, removeMeal, clearDay } = useWeekPlannerStore()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredRecipes = useMemo(() => {
    if (!searchTerm) return recipes
    return recipes.filter((r) =>
      r.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [recipes, searchTerm])

  const handleAddMeal = (recipeId: string) => {
    if (!selectedDay) return
    setLoading(true)
    try {
      addMeal(selectedDay, recipeId)
      setModalVisible(false)
      setSearchTerm('')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMeal = (day: string, recipeId: string) => {
    removeMeal(day, recipeId)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={typography.hero32Bold}>📅 Week planner</Text>
        <Text style={[typography.caption14, { color: colors.textLight }]}>
          Plan je recepten in
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {DAYS.map(({ key, label }) => (
          <View key={key} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <View>
                <Text style={styles.dayName}>{label}</Text>
                <Text style={styles.daySubtext}>
                  {(mealPlan[key] || []).length} recept
                  {(mealPlan[key] || []).length !== 1 ? 'en' : ''}
                </Text>
              </View>
              <View style={styles.dayActions}>
                {(mealPlan[key] || []).length > 0 && (
                  <Pressable
                    onPress={() => clearDay(key)}
                    hitSlop={10}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => {
                    setSelectedDay(key)
                    setModalVisible(true)
                  }}
                  hitSlop={10}
                >
                  <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                </Pressable>
              </View>
            </View>

            {(mealPlan[key] || []).length > 0 ? (
              <View style={styles.mealList}>
                {(mealPlan[key] || []).map((recipeId) => {
                  const recipe = recipes.find((r) => r.id === recipeId)
                  return recipe ? (
                    <Pressable
                      key={recipeId}
                      style={styles.meal}
                      onPress={() => router.push(`/recipes/${recipe.id}`)}
                    >
                      <View style={styles.mealContent}>
                        <Text style={styles.mealTitle}>{recipe.title}</Text>
                        {recipe.duration && (
                          <View style={styles.mealMeta}>
                            <Ionicons
                              name="time-outline"
                              size={12}
                              color={colors.textSecondary}
                            />
                            <Text style={styles.mealMetaText}>{recipe.duration} min</Text>
                          </View>
                        )}
                      </View>
                      <Pressable
                        onPress={() => handleRemoveMeal(key, recipeId)}
                        disabled={loading}
                        hitSlop={10}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color={colors.error}
                        />
                      </Pressable>
                    </Pressable>
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
        onRequestClose={() => {
          setModalVisible(false)
          setSearchTerm('')
        }}
      >
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {DAYS.find((d) => d.key === selectedDay)?.label}
            </Text>
            <Pressable
              onPress={() => {
                setModalVisible(false)
                setSearchTerm('')
              }}
              hitSlop={10}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.modalSearchInput}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <Text
              style={[
                styles.modalSearchText,
                !searchTerm && { color: colors.textSecondary },
              ]}
            >
              {searchTerm || 'Zoek recepten...'}
            </Text>
            {searchTerm && (
              <Pressable onPress={() => setSearchTerm('')} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          <FlatList
            data={filteredRecipes}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <Pressable
                style={styles.recipeOption}
                onPress={() => handleAddMeal(item.id)}
                disabled={loading}
              >
                <View style={styles.recipeOptionContent}>
                  <Text style={styles.recipeOptionTitle}>{item.title}</Text>
                  <View style={styles.recipeOptionMeta}>
                    {item.category && (
                      <Text style={styles.recipeOptionCategory}>{item.category}</Text>
                    )}
                    {item.duration && (
                      <Text style={styles.recipeOptionDuration}>{item.duration} min</Text>
                    )}
                  </View>
                </View>
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={styles.emptyListText}>Geen recepten gevonden</Text>
              </View>
            }
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

  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.lg,
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
    ...typography.title20,
    color: colors.text,
  },

  daySubtext: {
    ...typography.small12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  dayActions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },

  mealList: {
    gap: spacing.sm,
  },

  meal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F8F5',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },

  mealContent: {
    flex: 1,
    gap: spacing.xs,
  },

  mealTitle: {
    ...typography.caption14Medium,
    color: colors.text,
  },

  mealMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  mealMetaText: {
    ...typography.small12,
    color: colors.textSecondary,
  },

  emptyText: {
    ...typography.caption14,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  modalTitle: {
    ...typography.title20,
    color: colors.text,
  },

  modalSearchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },

  modalSearchText: {
    flex: 1,
    ...typography.caption14,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  recipeOptionContent: {
    flex: 1,
    gap: spacing.xs,
  },

  recipeOptionTitle: {
    ...typography.caption14Medium,
    color: colors.text,
  },

  recipeOptionMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  recipeOptionCategory: {
    ...typography.small12,
    color: colors.textSecondary,
  },

  recipeOptionDuration: {
    ...typography.small12,
    color: colors.textSecondary,
  },

  emptyList: {
    padding: spacing.lg,
    alignItems: 'center',
  },

  emptyListText: {
    ...typography.caption14,
    color: colors.textSecondary,
  },
})
