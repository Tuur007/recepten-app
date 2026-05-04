import React from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecipes } from '../../features/recipes/hooks';
import { RecipeCard } from '../../features/recipes/components/RecipeCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/LoadingScreen';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { Colors } from '../../components/ui/colors';

export default function RecipesScreen() {
  const router = useRouter();
  const { recipes, isLoading, update } = useRecipes();

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
        <FlatList
          data={recipes}
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
            <EmptyState
              icon="📖"
              title="Nog geen recepten"
              message="Tik op de + knop om je eerste recept handmatig toe te voegen of te importeren via URL."
            />
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
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16, gap: 10, flexGrow: 1 },
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
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
