import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../../constants/Designsystem';
import { Ingredient } from '../../../types/recipe';

interface IngredientInputProps {
  ingredient: Ingredient;
  onChange: (updated: Ingredient) => void;
  onRemove: () => void;
}

export function IngredientInput({ ingredient, onChange, onRemove }: IngredientInputProps) {
  return (
    <View style={styles.row}>
      <TextInput
        style={[styles.input, styles.quantityInput]}
        value={ingredient.quantity > 0 ? String(ingredient.quantity) : ''}
        onChangeText={(text) => onChange({ ...ingredient, quantity: parseFloat(text) || 0 })}
        placeholder="Hv."
        placeholderTextColor={colors.textSecondary}
        keyboardType="decimal-pad"
      />
      <TextInput
        style={[styles.input, styles.unitInput]}
        value={ingredient.unit}
        onChangeText={(text) => onChange({ ...ingredient, unit: text })}
        placeholder="Eenheid"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
      />
      <TextInput
        style={[styles.input, styles.nameInput]}
        value={ingredient.name}
        onChangeText={(text) => onChange({ ...ingredient, name: text })}
        placeholder="Ingrediëntnaam"
        placeholderTextColor={colors.textSecondary}
      />
      <TouchableOpacity onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
        <Ionicons name="close-circle" size={20} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.text,
    minHeight: 42,
  },
  quantityInput: { width: 56 },
  unitInput: { width: 76 },
  nameInput: { flex: 1 },
  removeBtn: { padding: 2 },
});
