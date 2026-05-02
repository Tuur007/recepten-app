import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const Colors = {
  primary: '#8B7B6B',
  primaryLight: '#f5f3f0',
  accent: '#d4a574',
  accentLight: '#faf9f7',
  green: '#639922',
  background: '#fafaf7',
  surface: '#ffffff',
  surfaceAlt: '#f5f3f0',
  border: '#f0ede6',
  text: '#4a4a4a',
  textSecondary: '#8a7a70',
  danger: '#C0392B',
  dangerLight: '#FDEDEC',
};

const RECIPE_CATEGORIES = [
  'Ontbijt',
  'Lunch',
  'Diner',
  'Snack',
  'Dessert',
  'Soep',
  'Salade',
  'Bakken',
  'Dranken',
];

type Tab = 'recipes' | 'grocery';

interface Recipe {
  id: string;
  title: string;
  ingredients: { id: string; name: string; quantity: number; unit: string }[];
  steps: string[];
  category: string;
  isFavorite: boolean;
  createdAt: string;
}

interface GroceryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  checked: boolean;
  recipeSource?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('recipes');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeTitle, setRecipeTitle] = useState('');
  const [recipeCategory, setRecipeCategory] = useState('');
  const [ingredients, setIngredients] = useState<
    { id: string; name: string; quantity: number; unit: string }[]
  >([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groceryInput, setGroceryInput] = useState('');

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const filteredRecipes = useMemo(() => {
    let list = recipes;
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.ingredients.some((i) => i.name.toLowerCase().includes(query))
      );
    }
    return list;
  }, [recipes, searchQuery]);

  const uncheckedGrocery = useMemo(
    () => groceryItems.filter((i) => !i.checked),
    [groceryItems]
  );
  const checkedGrocery = useMemo(
    () => groceryItems.filter((i) => i.checked),
    [groceryItems]
  );

  const handleAddRecipe = () => {
    if (!recipeTitle.trim()) {
      Alert.alert('Error', 'Enter recipe title');
      return;
    }
    const validIngredients = ingredients.filter((i) => i.name.trim());

    const recipe: Recipe = {
      id: generateId(),
      title: recipeTitle,
      ingredients: validIngredients,
      steps: steps.filter((s) => s.trim()),
      category: recipeCategory,
      isFavorite: false,
      createdAt: new Date().toISOString(),
    };

    if (editingRecipe) {
      setRecipes(recipes.map((r) => (r.id === editingRecipe.id ? recipe : r)));
      setEditingRecipe(null);
    } else {
      setRecipes([recipe, ...recipes]);
    }

    resetRecipeForm();
  };

  const resetRecipeForm = () => {
    setRecipeTitle('');
    setRecipeCategory('');
    setIngredients([{ id: generateId(), name: '', quantity: 1, unit: '' }]);
    setSteps(['']);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setRecipeTitle(recipe.title);
    setRecipeCategory(recipe.category);
    setIngredients(recipe.ingredients);
    setSteps(recipe.steps.length > 0 ? recipe.steps : ['']);
  };

  const handleDeleteRecipe = (id: string) => {
    Alert.alert('Delete Recipe', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setRecipes(recipes.filter((r) => r.id !== id)),
      },
    ]);
  };

  const handleToggleFavorite = (id: string) => {
    setRecipes(
      recipes.map((r) =>
        r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
      )
    );
  };

  const handleAddFromRecipe = (recipe: Recipe) => {
    const newItems = recipe.ingredients.map((ing) => ({
      id: generateId(),
      name: ing.name,
      unit: ing.unit,
      quantity: ing.quantity,
      checked: false,
      recipeSource: recipe.title,
    }));
    setGroceryItems([...groceryItems, ...newItems]);
  };

  const handleAddGrocery = () => {
    if (!groceryInput.trim()) return;
    const item: GroceryItem = {
      id: generateId(),
      name: groceryInput.trim(),
      unit: '',
      quantity: 1,
      checked: false,
    };
    setGroceryItems([...groceryItems, item]);
    setGroceryInput('');
  };

  const handleToggleGrocery = (id: string) => {
    setGroceryItems(
      groceryItems.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
    );
  };

  const handleDeleteGrocery = (id: string) => {
    setGroceryItems(groceryItems.filter((i) => i.id !== id));
  };

  const handleClearChecked = () => {
    if (checkedGrocery.length === 0) return;
    Alert.alert('Clear Checked', 'Remove all checked items?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          setGroceryItems(groceryItems.filter((i) => !i.checked)),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {activeTab === 'recipes' ? 'Recipes' : 'Grocery'}
        </Text>
      </View>

      {activeTab === 'recipes' ? (
        <>
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={16}
              color={Colors.textSecondary}
            />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search recipes..."
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.sectionTitle}>
              {editingRecipe ? 'Edit Recipe' : 'Add Recipe'}
            </Text>

            <TextInput
              style={styles.input}
              value={recipeTitle}
              onChangeText={setRecipeTitle}
              placeholder="Recipe title"
              placeholderTextColor={Colors.textSecondary}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {['', ...RECIPE_CATEGORIES].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    recipeCategory === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setRecipeCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      recipeCategory === cat &&
                        styles.categoryChipTextActive,
                    ]}
                  >
                    {cat || 'None'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.subTitle}>Ingredients</Text>
            {ingredients.map((ing, idx) => (
              <View key={ing.id} style={styles.ingredientRow}>
                <TextInput
                  style={[styles.input, styles.qtyInput]}
                  value={String(ing.quantity)}
                  onChangeText={(text) =>
                    setIngredients(
                      ingredients.map((i, i2) =>
                        i2 === idx
                          ? { ...i, quantity: parseFloat(text) || 0 }
                          : i
                      )
                    )
                  }
                  placeholder="Qty"
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[styles.input, styles.unitInput]}
                  value={ing.unit}
                  onChangeText={(text) =>
                    setIngredients(
                      ingredients.map((i, i2) =>
                        i2 === idx ? { ...i, unit: text } : i
                      )
                    )
                  }
                  placeholder="Unit"
                />
                <TextInput
                  style={[styles.input, styles.nameInput]}
                  value={ing.name}
                  onChangeText={(text) =>
                    setIngredients(
                      ingredients.map((i, i2) =>
                        i2 === idx ? { ...i, name: text } : i
                      )
                    )
                  }
                  placeholder="Ingredient"
                />
                <TouchableOpacity
                  onPress={() =>
                    setIngredients(ingredients.filter((_, i) => i !== idx))
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={Colors.danger}
                  />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() =>
                setIngredients([
                  ...ingredients,
                  { id: generateId(), name: '', quantity: 1, unit: '' },
                ])
              }
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.addBtnText}>Add Ingredient</Text>
            </TouchableOpacity>

            <Text style={styles.subTitle}>Steps</Text>
            {steps.map((step, idx) => (
              <View key={idx} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{idx + 1}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.stepInput]}
                  value={step}
                  onChangeText={(text) =>
                    setSteps(steps.map((s, i) => (i === idx ? text : s)))
                  }
                  placeholder={`Step ${idx + 1}`}
                  multiline
                />
                <TouchableOpacity
                  onPress={() => setSteps(steps.filter((_, i) => i !== idx))}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={Colors.danger}
                  />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setSteps([...steps, ''])}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.addBtnText}>Add Step</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleAddRecipe}
            >
              <Text style={styles.saveBtnText}>
                {editingRecipe ? 'Save Changes' : 'Add Recipe'}
              </Text>
            </TouchableOpacity>
            {editingRecipe && (
              <TouchableOpacity
                style={[styles.saveBtn, styles.cancelBtn]}
                onPress={() => {
                  setEditingRecipe(null);
                  resetRecipeForm();
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <Text style={styles.listTitle}>Recipes ({filteredRecipes.length})</Text>
          <FlatList
            data={filteredRecipes}
            keyExtractor={(r) => r.id}
            style={styles.list}
            renderItem={({ item }) => (
              <View style={styles.recipeCard}>
                <View style={styles.recipeHeader}>
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeName} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.category && (
                      <Text style={styles.recipeCategory}>{item.category}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleToggleFavorite(item.id)}
                  >
                    <Ionicons
                      name={item.isFavorite ? 'heart' : 'heart-outline'}
                      size={22}
                      color={item.isFavorite ? Colors.danger : Colors.text}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.recipeMetaText}>
                  {item.ingredients.length} ingredients • {item.steps.length}{' '}
                  steps
                </Text>
                <View style={styles.recipeActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleEditRecipe(item)}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={16}
                      color={Colors.primary}
                    />
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleAddFromRecipe(item)}
                  >
                    <Ionicons
                      name="cart-outline"
                      size={16}
                      color={Colors.primary}
                    />
                    <Text style={styles.actionBtnText}>Add to List</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnDanger]}
                    onPress={() => handleDeleteRecipe(item.id)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={Colors.danger}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </>
      ) : (
        <>
          <View style={styles.groceryAddRow}>
            <TextInput
              style={styles.groceryInput}
              value={groceryInput}
              onChangeText={setGroceryInput}
              placeholder="Add item..."
              placeholderTextColor={Colors.textSecondary}
              onSubmitEditing={handleAddGrocery}
            />
            <TouchableOpacity
              style={styles.groceryAddBtn}
              onPress={handleAddGrocery}
              disabled={!groceryInput.trim()}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {uncheckedGrocery.length > 0 && (
            <Text style={styles.grocerySectionHeader}>To Buy</Text>
          )}
          <FlatList
            data={[...uncheckedGrocery, ...checkedGrocery]}
            keyExtractor={(i) => i.id}
            style={styles.groceryList}
            renderItem={({ item, index }) => {
              const allItems = [...uncheckedGrocery, ...checkedGrocery];
              const isFirstChecked =
                item.checked &&
                (index === 0 || !(allItems[index - 1]?.checked ?? false));

              return (
                <>
                  {isFirstChecked && uncheckedGrocery.length > 0 && (
                    <Text style={styles.grocerySectionHeader}>Checked</Text>
                  )}
                  <View
                    style={[
                      styles.groceryItemRow,
                      item.checked && styles.groceryItemChecked,
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => handleToggleGrocery(item.id)}
                      style={[
                        styles.checkbox,
                        item.checked && styles.checkboxChecked,
                      ]}
                    >
                      {item.checked && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      )}
                    </TouchableOpacity>
                    <View style={styles.groceryItemContent}>
                      <Text
                        style={[
                          styles.groceryItemName,
                          item.checked && styles.groceryItemNameChecked,
                        ]}
                      >
                        {item.quantity > 0 && item.quantity !== 1
                          ? `${item.quantity} `
                          : ''}
                        {item.unit ? `${item.unit} ` : ''}
                        {item.name}
                      </Text>
                      {item.recipeSource && (
                        <Text style={styles.groceryItemSource}>
                          ({item.recipeSource})
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteGrocery(item.id)}
                    >
                      <Text style={styles.deleteIcon}>×</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🛒</Text>
                <Text style={styles.emptyStateTitle}>Your list is empty</Text>
              </View>
            }
          />
          {checkedGrocery.length > 0 && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClearChecked}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              <Text style={styles.clearBtnText}>
                Delete Checked ({checkedGrocery.length})
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'recipes' && styles.tabBtnActive]}
          onPress={() => setActiveTab('recipes')}
        >
          <Ionicons
            name="book-outline"
            size={20}
            color={
              activeTab === 'recipes' ? Colors.primary : Colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'recipes' && styles.tabBtnTextActive,
            ]}
          >
            Recipes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'grocery' && styles.tabBtnActive]}
          onPress={() => setActiveTab('grocery')}
        >
          <Ionicons
            name="cart-outline"
            size={20}
            color={
              activeTab === 'grocery' ? Colors.primary : Colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'grocery' && styles.tabBtnTextActive,
            ]}
          >
            Grocery
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  categoryScroll: {
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  qtyInput: {
    flex: 0,
    width: 60,
    marginBottom: 0,
  },
  unitInput: {
    flex: 0,
    width: 70,
    marginBottom: 0,
  },
  nameInput: {
    flex: 1,
    marginBottom: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  stepInput: {
    flex: 1,
    minHeight: 60,
    marginBottom: 0,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  addBtnText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  cancelBtnText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  recipeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  recipeCategory: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  recipeMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  recipeActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
  },
  actionBtnDanger: {
    backgroundColor: Colors.dangerLight,
  },
  actionBtnText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  groceryAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  groceryInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  groceryAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groceryList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  grocerySectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginVertical: 8,
  },
  groceryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 10,
  },
  groceryItemChecked: {
    opacity: 0.5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  groceryItemContent: {
    flex: 1,
  },
  groceryItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  groceryItemNameChecked: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  groceryItemSource: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  deleteIcon: {
    fontSize: 20,
    color: Colors.textSecondary,
    fontWeight: '300',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.dangerLight,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.danger,
  },
  clearBtnText: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  tabBtnActive: {},
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: Colors.primary,
  },
});
