import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../components/ui/colors';

interface StepInputProps {
  index: number;
  value: string;
  onChange: (text: string) => void;
  onRemove: () => void;
}

export function StepInput({ index, value, onChange, onRemove }: StepInputProps) {
  return (
    <View style={styles.row}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{index + 1}</Text>
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={`Stap ${index + 1}…`}
        placeholderTextColor={Colors.textSecondary}
        multiline
        textAlignVertical="top"
      />
      <TouchableOpacity onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
        <Ionicons name="close-circle" size={20} color={Colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 7,
    flexShrink: 0,
  },
  stepNumberText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    minHeight: 64,
  },
  removeBtn: { padding: 2, marginTop: 7 },
});
