// app/(tabs)/weekplanner.tsx
//
// "De week" — editorial magazine-spread weekplanner.
// Changes vs previous:
//   • Folio links + rechts (week · maand   ·   ‹ vorige · volgende ›)
//   • Drop-cap dagnummers (Fraunces 36px) ipv kleine date-mono
//   • Per-dag rij met ontbijt / lunch / diner — gescheiden met hairlines
//   • Familie-stippen per maaltijd (visuele "wie eet mee")
//   • Italic "— nog niets gepland" met "+ kies" link voor lege slots
//   • Vandaag krijgt zachte paperAlt-achtergrond en terracotta numeral
//
// Alle modal- en fill-gaps-logica blijft identiek aan de vorige versie.

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
import {
  useWeekPlannerStore,
  useMealPlan,
  getISOWeek,
  type MealType,
} from '../../store/weekPlannerStore';
import { useFamilyStore, type FamilyMember } from '../../store/familyStore';
import {
  cancelDinnerNotification,
  scheduleDinnerNotification,
} from '../../services/notifications';
import { LoadingScreen } from '../../components/LoadingScreen';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';
import type { Recipe } from '../../types/recipe';
import { haptics, toast } from '../../utils/feedback';
import { useThemeColors } from '../../theme';
import {
  EditorialTitle,
  FamilyRow,
} from '../../components/ui/EditorialBits';

const DAY_KEYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const DAY_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'ontbijt',
  lunch: 'lunch',
  dinner: 'diner',
};

interface PickerTarget { day: string; mealType: MealType; }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function splitTail(s: string) {
  const w = s.trim().split(' ');
  if (w.length < 2) return { lead: s, tail: '' };
  return { lead: w.slice(0, -1).join(' '), tail: w[w.length - 1] };
}

const MIN_WEEK_OFFSET = -4;
const MAX_WEEK_OFFSET = 8;

