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
import { generateId } from '../../utils/id';

export default function GroceryScreen() {
  const {
    items,
    uncheckedItems,
    checkedItems,
    isLoading,
    toggleChecked,
    remove,
    clearChecked,
    addFromRecipe,
    addManual,
    removeSource,
    removeSingleSource,
  } = useGrocery();
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
    await addFromRecipe(recipe.ingredients, recipe.id, recipe.title);
  };

  const handleManualAdd = async () => {
    const name = manualInput.trim();
    if (!name) return;
    setAdding(true);
    try {
      await addManual({
        name,
        unit: '',
        sources: [{ sourceId: generateId(), sourceType: 'manual', sourceName: name, quantity: 1 }],
        checked: false,
      });
      setManualInput('');
    } finally {
      setAdding(false);
    }
  };

  if (isLoading) return <LoadingScreen />;

  const hasItems = items.length > 0;
  const allItems = [...uncheckedItems, ...checkedItems];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Boodschappen</Text>
        </View>
      </View>

      <View style={styles.addRow}>
        <Ionicons name="add-outline" size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.addInput}
          value={manualInput}
          onChangeText={setManualInput}
          placeholder="Item toevoegen..."
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
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="book-outline" size={16} color={Colors.primary} />
          <Text style={styles.toolbarBtnText}>Van recept</Text>
        </TouchableOpacity>
        {checkedItems.length > 0 ? (
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={handleClearChecked}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            <Text style={[styles.toolbarBtnText, { color: Colors.danger }]}>
              Verwijder ({checkedItems.length})
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={allItems}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[styles.list, !hasItems && { flex: 1 }]}
        renderItem={({ item, index }) => {
          const isFirstChecked =
            item.checked && (index === 0 || !allItems[index - 1]?.checked);

          return (
            <>
              {isFirstChecked && uncheckedItems.length > 0 ? (
                <Text style={styles.sectionHeader}>Afgevinkt</Text>
              ) : null}
              <GroceryItem
                item={item}
                onToggle={() => toggleChecked(item.id)}
                onDelete={() => remove(item.id)}
                onRemoveSource={(sourceId) => removeSingleSource(item.id, sourceId)}
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: Colors.text,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  addInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  toolbarBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary,
  },
  list: { padding: 12, gap: 8 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
});
