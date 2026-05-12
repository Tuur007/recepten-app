import React, { useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useRecipes } from '../../features/recipes/hooks';
import { useWeekPlannerStore, type MealType } from '../../store/weekPlannerStore';
import { LoadingScreen } from '../../components/LoadingScreen';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';
import type { Recipe } from '../../types/recipe';
import { haptics, toast } from '../../utils/feedback';

const DAY_KEYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const DAY_LABELS = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];

const MEAL_TYPES: MealType[] = ['lunch', 'dinner'];
const MEAL_LABEL: Record<MealType, string> = {
  lunch: 'lunch',
  dinner: 'diner',
};
const MEAL_ICON: Record<MealType, keyof typeof Ionicons.glyphMap> = {
  lunch: 'sunny-outline',
  dinner: 'moon-outline',
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface PickerTarget {
  day: string;
  mealType: MealType;
}

export default function WeekPlannerScreen() {
  const router = useRouter();
  const { recipes, isLoading } = useRecipes();
  const { mealPlan, setMeal, removeMeal } = useWeekPlannerStore();

  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [prefModalVisible, setPrefModalVisible] = useState(false);
  const [prefVeg, setPrefVeg] = useState(false);
  const [prefSnel, setPrefSnel] = useState(false);
  const [prefMaxMin, setPrefMaxMin] = useState('');

  const weekDays = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return DAY_KEYS.map((key, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { key, label: DAY_LABELS[i], date: d.getDate() };
    });
  }, []);

  const weekLabel = useMemo(() => {
    const d = new Date();
    const onejan = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(
      ((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7,
    );
    const months = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
    return `week ${weekNum} · ${months[d.getMonth()]}`;
  }, []);

  const getRecipe = useCallback(
    (recipeId: string | null) => {
      if (!recipeId) return null;
      return recipes.find((r) => r.id === recipeId) ?? null;
    },
    [recipes],
  );

  const filteredPickerRecipes = useMemo(() => {
    if (!pickerQuery.trim()) return recipes;
    const q = pickerQuery.toLowerCase();
    return recipes.filter((r) => r.title.toLowerCase().includes(q));
  }, [recipes, pickerQuery]);

  const handlePick = useCallback(
    (recipeId: string) => {
      if (!pickerTarget) return;
      setMeal(pickerTarget.day, pickerTarget.mealType, recipeId);
      haptics.light();
      const recipe = recipes.find((r) => r.id === recipeId);
      if (recipe) {
        toast.success(
          `Ingepland · ${MEAL_LABEL[pickerTarget.mealType]}`,
          recipe.title,
        );
      }
      setPickerTarget(null);
      setPickerQuery('');
    },
    [pickerTarget, setMeal, recipes],
  );

  const applyFillGaps = useCallback(
    (pool: Recipe[]) => {
      if (!pool.length) {
        Alert.alert('Geen recepten', 'Geen recepten gevonden met deze filters.');
        return;
      }

      // Collect (day, mealType) slots that are still empty.
      const emptySlots: PickerTarget[] = [];
      weekDays.forEach(({ key }) => {
        const day = mealPlan[key];
        MEAL_TYPES.forEach((mealType) => {
          if (!day || !day[mealType]) emptySlots.push({ day: key, mealType });
        });
      });

      if (!emptySlots.length) {
        Alert.alert('Volledig', 'Alle maaltijden zijn al ingevuld.');
        return;
      }

      // Already-used IDs this week to maximise variety.
      const usedIds = new Set<string>();
      weekDays.forEach(({ key }) => {
        const day = mealPlan[key];
        if (day?.lunch) usedIds.add(day.lunch);
        if (day?.dinner) usedIds.add(day.dinner);
      });

      const preferred = shuffle(pool.filter((r) => !usedIds.has(r.id)));
      const fallback = shuffle(pool.filter((r) => usedIds.has(r.id)));
      const ordered = [...preferred, ...fallback];

      emptySlots.forEach((slot, i) => {
        const recipe = ordered[i % ordered.length];
        setMeal(slot.day, slot.mealType, recipe.id);
      });
      haptics.success();
      toast.success(
        `${emptySlots.length} ${emptySlots.length === 1 ? 'maaltijd' : 'maaltijden'} ingepland`,
      );
    },
    [weekDays, mealPlan, setMeal],
  );

  const handleFillGaps = useCallback(() => {
    if (!recipes.length) {
      Alert.alert('Geen recepten', 'Voeg eerst recepten toe aan je verzameling.');
      return;
    }
    setPrefModalVisible(true);
  }, [recipes]);

  const confirmFillGaps = useCallback(() => {
    setPrefModalVisible(false);
    const maxMin = prefMaxMin.trim() ? parseInt(prefMaxMin, 10) : undefined;
    let pool = [...recipes];
    if (prefVeg) pool = pool.filter((r) => r.category === 'Vegetarisch');
    if (prefSnel) pool = pool.filter((r) => r.category === 'Snel' || (r.duration != null && r.duration <= 30));
    if (maxMin && maxMin > 0) pool = pool.filter((r) => !r.duration || r.duration <= maxMin);
    if (!pool.length) pool = [...recipes];
    applyFillGaps(pool);
  }, [recipes, prefVeg, prefSnel, prefMaxMin, applyFillGaps]);

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Folio */}
        <View style={styles.folio}>
          <Text style={typography.folio}>{weekLabel}</Text>
        </View>

        {/* Title */}
        <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
          <Text style={[typography.hero32Bold, { fontSize: 38 }]}>Een week</Text>
          <Text style={[typography.heroItalic, { fontSize: 22, marginTop: 4 }]}>op tafel.</Text>
          <View style={styles.divider} />
        </View>

        {/* Days */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          {weekDays.map(({ key, label, date }) => {
            const day = mealPlan[key];
            return (
              <View key={key} style={styles.dayCard}>
                <View style={styles.dayCardHeader}>
                  <Text style={styles.dayName}>{label}</Text>
                  <Text style={styles.dateMono}>{date}</Text>
                </View>

                {MEAL_TYPES.map((mealType) => {
                  const recipe = getRecipe(day?.[mealType] ?? null);
                  return (
                    <View key={mealType} style={styles.mealRow}>
                      <View style={styles.mealLabelCol}>
                        <Ionicons
                          name={MEAL_ICON[mealType]}
                          size={12}
                          color={colors.textFaint}
                        />
                        <Text style={styles.mealLabel}>{MEAL_LABEL[mealType]}</Text>
                      </View>

                      {recipe ? (
                        <TouchableOpacity
                          style={styles.recipeRow}
                          onPress={() => router.push(`/recipes/${recipe.id}`)}
                          activeOpacity={0.7}
                        >
                          {recipe.imageUri ? (
                            <Image source={{ uri: recipe.imageUri }} style={styles.thumb} />
                          ) : (
                            <View style={[styles.thumb, styles.thumbPlaceholder]} />
                          )}
                          <Text style={styles.recipeTitle} numberOfLines={1}>
                            {recipe.title}
                          </Text>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              setPickerTarget({ day: key, mealType });
                            }}
                            hitSlop={10}
                            style={styles.mealActionBtn}
                          >
                            <Ionicons
                              name="swap-horizontal"
                              size={16}
                              color={colors.textFaint}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              haptics.light();
                              removeMeal(key, mealType);
                            }}
                            hitSlop={10}
                            style={styles.mealActionBtn}
                          >
                            <Ionicons
                              name="close-circle-outline"
                              size={18}
                              color={colors.textFaint}
                            />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.emptyRow}
                          onPress={() => setPickerTarget({ day: key, mealType })}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add" size={14} color={colors.primary} />
                          <Text style={styles.emptyText}>kies een recept</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <TouchableOpacity style={styles.footerHint} onPress={handleFillGaps} activeOpacity={0.7}>
          <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
          <Text style={styles.footerHintText}>laat ons de gaten vullen</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Recipe picker modal ── */}
      <Modal
        visible={!!pickerTarget}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setPickerTarget(null); setPickerQuery(''); }}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {pickerTarget
                ? `Kies een recept · ${MEAL_LABEL[pickerTarget.mealType]}`
                : 'Kies een recept'}
            </Text>
            <TouchableOpacity onPress={() => { setPickerTarget(null); setPickerQuery(''); }} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textDark} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={colors.textFaint} />
            <TextInput
              style={styles.searchInput}
              value={pickerQuery}
              onChangeText={setPickerQuery}
              placeholder="Zoek recept…"
              placeholderTextColor={colors.textFaint}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
          <FlatList
            data={filteredPickerRecipes}
            keyExtractor={(r) => r.id}
            contentContainerStyle={{ padding: spacing.md, gap: 10 }}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: colors.textLight, marginTop: 40 }}>
                Geen recepten gevonden.
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerRow}
                onPress={() => handlePick(item.id)}
                activeOpacity={0.75}
              >
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={styles.pickerThumb} />
                ) : (
                  <View style={[styles.pickerThumb, styles.thumbPlaceholder]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerTitle}>{item.title}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    {item.category ? (
                      <Text style={[typography.label12, { fontSize: 8 }]}>{item.category}</Text>
                    ) : null}
                    {item.duration ? (
                      <Text style={[typography.label12, { fontSize: 8, color: colors.textFaint }]}>
                        {item.duration} min
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* ── Preferences modal ── */}
      <Modal
        visible={prefModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPrefModalVisible(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Voorkeuren</Text>
            <TouchableOpacity onPress={() => setPrefModalVisible(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textDark} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 20 }}>
            <Text style={[typography.bodyItalic, { marginBottom: spacing.sm }]}>
              Pas de filter aan om alle lege maaltijden te vullen.
            </Text>

            <PrefToggle
              icon="leaf-outline"
              label="Alleen vegetarisch"
              value={prefVeg}
              onToggle={() => setPrefVeg((v) => !v)}
            />
            <PrefToggle
              icon="flash-outline"
              label="Alleen snel (<30 min)"
              value={prefSnel}
              onToggle={() => setPrefSnel((v) => !v)}
            />

            <View>
              <Text style={styles.prefLabel}>Max. kooktijd (minuten)</Text>
              <TextInput
                style={styles.prefInput}
                value={prefMaxMin}
                onChangeText={setPrefMaxMin}
                placeholder="bv. 45"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity style={styles.prefCta} onPress={confirmFillGaps} activeOpacity={0.85}>
              <Ionicons name="sparkles-outline" size={14} color={colors.background} style={{ marginRight: 8 }} />
              <Text style={typography.buttonLabel}>vul de gaten</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.prefSkip}
              onPress={() => { setPrefModalVisible(false); applyFillGaps(recipes); }}
              activeOpacity={0.6}
            >
              <Text style={styles.prefSkipText}>willekeurig zonder filter</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function PrefToggle({
  icon, label, value, onToggle,
}: { icon: string; label: string; value: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={styles.prefToggleRow} onPress={onToggle} activeOpacity={0.7}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={value ? colors.primary : colors.textLight} />
      <Text style={[styles.prefToggleLabel, value && { color: colors.primary }]}>{label}</Text>
      <Ionicons
        name={value ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={value ? colors.primary : colors.textFaint}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  folio: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  divider: { width: 32, height: 1, backgroundColor: colors.borderColor, marginTop: spacing.sm },

  dayCard: {
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dayName: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 15,
    color: colors.textDark,
  },
  dateMono: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textFaint,
  },

  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  mealLabelCol: {
    width: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mealLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textLight,
  },

  recipeRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 28, height: 28, borderRadius: 14 },
  thumbPlaceholder: { backgroundColor: colors.backgroundLight },
  recipeTitle: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.textDark,
  },
  mealActionBtn: { padding: 2 },

  emptyRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  emptyText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textFaint,
  },

  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  footerHintText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 12,
    color: colors.primary,
  },

  modal: { flex: 1, backgroundColor: colors.background },
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
    fontSize: 17,
    color: colors.textDark,
    flex: 1,
    paddingRight: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderColor,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
    paddingVertical: 6,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: spacing.sm,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
  },
  pickerThumb: { width: 44, height: 44, borderRadius: 8 },
  pickerTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
    marginBottom: 2,
  },

  prefToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  prefToggleLabel: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
  },
  prefLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textLight,
    marginBottom: 8,
  },
  prefInput: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    paddingVertical: 8,
  },
  prefCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textDark,
    paddingVertical: 14,
    borderRadius: 999,
    marginTop: spacing.sm,
  },
  prefSkip: { alignItems: 'center', paddingVertical: spacing.sm },
  prefSkipText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textFaint,
  },
});
