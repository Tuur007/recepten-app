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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { parseRecipeFromUrl, ParsedRecipe } from '../../services/recipeParser';
import { useRecipes } from '../../features/recipes/hooks';
import { IngredientInput } from '../../features/recipes/components/IngredientInput';
import { StepInput } from '../../features/recipes/components/StepInput';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../components/ui/colors';
import { Ingredient } from '../../types/recipe';
import { generateId } from '../../utils/id';

type ImportStep = 'url' | 'edit';

export default function ImportRecipeScreen() {
  const router = useRouter();
  const { create } = useRecipes();

  const [step, setStep] = useState<ImportStep>('url');
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Editable parsed data
  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleFetch = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setFetchError('Please enter a URL.');
      return;
    }
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      setFetchError('URL must start with http:// or https://');
      return;
    }

    setFetchError('');
    setFetching(true);

    try {
      const parsed: ParsedRecipe = await parseRecipeFromUrl(trimmedUrl);
      setTitle(parsed.title);
      setIngredients(
        parsed.ingredients.map((ing) => ({ ...ing, id: generateId() })),
      );
      setSteps(parsed.steps);
      setStep('edit');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to import recipe.';
      setFetchError(message);
    } finally {
      setFetching(false);
    }
  };

  const updateIngredient = (index: number, updated: Ingredient) =>
    setIngredients((prev) => prev.map((ing, i) => (i === index ? updated : ing)));

  const removeIngredient = (index: number) =>
    setIngredients((prev) => prev.filter((_, i) => i !== index));

  const updateStep = (index: number, text: string) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? text : s)));

  const removeStep = (index: number) =>
    setSteps((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a recipe title.');
      return;
    }
    const validIngredients = ingredients.filter((i) => i.name.trim());
    const validSteps = steps.filter((s) => s.trim());

    setSaving(true);
    try {
      await create({
        title: title.trim(),
        ingredients: validIngredients,
        steps: validSteps,
        sourceUrl: url.trim(),
      });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save recipe. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={step === 'edit' ? () => setStep('url') : () => router.back()}
          hitSlop={8}
        >
          <Ionicons
            name={step === 'edit' ? 'arrow-back' : 'close'}
            size={24}
            color={Colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'url' ? 'Import from URL' : 'Review Recipe'}
        </Text>
        {step === 'edit' ? (
          <Button label="Save" onPress={handleSave} loading={saving} />
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {step === 'url' ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <Text style={styles.heroIcon}>🔗</Text>
              <Text style={styles.heroTitle}>Import a Recipe</Text>
              <Text style={styles.heroSubtitle}>
                Paste a URL from your favourite food site and we'll extract the recipe for you.
              </Text>
            </View>

            <AppTextInput
              label="Recipe URL"
              value={url}
              onChangeText={(text) => {
                setUrl(text);
                setFetchError('');
              }}
              placeholder="https://www.example.com/recipe"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              error={fetchError}
            />

            <Button
              label={fetching ? 'Fetching…' : 'Fetch Recipe'}
              onPress={handleFetch}
              loading={fetching}
              fullWidth
            />

            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>💡 Tips</Text>
              <Text style={styles.tipsText}>
                • Works best with sites that use structured recipe data (schema.org){'\n'}
                • If auto-import fails, you can fill in the details manually{'\n'}
                • Supported: most popular recipe blogs &amp; food sites
              </Text>
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.parsedBanner}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              <Text style={styles.parsedBannerText}>
                Recipe extracted — review and edit before saving.
              </Text>
            </View>

            <AppTextInput
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="Recipe title"
            />

            {/* Ingredients */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Ingredients ({ingredients.length})
              </Text>
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
                  onPress={() =>
                    setIngredients((prev) => [
                      ...prev,
                      { id: generateId(), name: '', quantity: 1, unit: '' },
                    ])
                  }
                >
                  <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                  <Text style={styles.addRowBtnText}>Add ingredient</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Steps */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Steps ({steps.length})</Text>
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
          </ScrollView>
        )}
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  content: { padding: 16, gap: 20, paddingBottom: 60 },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  heroIcon: { fontSize: 48 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  tipsBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  tipsTitle: { fontSize: 14, fontWeight: '600', color: Colors.primaryDark },
  tipsText: { fontSize: 13, color: Colors.primaryDark, lineHeight: 20 },
  parsedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  parsedBannerText: { flex: 1, fontSize: 13, color: Colors.primaryDark },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sectionContent: { gap: 8 },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addRowBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
});
