// app/(tabs)/recipes.tsx
//
// "Het archief" — editorial cookbook recipes index.
// Changes vs previous:
//   • Folio links + rechts (count + sort hint)
//   • Masthead row: kleinere ghost-knoppen (zoeken / importeren) naast titel
//   • "+ schrijf een nieuw recept" als editorial regel met hairline ipv ronde +
//   • Categorieën in italic Fraunces, actieve onder terracotta-rule
//   • Filter-chips in mono uppercase
//   • Featured "uitgelicht · 01" met headnote-caption
//   • Grid items met mono index (· 01) + italic accent op laatste woord

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
import { useCollections } from '../../store/collectionsStore';
import { useFilteredRecipes } from '../../features/recipes/hooks/useFilteredRecipes';
import { DifficultyBadge } from '../../components/ui/DifficultyBadge';
import { LoadingScreen } from '../../components/LoadingScreen';
import { Bundle } from '../../components/ui/Bundle';
import { toBundleData } from '../../features/collections/presenter';
import { getTotalCookingTime } from '../../utils/filterRecipes';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';
import { useThemeColors } from '../../theme';
import {
  FolioStrip,
  EditorialTitle,
  RuleWithLabel,
} from '../../components/ui/EditorialBits';

const STRIP_LIMIT = 5;

const { width } = Dimensions.get('window');
const GRID_GAP = 18;
const GRID_PAD = spacing.lg;
const GRID_W = (width - GRID_PAD * 2 - GRID_GAP) / 2;

/** "Spaghetti vongole" -> { lead: 'Spaghetti', tail: 'vongole' } */
function splitTail(s: string) {
  const w = s.trim().split(' ');
  if (w.length < 2) return { lead: s, tail: '' };
  return { lead: w.slice(0, -1).join(' '), tail: w[w.length - 1] };
}

