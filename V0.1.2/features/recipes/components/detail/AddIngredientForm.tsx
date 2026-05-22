import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, spacing } from '../../../../constants/Designsystem';
import { generateId } from '../../../../utils/id';
import type { Ingredient } from '../../../../types/recipe';

interface Props {
  onAdd: (ingredient: Ingredient) => Promise<void> | void;
}

export function AddIngredientForm({ onAdd }: Props) {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');

  const reset = () => {
    setName('');
    setQty('');
    setUnit('');
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    await onAdd({
      id: generateId(),
      name: name.trim(),
      quantity: parseFloat(qty) || 0,
      unit: unit.trim(),
    });
    reset();
    setVisible(false);
  };

  if (!visible) {
    return (
      <TouchableOpacity style={styles.btn} onPress={() => setVisible(true)}>
        <Ionicons name="add" size={14} color={colors.primary} />
        <Text style={styles.btnText}>ingrediënt toevoegen</Text>
      </TouchableOpacity>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.form}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder="Naam"
          placeholderTextColor={colors.textFaint}
          value={name}
          onChangeText={setName}
          autoFocus
        />
        <TextInput
          style={[styles.input, { width: 56 }]}
          placeholder="Aantal"
          placeholderTextColor={colors.textFaint}
          value={qty}
          onChangeText={setQty}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[styles.input, { width: 64 }]}
          placeholder="Eenheid"
          placeholderTextColor={colors.textFaint}
          value={unit}
          onChangeText={setUnit}
        />
        <TouchableOpacity onPress={handleSave} hitSlop={6}>
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            reset();
            setVisible(false);
          }}
          hitSlop={6}
        >
          <Ionicons name="close-circle-outline" size={22} color={colors.textLight} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm },
  btnText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.primary,
  },
  form: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderSoft,
  },
  input: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.textDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
});
