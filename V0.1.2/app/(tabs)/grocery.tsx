import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useGrocery } from '../../features/grocery/hooks';
import { useRecipes } from '../../features/recipes/hooks';
import { useCategories } from '../../store/categoriesStore';
import { GroceryItem } from '../../features/grocery/components/GroceryItem';
import { AddFromRecipeModal } from '../../features/grocery/components/AddFromRecipeModal';
import { LoadingScreen } from '../../components/LoadingScreen';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';
import type { Recipe } from '../../types/recipe';

export default function GroceryScreen() {
  const {
    uncheckedItems,
    checkedItems,
    isLoading,
    addManual,
    addFromRecipe,
    removeSingleSource,
    toggleChecked,
    remove,
    clearChecked,
  } = useGrocery();
  const { recipes } = useRecipes();
  const { groceryCategories } = useCategories();

  const [recipeModalVisible, setRecipeModalVisible] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);

  // Manual add form state
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState('');
  const [manualUnit, setManualUnit] = useState('');
  const [manualCategory, setManualCategory] = useState('');

  if (isLoading) return <LoadingScreen />;

  const resetManualForm = () => {
    setManualName('');
    setManualQty('');
    setManualUnit('');
    setManualCategory('');
  };

  const handleSaveManual = async () => {
    const name = manualName.trim();
    if (!name) return;
    const qty = parseFloat(manualQty) || 1;
    await addManual({
      name,
      unit: manualUnit.trim(),
      category: manualCategory,
      sources: [
        {
          sourceId: 'manual',
          sourceType: 'manual',
          sourceName: 'Handmatig',
          quantity: qty,
        },
      ],
      checked: false,
    });
    resetManualForm();
    setManualModalVisible(false);
  };

  const handleAddFromRecipe = async (recipe: Recipe, ingredientIds: string[]) => {
    const filteredIngredients = recipe.ingredients.filter((ing) =>
      ingredientIds.includes(ing.id)
    );
    await addFromRecipe(filteredIngredients, recipe.id, recipe.title);
    setRecipeModalVisible(false);
  };

  const totalCount = uncheckedItems.length + checkedItems.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Folio */}
          <View style={styles.folio}>
            <Text style={typography.folio}>lijst · {totalCount}</Text>
          </View>

          {/* Title + action buttons */}
          <View style={styles.titleRow}>
            <View>
              <Text style={[typography.hero32Bold, { fontSize: 38 }]}>De</Text>
              <Text style={[typography.heroItalic, { fontSize: 38 }]}>boodschappen.</Text>
            </View>
            <View style={styles.actionBtns}>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setManualModalVisible(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.recipeBtn}
                onPress={() => setRecipeModalVisible(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="book-outline" size={18} color={colors.textDark} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Unchecked items */}
          {uncheckedItems.length > 0 && (
            <View style={styles.itemList}>
              {uncheckedItems.map((item) => (
                <GroceryItem
                  key={item.id}
                  item={item}
                  onToggle={() => toggleChecked(item.id)}
                  onDelete={() => remove(item.id)}
                  onRemoveSource={(sourceId) => removeSingleSource(item.id, sourceId)}
                />
              ))}
            </View>
          )}

          {/* Checked section */}
          {checkedItems.length > 0 && (
            <View style={{ marginTop: spacing.xl }}>
              <View style={styles.checkedHeader}>
                <Text style={typography.folioBold}>gedaan</Text>
                <View style={styles.rule} />
                <TouchableOpacity onPress={clearChecked} activeOpacity={0.7}>
                  <Text style={styles.clearText}>wis alles</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.itemList, { marginTop: spacing.sm }]}>
                {checkedItems.map((item) => (
                  <GroceryItem
                    key={item.id}
                    item={item}
                    onToggle={() => toggleChecked(item.id)}
                    onDelete={() => remove(item.id)}
                    onRemoveSource={(sourceId) => removeSingleSource(item.id, sourceId)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Empty state */}
          {totalCount === 0 && (
            <View style={styles.empty}>
              <Text style={[typography.bodyItalic, { textAlign: 'center' }]}>
                Je lijst is leeg.{'\n'}Voeg iets toe of haal uit een recept.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Manual add modal */}
      <Modal
        visible={manualModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { resetManualForm(); setManualModalVisible(false); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { resetManualForm(); setManualModalVisible(false); }} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textLight} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Item toevoegen</Text>
              <TouchableOpacity
                onPress={handleSaveManual}
                disabled={!manualName.trim()}
                hitSlop={8}
              >
                <Text style={[styles.modalSave, !manualName.trim() && { opacity: 0.35 }]}>
                  Voeg toe
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Naam</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={manualName}
                  onChangeText={setManualName}
                  placeholder="bv. melk"
                  placeholderTextColor={colors.textFaint}
                  autoFocus
                  returnKeyType="next"
                />
              </View>

              {/* Qty + Unit row */}
              <View style={styles.rowFields}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Hoeveelheid</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={manualQty}
                    onChangeText={setManualQty}
                    placeholder="1"
                    placeholderTextColor={colors.textFaint}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Eenheid</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={manualUnit}
                    onChangeText={setManualUnit}
                    placeholder="bv. liter"
                    placeholderTextColor={colors.textFaint}
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Category */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Categorie</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.catChips}
                >
                  {/* "Geen" chip */}
                  <TouchableOpacity
                    key="none"
                    style={[styles.catChip, manualCategory === '' && styles.catChipActive]}
                    onPress={() => setManualCategory('')}
                  >
                    <Text style={[styles.catChipText, manualCategory === '' && styles.catChipTextActive]}>
                      Geen
                    </Text>
                  </TouchableOpacity>
                  {groceryCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.catChip, manualCategory === cat.name && styles.catChipActive]}
                      onPress={() => setManualCategory(cat.name)}
                    >
                      <Text style={[styles.catChipText, manualCategory === cat.name && styles.catChipTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      <AddFromRecipeModal
        visible={recipeModalVisible}
        recipes={recipes}
        onConfirm={handleAddFromRecipe}
        onClose={() => setRecipeModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  folio: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },

  actionBtns: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingBottom: 4,
  },

  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recipeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemList: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginTop: spacing.lg,
  },

  checkedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
  },

  rule: { flex: 1, height: 1, backgroundColor: colors.borderColor },

  clearText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.primary,
  },

  empty: {
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderColor,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textDark,
  },
  modalSave: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.primary,
  },
  modalContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  fieldInput: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    paddingVertical: 8,
  },
  rowFields: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  catChips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderColor,
    backgroundColor: colors.background,
  },
  catChipActive: {
    backgroundColor: colors.textDark,
    borderColor: colors.textDark,
  },
  catChipText: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.textLight,
  },
  catChipTextActive: {
    color: colors.background,
  },
});
