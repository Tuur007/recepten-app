/**
 * 🎨 RECEPTEN ARCHIEF — magazine browse
 *
 * Vervang: V0.1.2/app/(tabs)/recipes.tsx
 */

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
import { LoadingScreen } from '../../components/LoadingScreen';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';

const PAPER = colors.background;
const { width } = Dimensions.get('window');
const GRID_GAP = 18;
const GRID_PAD = spacing.lg;
const GRID_W = (width - GRID_PAD * 2 - GRID_GAP) / 2;

const CATS = ['Alles', 'Pasta', 'Soep', 'Vis', 'Vlees', 'Snel', 'Vegetarisch', 'Dessert'];

export default function RecipesScreen() {
  const router = useRouter();
  const { recipes, isLoading } = useRecipes();
  const [activeCat, setActiveCat] = useState('Alles');

  const featured = recipes[0];
  const grid = useMemo(() => recipes.slice(1), [recipes]);

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Folio */}
        <View style={styles.folio}>
          <Text style={typography.folio}>p. 1</Text>
          <Text style={typography.folio}>recepten · {recipes.length}</Text>
        </View>

        {/* Title + search */}
        <View style={styles.titleRow}>
          <View>
            <Text style={[typography.hero32Bold, { fontSize: 38 }]}>Het</Text>
            <Text style={[typography.heroItalic, { fontSize: 38 }]}>archief.</Text>
          </View>
          <TouchableOpacity style={styles.searchBtn} activeOpacity={0.7}>
            <Ionicons name="search" size={18} color={colors.textDark} />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catsRow}
        >
          {CATS.map((c) => {
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

        {/* Featured */}
        {featured && (
          <TouchableOpacity
            style={styles.featuredWrap}
            onPress={() => router.push(`/recipes/${featured.id}`)}
            activeOpacity={0.85}
          >
            <Text style={[typography.folio, { marginBottom: 8 }]}>uitgelicht · 02</Text>
            {featured.imageUri ? (
              <Image source={{ uri: featured.imageUri }} style={styles.featuredImg} />
            ) : (
              <View style={[styles.featuredImg, styles.placeholder]} />
            )}
            <View style={styles.featuredMeta}>
              <Text style={[typography.title20, { fontSize: 22 }]}>{featured.title}</Text>
              <Text style={typography.label12}>
                {featured.totalTime ?? 60} min
              </Text>
            </View>
            {featured.category && (
              <Text style={[typography.bodyItalic, { fontSize: 12, marginTop: 2 }]}>
                {featured.category}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* "De rest" header */}
        <View style={styles.restHeader}>
          <Text style={typography.folioBold}>de rest</Text>
          <View style={styles.rule} />
        </View>

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
              {r.category && (
                <Text style={[typography.label12, { marginTop: 2, fontSize: 8 }]}>
                  {r.category}
                </Text>
              )}
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
  searchBtn: {
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
    lineHeight: 18,
  },
});