export default function RecipesScreen() {
  const router = useRouter();
  const { recipes, isLoading } = useRecipes();
  const { recipeCategories } = useCategories();
  const { collections } = useCollections();
  const [activeCat, setActiveCat] = useState('Alles');
  const filters = useFiltersStore();
  const themeColors = useThemeColors();

  const bundleStrip = useMemo(
    () => collections.slice(0, STRIP_LIMIT).map((c, i) => toBundleData(c, i)),
    [collections],
  );

  const cats = useMemo(
    () => ['Alles', ...recipeCategories.map((c) => c.name)],
    [recipeCategories],
  );

  const catFiltered = useMemo(() => {
    if (activeCat === 'Alles') return recipes;
    return recipes.filter((r) => r.category === activeCat);
  }, [recipes, activeCat]);

  const { sorted, featured, grid } = useFilteredRecipes(catFiltered);

  const filterChips = [
    { id: 'favorites', label: 'favorieten', active: filters.favoritesOnly,
      onPress: () => filters.setFavoritesOnly(!filters.favoritesOnly) },
    { id: 'easy', label: 'eenvoudig', active: filters.selectedDifficulty === 'easy',
      onPress: () => filters.setDifficulty(filters.selectedDifficulty === 'easy' ? null : 'easy') },
    { id: 'medium', label: 'gemiddeld', active: filters.selectedDifficulty === 'medium',
      onPress: () => filters.setDifficulty(filters.selectedDifficulty === 'medium' ? null : 'medium') },
    { id: 'under15', label: '< 15 min', active: filters.selectedTimeRange === 'under15',
      onPress: () => filters.setTimeRange(filters.selectedTimeRange === 'under15' ? null : 'under15') },
    { id: '15to30', label: '15–30 min', active: filters.selectedTimeRange === '15to30',
      onPress: () => filters.setTimeRange(filters.selectedTimeRange === '15to30' ? null : '15to30') },
  ];

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Folio */}
        <FolioStrip
          left={`recepten · ${sorted.length}`}
          right="sorteer · ↓ recent"
        />

        {/* Masthead */}
        <View style={styles.masthead}>
          <EditorialTitle lead="Onze" tail="recepten." size={40} />
          <View style={styles.actionBtns}>
            <TouchableOpacity
              style={styles.ghostBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/recipes/search')}
            >
              <Ionicons name="search" size={15} color={colors.textDark} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ghostBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/collections')}
            >
              <Ionicons name="albums-outline" size={15} color={colors.textDark} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ghostBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/recipes/import')}
            >
              <Ionicons name="link-outline" size={15} color={colors.textDark} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Verzamelingen-strip */}
        <View style={styles.stripWrap}>
          <View style={styles.stripHead}>
            <Text style={typography.folio}>verzamelingen</Text>
            <Text style={[typography.folio, { color: colors.textFaint }]}>
              · {collections.length}
            </Text>
            <View style={styles.stripRule} />
            <TouchableOpacity onPress={() => router.push('/collections')} hitSlop={8}>
              <Text style={[typography.folio, { color: colors.primary }]}>alles →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stripRow}
          >
            {bundleStrip.map((b) => (
              <TouchableOpacity
                key={b.id}
                activeOpacity={0.8}
                onPress={() => router.push(`/collections/${b.id}`)}
                style={styles.bundleCell}
              >
                <Bundle data={b} w={84} h={118} />
                <Text style={styles.bundleFolio}>vol. {b.vol}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/collections')}
              style={styles.bundleNew}
            >
              <Text style={styles.bundleNewPlus}>+</Text>
              <Text style={[typography.folio, styles.bundleNewLabel]}>nieuwe</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* + Schrijf een nieuw recept (editorial line) */}
        <TouchableOpacity
          style={styles.newRecipeLine}
          activeOpacity={0.6}
          onPress={() => router.push('/recipes/new')}
        >
          <Text style={styles.newRecipeText}>+ schrijf een nieuw recept</Text>
          <Text style={[typography.folio, { color: colors.primary }]}>nieuw</Text>
        </TouchableOpacity>

        {/* Categories — italic Fraunces */}
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
                  {c.toLowerCase()}
                </Text>
                {active && <View style={styles.catUnderline} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Filter chips */}
        <View style={styles.chipRow}>
          {filterChips.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, c.active && styles.chipActive]}
              onPress={c.onPress}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, c.active && styles.chipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Featured */}
        {featured ? (
          <TouchableOpacity
            style={styles.featuredWrap}
            onPress={() => router.push(`/recipes/${featured.id}`)}
            activeOpacity={0.85}
          >
            <View style={styles.featuredFolioRow}>
              <Text style={typography.folioBold}>uitgelicht · 01</Text>
              <Text style={[typography.folio, { color: colors.textFaint }]}>nieuw deze week</Text>
            </View>

            {featured.imageUri ? (
              <Image source={{ uri: featured.imageUri }} style={styles.featuredImg} />
            ) : (
              <View style={[styles.featuredImg, styles.placeholder]} />
            )}

            {(() => {
              const { lead, tail } = splitTail(featured.title);
              return (
                <View style={styles.featuredTitleRow}>
                  <View style={{ flex: 1 }}>
                    <EditorialTitle lead={lead} tail={tail ? tail + '.' : ''} size={26} />
                  </View>
                  {getTotalCookingTime(featured.preparationTime, featured.cookingTime) > 0 ? (
                    <Text style={typography.folio}>
                      {getTotalCookingTime(featured.preparationTime, featured.cookingTime)} min
                    </Text>
                  ) : null}
                </View>
              );
            })()}

            <View style={styles.featuredMetaRow}>
              {featured.difficulty && (
                <DifficultyBadge difficulty={featured.difficulty} size="small" />
              )}
              {featured.category ? (
                <Text style={[typography.folio, { color: colors.textFaint }]}>
                  {featured.category.toLowerCase()}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[typography.bodyItalic, { textAlign: 'center' }]}>
              {filters.hasActiveFilters()
                ? 'Geen recepten gevonden met deze filters.'
                : activeCat === 'Alles'
                ? 'Nog geen recepten. Schrijf je eerste!'
                : `Geen recepten in "${activeCat}".`}
            </Text>
          </View>
        )}

        {/* De rest */}
        {grid.length > 0 && (
          <View style={styles.restHeader}>
            <RuleWithLabel label="de rest" bold />
          </View>
        )}

        {/* Grid */}
        <View style={styles.grid}>
          {grid.map((r, i) => {
            const { lead, tail } = splitTail(r.title);
            const tm = getTotalCookingTime(r.preparationTime, r.cookingTime);
            return (
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
                <View style={styles.gridFolio}>
                  <Text style={[typography.folio, { color: colors.textFaint }]}>
                    · {String(i + 1).padStart(2, '0')}
                  </Text>
                  {tm > 0 ? (
                    <Text style={[typography.folio, { color: colors.textFaint }]}>{tm}m</Text>
                  ) : null}
                </View>
                <Text style={styles.gridTitle} numberOfLines={2}>
                  {lead}{lead && tail ? ' ' : ''}
                  {tail ? (
                    <Text
                      style={{
                        fontFamily: fonts.displayItalic,
                        fontStyle: 'italic',
                        color: colors.primary,
                      }}
                    >
                      {tail}
                    </Text>
                  ) : null}
                </Text>
                {r.difficulty && (
                  <View style={{ marginTop: 4 }}>
                    <DifficultyBadge difficulty={r.difficulty} size="small" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  masthead: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  actionBtns: { flexDirection: 'row', gap: 6, paddingBottom: 4 },
  ghostBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stripWrap: { marginTop: spacing.lg },
  stripHead: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  stripRule: {
    flex: 1,
    height: 0.5,
    backgroundColor: colors.borderColor,
  },
  stripRow: {
    paddingHorizontal: spacing.lg,
    gap: 14,
  },
  bundleCell: { alignItems: 'center', gap: 6 },
  bundleFolio: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1.5,
    color: colors.textFaint,
  },
  bundleNew: {
    width: 84,
    height: 118,
    borderWidth: 0.5,
    borderStyle: 'dashed',
    borderColor: colors.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bundleNewPlus: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 26,
    color: colors.primary,
  },
  bundleNewLabel: {
    color: colors.primary,
    fontSize: 8,
  },

  newRecipeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    marginTop: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderColor,
  },
  newRecipeText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 15,
    color: colors.primary,
  },

  catsRow: {
    paddingHorizontal: spacing.lg,
    gap: 18,
    marginTop: spacing.md,
    paddingBottom: 4,
  },
  catItem: { paddingBottom: 4, marginRight: 18, alignItems: 'center' },
  catUnderline: { height: 1.5, width: '100%', backgroundColor: colors.primary, marginTop: 4 },

  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
  },
  chipActive: { backgroundColor: colors.textDark, borderColor: colors.textDark },
  chipText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textLight,
  },
  chipTextActive: { color: colors.background },

  featuredWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  featuredFolioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  featuredImg: { width: '100%', height: 180, backgroundColor: colors.backgroundLight },
  placeholder: { backgroundColor: colors.backgroundLight },
  featuredTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: spacing.sm,
  },
  featuredMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: spacing.sm,
  },

  emptyState: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },

  restHeader: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: GRID_GAP,
  },
  gridImg: { width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.backgroundLight },
  gridFolio: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  gridTitle: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.textDark,
    marginTop: 4,
    lineHeight: 18,
  },
});
