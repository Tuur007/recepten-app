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
import { Button } from '../../components/ui/Button';
import { Colors } from '../../components/ui/colors';

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

  const handleAddToGroceryList = async () => {
    const selectedForGrocery = recipe.ingredients.filter((ing) =>
      selectedIngredients.has(ing.id)
    );
    if (!selectedForGrocery.length) {
      Alert.alert('Niets geselecteerd', 'Selecteer minstens één ingrediënt.');
      return;
    }
    setAddingToList(true);
    try {
      await addFromRecipe(selectedForGrocery, recipe.id, recipe.title);
      Alert.alert('Succes', 'Ingrediënten toegevoegd aan boodschappenlijst.');
    } catch {
      Alert.alert('Fout', 'Kon ingrediënten niet toevoegen.');
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

  const toggleAllIngredients = () => {
    if (allSelected) {
      setSelectedIngredients(new Set());
    } else {
      const validIds = new Set(recipe.ingredients.filter((i) => i.name.trim()).map((i) => i.id));
      setSelectedIngredients(validIds);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!isEditing ? (
            <>
              {recipe.imageUri && (
                <Image source={{ uri: recipe.imageUri }} style={styles.image} />
              )}

              <View style={styles.header}>
                <Text style={styles.title}>{recipe.title}</Text>
                {recipe.category ? (
                  <Text style={styles.category}>{recipe.category}</Text>
                ) : null}
              </View>

              {recipe.duration ? (
                <View style={styles.durationBadge}>
                  <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.durationText}>{recipe.duration} min</Text>
                </View>
              ) : null}

              {recipe.sourceUrl ? (
                <TouchableOpacity
                  style={styles.sourceBadge}
                  onPress={() => safeOpenUrl(recipe.sourceUrl!)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="link-outline" size={13} color={colors.primary} />
                  <Text style={styles.sourceText} numberOfLines={1}>{recipe.sourceUrl}</Text>
                </TouchableOpacity>
              ) : null}

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Ingrediënten</Text>
                  <TouchableOpacity onPress={toggleAllIngredients}>
                    <Text style={styles.selectAll}>
                      {allSelected ? 'Deselecteer alle' : 'Selecteer alle'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {recipe.ingredients.map((ing) => (
                  <TouchableOpacity
                    key={ing.id}
                    style={styles.ingredient}
                    onPress={() => toggleIngredient(ing.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={selectedIngredients.has(ing.id) ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={selectedIngredients.has(ing.id) ? colors.primary : colors.textSecondary}
                    />
                    <Text style={styles.ingredientText}>
                      {ing.name}{ing.quantity ? ` ${ing.quantity}` : ''}{ing.unit ? ` ${ing.unit}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Stappen</Text>
                {recipe.steps.map((step, index) => (
                  <Text key={index} style={styles.step}>
                    {index + 1}. {step}
                  </Text>
                ))}
              </View>

              <View style={styles.actions}>
                <Button label="Bewerken" onPress={() => setIsEditing(true)} />
                <Button
                  label="Toevoegen aan boodschappen"
                  onPress={handleAddToGroceryList}
                  loading={addingToList}
                />
                <Button
                  label="Verwijderen"
                  variant="danger"
                  onPress={() => {
                    Alert.alert('Verwijderen', 'Weet je het zeker?', [
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
                  }}
                />
              </View>
            </>
          ) : (
            <>
              <AppTextInput
                label="Titel"
                value={form.title}
                onChangeText={form.setTitle}
                placeholder="Recepttitel"
              />

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
                  <Ionicons name="link-outline" size={13} color={colors.primary} />
                  <Text style={styles.sourceTextEditing} numberOfLines={1}>{recipe.sourceUrl}</Text>
                  <Ionicons name="open-outline" size={12} color={colors.primary} />
                </TouchableOpacity>
              ) : null}

              <View style={styles.actions}>
                <Button label="Opslaan" onPress={handleSave} loading={saving} />
                <Button
                  label="Annuleer"
                  variant="secondary"
                  onPress={() => setIsEditing(false)}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  image: { width: '100%', height: 220, borderRadius: 12, marginBottom: 16 },
  header: { marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  category: { fontSize: 13, color: colors.textSecondary },
  section: { marginTop: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
  selectAll: { fontSize: 13, color: colors.primary },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  ingredientText: { fontSize: 14, color: colors.text, flex: 1 },
  step: { fontSize: 14, color: colors.text, lineHeight: 22, marginBottom: 6 },
  actions: { marginTop: 24, gap: 12 },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 8,
  },
  sourceText: { fontSize: 12, color: colors.primary, flex: 1 },
  sourceBadgeEditing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 16,
  },
  sourceTextEditing: { fontSize: 12, color: colors.primary, flex: 1 },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  durationText: { fontSize: 12, color: colors.textSecondary },
});
