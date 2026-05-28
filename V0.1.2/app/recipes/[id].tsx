import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  TextInput,
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useRecipes } from '../../features/recipes/hooks';
import { useGrocery } from '../../features/grocery/hooks';
import { LoadingScreen } from '../../components/LoadingScreen';
import { haptics, toast } from '../../utils/feedback';
import { DifficultyBadge } from '../../components/ui/DifficultyBadge';
import { FavoriteButton } from '../../components/ui/FavoriteButton';
import { CookingTimeDisplay } from '../../components/ui/CookingTimeDisplay';
import { ServingsSelector } from '../../components/ui/ServingsSelector';
import { StarRating } from '../../components/ui/StarRating';
import { MetaStrip } from '../../components/ui/EditorialBits';
import { NutritionPanel } from '../../components/ui/NutritionPanel';
import { shareRecipeViaWhatsApp } from '../../services/recipeShareService';
import { computeRecipeNutrition } from '../../services/nutrition';
import { exportRecipeAsPdf } from '../../services/exports/pdf';
import { useCollections } from '../../store/collectionsStore';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';
import { useThemeColors } from '../../theme';
import { generateId } from '../../utils/id';
import { scaleIngredients } from '../../utils/servingsScaler';
import { useFamilyStore } from '../../store/familyStore';

import { CookOverlay, type ActiveTimer } from '../../features/recipes/components/detail/CookOverlay';
import { GroceryPickerModal } from '../../features/recipes/components/detail/GroceryPickerModal';
import { ShareMenuModal } from '../../features/recipes/components/detail/ShareMenuModal';
import { CollectionsPickerModal } from '../../features/recipes/components/detail/CollectionsPickerModal';
import { AddIngredientForm } from '../../features/recipes/components/detail/AddIngredientForm';
import { Section } from '../../features/recipes/components/detail/Section';
import { toDisplayUri, stepText, splitTitle, pad2 } from '../../features/recipes/components/detail/helpers';

