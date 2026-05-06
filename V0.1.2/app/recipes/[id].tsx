import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useRecipes } from '../../features/recipes/hooks';
import { useGrocery } from '../../features/grocery/hooks';
import { LoadingScreen } from '../../components/LoadingScreen';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';
import { generateId } from '../../utils/id';
import { Ingredient } from '../../types/recipe';

const PAPER = colors.background;

function stepText(step: unknown): string {
  if (typeof step === 'string') return step;
  if (step && typeof step === 'object' && 'text' in step) return String((step as { text: unknown }).text);
  return '';
}

function formatQty(qty: number): string {
  if (!qty) return '';
  const rounded = Math.round(qty * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
}

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes, isLoading, update, remove } = useRecipes();
  const { addFromRecipe } = useGrocery();

  const [cookStep, setCookStep] = useState<number | null>(null);
  const [servings, setServings] = useState<number | null>(null);
  const [groceryModalVisible, setGroceryModalVisible] = useState(false);
  const [selectedIngIds, setSelectedIngIds] = useState<Set<string>>(new Set());
  const [addIngVisible, setAddIngVisible] = useState(false);
  const [newIngName, setNewIngName] = useState('');
  const [newIngQty, setNewIngQty] = useState('');
  const [newIngUnit, setNewIngUnit] = useState('');

  const recipe = recipes.find(r => r.id === id);

  const baseServings = useMemo(() => (recipe as any)?.servings ?? 4, [recipe]);
  const currentServings = servings ?? baseServings;

  const scaledIngredients = useMemo(() => {
    if (!recipe?.ingredients) return [];
    const ratio = currentServings / baseServings;
    return recipe.ingredients.map(ing => ({
      ...ing,
      displayQty: formatQty(ing.quantity * ratio),
    }));
  }, [recipe?.ingredients, currentServings, baseServings]);

  if (isLoading) return <LoadingScreen />;
  if (!recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={[typography.bodyItalic, { textAlign: 'center', marginTop: 40 }]}>
          Recept niet gevonden.
        </Text>
      </SafeAreaView>
    );
  }

  const steps = recipe.steps ?? [];

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

  const openGroceryModal = () => {
    const allIds = new Set(recipe.ingredients.map(i => i.id));
    setSelectedIngIds(allIds);
    setGroceryModalVisible(true);
  };

  const toggleIngredient = (ingId: string) => {
    setSelectedIngIds(prev => {
      const next = new Set(prev);
      if (next.has(ingId)) next.delete(ingId);
      else next.add(ingId);
      return next;
    });
  };

  const handleAddToGrocery = async () => {
    const selected = scaledIngredients
      .filter(i => selectedIngIds.has(i.id))
      .map(i => ({ ...i, quantity: i.quantity * (currentServings / baseServings) }));
    if (!selected.length) {
      Alert.alert('Niets geselecteerd', 'Selecteer minstens één ingrediënt.');
      return;
    }
    setGroceryModalVisible(false);
    try {
      await addFromRecipe(selected, recipe.id, recipe.title);
      Alert.alert('Toegevoegd', `Ingrediënten staan nu op je boodschappenlijst.`);
    } catch {
      Alert.alert('Fout', 'Kon ingrediënten niet toevoegen. Probeer opnieuw.');
    }
  };

  const handleSaveNewIngredient = async () => {
    if (!newIngName.trim()) return;
    const newIng: Ingredient = {
      id: generateId(),
      name: newIngName.trim(),
      quantity: parseFloat(newIngQty) || 0,
      unit: newIngUnit.trim(),
    };
    await update(recipe.id, {
      ingredients: [...recipe.ingredients, newIng],
    });
    setNewIngName('');
    setNewIngQty('');
    setNewIngUnit('');
    setAddIngVisible(false);
  };

  const splitTitle = (title: string) => {
    const words = title.trim().split(' ');
    if (words.length === 1) return { lead: '', tail: title };
    return { lead: words.slice(0, -1).join(' '), tail: words[words.length - 1] };
  };
  const { lead, tail } = splitTitle(recipe.title);

  const stats = [
    { icon: 'time-outline', v: String((recipe as any).duration ?? (recipe as any).totalTime ?? '—'), u: 'min' },
    { icon: 'flame-outline', v: String((recipe as any).calories ?? '—'), u: 'kcal' },
    { icon: 'restaurant-outline', v: String(recipe.ingredients?.length ?? 0), u: 'ing.' },
  ] as const;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={typography.folio}>{recipe.category || 'recept'}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push(`/recipes/edit/${recipe.id}`)} hitSlop={8}>
            <Ionicons name="pencil-outline" size={20} color={colors.textDark} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => update(recipe.id, { isFavorite: !recipe.isFavorite })}
            hitSlop={8}
          >
            <Ionicons
              name={recipe.isFavorite ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={colors.textDark}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteRecipe} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Title */}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          {lead.length > 0 && (
            <Text style={[typography.hero32Bold, { fontSize: 42, marginTop: 8 }]}>{lead}</Text>
          )}
          <Text style={[typography.heroItalic, { fontSize: 42 }]}>{tail}</Text>
          {(recipe as any).description ? (
            <Text style={[typography.bodyItalic, { marginTop: 14 }]}>"{(recipe as any).description}"</Text>
          ) : null}
        </View>

        {/* Hero photo */}
        <View style={{ marginTop: spacing.lg }}>
          {recipe.imageUri ? (
            <Image source={{ uri: recipe.imageUri }} style={styles.hero} />
          ) : (
            <View style={[styles.hero, { backgroundColor: colors.backgroundLight }]} />
          )}
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statCol}>
              <Ionicons name={s.icon as any} size={16} color={colors.textLight} />
              <Text style={styles.statValue}>{s.v}</Text>
              <Text style={typography.label12}>{s.u}</Text>
            </View>
          ))}
          {/* Servings adjuster */}
          <View style={styles.statCol}>
            <Ionicons name="people-outline" size={16} color={colors.textLight} />
            <View style={styles.servingsRow}>
              <TouchableOpacity
                onPress={() => setServings(Math.max(1, currentServings - 1))}
                hitSlop={6}
              >
                <Ionicons name="remove" size={14} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.statValue}>{currentServings}</Text>
              <TouchableOpacity
                onPress={() => setServings(currentServings + 1)}
                hitSlop={6}
              >
                <Ionicons name="add" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={typography.label12}>pers.</Text>
          </View>
        </View>

        {/* Ingrediënten */}
        <Section title="i. ingrediënten" count={recipe.ingredients?.length ?? 0} />
        <View style={{ paddingHorizontal: spacing.lg, gap: 10 }}>
          {scaledIngredients.map((ing) => (
            <View key={ing.id} style={styles.ingRow}>
              <Text style={styles.ingNum}>{ing.displayQty}</Text>
              <Text style={styles.ingUnit}>{ing.unit || ''}</Text>
              <Text style={styles.ingName}>{ing.name}</Text>
            </View>
          ))}

          {/* Add ingredient inline */}
          {addIngVisible ? (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.addIngForm}>
                <TextInput
                  style={[styles.addIngInput, { flex: 2 }]}
                  placeholder="Naam"
                  placeholderTextColor={colors.textFaint}
                  value={newIngName}
                  onChangeText={setNewIngName}
                  autoFocus
                />
                <TextInput
                  style={[styles.addIngInput, { width: 56 }]}
                  placeholder="Aantal"
                  placeholderTextColor={colors.textFaint}
                  value={newIngQty}
                  onChangeText={setNewIngQty}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[styles.addIngInput, { width: 64 }]}
                  placeholder="Eenheid"
                  placeholderTextColor={colors.textFaint}
                  value={newIngUnit}
                  onChangeText={setNewIngUnit}
                />
                <TouchableOpacity onPress={handleSaveNewIngredient} hitSlop={6}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAddIngVisible(false)} hitSlop={6}>
                  <Ionicons name="close-circle-outline" size={22} color={colors.textLight} />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          ) : (
            <TouchableOpacity style={styles.addIngBtn} onPress={() => setAddIngVisible(true)}>
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={styles.addIngBtnText}>ingrediënt toevoegen</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Werkwijze */}
        <Section title="ii. werkwijze" count={steps.length} suffix="stappen" />
        <View style={{ paddingHorizontal: spacing.lg, gap: 16 }}>
          {steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <Text style={styles.stepText}>{stepText(step)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          style={styles.ctaPrimary}
          onPress={() =>
            steps.length
              ? setCookStep(0)
              : Alert.alert('Geen stappen', 'Voeg stappen toe aan dit recept.')
          }
          activeOpacity={0.85}
        >
          <Text style={typography.buttonLabel}>begin met koken</Text>
          <Ionicons name="arrow-forward" size={14} color={PAPER} style={{ marginLeft: 10 }} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ctaSecondary}
          onPress={openGroceryModal}
          activeOpacity={0.7}
        >
          <Ionicons name="bag-outline" size={18} color={colors.textDark} />
        </TouchableOpacity>
      </View>

      {/* Cook mode overlay */}
      {cookStep !== null && steps.length > 0 && (
        <View style={styles.cookOverlay}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <TouchableOpacity style={styles.cookClose} onPress={() => setCookStep(null)}>
              <Ionicons name="close" size={24} color={colors.textDark} />
            </TouchableOpacity>
            <View style={styles.cookContent}>
              <Text style={typography.folio}>
                stap {cookStep + 1} van {steps.length}
              </Text>
              <Text style={styles.cookStepText}>{stepText(steps[cookStep])}</Text>
            </View>
            <View style={styles.cookNav}>
              <TouchableOpacity
                style={[styles.cookNavBtn, cookStep === 0 && styles.cookNavDisabled]}
                onPress={() => cookStep > 0 && setCookStep(cookStep - 1)}
                disabled={cookStep === 0}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={cookStep === 0 ? colors.textFaint : colors.textDark}
                />
                <Text style={[styles.cookNavLabel, cookStep === 0 && { color: colors.textFaint }]}>
                  vorige
                </Text>
              </TouchableOpacity>
              {cookStep < steps.length - 1 ? (
                <TouchableOpacity style={styles.cookNavBtn} onPress={() => setCookStep(cookStep + 1)}>
                  <Text style={styles.cookNavLabel}>volgende</Text>
                  <Ionicons name="chevron-forward" size={22} color={colors.textDark} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.cookDoneBtn} onPress={() => setCookStep(null)}>
                  <Text style={typography.buttonLabel}>klaar!</Text>
                </TouchableOpacity>
              )}
            </View>
          </SafeAreaView>
        </View>
      )}

      {/* Grocery ingredient select modal */}
      <Modal
        visible={groceryModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setGroceryModalVisible(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setGroceryModalVisible(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textDark} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ingrediënten kiezen</Text>
            <TouchableOpacity
              onPress={() => {
                if (selectedIngIds.size === scaledIngredients.length) {
                  setSelectedIngIds(new Set());
                } else {
                  setSelectedIngIds(new Set(scaledIngredients.map(i => i.id)));
                }
              }}
              hitSlop={8}
            >
              <Text style={styles.selectAllText}>
                {selectedIngIds.size === scaledIngredients.length ? 'Geen' : 'Alles'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 2 }}>
            {scaledIngredients.map((ing) => {
              const checked = selectedIngIds.has(ing.id);
              return (
                <TouchableOpacity
                  key={ing.id}
                  style={styles.ingCheckRow}
                  onPress={() => toggleIngredient(ing.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={checked ? colors.primary : colors.textFaint}
                  />
                  <Text style={styles.ingCheckNum}>{ing.displayQty}</Text>
                  <Text style={styles.ingCheckUnit}>{ing.unit}</Text>
                  <Text style={styles.ingCheckName}>{ing.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalCta}
              onPress={handleAddToGrocery}
              activeOpacity={0.85}
            >
              <Ionicons name="bag-outline" size={16} color={PAPER} style={{ marginRight: 8 }} />
              <Text style={typography.buttonLabel}>
                voeg {selectedIngIds.size} toe aan lijst
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Section({ title, count, suffix }: { title: string; count: number; suffix?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={typography.folioBold}>{title}</Text>
      <View style={styles.rule} />
      <Text style={typography.folio}>
        {count} {suffix ?? ''}
      </Text>
    </View>
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
  headerActions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  hero: { width: '100%', height: 240 },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    justifyContent: 'space-between',
  },
  statCol: { alignItems: 'center', flex: 1 },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textDark,
    marginTop: 6,
    marginBottom: 4,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  rule: { flex: 1, height: 1, backgroundColor: colors.borderColor },
  ingRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  ingNum: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.primary,
    width: 38,
    textAlign: 'right',
  },
  ingUnit: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.textLight,
    textTransform: 'uppercase',
    width: 56,
  },
  ingName: { flex: 1, fontFamily: fonts.display, fontSize: 15 },
  addIngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  addIngBtnText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.primary,
  },
  addIngForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderSoft,
  },
  addIngInput: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.textDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  stepRow: { flexDirection: 'row', gap: 10 },
  stepNum: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 22,
    color: colors.primary,
    width: 28,
  },
  stepText: { flex: 1, fontFamily: fonts.display, fontSize: 15, lineHeight: 22 },
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
  cookOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PAPER,
    zIndex: 100,
  },
  cookClose: {
    alignSelf: 'flex-end',
    padding: spacing.lg,
  },
  cookContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  cookStepText: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.textDark,
    lineHeight: 34,
  },
  cookNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  cookNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: spacing.sm,
  },
  cookNavDisabled: { opacity: 0.3 },
  cookNavLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textDark,
  },
  cookDoneBtn: {
    backgroundColor: colors.textDark,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal
  modal: { flex: 1, backgroundColor: PAPER },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderColor,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.textDark,
  },
  selectAllText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  ingCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  ingCheckNum: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.primary,
    width: 34,
    textAlign: 'right',
  },
  ingCheckUnit: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textLight,
    textTransform: 'uppercase',
    width: 50,
  },
  ingCheckName: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
  },
  modalFooter: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderColor,
  },
  modalCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textDark,
    paddingVertical: 14,
    borderRadius: 999,
  },
});
