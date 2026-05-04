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
import { safeOpenUrl } from '../../utils/linking';
import { RecipeImagePicker } from '../../features/recipes/components/RecipeImagePicker';
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

  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());

  const validIngredients = recipe?.ingredients.filter((i) => i.name.trim()) ?? [];
  const allSelected = validIngredients.length > 0 && selectedIngredients.size === validIngredients.length;

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
      duration: recipe.duration,
    });
    const validIds = new Set(recipe.ingredients.filter((i) => i.name.trim()).map((i) => i.id));
    setSelectedIngredients(validIds);
  }, [recipe?.id]);

  if (!recipe) return <LoadingScreen />;

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
        duration: form.duration,
      });
      setIsEditing(false);
    } catch {
      Alert.alert('Fout', 'Kon wijzigingen niet opslaan. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset form back to current saved recipe values
    form.reset({
      title: recipe.title,
      category: recipe.category ?? '',
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      imageUri: recipe.imageUri,
      duration: recipe.duration,
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Recept verwijderen',
      `Weet je zeker dat je "${recipe.title}" wilt verwijderen?`,
      [
        { text: 'Annuleer', style: 'cancel' },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: async () => {
            try {
              await remove(id);
              router.back();
            } catch {
              Alert.alert('Fout', 'Kon recept niet verwijderen. Probeer opnieuw.');
            }
          },
        },
      ],
    );
  };

  const handleAddToGrocery = async () => {
    if (selectedIngredients.size === 0) {
      Alert.alert('Geen ingrediënten', 'Selecteer minstens één ingrediënt.');
      return;
    }
    setAddingToList(true);
    try {
      await addFromRecipe(recipe, selectedIngredients);
      Alert.alert('Toegevoegd', 'Ingrediënten zijn toegevoegd aan je boodschappenlijst.');
    } catch {
      Alert.alert('Fout', 'Kon ingrediënten niet toevoegen. Probeer opnieuw.');
    } finally {
      setAddingToList(false);
    }
  };

  const toggleIngredient = (ingId: string) => {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      next.has(ingId) ? next.delete(ingId) : next.add(ingId);
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

  // ─── Edit mode ────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancelEdit} hitSlop={8}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Bewerken
          </Text>
          <Button label="Opslaan" onPress={handleSave} loading={saving} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
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

            <AppTextInput
              label="Kooktijd (minuten)"
              value={form.duration?.toString() ?? ''}
              onChangeText={(text) => form.setDuration(text ? parseInt(text, 10) : undefined)}
              placeholder="30"
              keyboardType="number-pad"
            />

            {recipe.sourceUrl ? (
              <TouchableOpacity
                style={styles.sourceBadgeEditing}
                onPress={() => safeOpenUrl(recipe.sourceUrl!)}
                activeOpacity={0.7}
              >
                <Ionicons name="link-outline" size={13} color={Colors.primary} />
                <Text style={styles.sourceTextEditing} numberOfLines={1}>
                  {recipe.sourceUrl}
                </Text>
                <Ionicons name="open-outline" size={12} color={Colors.primary} />
              </TouchableOpacity>
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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── View mode ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {recipe.title}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setIsEditing(true)} hitSlop={8} style={styles.headerBtn}>
            <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} hitSlop={8} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {recipe.imageUri ? (
          <Image source={{ uri: recipe.imageUri }} style={styles.heroImage} />
        ) : null}

        {/* Meta row: duration, category, source */}
        <View style={styles.metaRow}>
          {recipe.duration ? (
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.durationText}>{recipe.duration} min</Text>
            </View>
          ) : null}
          {recipe.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{recipe.category}</Text>
            </View>
          ) : null}
        </View>

        {recipe.sourceUrl ? (
          <TouchableOpacity
            style={styles.sourceBadge}
            onPress={() => safeOpenUrl(recipe.sourceUrl!)}
            activeOpacity={0.7}
          >
            <Ionicons name="link-outline" size={13} color={Colors.primary} />
            <Text style={styles.sourceText} numberOfLines={1}>
              {recipe.sourceUrl}
            </Text>
            <Ionicons name="open-outline" size={12} color={Colors.primary} />
          </TouchableOpacity>
        ) : null}

        {/* Ingredients */}
        {validIngredients.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ingrediënten</Text>
              <TouchableOpacity onPress={toggleAll} hitSlop={8}>
                <Text style={styles.selectAllText}>
                  {allSelected ? 'Deselecteer alles' : 'Selecteer alles'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sectionContent}>
              {validIngredients.map((ing) => {
                const checked = selectedIngredients.has(ing.id);
                return (
                  <TouchableOpacity
                    key={ing.id}
                    style={styles.ingredientRow}
                    onPress={() => toggleIngredient(ing.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={checked ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={checked ? Colors.primary : Colors.border}
                    />
                    <Text style={styles.ingredientText}>
                      {ing.quantity > 0 ? `${ing.quantity} ` : ''}
                      {ing.unit ? `${ing.unit} ` : ''}
                      {ing.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              label={`Voeg toe aan boodschappenlijst (${selectedIngredients.size})`}
              variant="secondary"
              onPress={handleAddToGrocery}
              loading={addingToList}
              fullWidth
              style={styles.groceryBtn}
              disabled={selectedIngredients.size === 0}
            />
          </View>
        ) : null}

        {/* Steps */}
        {recipe.steps.filter((s) => s.trim()).length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bereidingswijze</Text>
            <View style={styles.sectionContent}>
              {recipe.steps.filter((s) => s.trim()).map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
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
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginHorizontal: 12,
  },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: { padding: 6 },

  content: { padding: 16, gap: 20, paddingBottom: 40 },

  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
  },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  durationText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },

  categoryBadge: {
    backgroundColor: Colors.accentLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  categoryText: { fontSize: 13, color: Colors.accent, fontWeight: '600' },

  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  sourceText: { fontSize: 12, color: Colors.primary, flex: 1 },

  sourceBadgeEditing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  sourceTextEditing: { fontSize: 12, color: Colors.primary, flex: 1 },

  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  selectAllText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  sectionContent: { gap: 8 },

  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  ingredientText: { fontSize: 14, color: Colors.text, flex: 1, lineHeight: 20 },

  groceryBtn: { marginTop: 4 },

  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  stepText: { flex: 1, fontSize: 14, color: Colors.text, lineHeight: 22 },

  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addRowBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
});
