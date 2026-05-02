import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../components/ui/colors';
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
        placeholderTextColor={Colors.textSecondary}
        keyboardType="decimal-pad"
      />
      <TextInput
        style={[styles.input, styles.unitInput]}
        value={ingredient.unit}
        onChangeText={(text) => onChange({ ...ingredient, unit: text })}
        placeholder="Eenheid"
        placeholderTextColor={Colors.textSecondary}
        autoCapitalize="none"
      />
      <TextInput
        style={[styles.input, styles.nameInput]}
        value={ingredient.name}
        onChangeText={(text) => onChange({ ...ingredient, name: text })}
        placeholder="Ingrediëntnaam"
        placeholderTextColor={Colors.textSecondary}
      />
      <TouchableOpacity onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
        <Ionicons name="close-circle" size={20} color={Colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    color: Colors.text,
    minHeight: 42,
  },
  quantityInput: { width: 56 },
  unitInput: { width: 76 },
  nameInput: { flex: 1 },
  removeBtn: { padding: 2 },
});
