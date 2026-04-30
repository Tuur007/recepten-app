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
        onChangeText={(text) =>
          onChange({ ...ingredient, quantity: parseFloat(text) || 0 })
        }
        placeholder="Qty"
        placeholderTextColor={Colors.textSecondary}
        keyboardType="decimal-pad"
      />
      <TextInput
        style={[styles.input, styles.unitInput]}
        value={ingredient.unit}
        onChangeText={(text) => onChange({ ...ingredient, unit: text })}
        placeholder="Unit"
        placeholderTextColor={Colors.textSecondary}
        autoCapitalize="none"
      />
      <TextInput
        style={[styles.input, styles.nameInput]}
        value={ingredient.name}
        onChangeText={(text) => onChange({ ...ingredient, name: text })}
        placeholder="Ingredient name"
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
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
    minHeight: 40,
  },
  quantityInput: { width: 58 },
  unitInput: { width: 72 },
  nameInput: { flex: 1 },
  removeBtn: { padding: 2 },
});
