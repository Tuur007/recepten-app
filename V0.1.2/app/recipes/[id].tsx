/**
 * 📄 RECIPE DETAIL SCREEN
 * FILE: app/recipes/[id].tsx
 * 
 * CHANGES:
 * - In edit mode: ONLY show title and duration (cooking time)
 * - Hide ingredients editing
 * - Hide steps editing
 * - Hide category editing
 * - Hide image editing
 * - Can still VIEW ingredients and steps in read mode
 * - Can still add ingredients to grocery list
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRecipes } from '../../features/recipes/hooks'
import { useGrocery } from '../../features/grocery/hooks'
import { useRecipeForm } from '../../features/recipes/hooks/useRecipeForm'
import { safeOpenUrl } from '../../utils/linking'
import { LoadingScreen } from '../../components/LoadingScreen'
import { AppTextInput } from '../../components/ui/AppTextInput'
import { Button } from '../../components/ui/Button'
import {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius,
} from '../../constants/Designsystem'

export default function RecipeDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { getById, update, remove } = useRecipes()
  const { addFromRecipe } = useGrocery()

  const recipe = getById(id)

  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addingToList, setAddingToList] = useState(false)
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(
    new Set()
  )
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)

  const allSelected =
    recipe
      ? selectedIngredients.size ===
        recipe.ingredients.filter((i) => i.name.trim()).length
      : false

  // ====== FORM STATE ======
  const form = useRecipeForm()
  const initialised = useRef(false)

  useEffect(() => {
    if (!recipe || initialised.current) return
    initialised.current = true
    form.reset({
      title: recipe.title,
      category: recipe.category ?? '',
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      imageUri: recipe.imageUri,
      duration: recipe.duration,
    })
    const validIds = new Set(
      recipe.ingredients.filter((i) => i.name.trim()).map((i) => i.id)
    )
    setSelectedIngredients(validIds)
  }, [recipe?.id])

  if (!recipe) return <LoadingScreen />

  // ====== HANDLERS ======

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Titel ontbreekt', 'Voer een recepttitel in.')
      return
    }
    setSaving(true)
    try {
      await update(id, {
        title: form.title.trim(),
        category: form.category,
        ingredients: form.validIngredients,
        steps: form.validSteps,
        imageUri: form.imageUri,
        duration: form.duration,
      })
      setIsEditing(false)
    } catch {
      Alert.alert('Fout', 'Kon wijzigingen niet opslaan. Probeer opnieuw.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddToGroceryList = async () => {
    const selectedForGrocery = recipe.ingredients.filter((ing) =>
      selectedIngredients.has(ing.id)
    )
    if (!selectedForGrocery.length) {
      Alert.alert('Niets geselecteerd', 'Selecteer minstens één ingrediënt.')
      return
    }
    setAddingToList(true)
    try {
      await addFromRecipe(selectedForGrocery, recipe.id, recipe.title)
      Alert.alert('Succes', 'Ingrediënten toegevoegd aan boodschappenlijst.')
    } catch {
      Alert.alert('Fout', 'Kon ingrediënten niet toevoegen.')
    } finally {
      setAddingToList(false)
    }
  }

  const handleDelete = async () => {
    setDeleteModalVisible(false)
    try {
      await remove(id)
      router.back()
    } catch {
      Alert.alert('Fout', 'Kon recept niet verwijderen.')
    }
  }

  const toggleIngredient = (ingId: string) => {
    setSelectedIngredients((prev) => {
      const next = new Set(prev)
      next.has(ingId) ? next.delete(ingId) : next.add(ingId)
      return next
    })
  }

  const toggleAllIngredients = () => {
    if (allSelected) {
      setSelectedIngredients(new Set())
    } else {
      const validIds = new Set(
        recipe.ingredients.filter((i) => i.name.trim()).map((i) => i.id)
      )
      setSelectedIngredients(validIds)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ====== HEADER / TITLE ====== */}
          {!isEditing ? (
            <>
              {recipe.imageUri && (
                <Image
                  source={{ uri: recipe.imageUri }}
                  style={styles.image}
                />
              )}

              <View style={styles.header}>
                <Text style={styles.title}>{recipe.title}</Text>
                {recipe.category ? (
                  <Text style={styles.category}>{recipe.category}</Text>
                ) : null}
              </View>

              {recipe.duration ? (
                <View style={styles.durationBadge}>
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.durationText}>
                    {recipe.duration} min
                  </Text>
                </View>
              ) : null}

              {recipe.sourceUrl ? (
                <TouchableOpacity
                  style={styles.sourceBadge}
                  onPress={() => safeOpenUrl(recipe.sourceUrl!)}
                >
                  <Ionicons name="link-outline" size={13} color={colors.primary} />
                  <Text style={styles.sourceText}>Origineel recept</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}

          {/* ====== EDIT MODE ====== */}
          {isEditing && (
            <View style={styles.editSection}>
              <AppTextInput
                label="Titel"
                value={form.title}
                onChangeText={form.setTitle}
                placeholder="Titel van het recept"
              />

              <AppTextInput
                label="Kooktijd (minuten)"
                value={form.duration?.toString() ?? ''}
                onChangeText={(text) =>
                  form.setDuration(text ? parseInt(text, 10) : undefined)
                }
                placeholder="bijv. 30"
                keyboardType="numeric"
              />
            </View>
          )}

          {/* ====== INGREDIENTS (READ ONLY) ====== */}
          {recipe.ingredients.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ingrediënten</Text>
                {!isEditing && recipe.ingredients.length > 0 && (
                  <TouchableOpacity
                    onPress={toggleAllIngredients}
                    style={styles.selectAllBtn}
                  >
                    <Ionicons
                      name={allSelected ? 'checkmark-circle' : 'circle-outline'}
                      size={18}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.ingredientsList}>
                {recipe.ingredients.map((ingredient) => (
                  <TouchableOpacity
                    key={ingredient.id}
                    style={styles.ingredientItem}
                    onPress={() => toggleIngredient(ingredient.id)}
                    disabled={isEditing}
                  >
                    <Ionicons
                      name={
                        selectedIngredients.has(ingredient.id)
                          ? 'checkbox'
                          : 'checkbox-outline'
                      }
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.ingredientText}>
                      {ingredient.name}
                      {ingredient.quantity && ingredient.quantity > 0
                        ? ` - ${ingredient.quantity}`
                        : ''}
                      {ingredient.unit ? ` ${ingredient.unit}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {!isEditing && selectedIngredients.size > 0 && (
                <TouchableOpacity
                  style={styles.addToGroceryBtn}
                  onPress={handleAddToGroceryList}
                  disabled={addingToList}
                >
                  <Ionicons name="cart-outline" size={16} color={colors.white} />
                  <Text style={styles.addToGroceryBtnText}>
                    {addingToList
                      ? 'Toevoegen...'
                      : `${selectedIngredients.size} toevoegen aan boodschappen`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ====== STEPS (READ ONLY) ====== */}
          {recipe.steps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bereidingsstappen</Text>
              <View style={styles.stepsList}>
                {recipe.steps.map((step, index) => (
                  <View key={index} style={styles.stepItem}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* ====== BOTTOM BUTTONS ====== */}
        <View style={styles.bottomBar}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={[styles.bottomButton, styles.cancelButton]}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.cancelButtonText}>Annuleren</Text>
              </TouchableOpacity>
              <Button
                label="Opslaan"
                onPress={handleSave}
                loading={saving}
                style={styles.saveButton}
              />
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.bottomButton, styles.deleteButton]}
                onPress={() => setDeleteModalVisible(true)}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bottomButton, styles.editButton]}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="pencil-outline" size={20} color={colors.primary} />
                <Text style={styles.editButtonText}>Bewerken</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ====== DELETE CONFIRMATION MODAL ====== */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeleteModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={colors.error}
              style={styles.modalIcon}
            />
            <Text style={styles.modalTitle}>
              {recipe.title} verwijderen?
            </Text>
            <Text style={styles.modalDescription}>
              Dit kan niet ongedaan worden gemaakt.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Annuleren</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={handleDelete}
              >
                <Text style={styles.modalDeleteText}>Verwijderen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingBottom: spacing.xl + 56,
  },

  // ====== IMAGE ======
  image: {
    width: '100%',
    height: 300,
    backgroundColor: colors.border,
  },

  // ====== HEADER ======
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  title: {
    ...typography.title32,
    marginBottom: spacing.sm,
  },

  category: {
    ...typography.caption14,
    color: colors.textSecondary,
  },

  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },

  durationText: {
    ...typography.caption14,
    color: colors.textSecondary,
  },

  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: `${colors.primary}15`,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },

  sourceText: {
    ...typography.caption14,
    color: colors.primary,
  },

  // ====== EDIT MODE ======
  editSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // ====== SECTIONS ======
  section: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  sectionTitle: {
    ...typography.title18,
  },

  selectAllBtn: {
    padding: spacing.sm,
  },

  // ====== INGREDIENTS ======
  ingredientsList: {
    gap: spacing.sm,
  },

  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  ingredientText: {
    flex: 1,
    ...typography.caption14,
    color: colors.text,
  },

  addToGroceryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTopmargin: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
  },

  addToGroceryBtnText: {
    ...typography.caption14Medium,
    color: colors.white,
  },

  // ====== STEPS ======
  stepsList: {
    gap: spacing.md,
  },

  stepItem: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },

  stepNumberText: {
    ...typography.caption14Medium,
    color: colors.white,
  },

  stepText: {
    flex: 1,
    ...typography.caption14,
    color: colors.text,
    paddingTop: spacing.xs,
  },

  // ====== BOTTOM BAR ======
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },

  bottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },

  deleteButton: {
    backgroundColor: colors.white,
    borderColor: colors.error,
  },

  editButton: {
    flex: 2,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  editButtonText: {
    ...typography.caption14Medium,
    color: colors.white,
  },

  cancelButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },

  cancelButtonText: {
    ...typography.caption14Medium,
    color: colors.text,
  },

  saveButton: {
    flex: 1,
  },

  // ====== MODAL ======
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    alignItems: 'center',
    ...shadows.xl,
  },

  modalIcon: {
    marginBottom: spacing.md,
  },

  modalTitle: {
    ...typography.title18,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },

  modalDescription: {
    ...typography.caption14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },

  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },

  modalButton: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  modalCancelButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },

  modalCancelText: {
    ...typography.caption14Medium,
    color: colors.text,
  },

  modalDeleteButton: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },

  modalDeleteText: {
    ...typography.caption14Medium,
    color: colors.white,
  },
})
