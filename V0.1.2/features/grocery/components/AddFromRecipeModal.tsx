/**
 * FIX 2: INGREDIËNTEN TOEVOEGEN - TWEE-STAPS FLOW
 * 
 * Vervang: V0.1.2/features/grocery/components/AddFromRecipeModal.tsx
 * 
 * PROBLEEM: Na recept selecteren, alle ingrediënten toevoegen
 * OPLOSSING: Eerst recept kiezen → dan ingrediënten checklist tonen → selectief toevoegen
 */

import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../../constants/Designsystem';
import { Button } from '../../../components/ui/Button';
import { Recipe } from '../../../types/recipe';

interface AddFromRecipeModalProps {
  visible: boolean;
  recipes: Recipe[];
  onConfirm: (recipe: Recipe, ingredientIds: string[]) => void;
  onClose: () => void;
}

export function AddFromRecipeModal({ visible, recipes, onConfirm, onClose }: AddFromRecipeModalProps) {
  const [step, setStep] = useState<'recipe' | 'ingredients'>('recipe');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setSelectedIngredients(new Set(recipe.ingredients.map((i) => i.id)));
    setStep('ingredients');
  };

  const toggleIngredient = (ingredientId: string) => {
    const updated = new Set(selectedIngredients);
    if (updated.has(ingredientId)) {
      updated.delete(ingredientId);
    } else {
      updated.add(ingredientId);
    }
    setSelectedIngredients(updated);
  };

  const handleConfirm = () => {
    if (selectedRecipe && selectedIngredients.size > 0) {
      const filteredRecipe = {
        ...selectedRecipe,
        ingredients: selectedRecipe.ingredients.filter((i) =>
          selectedIngredients.has(i.id)
        ),
      };
      onConfirm(filteredRecipe, Array.from(selectedIngredients));
      resetModal();
    }
  };

  const resetModal = () => {
    setStep('recipe');
    setSelectedRecipe(null);
    setSelectedIngredients(new Set());
    onClose();
  };

  if (step === 'recipe') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Van recept toevoegen</Text>
            <TouchableOpacity onPress={resetModal} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Kies een recept om ingrediënten toe te voegen.
          </Text>

          <FlatList
            data={recipes}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recipeRow}
                onPress={() => handleSelectRecipe(item)}
                activeOpacity={0.75}
              >
                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeName}>{item.title}</Text>
                  <View style={styles.recipeMeta}>
                    {item.category ? (
                      <View style={styles.catBadge}>
                        <Text style={styles.catBadgeText}>{item.category}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.recipeMetaText}>
                      {item.ingredients.length} ingrediënt{item.ingredients.length !== 1 ? 'en' : ''}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>Nog geen recepten. Voeg eerst een recept toe.</Text>
            }
          />
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('recipe')} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Ingrediënten selecteren</Text>
          <View style={{ width: 24 }} />
        </View>

        {selectedRecipe && (
          <>
            <View style={styles.recipeSummary}>
              <Text style={styles.recipeTitle}>{selectedRecipe.title}</Text>
              <Text style={styles.ingredientCount}>
                {selectedIngredients.size} van {selectedRecipe.ingredients.length} geselecteerd
              </Text>
            </View>

            <FlatList
              data={selectedRecipe.ingredients}
              keyExtractor={(ing) => ing.id}
              contentContainerStyle={styles.ingredientList}
              renderItem={({ item }) => {
                const isSelected = selectedIngredients.has(item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.ingredientRow,
                      isSelected && styles.ingredientRowSelected,
                    ]}
                    onPress={() => toggleIngredient(item.id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.ingredientInfo}>
                      <Text style={styles.ingredientName}>{item.name}</Text>
                      {item.quantity && item.unit && (
                        <Text style={styles.ingredientAmount}>
                          {item.quantity} {item.unit}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color={colors.background} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.footer}>
              <Button
                label="Ingrediënten toevoegen"
                onPress={handleConfirm}
                disabled={selectedIngredients.size === 0}
                fullWidth
              />
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  list: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: spacing.md },
  
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  recipeInfo: { flex: 1, gap: 4 },
  recipeName: { fontSize: 15, fontWeight: '600', color: colors.text },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recipeMetaText: { fontSize: 13, color: colors.textSecondary },
  catBadge: {
    backgroundColor: colors.tertiary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  catBadgeText: { fontSize: 11, fontWeight: '600', color: colors.textDark },
  
  recipeSummary: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  ingredientCount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  
  ingredientList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ingredientRowSelected: {
    backgroundColor: '#FFE6D1',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  ingredientInfo: {
    flex: 1,
    gap: 2,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  ingredientAmount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 40,
    fontSize: 14,
  },
});
