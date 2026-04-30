import React, { useEffect, useState } from 'react';
import {
  Alert,
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
import { IngredientInput } from '../../features/recipes/components/IngredientInput';
import { StepInput } from '../../features/recipes/components/StepInput';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../components/ui/colors';
import { Ingredient } from '../../types/recipe';
import { generateId } from '../../utils/id';
import { LoadingScreen } from '../../components/LoadingScreen';

function emptyIngredient(): Ingredient {
  return { id: generateId(), name: '', quantity: 1, unit: '' };
}

export default function EditRecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, update, remove } = useRecipes();
  const { addFromRecipe } = useGrocery();

  const recipe = getById(id);

  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([emptyIngredient()]);
  const [steps, setSteps] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [addingToList, setAddingToList] = useState(false);

  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title);
      setIngredients(recipe.ingredients.length > 0 ? recipe.ingredients : [emptyIngredient()]);
      setSteps(recipe.steps.length > 0 ? recipe.steps : ['']);
    }
  }, [recipe?.id]);

  if (!recipe) return <LoadingScreen />;

  const updateIngredient = (index: number, updated: Ingredient) => {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? updated : ing)));
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, text: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? text : s)));
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a recipe title.');
      return;
    }
    const validIngredients = ingredients.filter((i) => i.name.trim());
    const validSteps = steps.filter((s) => s.trim());

    setSaving(true);
    try {
      await update(id, { title: title.trim(), ingredients: validIngredients, steps: validSteps });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Recipe', `Delete "${recipe.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(id);
          router.back();
        },
      },
    ]);
  };

  const handleAddToGrocery = async () => {
    const validIngredients = ingredients.filter((i) => i.name.trim());
    if (validIngredients.length === 0) {
      Alert.alert('No ingredients', 'Add some ingredients first.');
      return;
    }
    setAddingToList(true);
    try {
      await addFromRecipe(validIngredients, title.trim() || recipe.title);
      Alert.alert('Added!', 'Ingredients have been merged into your grocery list.', [
        { text: 'OK' },
      ]);
    } catch {
      Alert.alert('Error', 'Could not add to grocery list.');
    } finally {
      setAddingToList(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Edit Recipe
        </Text>
        <Button label="Save" onPress={handleSave} loading={saving} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <AppTextInput
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Recipe title"
          />

          {/* Add to grocery button */}
          <TouchableOpacity
            style={styles.groceryBtn}
            onPress={handleAddToGrocery}
            disabled={addingToList}
            activeOpacity={0.75}
          >
            <Ionicons name="cart-outline" size={18} color={Colors.primary} />
            <Text style={styles.groceryBtnText}>
              {addingToList ? 'Adding…' : 'Add ingredients to grocery list'}
            </Text>
          </TouchableOpacity>

          {/* Source URL badge */}
          {recipe.sourceUrl ? (
            <View style={styles.sourceBadge}>
              <Ionicons name="link-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.sourceText} numberOfLines={1}>
                {recipe.sourceUrl}
              </Text>
            </View>
          ) : null}

          {/* Ingredients */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <View style={styles.sectionContent}>
              {ingredients.map((ing, index) => (
                <IngredientInput
                  key={ing.id}
                  ingredient={ing}
                  onChange={(updated) => updateIngredient(index, updated)}
                  onRemove={() => removeIngredient(index)}
                />
              ))}
              <TouchableOpacity
                style={styles.addRowBtn}
                onPress={() => setIngredients((prev) => [...prev, emptyIngredient()])}
              >
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.addRowBtnText}>Add ingredient</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Steps */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Steps</Text>
            <View style={styles.sectionContent}>
              {steps.map((step, index) => (
                <StepInput
                  key={index}
                  index={index}
                  value={step}
                  onChange={(text) => updateStep(index, text)}
                  onRemove={() => removeStep(index)}
                />
              ))}
              <TouchableOpacity
                style={styles.addRowBtn}
                onPress={() => setSteps((prev) => [...prev, ''])}
              >
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.addRowBtnText}>Add step</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Delete */}
          <Button
            label="Delete Recipe"
            variant="danger"
            onPress={handleDelete}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: { padding: 16, gap: 20, paddingBottom: 60 },
  groceryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  groceryBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
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
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sectionContent: { gap: 8 },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addRowBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
});
