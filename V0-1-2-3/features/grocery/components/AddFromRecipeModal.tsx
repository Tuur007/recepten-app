import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../components/ui/colors';
import { Button } from '../../../components/ui/Button';
import { Recipe } from '../../../types/recipe';

interface AddFromRecipeModalProps {
  visible: boolean;
  recipes: Recipe[];
  onConfirm: (recipe: Recipe) => void;
  onClose: () => void;
}

export function AddFromRecipeModal({ visible, recipes, onConfirm, onClose }: AddFromRecipeModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleConfirm = () => {
    const recipe = recipes.find((r) => r.id === selected);
    if (recipe) {
      onConfirm(recipe);
      setSelected(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Van recept toevoegen</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          Ingrediënten worden samengevoegd met je huidige boodschappenlijst.
        </Text>

        <FlatList
          data={recipes}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.recipeRow, selected === item.id && styles.selectedRow]}
              onPress={() => setSelected(item.id === selected ? null : item.id)}
              activeOpacity={0.75}
            >
              <View style={styles.recipeInfo}>
                <Text style={styles.recipeName}>{item.title}</Text>
                <View style={styles.recipeMeta}>
                  {item.category ? (
                    <View style={styles.catBadge}>
                      <Text style={styles.catBadgeText}>{item.category}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.recipeMetaText}>
                    {item.ingredients.length} ingrediënt{item.ingredients.length !== 1 ? 'en' : ''}
                  </Text>
                </View>
              </View>
              {selected === item.id ? (
                <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
              ) : (
                <View style={styles.unselected} />
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Nog geen recepten. Voeg eerst een recept toe.</Text>
          }
        />

        <View style={styles.footer}>
          <Button
            label="Ingrediënten toevoegen"
            onPress={handleConfirm}
            disabled={!selected}
            fullWidth
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  selectedRow: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  recipeInfo: { flex: 1, gap: 4 },
  recipeName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recipeMetaText: { fontSize: 13, color: Colors.textSecondary },
  catBadge: {
    backgroundColor: Colors.accentLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  catBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.accent },
  unselected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 40,
    fontSize: 14,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
});
