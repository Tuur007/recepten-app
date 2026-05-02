import React, { useEffect, useRef, useState } from 'react';
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
import { useRecipeForm } from '../../features/recipes/hooks/useRecipeForm';
import { IngredientInput } from '../../features/recipes/components/IngredientInput';
import { StepInput } from '../../features/recipes/components/StepInput';
import { CategoryPicker } from '../../features/recipes/components/CategoryPicker';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../components/ui/colors';
import { LoadingScreen } from '../../components/LoadingScreen';

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, update, remove } = useRecipes();
  const { addFromRecipe } = useGrocery();

  const recipe = getById(id);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingToList, setAddingToList] = useState(false);

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
    });
  }, [recipe]);

  if (!recipe) return <LoadingScreen />;

  const handleCancelEdit = () => {
    form.reset({
      title: recipe.title,
      category: recipe.category ?? '',
      ingredients: recipe.ingredients,
      steps: recipe.steps,
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
    const validIngredients = recipe.ingredients.filter((i) => i.name.trim());
    if (validIngredients.length === 0) {
      Alert.alert('Geen ingrediënten', 'Voeg eerst ingrediënten toe aan dit recept.');
      return;
    }
    setAddingToList(true);
    try {
      await addFromRecipe(validIngredients, recipe.id, recipe.title);
      Alert.alert('Toegevoegd!', 'Ingrediënten zijn samengevoegd in je boodschappenlijst.');
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

  // Read-only view
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

        <TouchableOpacity
          style={styles.groceryBtn}
          onPress={handleAddToGrocery}
          disabled={addingToList}
          activeOpacity={0.75}
        >
          <Ionicons name="cart-outline" size={18} color={Colors.primary} />
          <Text style={styles.groceryBtnText}>
            {addingToList ? 'Bezig…' : 'Ingrediënten naar boodschappenlijst'}
          </Text>
        </TouchableOpacity>

        {recipe.ingredients.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingrediënten ({recipe.ingredients.length})</Text>
            <View style={styles.readonlyList}>
              {recipe.ingredients.map((ing) => (
                <View key={ing.id} style={styles.readonlyRow}>
                  <View style={styles.readonlyBullet} />
                  <Text style={styles.readonlyText}>
                    {ing.quantity > 0 && ing.quantity !== 1 ? `${ing.quantity} ` : ''}
                    {ing.unit ? `${ing.unit} ` : ''}
                    {ing.name}
                  </Text>
                </View>
              ))}
            </View>
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

        {recipe.ingredients.length === 0 && recipe.steps.length === 0 ? (
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
  },
  groceryBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sectionContent: { gap: 8 },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addRowBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  readonlyList: { gap: 8 },
  readonlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readonlyBullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    flexShrink: 0,
  },
  readonlyText: { fontSize: 15, color: Colors.text, flex: 1, lineHeight: 20 },
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
