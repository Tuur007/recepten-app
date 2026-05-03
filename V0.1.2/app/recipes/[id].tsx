import React, { useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRecipes } from '../../features/recipes/hooks';
import { useGrocery } from '../../features/grocery/hooks';
import { useRecipeForm } from '../../features/recipes/hooks/useRecipeForm';
import { RecipeImagePicker } from '../../features/recipes/components/RecipeImagePicker';
import { IngredientInput } from '../../features/recipes/components/IngredientInput';
import { StepInput } from '../../features/recipes/components/StepInput';
import { CategoryPicker } from '../../features/recipes/components/CategoryPicker';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../components/ui/colors';
import { LoadingScreen } from '../../components/LoadingScreen';
import { Ingredient } from '../../types/recipe';

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, update, remove } = useRecipes();
  const { addFromRecipe } = useGrocery();

  const recipe = getById(id);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingToList, setAddingToList] = useState(false);

  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const allSelected =
    recipe ? selectedIngredients.size === recipe.ingredients.filter((i) => i.name.trim()).length : false;

  const form = useRecipeForm();

  const initialised = useRef(false);
  useEffect(() => {
    if (!recipe || initialised.current) return;
    initialised.current = true;
    form.reset({
      title: recipe.title,
      category: recipe.category ?? '',
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      imageUri: recipe.imageUri,
    });
    const validIds = new Set(recipe.ingredients.filter((i) => i.name.trim()).map((i) => i.id));
    setSelectedIngredients(validIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.id]);

  if (!recipe) return <LoadingScreen />;

  const validIngredients = recipe.ingredients.filter((i) => i.name.trim());

  const toggleIngredient = (ing: Ingredient) => {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(ing.id)) {
        next.delete(ing.id);
      } else {
        next.add(ing.id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIngredients(new Set());
    } else {
      setSelectedIngredients(new Set(validIngredients.map((i) => i.id)));
    }
  };

  const handleCancelEdit = () => {
    form.reset({
      title: recipe.title,
      category: recipe.category ?? '',
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      imageUri: recipe.imageUri,
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Titel ontbreekt', 'Voer een recepttitel in.');
      return;
    }
    setSaving(true);
    try {
      await update(id, {
        title: form.title.trim(),
        category: form.category,
        ingredients: form.validIngredients,
        steps: form.validSteps,
        imageUri: form.imageUri,
      });
      setIsEditing(false);
    } catch {
      Alert.alert('Fout', 'Kon wijzigingen niet opslaan. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Recept verwijderen', `"${recipe.title}" verwijderen? Dit kan niet ongedaan worden gemaakt.`, [
      { text: 'Annuleer', style: 'cancel' },
      {
        text: 'Verwijder',
        style: 'destructive',
        onPress: async () => {
          await remove(id);
          router.back();
        },
      },
    ]);
  };

  const handleAddToGrocery = async () => {
    const toAdd = validIngredients.filter((i) => selectedIngredients.has(i.id));
    if (toAdd.length === 0) {
      Alert.alert('Geen ingrediënten geselecteerd', 'Vink minstens één ingrediënt aan.');
      return;
    }
    setAddingToList(true);
    try {
      await addFromRecipe(toAdd, recipe.id, recipe.title);
      Alert.alert(
        'Toegevoegd! 🛒',
        `${toAdd.length} ingrediënt${toAdd.length !== 1 ? 'en' : ''} toegevoegd aan je boodschappenlijst.`,
      );
    } catch {
      Alert.alert('Fout', 'Kon niet toevoegen aan boodschappenlijst.');
    } finally {
      setAddingToList(false);
    }
  };

  if (isEditing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancelEdit} hitSlop={8}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Recept bewerken</Text>
          <Button label="Opslaan" onPress={handleSave} loading={saving} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <RecipeImagePicker
              imageUri={form.imageUri}
              onImageSelect={form.setImageUri}
              onImageRemove={() => form.setImageUri(undefined)}
              loading={saving}
            />

            <AppTextInput
              label="Titel"
              value={form.title}
              onChangeText={form.setTitle}
              placeholder="Recepttitel"
            />

            <CategoryPicker value={form.category} onChange={form.setCategory} />

            {recipe.sourceUrl ? (
              <View style={styles.sourceBadge}>
                <Ionicons name="link-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.sourceText} numberOfLines={1}>{recipe.sourceUrl}</Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingrediënten</Text>
              <View style={styles.sectionContent}>
                {form.ingredients.map((ing, index) => (
                  <IngredientInput
                    key={ing.id}
                    ingredient={ing}
                    onChange={(updated) => form.updateIngredient(index, updated)}
                    onRemove={() => form.removeIngredient(index)}
                  />
                ))}
                <TouchableOpacity style={styles.addRowBtn} onPress={form.addIngredient}>
                  <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                  <Text style={styles.addRowBtnText}>Ingrediënt toevoegen</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stappen</Text>
              <View style={styles.sectionContent}>
                {form.steps.map((step, index) => (
                  <StepInput
                    key={index}
                    index={index}
                    value={step}
                    onChange={(text) => form.updateStep(index, text)}
                    onRemove={() => form.removeStep(index)}
                  />
                ))}
                <TouchableOpacity style={styles.addRowBtn} onPress={form.addStep}>
                  <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                  <Text style={styles.addRowBtnText}>Stap toevoegen</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Button label="Recept verwijderen" variant="danger" onPress={handleDelete} fullWidth />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const selectedCount = selectedIngredients.size;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{recipe.title}</Text>
        <TouchableOpacity onPress={() => setIsEditing(true)} hitSlop={8} style={styles.editHeaderBtn}>
          <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {recipe.imageUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: recipe.imageUri }} style={styles.recipeImage} />
          </View>
        ) : null}

        <View style={styles.metaRow}>
          {recipe.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{recipe.category}</Text>
            </View>
          ) : null}
          {recipe.sourceUrl ? (
            <View style={styles.sourceBadge}>
              <Ionicons name="link-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.sourceText} numberOfLines={1}>{recipe.sourceUrl}</Text>
            </View>
          ) : null}
        </View>

        {validIngredients.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Ingrediënten ({validIngredients.length})
              </Text>
              <TouchableOpacity onPress={toggleAll} style={styles.selectAllBtn} activeOpacity={0.7}>
                <View style={[styles.selectAllBox, allSelected && styles.selectAllBoxActive]}>
                  {allSelected ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                </View>
                <Text style={styles.selectAllText}>
                  {allSelected ? 'Alles deselecteren' : 'Alles selecteren'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.readonlyList}>
              {validIngredients.map((ing) => {
                const checked = selectedIngredients.has(ing.id);
                return (
                  <TouchableOpacity
                    key={ing.id}
                    style={[styles.ingredientRow, checked && styles.ingredientRowSelected]}
                    onPress={() => toggleIngredient(ing)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
                    </View>

                    <Text style={[styles.ingredientText, !checked && styles.ingredientTextMuted]}>
                      {ing.quantity > 0 && ing.quantity !== 1 ? `${ing.quantity} ` : ''}
                      {ing.unit ? `${ing.unit} ` : ''}
                      {ing.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.groceryBtn, selectedCount === 0 && styles.groceryBtnDisabled]}
              onPress={handleAddToGrocery}
              disabled={addingToList || selectedCount === 0}
              activeOpacity={0.75}
            >
              <Ionicons
                name="cart-outline"
                size={18}
                color={selectedCount === 0 ? Colors.textSecondary : Colors.primary}
              />
              <Text style={[styles.groceryBtnText, selectedCount === 0 && styles.groceryBtnTextMuted]}>
                {addingToList
                  ? 'Bezig…'
                  : selectedCount === 0
                  ? 'Selecteer ingrediënten'
                  : `${selectedCount} ingrediënt${selectedCount !== 1 ? 'en' : ''} naar boodschappen`}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {recipe.steps.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stappen ({recipe.steps.length})</Text>
            <View style={styles.readonlyList}>
              {recipe.steps.map((step, index) => (
                <View key={index} style={styles.readonlyStepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.readonlyStepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {validIngredients.length === 0 && recipe.steps.length === 0 ? (
          <View style={styles.emptyRecipe}>
            <Text style={styles.emptyRecipeText}>
              Dit recept heeft nog geen ingrediënten of stappen.
            </Text>
            <Button variant="secondary" label="Recept bewerken" onPress={() => setIsEditing(true)} />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.editBtnContainer}>
        <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)} activeOpacity={0.85}>
          <Ionicons name="pencil" size={20} color="#fff" />
          <Text style={styles.editBtnText}>Recept bewerken</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, flex: 1, marginHorizontal: 12 },
  editHeaderBtn: { padding: 4 },
  content: { padding: 16, gap: 20, paddingBottom: 100 },
  imageContainer: { width: '100%', height: 240, borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
  recipeImage: { width: '100%', height: '100%' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBadge: {
    backgroundColor: Colors.accentLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  categoryBadgeText: { fontSize: 13, fontWeight: '600', color: Colors.accent },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.background,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sourceText: { fontSize: 12, color: Colors.textSecondary, flex: 1 },
  section: { gap: 10 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sectionContent: { gap: 8 },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectAllBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  selectAllBoxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  selectAllText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  readonlyList: { gap: 8 },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  ingredientRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: Colors.surface,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ingredientText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  ingredientTextMuted: {
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  groceryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginTop: 4,
  },
  groceryBtnDisabled: {
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.border,
  },
  groceryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  groceryBtnTextMuted: {
    color: Colors.textSecondary,
  },
  readonlyStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  readonlyStepText: { fontSize: 15, color: Colors.text, flex: 1, lineHeight: 22 },
  emptyRecipe: { alignItems: 'center', gap: 16, paddingVertical: 24 },
  emptyRecipeText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addRowBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  editBtnContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  editBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
