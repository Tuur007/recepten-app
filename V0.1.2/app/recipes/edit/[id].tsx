import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRecipes } from '../../../features/recipes/hooks';
import { useRecipeForm } from '../../../features/recipes/hooks/useRecipeForm';
import { RecipeImagePicker } from '../../../features/recipes/components/RecipeImagePicker';
import { IngredientInput } from '../../../features/recipes/components/IngredientInput';
import { StepInput } from '../../../features/recipes/components/StepInput';
import { CategoryPicker } from '../../../features/recipes/components/CategoryPicker';
import { RecipeMetaFields } from '../../../features/recipes/components/RecipeMetaFields';
import { AppTextInput } from '../../../components/ui/AppTextInput';
import { Button } from '../../../components/ui/Button';
import { LoadingScreen } from '../../../components/LoadingScreen';
import { colors, spacing, fonts } from '../../../constants/Designsystem';
import { ALLERGENS } from '../../../types/recipe';

export default function EditRecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes, isLoading, update } = useRecipes();
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [notes, setNotes] = useState('');
  const notesAutoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recipe = recipes.find((r) => r.id === id);
  const form = useRecipeForm();

  useEffect(() => {
    if (recipe && !initialized) {
      form.reset({
        title: recipe.title,
        category: recipe.category ?? '',
        ingredients: recipe.ingredients ?? [],
        steps: (recipe.steps ?? []).map((s) =>
          typeof s === 'string' ? s : (s as { text?: string }).text ?? '',
        ),
        imageUri: recipe.imageUri,
        duration: recipe.duration,
        preparationTime: recipe.preparationTime,
        cookingTime: recipe.cookingTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        allergens: recipe.allergens ?? [],
      });
      setNotes(recipe.notes ?? '');
      setInitialized(true);
    }
    // form is excluded: useRecipeForm returns a new object every render,
    // adding it would cause an infinite loop. initialized guards single-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe, initialized]);

  useEffect(() => {
    if (!initialized || !id) return;
    if (notesAutoSaveTimer.current) clearTimeout(notesAutoSaveTimer.current);
    notesAutoSaveTimer.current = setTimeout(() => {
      update(id, { notes });
    }, 800);
    return () => {
      if (notesAutoSaveTimer.current) clearTimeout(notesAutoSaveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  if (isLoading) return <LoadingScreen />;

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 40, color: colors.textLight }}>
          Recept niet gevonden.
        </Text>
      </SafeAreaView>
    );
  }

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
        duration: form.totalDuration,
        preparationTime: form.preparationTime,
        cookingTime: form.cookingTime,
        servings: form.servings,
        difficulty: form.difficulty,
        allergens: form.allergens,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch {
      Alert.alert('Fout', 'Kon recept niet opslaan. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recept bewerken</Text>
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
            placeholder="bijv. Oma's Lasagne"
          />

          <CategoryPicker value={form.category} onChange={form.setCategory} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <RecipeMetaFields
              preparationTime={form.preparationTime}
              cookingTime={form.cookingTime}
              servings={form.servings}
              difficulty={form.difficulty}
              onPrepChange={form.setPreparationTime}
              onCookChange={form.setCookingTime}
              onServingsChange={form.setServings}
              onDifficultyChange={form.setDifficulty}
            />
          </View>

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
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
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
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.addRowBtnText}>Stap toevoegen</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Allergenen</Text>
            <View style={styles.allergenGrid}>
              {ALLERGENS.map((allergen) => {
                const active = form.allergens.includes(allergen);
                return (
                  <TouchableOpacity
                    key={allergen}
                    style={[styles.allergenChip, active && styles.allergenChipActive]}
                    onPress={() => form.toggleAllergen(allergen)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.allergenChipText, active && styles.allergenChipTextActive]}>
                      {allergen}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.notesTitleRow}>
              <Text style={styles.sectionTitle}>Notities</Text>
              <Text style={[styles.notesCounter, notes.length > 480 && styles.notesCounterWarn]}>
                {notes.length}/500
              </Text>
            </View>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={(t) => setNotes(t.slice(0, 500))}
              placeholder="Persoonlijke notities, tips, variaties…"
              placeholderTextColor={colors.textFaint}
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textDark,
  },
  content: { padding: spacing.lg, gap: 20, paddingBottom: 40 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  sectionContent: { gap: 8 },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addRowBtnText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  allergenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  allergenChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderColor,
    backgroundColor: colors.background,
  },
  allergenChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  allergenChipText: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.textLight,
  },
  allergenChipTextActive: {
    color: colors.white,
  },
  notesTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  notesCounter: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textFaint,
  },
  notesCounterWarn: {
    color: colors.primary,
  },
  notesInput: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    lineHeight: 22,
  },
});
