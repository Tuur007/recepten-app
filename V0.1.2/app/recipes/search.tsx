/**
 * FIX 1: ZOEKFUNCTIE RECEPTEN
 * 
 * Nieuw bestand: V0.1.2/app/recipes/search.tsx
 * 
 * PROBLEEM: Zoekknop werkt niet (onPress is leeg)
 * OPLOSSING: Maak search screen met filter op title + kategorie
 */

import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useRecipes } from '../../features/recipes/hooks';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';

const { width } = Dimensions.get('window');
const GRID_GAP = 18;
const GRID_PAD = spacing.lg;
const GRID_W = (width - GRID_PAD * 2 - GRID_GAP) / 2;

export default function RecipeSearchScreen() {
  const router = useRouter();
  const { recipes } = useRecipes();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return recipes;
    const q = query.toLowerCase();
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q)
    );
  }, [query, recipes]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.textDark} />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Zoeken in recepten…"
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.textLight} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={colors.textFaint} />
            <Text style={styles.emptyText}>Geen recepten gevonden</Text>
          </View>
        ) : (
          <>
            <View style={styles.resultInfo}>
              <Text style={typography.label12}>
                {filtered.length} recept{filtered.length !== 1 ? 'en' : ''}
              </Text>
            </View>
            <View style={styles.grid}>
              {filtered.map((r) => (
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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textDark,
    paddingVertical: 8,
  },
  resultInfo: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: GRID_GAP,
    marginTop: spacing.md,
  },
  gridImg: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: colors.backgroundLight,
  },
  placeholder: { backgroundColor: colors.backgroundLight },
  gridTitle: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.textDark,
    marginTop: 6,
    lineHeight: 18,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textLight,
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
  },
});
