import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
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

  const [modalVisible, setModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  if (isLoading) return <LoadingScreen />;

  const handleAddManual = async () => {
    const name = newItemName.trim();
    if (!name) return;
    await addManual({
      name,
      unit: '',
      sources: [
        {
          sourceId: 'manual',
          sourceType: 'manual',
          sourceName: 'Handmatig',
          quantity: 1,
        },
      ],
      checked: false,
    });
    setNewItemName('');
  };

  const handleAddFromRecipe = async (recipe: Recipe) => {
    await addFromRecipe(recipe.ingredients, recipe.id, recipe.title);
    setModalVisible(false);
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
            <Text style={typography.folio}>p. 72</Text>
            <Text style={typography.folio}>lijst · {totalCount}</Text>
          </View>

          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={[typography.hero32Bold, { fontSize: 38 }]}>De</Text>
            <Text style={[typography.heroItalic, { fontSize: 38 }]}>boodschappen.</Text>
          </View>

          {/* Add item row */}
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="Iets toevoegen…"
              placeholderTextColor={colors.textFaint}
              value={newItemName}
              onChangeText={setNewItemName}
              onSubmitEditing={handleAddManual}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleAddManual}
              activeOpacity={0.75}
            >
              <Ionicons name="add" size={18} color={colors.background} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.recipeBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="book-outline" size={18} color={colors.textDark} />
            </TouchableOpacity>
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

      <AddFromRecipeModal
        visible={modalVisible}
        recipes={recipes}
        onConfirm={handleAddFromRecipe}
        onClose={() => setModalVisible(false)}
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

  titleBlock: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },

  addInput: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    paddingVertical: 10,
  },

  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.textDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recipeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemList: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginTop: spacing.md,
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
});
