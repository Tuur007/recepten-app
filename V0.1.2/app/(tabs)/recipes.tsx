import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useRecipes } from '../../features/recipes/hooks';
import { useCategories } from '../../store/categoriesStore';
import { useFiltersStore } from '../../store/filtersStore';
import { filterRecipes, sortRecipes } from '../../utils/filterRecipes';
import { FilterBar } from '../../features/recipes/components/FilterBar';
import { DifficultyBadge } from '../../components/ui/DifficultyBadge';
import { CookingTimeDisplay } from '../../components/ui/CookingTimeDisplay';
import { LoadingScreen } from '../../components/LoadingScreen';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';

const PAPER = colors.background;
const { width } = Dimensions.get('window');
const GRID_GAP = 18;
const GRID_PAD = spacing.lg;
const GRID_W = (width - GRID_PAD * 2 - GRID_GAP) / 2;

export default function RecipesScreen() {
  const router = useRouter();
  const { recipes, isLoading } = useRecipes();
  const { recipeCategories } = useCategories();
  const [activeCat, setActiveCat] = useState('Alles');
  const filters = useFiltersStore();

  const cats = useMemo(
    () => ['Alles', ...recipeCategories.map((c) => c.name)],
    [recipeCategories],
  );

  const catFiltered = useMemo(() => {
    if (activeCat === 'Alles') return recipes;
    return recipes.filter((r) => r.category === activeCat);
  }, [recipes, activeCat]);

  const filtered = useMemo(
    () =>
      filterRecipes(catFiltered, {
        difficulty: filters.selectedDifficulty ?? undefined,
        timeRange: filters.selectedTimeRange ?? undefined,
        favoritesOnly: filters.favoritesOnly,
      }),
    [catFiltered, filters.selectedDifficulty, filters.selectedTimeRange, filters.favoritesOnly],
  );

  const sorted = useMemo(() => sortRecipes(filtered, filters.sortBy), [filtered, filters.sortBy]);

  const featured = sorted[0];
  const grid = useMemo(() => sorted.slice(1), [sorted]);

  const filterChips = [
    {
      id: 'favorites',
      label: '❤️ Favorieten',
      active: filters.favoritesOnly,
      onPress: () => filters.setFavoritesOnly(!filters.favoritesOnly),
    },
    {
      id: 'easy',
      label: 'Makkelijk',
      active: filters.selectedDifficulty === 'easy',
      onPress: () => filters.setDifficulty(filters.selectedDifficulty === 'easy' ? null : 'easy'),
    },
    {
      id: 'medium',
      label: 'Gemiddeld',
      active: filters.selectedDifficulty === 'medium',
      onPress: () => filters.setDifficulty(filters.selectedDifficulty === 'medium' ? null : 'medium'),
    },
    {
      id: 'hard',
      label: 'Lastig',
      active: filters.selectedDifficulty === 'hard',
      onPress: () => filters.setDifficulty(filters.selectedDifficulty === 'hard' ? null : 'hard'),
    },
    {
      id: 'under15',
      label: 'Onder 15m',
      active: filters.selectedTimeRange === 'under15',
      onPress: () => filters.setTimeRange(filters.selectedTimeRange === 'under15' ? null : 'under15'),
    },
    {
      id: '15to30',
      label: '15–30m',
      active: filters.selectedTimeRange === '15to30',
      onPress: () => filters.setTimeRange(filters.selectedTimeRange === '15to30' ? null : '15to30'),
    },
    {
      id: 'over30',
      label: '30m+',
      active: filters.selectedTimeRange === 'over30',
      onPress: () => filters.setTimeRange(filters.selectedTimeRange === 'over30' ? null : 'over30'),
    },
  ];

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Folio */}
        <View style={styles.folio}>
          <Text style={typography.folio}>recepten · {sorted.length}</Text>
        </View>

        {/* Title + search + add + import */}
        <View style={styles.titleRow}>
          <View>
            <Text style={[typography.hero32Bold, { fontSize: 38 }]}>Het</Text>
            <Text style={[typography.heroItalic, { fontSize: 38 }]}>archief.</Text>
          </View>
          <View style={styles.actionBtns}>
            <TouchableOpacity
              style={styles.searchBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/recipes/search')}
            >
              <Ionicons name="search" size={18} color={colors.textDark} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/recipes/new')}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.importBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/recipes/import')}
            >
              <Ionicons name="link" size={18} color={colors.textDark} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catsRow}
        >
          {cats.map((c) => {
            const active = c === activeCat;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setActiveCat(c)}
                style={styles.catItem}
              >
                <Text
                  style={{
                    fontFamily: active ? fonts.display : fonts.displayItalic,
                    fontStyle: active ? 'normal' : 'italic',
                    fontSize: 16,
                    color: active ? colors.textDark : colors.textLight,
                  }}
                >
                  {c}
                </Text>
                {active && <View style={styles.catUnderline} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Filter chips */}
        <FilterBar
          filters={filterChips}
          onClearFilters={() => filters.clearAllFilters()}
        />

        {/* Featured */}
        {featured ? (
          <TouchableOpacity
            style={styles.featuredWrap}
            onPress={() => router.push(`/recipes/${featured.id}`)}
            activeOpacity={0.85}
          >
            <Text style={[typography.folio, { marginBottom: 8 }]}>uitgelicht · 01</Text>
            {featured.imageUri ? (
              <Image source={{ uri: featured.imageUri }} style={styles.featuredImg} />
            ) : (
              <View style={[styles.featuredImg, styles.placeholder]} />
            )}
            <View style={styles.featuredMeta}>
              <Text style={[typography.title20, { fontSize: 22, flex: 1 }]} numberOfLines={2}>
                {featured.title}
              </Text>
              {featured.duration ? (
                <Text style={typography.label12}>{featured.duration} min</Text>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
              {featured.category ? (
                <Text style={[typography.bodyItalic, { fontSize: 12 }]}>
                  {featured.category}
                </Text>
              ) : null}
              {featured.difficulty && <DifficultyBadge difficulty={featured.difficulty} size="small" />}
              <CookingTimeDisplay
                preparationTime={featured.preparationTime}
                cookingTime={featured.cookingTime}
                size="small"
              />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[typography.bodyItalic, { textAlign: 'center' }]}>
              {filters.hasActiveFilters()
                ? 'Geen recepten gevonden met deze filters.'
                : activeCat === 'Alles'
                ? 'Nog geen recepten. Voeg er een toe!'
                : `Geen recepten in "${activeCat}".`}
            </Text>
          </View>
        )}

        {/* "De rest" header */}
        {grid.length > 0 && (
          <View style={styles.restHeader}>
            <Text style={typography.folioBold}>de rest</Text>
            <View style={styles.rule} />
          </View>
        )}

        {/* Grid */}
        <View style={styles.grid}>
          {grid.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={{ width: GRID_W, marginBottom: 22 }}
              onPress={() => router.push(`/recipes/${r.id}`)}
              activeOpacity={0.85}
            >
              {r.imageUri ? (
                <Image source={{ uri: r.imageUri }} style={styles.gridImg} />
              ) : (
                <View style={[styles.gridImg, styles.placeholder]} />
              )}
              <Text style={styles.gridTitle} numberOfLines={2}>
                {r.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                {r.difficulty && <DifficultyBadge difficulty={r.difficulty} size="small" />}
                <CookingTimeDisplay
                  preparationTime={r.preparationTime}
                  cookingTime={r.cookingTime}
                  size="small"
                />
              </View>
              {r.category ? (
                <Text style={[typography.label12, { marginTop: 2, fontSize: 8, color: colors.textFaint }]}>
                  {r.category}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAPER },
  folio: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  actionBtns: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catsRow: {
    paddingHorizontal: spacing.lg,
    gap: 18,
    marginTop: spacing.md,
    paddingBottom: 4,
  },
  catItem: { paddingBottom: 4, marginRight: 18 },
  catUnderline: {
    height: 1.5,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  featuredWrap: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  featuredImg: {
    width: '100%',
    height: 180,
    backgroundColor: colors.backgroundLight,
  },
  placeholder: { backgroundColor: colors.backgroundLight },
  featuredMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 10,
    gap: 8,
  },
  emptyState: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  restHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  rule: { flex: 1, height: 1, backgroundColor: colors.borderColor },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: GRID_GAP,
  },
  gridImg: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: colors.backgroundLight,
  },
  gridTitle: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.textDark,
    marginTop: 6,
    lineHeight: 19,
  },
});
