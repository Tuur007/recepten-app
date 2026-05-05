import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/Designsystem';

interface StepInputProps {
  index: number;
  value: string;
  onChange: (text: string) => void;
  onRemove: () => void;
}

export function StepInput({ index, value, onChange, onRemove }: StepInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.row}>
      <Text style={styles.stepNumber}>{index + 1}.</Text>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        placeholder={`Stap ${index + 1}`}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline
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
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 6,
    minWidth: 20,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  inputFocused: {
    color: colors.text,
  },
  removeBtn: {
    padding: 4,
    marginTop: 2,
  },
});
