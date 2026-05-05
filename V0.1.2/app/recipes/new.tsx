import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRecipes } from '../../features/recipes/hooks';
import { useRecipeForm } from '../../features/recipes/hooks/useRecipeForm';
import { RecipeImagePicker } from '../../features/recipes/components/RecipeImagePicker';
import { IngredientInput } from '../../features/recipes/components/IngredientInput';
import { StepInput } from '../../features/recipes/components/StepInput';
import { CategoryPicker } from '../../features/recipes/components/CategoryPicker';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { Button } from '../../components/ui/Button';
import { colors } from '../../constants/Designsystem';

export default function NewRecipeScreen() {
  const router = useRouter();
  const { create } = useRecipes();
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  const form = useRecipeForm();

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Titel ontbreekt', 'Voer een recepttitel in.');
      return;
    }
    setSaving(true);
    try {
      await create({
        title: form.title.trim(),
        category: form.category,
        isFavorite: false,
        ingredients: form.validIngredients,
        steps: form.validSteps,
        imageUri: form.imageUri,
      });
      router.back();
    } catch {
      Alert.alert('Fout', 'Kon recept niet opslaan. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Button label="Opslaan" onPress={handleSave} loading={saving} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
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
            placeholder="bijv. Oma's Lasagne"
            autoFocus
          />

          <CategoryPicker value={form.category} onChange={form.setCategory} />

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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: { padding: 16, gap: 20 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  sectionContent: { gap: 8 },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addRowBtnText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
});