export default function WeekPlannerScreen() {
  const router = useRouter();
  const { recipes, isLoading } = useRecipes();
  const setMeal = useWeekPlannerStore((s) => s.setMeal);
  const removeMeal = useWeekPlannerStore((s) => s.removeMeal);
  const activeMembers = useFamilyStore((s) => s.members.filter((m) => m.active));
  const themeColors = useThemeColors();

  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [prefModalVisible, setPrefModalVisible] = useState(false);
  const [prefVeg, setPrefVeg] = useState(false);
  const [prefSnel, setPrefSnel] = useState(false);
  const [prefMaxMin, setPrefMaxMin] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);

  const { weekDays, weekKey, weekLabel } = useMemo(() => {
    const today = new Date();
    const target = new Date(today);
    target.setDate(today.getDate() + weekOffset * 7);
    const monday = new Date(target);
    monday.setDate(target.getDate() - ((target.getDay() + 6) % 7));
    const days = DAY_KEYS.map((key, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isToday =
        weekOffset === 0 && d.toDateString() === today.toDateString();
      return {
        key,
        short: DAY_SHORT[i],
        date: d.getDate(),
        dateObj: d,
        isToday,
      };
    });
    const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    const key = getISOWeek(target);
    const weekNum = key.split('-W')[1] ?? '–';
    const label = `week ${weekNum} · ${months[target.getMonth()]}`;
    return { weekDays: days, weekKey: key, weekLabel: label };
  }, [weekOffset]);

  const mealPlan = useMealPlan(weekKey);

  const getRecipe = useCallback(
    (recipeId: string | null) => (recipeId ? recipes.find((r) => r.id === recipeId) ?? null : null),
    [recipes],
  );

  const filteredPickerRecipes = useMemo(() => {
    if (!pickerQuery.trim()) return recipes;
    const q = pickerQuery.toLowerCase();
    return recipes.filter((r) => r.title.toLowerCase().includes(q));
  }, [recipes, pickerQuery]);

  // Stats
  const planned = useMemo(() => {
    let count = 0;
    weekDays.forEach(({ key }) => {
      const day = mealPlan[key];
      if (!day) return;
      MEAL_TYPES.forEach((m) => {
        if (day[m]) count++;
      });
    });
    return count;
  }, [mealPlan, weekDays]);
  const totalSlots = weekDays.length * MEAL_TYPES.length;
  const gaps = totalSlots - planned;

  const handlePick = useCallback((recipeId: string) => {
    if (!pickerTarget) return;
    setMeal(weekKey, pickerTarget.day, pickerTarget.mealType, recipeId);
    haptics.light();
    const recipe = recipes.find((r) => r.id === recipeId);
    if (recipe) {
      toast.success(`Ingepland · ${MEAL_LABEL[pickerTarget.mealType]}`, recipe.title);
    }
    if (pickerTarget.mealType === 'dinner' && recipe) {
      const dateForDay = weekDays.find((d) => d.key === pickerTarget.day)?.dateObj;
      if (dateForDay && dateForDay.getTime() > Date.now()) {
        scheduleDinnerNotification(pickerTarget.day, recipe.title, dateForDay).catch((err) =>
          console.warn('[notif] schedule failed:', err),
        );
      }
    }
    setPickerTarget(null);
    setPickerQuery('');
  }, [pickerTarget, setMeal, weekKey, recipes, weekDays]);

  const handleRemoveMeal = useCallback((day: string, mealType: MealType) => {
    haptics.light();
    removeMeal(weekKey, day, mealType);
    if (mealType === 'dinner') {
      cancelDinnerNotification(day).catch((err) =>
        console.warn('[notif] cancel failed:', err),
      );
    }
  }, [removeMeal, weekKey]);

  const applyFillGaps = useCallback((pool: Recipe[]) => {
    if (!pool.length) {
      Alert.alert('Geen recepten', 'Geen recepten gevonden met deze filters.');
      return;
    }
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
    const usedIds = new Set<string>();
    weekDays.forEach(({ key }) => {
      const day = mealPlan[key];
      if (!day) return;
      MEAL_TYPES.forEach((m) => {
        const id = day[m];
        if (id) usedIds.add(id);
      });
    });
    const preferred = shuffle(pool.filter((r) => !usedIds.has(r.id)));
    const fallback = shuffle(pool.filter((r) => usedIds.has(r.id)));
    const ordered = [...preferred, ...fallback];
    emptySlots.forEach((slot, i) => {
      const recipe = ordered[i % ordered.length];
      setMeal(weekKey, slot.day, slot.mealType, recipe.id);
      if (slot.mealType === 'dinner') {
        const dateForDay = weekDays.find((d) => d.key === slot.day)?.dateObj;
        if (dateForDay && dateForDay.getTime() > Date.now()) {
          scheduleDinnerNotification(slot.day, recipe.title, dateForDay).catch((err) =>
            console.warn('[notif] schedule failed:', err),
          );
        }
      }
    });
    haptics.success();
    toast.success(
      `${emptySlots.length} ${emptySlots.length === 1 ? 'maaltijd' : 'maaltijden'} ingepland`,
    );
  }, [weekDays, mealPlan, setMeal, weekKey]);

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
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Folio + week navigatie */}
        <View style={styles.folioRow}>
          <Text style={typography.folio}>{weekLabel}</Text>
          <View style={styles.navGroup}>
            <TouchableOpacity
              onPress={() => {
                if (weekOffset > MIN_WEEK_OFFSET) {
                  haptics.selection();
                  setWeekOffset((o) => o - 1);
                }
              }}
              disabled={weekOffset <= MIN_WEEK_OFFSET}
              hitSlop={8}
              activeOpacity={0.6}
            >
              <Text
                style={[
                  styles.navLabel,
                  weekOffset <= MIN_WEEK_OFFSET && styles.navDisabled,
                ]}
              >
                ‹ vorige
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (weekOffset < MAX_WEEK_OFFSET) {
                  haptics.selection();
                  setWeekOffset((o) => o + 1);
                }
              }}
              disabled={weekOffset >= MAX_WEEK_OFFSET}
              hitSlop={8}
              activeOpacity={0.6}
            >
              <Text
                style={[
                  styles.navLabel,
                  weekOffset >= MAX_WEEK_OFFSET && styles.navDisabled,
                ]}
              >
                volgende ›
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Masthead */}
        <View style={styles.masthead}>
          <EditorialTitle lead="De" tail="week." size={42} />
          <TouchableOpacity
            style={styles.fillBtn}
            onPress={handleFillGaps}
            activeOpacity={0.75}
          >
            <Ionicons name="sparkles-outline" size={11} color={colors.primary} />
            <Text style={styles.fillBtnText}>vul de gaten</Text>
          </TouchableOpacity>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {planned} ingepland · {gaps} {gaps === 1 ? 'gat' : 'gaten'} · {totalSlots} maaltijden.
        </Text>

        {weekOffset !== 0 && (
          <View style={styles.backChipWrap}>
            <TouchableOpacity
              onPress={() => {
                haptics.selection();
                setWeekOffset(0);
              }}
              activeOpacity={0.7}
              style={styles.backChip}
            >
              <Text style={styles.backChipLabel}>· terug naar deze week ·</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Day spreads */}
        <View style={{ marginTop: spacing.lg }}>
          {weekDays.map(({ key, short, date, isToday }, idx) => {
            const day = mealPlan[key];
            return (
              <View
                key={key}
                style={[
                  styles.dayCard,
                  isToday && { backgroundColor: colors.backgroundLight },
                  idx === 0 && { borderTopWidth: 0.5, borderTopColor: colors.borderColor },
                ]}
              >
                <View style={styles.dayInner}>
                  {/* Drop-cap numeral */}
                  <View style={styles.dayNumeralCol}>
                    <Text
                      style={[
                        styles.dayNumeral,
                        isToday && { color: colors.primary },
                      ]}
                    >
                      {String(date).padStart(2, '0')}
                    </Text>
                    <Text
                      style={[
                        typography.folio,
                        { marginTop: 4 },
                        isToday && { color: colors.primary },
                      ]}
                    >
                      {short}
                    </Text>
                    {isToday && (
                      <Text style={[typography.folioBold, { color: colors.primary, marginTop: 2 }]}>
                        vandaag
                      </Text>
                    )}
                  </View>

                  {/* Meals column */}
                  <View style={{ flex: 1 }}>
                    {MEAL_TYPES.map((mealType, i) => {
                      const recipe = getRecipe(day?.[mealType] ?? null);
                      return (
                        <React.Fragment key={mealType}>
                          {i > 0 && <View style={styles.mealRule} />}
                          <MealRow
                            recipe={recipe}
                            mealType={mealType}
                            members={activeMembers}
                            onChange={() => setPickerTarget({ day: key, mealType })}
                            onRemove={() => handleRemoveMeal(key, mealType)}
                            onOpen={(rid) => router.push(`/recipes/${rid}`)}
                          />
                        </React.Fragment>
                      );
                    })}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
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
                  <View style={[styles.pickerThumb, { backgroundColor: colors.backgroundLight }]} />
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

// ─── Helper: one meal row ────────────────────────────────────────────────────
function MealRow({
  recipe,
  mealType,
  members,
  onChange,
  onRemove,
  onOpen,
}: {
  recipe: Recipe | null;
  mealType: MealType;
  members: FamilyMember[];
  onChange: () => void;
  onRemove: () => void;
  onOpen: (id: string) => void;
}) {
  const empty = !recipe;
  return (
    <View style={mealStyles.row}>
      <Text style={mealStyles.label}>{MEAL_LABEL[mealType]}</Text>

      {empty ? (
        <TouchableOpacity
          style={mealStyles.emptyBody}
          onPress={onChange}
          activeOpacity={0.6}
        >
          <Text style={mealStyles.emptyText}>— nog niets gepland</Text>
          <Text style={mealStyles.emptyAction}>+ kies</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={mealStyles.filledBody}
          onPress={() => onOpen(recipe.id)}
          activeOpacity={0.75}
        >
          {recipe.imageUri ? (
            <Image source={{ uri: recipe.imageUri }} style={mealStyles.swatch} />
          ) : (
            <View style={[mealStyles.swatch, { backgroundColor: colors.backgroundLight }]} />
          )}
          <Text style={mealStyles.title} numberOfLines={1}>
            {recipe.title}
          </Text>
          {members.length > 0 && (
            <FamilyRow members={members} size={12} overlap={4} />
          )}
          <TouchableOpacity
            hitSlop={8}
            onPress={onRemove}
            style={{ paddingHorizontal: 4 }}
          >
            <Ionicons name="close" size={14} color={colors.textFaint} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
}

const mealStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 10,
  },
  label: {
    width: 52,
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.textLight,
  },
  emptyBody: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  emptyText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 14,
    color: colors.textFaint,
  },
  emptyAction: {
    marginLeft: 'auto',
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  filledBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: { width: 24, height: 24, borderRadius: 2 },
  title: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
    lineHeight: 18,
  },
});

function PrefToggle({
  icon, label, value, onToggle,
}: { icon: string; label: string; value: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={styles.prefToggleRow} onPress={onToggle} activeOpacity={0.7}>
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={18}
        color={value ? colors.primary : colors.textLight}
      />
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

  folioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  navGroup: { flexDirection: 'row', gap: 14 },
  navLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.textDark,
  },
  navDisabled: { color: colors.textFaint },

  backChipWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  backChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: colors.primary,
  },
  backChipLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.primary,
  },

  masthead: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  fillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fillBtnText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textDark,
  },
  subtitle: {
    paddingHorizontal: spacing.lg,
    marginTop: 6,
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textLight,
  },

  dayCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  dayInner: { flexDirection: 'row', gap: 14 },
  dayNumeralCol: { width: 52 },
  dayNumeral: {
    fontFamily: fonts.display,
    fontWeight: '300',
    fontSize: 36,
    lineHeight: 36,
    letterSpacing: -1,
    color: colors.textDark,
  },
  mealRule: { height: 0.5, backgroundColor: colors.borderSoft, marginVertical: 4 },

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