const PAPER = colors.background;

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes, isLoading, update, remove } = useRecipes();
  const { addFromRecipe } = useGrocery();
  const themeColors = useThemeColors();
  const familyMembers = useFamilyStore((s) => s.members);

  const recipe = recipes.find((r) => r.id === id);

  const [cookStep, setCookStep] = useState<number | null>(null);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [servings, setServings] = useState<number | null>(null);
  const [groceryModalVisible, setGroceryModalVisible] = useState(false);
  const [selectedIngIds, setSelectedIngIds] = useState<Set<string>>(new Set());
  const [notesEdit, setNotesEdit] = useState(false);
  const [notesTxt, setNotesTxt] = useState(() => recipe?.notes ?? '');
  const [sharingLink, setSharingLink] = useState(false);
  const [computingNutrition, setComputingNutrition] = useState(false);
  const [shareMenuVisible, setShareMenuVisible] = useState(false);
  const [collectionsPickerVisible, setCollectionsPickerVisible] = useState(false);
  const { collections, addRecipe: addToCollection, removeRecipe: removeFromCollection } = useCollections();

  const baseServings = recipe?.servings ?? 4;
  const currentServings = servings ?? baseServings;

  const scaledIngredients = useMemo(() => {
    if (!recipe?.ingredients) return [];
    return scaleIngredients(recipe.ingredients, baseServings, currentServings);
  }, [recipe?.ingredients, baseServings, currentServings]);

  if (isLoading) return <LoadingScreen />;
  if (!recipe) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Text style={[typography.bodyItalic, { textAlign: 'center', marginTop: 40 }]}>
          Recept niet gevonden.
        </Text>
      </SafeAreaView>
    );
  }

  const steps = recipe.steps ?? [];

  const handleShareLink = async () => {
    if (sharingLink) return;
    setSharingLink(true);
    haptics.light();
    try {
      await shareRecipeViaWhatsApp(recipe);
    } catch (err) {
      toast.error('Delen mislukt', err instanceof Error ? err.message : 'Controleer je internetverbinding.');
    } finally {
      setSharingLink(false);
    }
  };

  const handleDeleteRecipe = () => {
    Alert.alert(
      'Recept verwijderen',
      'Weet je zeker dat je dit recept wilt verwijderen? Dit kan niet ongedaan worden.',
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: async () => {
            await remove(recipe.id);
            router.back();
          },
        },
      ],
    );
  };

  const handleShareText = async () => {
    setShareMenuVisible(false);
    haptics.light();
    const lines: string[] = [recipe.title, ''];
    if (recipe.ingredients?.length) {
      lines.push('Ingrediënten:');
      recipe.ingredients.forEach((ing) => {
        const qty = ing.quantity ? `${ing.quantity} ` : '';
        const unit = ing.unit ? `${ing.unit} ` : '';
        lines.push(`- ${qty}${unit}${ing.name}`.trim());
      });
      lines.push('');
    }
    if (steps.length) {
      lines.push('Bereiding:');
      steps.forEach((s, i) => lines.push(`${i + 1}. ${stepText(s)}`));
    }
    try {
      await Share.share({ message: lines.join('\n'), title: recipe.title });
    } catch (err) {
      toast.error('Delen mislukt', err instanceof Error ? err.message : undefined);
    }
  };

  const openGroceryModal = () => {
    setSelectedIngIds(new Set(recipe.ingredients.map((i) => i.id)));
    setGroceryModalVisible(true);
  };

  const toggleIngredient = (ingId: string) => {
    setSelectedIngIds((prev) => {
      const next = new Set(prev);
      if (next.has(ingId)) next.delete(ingId);
      else next.add(ingId);
      return next;
    });
  };

  const toggleAllIngredients = () => {
    if (selectedIngIds.size === scaledIngredients.length) {
      setSelectedIngIds(new Set());
    } else {
      setSelectedIngIds(new Set(scaledIngredients.map((i) => i.id)));
    }
  };

  const handleAddToGrocery = async () => {
    const selected = scaledIngredients
      .filter((i) => selectedIngIds.has(i.id))
      .map((i) => ({ ...i, quantity: i.quantity * (currentServings / baseServings) }));
    if (!selected.length) {
      Alert.alert('Niets geselecteerd', 'Selecteer minstens één ingrediënt.');
      return;
    }
    setGroceryModalVisible(false);
    try {
      await addFromRecipe(selected, recipe.id, recipe.title);
    } catch {
      /* addFromRecipe surfaces its own toast */
    }
  };

  const handleComputeNutrition = async () => {
    if (computingNutrition) return;
    setComputingNutrition(true);
    haptics.light();
    try {
      const result = await computeRecipeNutrition(recipe.ingredients ?? [], recipe.servings ?? 4);
      await update(recipe.id, { nutrition: result });
      const matched = result.matchedIngredients ?? 0;
      const total = result.totalIngredients ?? 0;
      if (matched === 0) {
        toast.error('Geen treffers', 'Geen enkel ingrediënt gevonden in Open Food Facts.');
      } else {
        haptics.success();
        toast.success(
          'Nutritie berekend',
          total > 0 ? `${matched}/${total} ingrediënten gematcht` : undefined,
        );
      }
    } catch (err) {
      console.error('[recipe.nutrition] compute failed:', err);
      toast.error('Berekening mislukt', err instanceof Error ? err.message : undefined);
    } finally {
      setComputingNutrition(false);
    }
  };

  const handleExportPdf = async () => {
    setShareMenuVisible(false);
    haptics.light();
    try {
      await exportRecipeAsPdf(recipe);
    } catch (err) {
      toast.error('PDF-export mislukt', err instanceof Error ? err.message : undefined);
    }
  };

  const handleToggleCollection = async (collectionId: string, currentlyIn: boolean) => {
    try {
      if (currentlyIn) {
        await removeFromCollection(collectionId, recipe.id);
      } else {
        await addToCollection(collectionId, recipe.id);
      }
      haptics.light();
    } catch {
      /* store toasts on failure */
    }
  };

  const { lead, tail } = splitTitle(recipe.title);

  // 4-column meta strip: voorber. / koken / porties / ing.
  const metaItems = [
    { num: pad2(recipe.preparationTime), unit: 'voorber.' },
    { num: pad2(recipe.cookingTime ?? recipe.duration), unit: 'koken' },
    { num: pad2(recipe.servings ?? 4), unit: 'porties' },
    { num: pad2(recipe.ingredients?.length), unit: 'ing.' },
  ];

  const allergyWarnings = recipe.allergens?.length
    ? familyMembers
        .filter((m) => m.active && m.allergies.some((a) => recipe.allergens.includes(a)))
        .map((m) => ({
          name: m.displayName.trim() || 'Gezinslid',
          color: m.color,
          allergens: m.allergies.filter((a) => recipe.allergens.includes(a)),
        }))
    : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={typography.folio}>{recipe.category || 'recept'}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push(`/recipes/edit/${recipe.id}`)} hitSlop={8}>
            <Ionicons name="pencil-outline" size={20} color={colors.textDark} />
          </TouchableOpacity>
          <FavoriteButton
            isFavorite={recipe.isFavorite}
            onPress={() => update(recipe.id, { isFavorite: !recipe.isFavorite })}
            size={22}
          />
          <TouchableOpacity onPress={() => setShareMenuVisible(true)} hitSlop={8}>
            <Ionicons name="share-social-outline" size={20} color={colors.textDark} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShareLink} hitSlop={8} disabled={sharingLink}>
            <Ionicons
              name="link-outline"
              size={20}
              color={sharingLink ? colors.textFaint : colors.textDark}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCollectionsPickerVisible(true)} hitSlop={8}>
            <Ionicons name="albums-outline" size={20} color={colors.textDark} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteRecipe} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          {lead.length > 0 && (
            <Text style={[typography.hero32Bold, { fontSize: 42, marginTop: 8 }]}>{lead}</Text>
          )}
          <Text style={[typography.heroItalic, { fontSize: 42 }]}>{tail}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
            {recipe.difficulty && <DifficultyBadge difficulty={recipe.difficulty} size="medium" />}
            <CookingTimeDisplay
              preparationTime={recipe.preparationTime}
              cookingTime={recipe.cookingTime}
              size="medium"
            />
          </View>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          {recipe.imageUri ? (
            <Image source={{ uri: toDisplayUri(recipe.imageUri) }} style={styles.hero} />
          ) : (
            <View style={[styles.hero, { backgroundColor: colors.backgroundLight }]} />
          )}
        </View>

        <MetaStrip items={metaItems} style={styles.metaStrip} />

        <ServingsSelector
          current={currentServings}
          defaultServings={baseServings}
          onChange={setServings}
        />

        <Section title="i. ingrediënten" count={recipe.ingredients?.length ?? 0} />
        <View style={{ paddingHorizontal: spacing.lg }}>
          {scaledIngredients.map((ing, idx) => (
            <View
              key={ing.id}
              style={[
                styles.ingRow,
                idx < scaledIngredients.length - 1 && styles.ingRowDivider,
              ]}
            >
              <Text style={styles.ingNum}>{ing.displayQty || '—'}</Text>
              <Text style={styles.ingUnit}>{ing.unit || ''}</Text>
              <Text style={styles.ingName}>{ing.name}</Text>
              <Ionicons
                name="bag-outline"
                size={13}
                color={colors.textFaint}
                style={styles.ingCart}
              />
            </View>
          ))}
          <AddIngredientForm
            onAdd={async (ing) => {
              await update(recipe.id, { ingredients: [...recipe.ingredients, ing] });
            }}
          />
        </View>

        <Section title="ii. werkwijze" count={steps.length} suffix="stappen" />
        <View style={{ paddingHorizontal: spacing.lg }}>
          {steps.map((step, i) => (
            <View
              key={i}
              style={[styles.stepRow, i < steps.length - 1 && styles.stepRowDivider]}
            >
              <Text style={styles.stepNum}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={styles.stepText}>{stepText(step)}</Text>
            </View>
          ))}
        </View>

        {recipe.allergens?.length > 0 && (
          <>
            <Section title="iii. allergenen" count={recipe.allergens.length} />
            {allergyWarnings.length > 0 && (
              <View style={styles.allergyWarningBox}>
                {allergyWarnings.map((w) => (
                  <View key={w.name} style={styles.allergyWarningRow}>
                    <View style={[styles.allergyDot, { backgroundColor: w.color }]} />
                    <Text style={styles.allergyWarningText}>
                      <Text style={{ fontFamily: fonts.bodyMedium }}>{w.name}</Text>
                      {' is allergisch voor '}
                      {w.allergens.join(', ')}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.allergenRow}>
              {recipe.allergens.map((a) => (
                <View key={a} style={styles.allergenChip}>
                  <Text style={styles.allergenChipText}>{a}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Section
          title="iv. nutritie"
          count={recipe.nutrition?.matchedIngredients ?? 0}
          suffix={recipe.nutrition ? 'ingr.' : 'per portie'}
        />
        <NutritionPanel
          nutrition={recipe.nutrition}
          loading={computingNutrition}
          onCompute={handleComputeNutrition}
        />

        <View style={styles.ratingSection}>
          <StarRating
            rating={recipe.rating ?? 0}
            size="large"
            onRate={(r) => update(recipe.id, { rating: r === recipe.rating ? 0 : r })}
          />
        </View>

        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <TouchableOpacity
            onPress={async () => {
              try {
                await update(recipe.id, {
                  timesCooked: (recipe.timesCooked ?? 0) + 1,
                  lastCooked: new Date().toISOString(),
                });
                haptics.success();
                toast.success('Gemarkeerd als gekookt', recipe.title);
              } catch {
                /* update() already toasted on failure */
              }
            }}
            style={styles.cookedBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.cookedBtnText}>👨‍🍳 Ik heb dit gekookt</Text>
          </TouchableOpacity>
          {recipe.lastCooked && (
            <Text style={styles.cookedMeta}>
              Laatst: {new Date(recipe.lastCooked).toLocaleDateString('nl-NL')}
            </Text>
          )}
          {(recipe.timesCooked ?? 0) > 0 && (
            <Text style={styles.cookedMeta}>{recipe.timesCooked}x gekookt</Text>
          )}
        </View>

        <View style={styles.notesSection}>
          <View style={styles.notesSectionHeader}>
            <Text style={typography.folioBold}>notities</Text>
            <TouchableOpacity
              onPress={() => {
                if (!notesEdit) setNotesTxt(recipe.notes ?? '');
                setNotesEdit(!notesEdit);
              }}
              hitSlop={8}
            >
              <Ionicons name={notesEdit ? 'close' : 'pencil'} size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {notesEdit ? (
            <>
              <TextInput
                value={notesTxt}
                onChangeText={setNotesTxt}
                placeholder="Voeg notities toe..."
                placeholderTextColor={colors.textFaint}
                multiline
                numberOfLines={4}
                style={styles.notesInput}
              />
              <TouchableOpacity
                onPress={async () => {
                  await update(recipe.id, { notes: notesTxt });
                  setNotesEdit(false);
                }}
                style={styles.notesSaveBtn}
              >
                <Text style={styles.notesSaveBtnText}>Opslaan</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.notesText}>
              {recipe.notes || 'Geen notities. Tap het potlood om toe te voegen.'}
            </Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.ctaBar}>
        <TouchableOpacity
          style={styles.ctaPrimary}
          onPress={() =>
            steps.length
              ? router.push(`/cook/${id}`)
              : Alert.alert('Geen stappen', 'Voeg stappen toe aan dit recept.')
          }
          activeOpacity={0.85}
        >
          <Text style={typography.buttonLabel}>begin met koken</Text>
          <Ionicons name="arrow-forward" size={14} color={PAPER} style={{ marginLeft: 10 }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctaSecondary} onPress={openGroceryModal} activeOpacity={0.7}>
          <Ionicons name="bag-outline" size={18} color={colors.textDark} />
        </TouchableOpacity>
      </View>

      {cookStep !== null && steps.length > 0 && (
        <CookOverlay
          stepIndex={cookStep}
          totalSteps={steps.length}
          stepBody={stepText(steps[cookStep])}
          recipeTitle={recipe.title}
          activeTimers={activeTimers}
          onClose={() => {
            setCookStep(null);
            setActiveTimers([]);
          }}
          onPrev={() => setCookStep((s) => (s != null && s > 0 ? s - 1 : s))}
          onNext={() => setCookStep((s) => (s != null && s < steps.length - 1 ? s + 1 : s))}
          onStartTimer={(seconds, label) =>
            setActiveTimers((prev) => [...prev, { id: generateId(), seconds, label }])
          }
          onDismissTimer={(id) =>
            setActiveTimers((prev) => prev.filter((t) => t.id !== id))
          }
        />
      )}

      <GroceryPickerModal
        visible={groceryModalVisible}
        ingredients={scaledIngredients}
        selectedIds={selectedIngIds}
        onClose={() => setGroceryModalVisible(false)}
        onToggle={toggleIngredient}
        onToggleAll={toggleAllIngredients}
        onConfirm={handleAddToGrocery}
      />

      <ShareMenuModal
        visible={shareMenuVisible}
        onClose={() => setShareMenuVisible(false)}
        onSharePdf={handleExportPdf}
        onShareText={handleShareText}
      />

      <CollectionsPickerModal
        visible={collectionsPickerVisible}
        recipeId={recipe.id}
        collections={collections}
        onClose={() => setCollectionsPickerVisible(false)}
        onToggle={handleToggleCollection}
        onManage={() => {
          setCollectionsPickerVisible(false);
          router.push('/collections');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAPER },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerActions: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  hero: { width: '100%', height: 240 },
  metaStrip: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  ingRow: { flexDirection: 'row', alignItems: 'baseline', paddingVertical: 7 },
  ingRowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderColor,
    borderStyle: 'dotted',
  },
  ingNum: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.textDark,
    width: 40,
    textAlign: 'right',
    paddingRight: 6,
  },
  ingUnit: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.textLight,
    width: 36,
  },
  ingName: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.textMedium,
    lineHeight: 18,
  },
  ingCart: { width: 16, marginLeft: 4 },
  stepRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  stepRowDivider: { borderBottomWidth: 0.5, borderBottomColor: colors.borderSoft },
  stepNum: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.primary,
    width: 36,
    paddingTop: 4,
  },
  stepText: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.textMedium,
    lineHeight: 22,
  },
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: PAPER,
    borderTopWidth: 1,
    borderTopColor: colors.borderColor,
    flexDirection: 'row',
    padding: spacing.md,
    gap: 10,
    alignItems: 'center',
  },
  ctaPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textDark,
    paddingVertical: 14,
    borderRadius: 999,
  },
  ctaSecondary: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allergenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginBottom: spacing.md,
  },
  allergyWarningBox: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: 10,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    backgroundColor: 'rgba(194,73,42,0.05)',
    gap: 6,
  },
  allergyWarningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  allergyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  allergyWarningText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textDark,
    lineHeight: 17,
  },
  cookedBtn: {
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cookedBtnText: {
    color: colors.secondary,
    fontFamily: fonts.display,
    fontWeight: '600',
    fontSize: 14,
  },
  cookedMeta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.textLight,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  ratingSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.md },
  notesSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  notesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 100,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
    textAlignVertical: 'top',
  },
  notesSaveBtn: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  notesSaveBtnText: {
    color: colors.background,
    fontFamily: fonts.display,
    fontWeight: '600',
    fontSize: 14,
  },
  notesText: {
    fontFamily: fonts.display,
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMedium,
  },
  allergenChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  allergenChipText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.background,
    fontWeight: '600',
  },
});
