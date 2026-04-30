import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGrocery } from '../../features/grocery/hooks';
import { useRecipes } from '../../features/recipes/hooks';
import { GroceryItem } from '../../features/grocery/components/GroceryItem';
import { AddFromRecipeModal } from '../../features/grocery/components/AddFromRecipeModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/LoadingScreen';
import { Colors } from '../../components/ui/colors';
import { Recipe } from '../../types/recipe';

export default function GroceryScreen() {
  const { items, uncheckedItems, checkedItems, isLoading, toggleChecked, remove, clearChecked, addFromRecipe, addManual } =
    useGrocery();
  const { recipes } = useRecipes();
  const [modalVisible, setModalVisible] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [adding, setAdding] = useState(false);

  const handleClearChecked = () => {
    if (checkedItems.length === 0) return;
    Alert.alert(
      'Afgevinkte items verwijderen',
      `${checkedItems.length} afgevinkt${checkedItems.length !== 1 ? 'e items' : ' item'} verwijderen?`,
      [
        { text: 'Annuleer', style: 'cancel' },
        { text: 'Verwijder', style: 'destructive', onPress: clearChecked },
      ],
    );
  };

  const handleAddFromRecipe = async (recipe: Recipe) => {
    setModalVisible(false);
    await addFromRecipe(recipe.ingredients, recipe.title);
  };

  const handleManualAdd = async () => {
    const name = manualInput.trim();
    if (!name) return;
    setAdding(true);
    try {
      await addManual({ name, quantity: 1, unit: '', recipes: [], checked: false });
      setManualInput('');
    } finally {
      setAdding(false);
    }
  };

  if (isLoading) return <LoadingScreen />;

  const hasItems = items.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Manual add input */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          value={manualInput}
          onChangeText={setManualInput}
          placeholder="Item toevoegen…"
          placeholderTextColor={Colors.textSecondary}
          returnKeyType="done"
          onSubmitEditing={handleManualAdd}
          editable={!adding}
        />
        <TouchableOpacity
          style={[styles.addBtn, (!manualInput.trim() || adding) && styles.addBtnDisabled]}
          onPress={handleManualAdd}
          disabled={!manualInput.trim() || adding}
          activeOpacity={0.75}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolbarBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="book-outline" size={16} color={Colors.primary} />
          <Text style={styles.toolbarBtnText}>Van recept</Text>
        </TouchableOpacity>
        {checkedItems.length > 0 ? (
          <TouchableOpacity style={styles.toolbarBtn} onPress={handleClearChecked}>
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            <Text style={[styles.toolbarBtnText, { color: Colors.danger }]}>
              Verwijder afgevinkt ({checkedItems.length})
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={[...uncheckedItems, ...checkedItems]}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[styles.list, !hasItems && { flex: 1 }]}
        renderItem={({ item, index }) => {
          const allItems = [...uncheckedItems, ...checkedItems];
          const isFirstChecked =
            item.checked && (index === 0 || !(allItems[index - 1]?.checked ?? false));

          return (
            <>
              {isFirstChecked && uncheckedItems.length > 0 ? (
                <Text style={styles.sectionHeader}>Afgevinkt</Text>
              ) : null}
              <GroceryItem
                item={item}
                onToggle={() => toggleChecked(item.id)}
                onDelete={() => remove(item.id)}
              />
            </>
          );
        }}
        ListHeaderComponent={
          uncheckedItems.length > 0 ? (
            <Text style={styles.sectionHeader}>Te kopen</Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="🛒"
            title="Je lijst is leeg"
            message="Typ een item hierboven, of tap 'Van recept' om ingrediënten toe te voegen."
          />
        }
      />

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
  container: { flex: 1, backgroundColor: Colors.background },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  addInput: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  toolbarBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary,
  },
  list: { padding: 16, gap: 8 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    marginTop: 4,
  },
});
