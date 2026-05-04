import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '../../../constants/Designsystem';
import { RECIPE_CATEGORIES, RecipeCategory } from '../../../types/recipe';

interface CategoryPickerProps {
  value: RecipeCategory;
  onChange: (category: RecipeCategory) => void;
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Categorie</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <TouchableOpacity
          style={[styles.chip, value === '' && styles.chipActive]}
          onPress={() => onChange('')}
          activeOpacity={0.75}
        >
          <Text style={[styles.chipText, value === '' && styles.chipTextActive]}>Geen</Text>
        </TouchableOpacity>
        {RECIPE_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, value === cat && styles.chipActive]}
            onPress={() => onChange(cat)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, value === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
});
