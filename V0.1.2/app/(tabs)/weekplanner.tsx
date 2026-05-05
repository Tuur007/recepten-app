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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useRecipes } from '../../features/recipes/hooks';
import { useWeekPlannerStore } from '../../store/weekPlannerStore';
import { LoadingScreen } from '../../components/LoadingScreen';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';

const DAY_KEYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const DAY_LABELS = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];

export default function WeekPlannerScreen() {
  const router = useRouter();
  const { recipes, isLoading } = useRecipes();
  const { mealPlan, addMeal, clearDay } = useWeekPlannerStore();
  const [pickerDay, setPickerDay] = useState<string | null>(null);

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
    const weekNum = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    const months = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
    return `week ${weekNum} · ${months[d.getMonth()]}`;
  }, []);

  const getRecipe = useCallback((key: string) => {
    const ids = mealPlan[key];
    if (!ids?.length) return null;
    return recipes.find(r => r.id === ids[0]) ?? null;
  }, [mealPlan, recipes]);

  const handleAdd = useCallback((dayKey: string, recipeId: string) => {
    clearDay(dayKey);
    addMeal(dayKey, recipeId);
    setPickerDay(null);
  }, [clearDay, addMeal]);

  const fillGaps = useCallback(() => {
    if (!recipes.length) {
      Alert.alert('Geen recepten', 'Voeg eerst recepten toe aan je verzameling.');
      return;
    }
    weekDays.forEach(({ key }) => {
      if (!mealPlan[key]?.length) {
        const recipe = recipes[Math.floor(Math.random() * recipes.length)];
        addMeal(key, recipe.id);
      }
    });
  }, [recipes, mealPlan, weekDays, addMeal]);

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
            const recipe = getRecipe(key);
            return (
              <View key={key} style={styles.dayRow}>
                <Text style={styles.dayName}>{label}</Text>

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
                    <Text style={styles.recipeTitle} numberOfLines={1}>{recipe.title}</Text>
                    <TouchableOpacity onPress={() => clearDay(key)} hitSlop={12}>
                      <Ionicons name="close-circle-outline" size={18} color={colors.textFaint} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.emptyRow}
                    onPress={() => setPickerDay(key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <Text style={styles.emptyText}>kies een recept</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.dateMono}>{date}</Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <TouchableOpacity style={styles.footerHint} onPress={fillGaps} activeOpacity={0.7}>
          <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
          <Text style={styles.footerHintText}>laat ons de gaten vullen</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Recipe picker modal */}
      <Modal
        visible={!!pickerDay}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerDay(null)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Kies een recept</Text>
            <TouchableOpacity onPress={() => setPickerDay(null)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textDark} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={recipes}
            keyExtractor={r => r.id}
            contentContainerStyle={{ padding: spacing.md, gap: 10 }}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: colors.textLight, marginTop: 40 }}>
                Geen recepten gevonden.
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerRow}
                onPress={() => handleAdd(pickerDay!, item.id)}
                activeOpacity={0.75}
              >
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={styles.pickerThumb} />
                ) : (
                  <View style={[styles.pickerThumb, styles.thumbPlaceholder]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerTitle}>{item.title}</Text>
                  {item.category ? (
                    <Text style={typography.label12}>{item.category}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
    gap: 8,
  },
  dayName: {
    width: 80,
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textLight,
  },
  recipeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumb: { width: 32, height: 32, borderRadius: 16 },
  thumbPlaceholder: { backgroundColor: colors.backgroundLight },
  recipeTitle: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
  },
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
  dateMono: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textFaint,
    width: 18,
    textAlign: 'right',
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
    fontSize: 18,
    color: colors.textDark,
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
});
