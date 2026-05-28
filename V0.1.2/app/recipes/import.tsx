import React, { useRef, useState } from 'react';
import { log, warn } from '../../utils/logger';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRecipes } from '../../features/recipes/hooks';
import { useRecipeStore } from '../../store/recipeStore';
import { useRecipeForm } from '../../features/recipes/hooks/useRecipeForm';
import { parseRecipeFromUrl, extractAndSaveImage } from '../../services/recipeParser';
import { extractImageFromUrl } from '../../services/imageExtractor';
import { IngredientInput } from '../../features/recipes/components/IngredientInput';
import { StepInput } from '../../features/recipes/components/StepInput';
import { CategoryPicker } from '../../features/recipes/components/CategoryPicker';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { Button } from '../../components/ui/Button';
import { colors, spacing, fonts } from '../../constants/Designsystem';
import { useThemeColors } from '../../theme';
import { generateId } from '../../utils/id';
import { ALLERGENS } from '../../types/recipe';

export default function ImportRecipeScreen() {
  const router = useRouter();
  const { create } = useRecipes();
  const recipeExists = useRecipeStore((state) => state.recipeExists);
  const themeColors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<'url' | 'edit'>('url');
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);

  const parsedSourceUrl = useRef<string>('');
  const form = useRecipeForm();

  const handleFetch = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setFetchError('Voer een URL in.');
      return;
    }
    if (trimmedUrl.length > 2048) {
      setFetchError('URL is te lang.');
      return;
    }
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      setFetchError('URL moet beginnen met http:// of https://');
      return;
    }

    setFetchError('');
    setFetching(true);

    try {
      const parsed = await parseRecipeFromUrl(trimmedUrl);

      if (recipeExists(parsed.title, trimmedUrl)) {
        setFetchError('Dit recept bestaat al in je verzameling.');
        setFetching(false);
        return;
      }

      parsedSourceUrl.current = parsed.sourceUrl;

      // Try the fast path first: og:image URL already extracted during page parse.
      // Fall back to the full HTML-scraping extractor if no og:image was found.
      let imageUri: string | undefined;
      try {
        if (parsed.imageUrl) {
          log(`[import] Using og:image URL: ${parsed.imageUrl}`);
          imageUri = await extractAndSaveImage(parsed.imageUrl, trimmedUrl);
        }
        if (!imageUri) {
          log('[import] Falling back to extractImageFromUrl…');
          imageUri = await extractImageFromUrl(trimmedUrl);
        }
        if (imageUri) {
          log(`[import] imageUri resolved: ${imageUri}`);
        } else {
          warn('[import] No image found; recipe will show placeholder');
        }
      } catch (imgErr) {
        warn('[import] Image extraction error (non-fatal):', imgErr instanceof Error ? imgErr.message : imgErr);
        imageUri = undefined;
      }

      const detectedCategory = detectCategory(
        parsed.title,
        parsed.ingredients.map((i) => i.name),
        parsed.duration,
      );

      form.reset({
        title: parsed.title,
        category: detectedCategory,
        ingredients: parsed.ingredients.map((ing) => ({ ...ing, id: generateId() })),
        steps: parsed.steps,
        duration: parsed.duration,
        imageUri,
      });
      setStep('edit');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Importeren mislukt.';
      setFetchError(message);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Titel ontbreekt', 'Voer een recepttitel in.');
      return;
    }
    if (form.title.trim().length > 200) {
      Alert.alert('Titel te lang', 'De recepttitel mag maximaal 200 tekens bevatten.');
      return;
    }

    if (recipeExists(form.title.trim(), parsedSourceUrl.current)) {
      Alert.alert('Recept bestaat al', 'Dit recept is al in je verzameling opgeslagen.');
      return;
    }

    setSaving(true);
    try {
      log(`[import] Storing recipe with imageUri: ${form.imageUri ?? 'none'}`);
      await create({
        title: form.title.trim(),
        category: form.category,
        isFavorite: false,
        ingredients: form.validIngredients,
        steps: form.validSteps,
        imageUri: form.imageUri,
        duration: form.duration,
        sourceUrl: parsedSourceUrl.current || undefined,
        allergens: form.allergens,
      });
      log('[import] Recipe saved successfully');
      router.back();
    } catch {
      Alert.alert('Fout', 'Kon recept niet opslaan. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  if (step === 'url') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themeColors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Importeer recept</Text>
          <View style={{ width: 32 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.urlCard}>
              <Ionicons name="link-outline" size={36} color={colors.primary} style={styles.urlIcon} />
              <Text style={styles.urlHint}>
                Plak een link van een receptenwebsite, zoals Dagelijkse Kost, Marley Spoon of een andere kooksite.
              </Text>

              <AppTextInput
                label="Recept URL"
                value={url}
                onChangeText={setUrl}
                placeholder="https://..."
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              {fetchError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{fetchError}</Text>
                </View>
              ) : null}

              {fetching ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.loadingText}>Recept ophalen…</Text>
                </View>
              ) : (
                <Button label="Importeer" onPress={handleFetch} />
              )}
            </View>

            <TouchableOpacity
              style={styles.scanCard}
              activeOpacity={0.75}
              onPress={() => router.push('/recipes/scan')}
            >
              <Ionicons name="camera-outline" size={28} color={colors.textLight} style={styles.scanIcon} />
              <Text style={styles.scanCardTitle}>Scan een kookboek</Text>
              <Text style={styles.scanCardHint}>
                Richt je camera op een receptpagina — Claude herkent de ingrediënten en stappen automatisch.
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep('url')} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recept bewerken</Text>
        <Button label="Opslaan" onPress={handleSave} loading={saving} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {parsedSourceUrl.current ? (
            <View style={styles.sourceBadge}>
              <Ionicons name="link-outline" size={13} color={colors.primary} />
              <Text style={styles.sourceText} numberOfLines={1}>
                {parsedSourceUrl.current}
              </Text>
            </View>
          ) : null}

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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function detectCategory(title: string, ingredientNames: string[], duration?: number): string {
  const haystack = [title, ...ingredientNames].join(' ').toLowerCase();

  if (duration != null && duration <= 30) return 'Snel';

  const rules: [string[], string][] = [
    [['pasta', 'spaghetti', 'penne', 'linguine', 'rigatoni', 'tagliatelle', 'lasagne', 'fettuccine', 'gnocchi'], 'Pasta'],
    [['soep', 'bouillon', 'bisque', 'potage', 'broth'], 'Soep'],
    [['zalm', 'kabeljauw', 'garnaal', 'garnalen', 'vis', 'forel', 'tonijn', 'inktvis', 'mosselen', 'scampi', 'zeevruchten', 'tilapia', 'pangasius'], 'Vis'],
    [['kip', 'kipfilet', 'kippenborst', 'rund', 'rundvlees', 'gehakt', 'varken', 'varkensvlees', 'spek', 'lam', 'lamsvlees', 'tartaar', 'entrecote', 'rosbief', 'hamburger'], 'Vlees'],
    [['dessert', 'taart', 'cake', 'pudding', 'mousse', 'crème brûlée', 'tiramisu', 'brownie', 'koekje', 'ijs', 'sorbet', 'pannacotta'], 'Dessert'],
    [['soepje', 'salade', 'sla', 'coleslaw'], 'Salade'],
  ];

  for (const [keywords, category] of rules) {
    if (keywords.some((k) => haystack.includes(k))) return category;
  }

  return '';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  content: { padding: 16, gap: 20 },
  urlCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  urlIcon: { alignSelf: 'center' },
  urlHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerLight,
    borderRadius: 8,
    padding: 10,
  },
  errorText: { fontSize: 13, color: colors.danger, flex: 1 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  loadingText: { fontSize: 14, color: colors.textSecondary },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sourceText: { fontSize: 12, color: colors.primary, flex: 1 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  sectionContent: { gap: 8 },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addRowBtnText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  allergenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  allergenChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  allergenChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  allergenChipText: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.textSecondary,
  },
  allergenChipTextActive: {
    color: colors.white,
  },
  scanCard: {
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  scanIcon: { marginBottom: 4 },
  scanCardTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textDark,
  },
  scanCardHint: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
});
