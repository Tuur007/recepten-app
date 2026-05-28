// app/recipes/scan.tsx
//
// Kookboek-scanner: neem een foto van een kookboekpagina → Claude Vision herkent
// het recept → bewerkbaar formulier → opslaan in je verzameling.
// Stroming: camera → preview → scanning → review/edit → opslaan

import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useRecipes } from '../../features/recipes/hooks';
import { useRecipeForm } from '../../features/recipes/hooks/useRecipeForm';
import { scanCookbookPage } from '../../services/cookbookScanner';
import { IngredientInput } from '../../features/recipes/components/IngredientInput';
import { StepInput } from '../../features/recipes/components/StepInput';
import { CategoryPicker } from '../../features/recipes/components/CategoryPicker';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { Button } from '../../components/ui/Button';
import { EditorialTitle } from '../../components/ui/EditorialBits';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';
import { useThemeColors } from '../../theme';
import { generateId } from '../../utils/id';
import { haptics, toast } from '../../utils/feedback';
import { log } from '../../utils/logger';
import { ALLERGENS } from '../../types/recipe';

type Phase = 'camera' | 'preview' | 'scanning' | 'error' | 'edit';

export default function ScanRecipeScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const { create } = useRecipes();
  const form = useRecipeForm();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [phase, setPhase] = useState<Phase>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanError, setScanError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    haptics.selection();
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: false });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setPhase('preview');
      }
    } catch {
      toast.error('Foto maken mislukt', 'Probeer opnieuw.');
    }
  };

  const handleScan = async () => {
    if (!photoUri) return;
    setPhase('scanning');
    try {
      const scanned = await scanCookbookPage(photoUri);
      log('[scan] recept herkend:', scanned.title);
      form.reset({
        title: scanned.title,
        ingredients: scanned.ingredients.length > 0
          ? scanned.ingredients
          : [{ id: generateId(), name: '', quantity: 1, unit: '' }],
        steps: scanned.steps.length > 0 ? scanned.steps : [''],
        duration: scanned.duration,
        servings: scanned.servings,
      });
      haptics.success();
      setPhase('edit');
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scannen mislukt.');
      setPhase('error');
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
        imageUri: undefined,
        duration: form.duration,
        allergens: form.allergens,
      });
      haptics.success();
      toast.success('Recept opgeslagen', form.title.trim());
      router.back();
    } catch {
      Alert.alert('Fout', 'Kon recept niet opslaan. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  // ── Camera permission states ──────────────────────────────────────────────

  if (!permission) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: themeColors.background }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={typography.folio}>scannen</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={[styles.center, { flex: 1, paddingHorizontal: spacing.xl }]}>
          <EditorialTitle lead="Cameratoegang" tail="nodig." size={32} align="center" />
          <Text style={[typography.bodyItalic, styles.permText]}>
            Geef de app toestemming om de camera te gebruiken voor het scannen van kookboeken.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={typography.buttonLabel}>geef toegang</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Camera view ───────────────────────────────────────────────────────────

  if (phase === 'camera') {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: '#000' }]} edges={['top']}>
        <View style={styles.cameraHeader}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={[typography.folio, { color: '#fff' }]}>scan een kookboekpagina</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={{ flex: 1 }}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          <View style={styles.scanOverlay} pointerEvents="none">
            <View style={styles.scanRect} />
            <Text style={styles.scanHint}>richt de camera op de receptpagina</Text>
          </View>
        </View>

        <View style={styles.shutterBar}>
          <TouchableOpacity style={styles.shutterBtn} onPress={handleCapture} activeOpacity={0.8}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Preview ───────────────────────────────────────────────────────────────

  if (phase === 'preview' && photoUri) {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: '#000' }]} edges={['top', 'bottom']}>
        <View style={styles.cameraHeader}>
          <TouchableOpacity onPress={() => setPhase('camera')} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[typography.folio, { color: '#fff' }]}>foto controleren</Text>
          <View style={{ width: 24 }} />
        </View>

        <Image source={{ uri: photoUri }} style={{ flex: 1 }} resizeMode="contain" />

        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.retakeBtn} onPress={() => setPhase('camera')} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={18} color={colors.textDark} />
            <Text style={[typography.buttonLabel, { color: colors.textDark }]}>opnieuw</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scanTriggerBtn} onPress={handleScan} activeOpacity={0.85}>
            <Ionicons name="scan-outline" size={18} color="#fff" />
            <Text style={typography.buttonLabel}>scan dit recept</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Scanning (loading) ────────────────────────────────────────────────────

  if (phase === 'scanning') {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.scanningLabel}>recept herkennen…</Text>
        <Text style={[typography.bodyItalic, { color: colors.textLight, marginTop: spacing.sm }]}>
          dit duurt een paar seconden
        </Text>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (phase === 'error') {
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: themeColors.background }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={typography.folio}>scannen mislukt</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={[styles.center, { flex: 1, paddingHorizontal: spacing.xl }]}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={styles.errorMsg}>{scanError}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setPhase('camera')} activeOpacity={0.85}>
            <Text style={typography.buttonLabel}>opnieuw proberen</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Edit / review form ────────────────────────────────────────────────────

  return (
    <View style={[styles.fill, { backgroundColor: themeColors.background }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => setPhase('camera')} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={typography.folio}>recept nakijken</Text>
          <Button label="Opslaan" onPress={handleSave} loading={saving} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.scanBadge}>
            <Ionicons name="scan-outline" size={13} color={colors.primary} />
            <Text style={styles.scanBadgeText}>gescand vanuit kookboek — controleer voor het opslaan</Text>
          </View>

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
            onChangeText={(t) => form.setDuration(t ? parseInt(t, 10) : undefined)}
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
              <TouchableOpacity style={styles.addRow} onPress={form.addIngredient}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.addRowText}>ingrediënt toevoegen</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stappen</Text>
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
              <TouchableOpacity style={styles.addRow} onPress={form.addStep}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.addRowText}>stap toevoegen</Text>
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

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderColor,
  },

  permText: {
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    color: colors.textLight,
  },

  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },

  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanRect: {
    width: 300,
    height: 420,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    borderRadius: 4,
  },
  scanHint: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.md,
  },

  shutterBar: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  shutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },

  previewActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scanTriggerBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: colors.textDark,
  },

  scanningLabel: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.textDark,
    marginTop: spacing.lg,
  },

  errorMsg: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 15,
    color: colors.danger,
    textAlign: 'center',
    marginVertical: spacing.lg,
    lineHeight: 22,
  },

  primaryBtn: {
    backgroundColor: colors.textDark,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },

  formContent: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 60 },

  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
  },
  scanBadgeText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 12,
    color: colors.primary,
    flex: 1,
  },

  section: { gap: 10 },
  sectionTitle: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  sectionContent: { gap: 8 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addRowText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 14,
    color: colors.primary,
  },

  allergenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  allergenChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
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
  allergenChipTextActive: { color: '#fff' },
});
