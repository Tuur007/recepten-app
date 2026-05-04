import React, { useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecipes } from '../../features/recipes/hooks';
import { RecipeCard } from '../../features/recipes/components/RecipeCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/LoadingScreen';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { colors, spacing, shadows } from '../../constants/Designsystem'; // ✅ FIXED
import { RecipeCategory } from '../../types/recipe';

export default function RecipesScreen() {
  const router = useRouter();
  const { recipes, isLoading, update } = useRecipes();
  const [activeCategory, setActiveCategory] = useState<RecipeCategory | ''>('');

  const availableCategories = useMemo<RecipeCategory[]>(() => {
    const seen = new Set<RecipeCategory>();
    for (const r of recipes) {
      if (r.category) seen.add(r.category);
    }
    return Array.from(seen);
  }, [recipes]);

  const filteredRecipes = useMemo(
    () => (activeCategory ? recipes.filter((r) => r.category === activeCategory) : recipes),
    [recipes, activeCategory],
  );

  const handleFab = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuleer', 'Handmatig toevoegen', 'Importeer via URL'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) router.push('/recipes/new');
          if (index === 2) router.push('/recipes/import');
        },
      );
    } else {
      Alert.alert('Recept toevoegen', undefined, [
        { text: 'Handmatig toevoegen', onPress: () => router.push('/recipes/new') },
        { text: 'Importeer via URL', onPress: () => router.push('/recipes/import') },
        { text: 'Annuleer', style: 'cancel' },
      ]);
    }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {availableCategories.length > 0 && (
          <View style={styles.filterBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              <TouchableOpacity
                style={[styles.chip, !activeCategory && styles.chipActive]}
                onPress={() => setActiveCategory('')}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, !activeCategory && styles.chipTextActive]}>
                  Alles
                </Text>
              </TouchableOpacity>

              {availableCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, activeCategory === cat && styles.chipActive]}
                  onPress={() => setActiveCategory(activeCategory === cat ? '' : cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <FlatList
          data={filteredRecipes}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() => router.push(`/recipes/${item.id}`)}
              onToggleFavorite={() => update(item.id, { isFavorite: !item.isFavorite })}
            />
          )}
          ListEmptyComponent={
            activeCategory ? (
              <EmptyState
                icon="🔍"
                title={`Geen ${activeCategory} recepten`}
                message="Er zijn nog geen recepten in deze categorie."
              />
            ) : (
              <EmptyState
                icon="📖"
                title="Nog geen recepten"
                message="Tik op de + knop om je eerste recept handmatig toe te voegen of te importeren via URL."
              />
            )
          }
        />

        <TouchableOpacity style={styles.fab} onPress={handleFab} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background, // ✅ WARM CREAM #FEF9E7
  },

  filterBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  chipActive: {
    backgroundColor: colors.primary, // ✅ ORANGE #FF6B35
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textLight,
  },
  chipTextActive: {
    color: '#fff',
  },

  list: { 
    padding: spacing.md, 
    gap: spacing.sm, 
    flexGrow: 1 
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary, // ✅ ORANGE
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
});
