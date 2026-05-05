import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/Designsystem';
import { Ingredient } from '../../../types/recipe';

interface IngredientInputProps {
  ingredient: Ingredient;
  onChange: (ingredient: Ingredient) => void;
  onRemove: () => void;
}

export function IngredientInput({ ingredient, onChange, onRemove }: IngredientInputProps) {
  const [focused, setFocused] = useState<'name' | 'quantity' | 'unit' | null>(null);

  return (
    <View style={styles.row}>
      <TextInput
        style={[styles.input, styles.nameInput, focused === 'name' && styles.inputFocused]}
        placeholder="Ingrediënt"
        value={ingredient.name}
        onChangeText={(name) => onChange({ ...ingredient, name })}
        onFocus={() => setFocused('name')}
        onBlur={() => setFocused(null)}
        placeholderTextColor={colors.textSecondary}
      />
      <TextInput
        style={[styles.input, styles.quantityInput, focused === 'quantity' && styles.inputFocused]}
        placeholder="Hoeveelheid"
        value={ingredient.quantity?.toString() ?? ''}
        onChangeText={(text) =>
          onChange({ ...ingredient, quantity: text ? parseFloat(text) : 0 })
        }
        onFocus={() => setFocused('quantity')}
        onBlur={() => setFocused(null)}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.textSecondary}
      />
      <TextInput
        style={[styles.input, styles.unitInput, focused === 'unit' && styles.inputFocused]}
        placeholder="Eenheid"
        value={ingredient.unit}
        onChangeText={(unit) => onChange({ ...ingredient, unit })}
        onFocus={() => setFocused('unit')}
        onBlur={() => setFocused(null)}
        placeholderTextColor={colors.textSecondary}
      />
      <TouchableOpacity onPress={onRemove} hitSlop={10} style={styles.removeBtn}>
        <Ionicons name="close-circle" size={20} color={colors.error} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    fontSize: 13,
    color: colors.text,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  inputFocused: {
    color: colors.text,
  },
  nameInput: {
    flex: 2,
  },
  quantityInput: {
    flex: 1,
  },
  unitInput: {
    flex: 1,
  },
  removeBtn: {
    padding: 4,
  },
});
