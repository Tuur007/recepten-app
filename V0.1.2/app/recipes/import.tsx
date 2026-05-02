import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { parseRecipeFromUrl } from '../../services/recipeParser';
import { useRecipes } from '../../features/recipes/hooks';
import { useRecipeForm } from '../../features/recipes/hooks/useRecipeForm';
import { IngredientInput } from '../../features/recipes/components/IngredientInput';
import { StepInput } from '../../features/recipes/components/StepInput';
import { CategoryPicker } from '../../features/recipes/components/CategoryPicker';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../components/ui/colors';
import { generateId } from '../../utils/id';

type ImportStep = 'url' | 'edit';

// Sites that block scraping — we detect them by checking if we got a title
// but zero ingredients after parsing.
const LOGIN_WALLED_HOSTS = [
  'marleyspoon.com',
  'hellofresh.',
  'greenchef.',
  'everyplate.',
];

function isLoginWalled(url: string): boolean {
  return LOGIN_WALLED_HOSTS.some((host) => url.includes(host));
}

export default function ImportRecipeScreen() {
  const router = useRouter();
  const { create } = useRecipes();

  const [step, setStep] = useState<ImportStep>('url');
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loginWalled, setLoginWalled] = useState(false);

  const form = useRecipeForm();

  const handleFetch = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setFetchError('Voer een URL in.');
      return;
    }
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      setFetchError('URL moet beginnen met http:// of https://');
      return;
    }

    setFetchError('');
    setFetching(true);
    setLoginWalled(false);

    try {
      const parsed = await parseRecipeFromUrl(trimmedUrl);

      // Detect login-walled: we got a title but no ingredients/steps
      const walled = isLoginWalled(trimmedUrl) && parsed.ingredients.length === 0 && parsed.steps.length === 0;
      setLoginWalled(walled);

      form.reset({
        title: parsed.title,
        category: '',
        ingredients: parsed.ingredients.map((ing) => ({ ...ing, id: generateId() })),
        steps: parsed.steps,
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
    setSaving(true);
    try {
      await create({
        title: form.title.trim(),
        category: form.category,
        isFavorite: false,
        ingredients: form.validIngredients,
        steps: form.validSteps,
        sourceUrl: url.trim(),
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
          {step === 'url' ? 'Importeren via URL' : 'Recept controleren'}
        </Text>
        {step === 'edit' ? (
          <Button label="Opslaan" onPress={handleSave} loading={saving} />
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {step === 'url' ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <Text style={styles.heroIcon}>🔗</Text>
              <Text style={styles.heroTitle}>Recept importeren</Text>
              <Text style={styles.heroSubtitle}>
                Plak een URL van je favoriete receptensite en we lezen het recept automatisch uit.
              </Text>
            </View>

            <View style={styles.urlWrapper}>
              <Text style={styles.urlLabel}>Recept URL</Text>
              <View style={[styles.urlInputRow, fetchError ? styles.urlInputRowError : null]}>
                <TextInput
                  style={styles.urlInput}
                  value={url}
                  onChangeText={(text) => {
                    setUrl(text);
                    setFetchError('');
                  }}
                  placeholder="https://www.example.com/recept"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {url.length > 0 ? (
                  <TouchableOpacity onPress={() => { setUrl(''); setFetchError(''); }} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
              {fetchError ? <Text style={styles.urlError}>{fetchError}</Text> : null}
            </View>

            <Button
              label={fetching ? 'Ophalen…' : 'Recept ophalen'}
              onPress={handleFetch}
              loading={fetching}
              fullWidth
            />

            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>💡 Tips</Text>
              <Text style={styles.tipsText}>
                • Werkt het beste met sites die gestructureerde receptdata gebruiken (schema.org){'\n'}
                • Als automatisch importeren mislukt, kun je de gegevens handmatig invullen{'\n'}
                • Ondersteund: de meeste populaire receptblogs &amp; voedselwebsites
              </Text>
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

            {/* Banner: login-walled site */}
            {loginWalled ? (
              <View style={styles.warningBanner}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.warning} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.warningBannerTitle}>Login vereist op deze site</Text>
                  <Text style={styles.warningBannerText}>
                    De titel is ingelezen vanuit de URL. Voeg de ingrediënten en stappen handmatig toe via je receptkaart of app.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.parsedBanner}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <Text style={styles.parsedBannerText}>
                  Recept uitgelezen — controleer en bewerk voor je opslaat.
                </Text>
              </View>
            )}

            <AppTextInput
              label="Titel"
              value={form.title}
              onChangeText={form.setTitle}
              placeholder="Recepttitel"
            />

            <CategoryPicker value={form.category} onChange={form.setCategory} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingrediënten ({form.ingredients.length})</Text>
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
              <Text style={styles.sectionTitle}>Stappen ({form.steps.length})</Text>
              <View style={styles.sectionContent}>
                {form.steps.map((s, index) => (
                  <StepInput
                    key={index}
                    index={index}
                    value={s}
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
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark },
  tipsText: { fontSize: 13, color: Colors.primaryDark, lineHeight: 20 },

  // Success banner
  parsedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.successLight,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.success,
  },
  parsedBannerText: { flex: 1, fontSize: 13, color: Colors.text },

  // Warning banner for login-walled sites
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF9EC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.warning,
  },
  warningBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  warningBannerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sectionContent: { gap: 8 },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addRowBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  urlWrapper: { gap: 6 },
  urlLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    minHeight: 48,
  },
  urlInputRowError: { borderColor: Colors.danger },
  urlInput: { flex: 1, fontSize: 15, color: Colors.text },
  urlError: { fontSize: 12, color: Colors.danger, marginTop: 2 },
});
