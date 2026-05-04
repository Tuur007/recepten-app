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
import { LoadingScreen } from '../../components/LoadingScreen';
import { AppTextInput } from '../../components/ui/AppTextInput';

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
      duration: recipe.duration,
    });
    const validIds = new Set(recipe.ingredients.filter((i) => i.name.trim()).map((i) => i.id));
    setSelectedIngredients(validIds);
 }, [recipe?.id, form]);

  if (!recipe) return <LoadingScreen />;

  // ... existing handlers ...

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

  // ... in render, edit view ...
  {recipe.sourceUrl ? (
    <TouchableOpacity
      style={styles.sourceBadgeEditing}
      onPress={() => safeOpenUrl(recipe.sourceUrl!)}
      activeOpacity={0.7}
    >
      <Ionicons name="link-outline" size={13} color={Colors.primary} />
      <Text style={styles.sourceTextEditing} numberOfLines={1}>{recipe.sourceUrl}</Text>
      <Ionicons name="open-outline" size={12} color={Colors.primary} />
    </TouchableOpacity>
  ) : null}

  <AppTextInput
    label="Kooktijd (minuten)"
    value={form.duration?.toString() ?? ''}
    onChangeText={(text) => form.setDuration(text ? parseInt(text, 10) : undefined)}
    placeholder="30"
    keyboardType="number-pad"
  />

  // ... in render, read-only view ...
  {recipe.duration ? (
    <View style={styles.durationBadge}>
      <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
      <Text style={styles.durationText}>{recipe.duration} min</Text>
    </View>
  ) : null}

  {recipe.sourceUrl ? (
    <TouchableOpacity
      style={styles.sourceBadge}
      onPress={() => safeOpenUrl(recipe.sourceUrl!)}
      activeOpacity={0.7}
    >
      <Ionicons name="link-outline" size={13} color={Colors.primary} />
      <Text style={styles.sourceText} numberOfLines={1}>{recipe.sourceUrl}</Text>
    </TouchableOpacity>
  ) : null}
}

// Styles for duration & clickable URL:
const styles = StyleSheet.create({
  // ... existing styles ...
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  durationText: { fontSize: 12, color: Colors.textSecondary },
});
