import React, { useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { Colors } from '../../components/ui/colors';
import { RECIPE_CATEGORIES, RecipeCategory } from '../../types/recipe';

type FilterTab = 'all' | 'favorites' | RecipeCategory;

export default function RecipesScreen() {
  const router = useRouter();
  const { recipes, isLoading, update } = useRecipes();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const handleFab = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuleer', 'Handmatig toevoegen', 'Importeren via URL'],
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
        { text: 'Importeren via URL', onPress: () => router.push('/recipes/import') },
        { text: 'Annuleer', style: 'cancel' },
      ]);
    }
  };

  const handleToggleFavorite = async (id: string, current: boolean) => {
    await update(id, { isFavorite: !current });
  };

  const usedCategories = useMemo(() => {
    const cats = new Set(recipes.map((r) => r.category).filter(Boolean));
    return RECIPE_CATEGORIES.filter((c) => cats.has(c));
  }, [recipes]);

  const filtered = useMemo(() => {
    let list = recipes;

    if (activeTab === 'favorites') {
      list = list.filter((r) => r.isFavorite);
    } else if (activeTab !== 'all') {
      list = list.filter((r) => r.category === activeTab);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.ingredients.some((i) => i.name.toLowerCase().includes(query)),
      );
    }

    return list;
  }, [recipes, activeTab, searchQuery]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Alles' },
    { key: 'favorites', label: '❤️ Favorieten' },
    ...usedCategories.map((c) => ({ key: c as FilterTab, label: c })),
  ];

  if (isLoading) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with search */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Recepten</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="search-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="sunny-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Zoek recepten..."
            placeholderTextColor={Colors.textSecondary}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      {(usedCategories.length > 0 || recipes.some((r) => r.isFavorite)) ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
          style={styles.chipsScroll}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.chip,
                activeTab === tab.key && styles.chipActive,
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, activeTab === tab.key && styles.chipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      {/* Grid */}
      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <RecipeCard
              recipe={item}
              onPress={() => router.push(`/recipes/${item.id}`)}
              onToggleFavorite={() => handleToggleFavorite(item.id, item.isFavorite)}
            />
          </View>
        )}
        ListEmptyComponent={
          searchQuery || activeTab !== 'all' ? (
            <EmptyState
              icon="🔍"
              title="Geen resultaten"
              message="Pas je zoekopdracht of filter aan."
            />
          ) : (
            <EmptyState
              icon="📖"
              title="Nog geen recepten"
              message="Tap de + knop om je eerste recept toe te voegen."
            />
          )
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleFab} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: Colors.text,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },

  chipsScroll: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  chipsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: Colors.textSecondary 
  },
  chipTextActive: { color: '#fff' },

  gridContent: { 
    padding: 12, 
    paddingBottom: 80,
  },
  gridRow: {
    gap: 12,
  },
  gridItem: {
    flex: 1,
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});