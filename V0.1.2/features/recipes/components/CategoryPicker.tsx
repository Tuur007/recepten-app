import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/Designsystem';
import { RECIPE_CATEGORIES, RecipeCategory } from '../../../types/recipe';

const CATEGORIES: RecipeCategory[] = [...RECIPE_CATEGORIES];

interface CategoryPickerProps {
  value: RecipeCategory | '';
  onChange: (category: RecipeCategory | '') => void;
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Categorie</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, value === cat && styles.chipActive]}
            onPress={() => onChange(value === cat ? '' : cat)}
          >
            <Text style={[styles.chipText, value === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginVertical: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scroll: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
  },
});
