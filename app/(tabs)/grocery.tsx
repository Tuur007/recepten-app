import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
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
  const { items, uncheckedItems, checkedItems, isLoading, toggleChecked, remove, clearChecked, addFromRecipe } =
    useGrocery();
  const { recipes } = useRecipes();
  const [modalVisible, setModalVisible] = useState(false);

  const handleClearChecked = () => {
    if (checkedItems.length === 0) return;
    Alert.alert(
      'Clear Checked Items',
      `Remove ${checkedItems.length} checked item${checkedItems.length !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearChecked },
      ],
    );
  };

  const handleAddFromRecipe = async (recipe: Recipe) => {
    setModalVisible(false);
    await addFromRecipe(recipe.ingredients, recipe.title);
  };

  if (isLoading) return <LoadingScreen />;

  const hasItems = items.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolbarBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.toolbarBtnText}>From recipe</Text>
        </TouchableOpacity>
        {checkedItems.length > 0 ? (
          <TouchableOpacity style={styles.toolbarBtn} onPress={handleClearChecked}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            <Text style={[styles.toolbarBtnText, { color: Colors.danger }]}>
              Clear checked ({checkedItems.length})
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={[...uncheckedItems, ...checkedItems]}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[styles.list, !hasItems && { flex: 1 }]}
        renderItem={({ item, index }) => {
          const isFirstChecked =
            item.checked &&
            (index === 0 || !([...uncheckedItems, ...checkedItems][index - 1]?.checked ?? false));

          return (
            <>
              {isFirstChecked && uncheckedItems.length > 0 ? (
                <Text style={styles.sectionHeader}>Checked</Text>
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
            <Text style={styles.sectionHeader}>To buy</Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="🛒"
            title="Your list is empty"
            message="Tap 'From recipe' to add ingredients, or go to a recipe and add its ingredients here."
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
