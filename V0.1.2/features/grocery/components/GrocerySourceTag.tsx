import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../components/ui/colors';
import { SourceLineage } from '../../../types/grocery';

interface GrocerySourceTagProps {
  source: SourceLineage;
  onRemove?: (sourceId: string) => void;
}

export function GrocerySourceTag({ source, onRemove }: GrocerySourceTagProps) {
  const isManual = source.sourceType === 'manual';
  const label = `${source.quantity > 0 && source.quantity !== 1 ? `${source.quantity}× ` : ''}${source.sourceName}`;

  return (
    <View style={[styles.tag, isManual && styles.tagManual]}>
      <Ionicons
        name={isManual ? 'pencil-outline' : 'book-outline'}
        size={10}
        color={isManual ? Colors.blue : Colors.accent}
      />
      <Text style={[styles.label, isManual && styles.labelManual]} numberOfLines={1}>
        {label}
      </Text>
      {onRemove ? (
        <TouchableOpacity onPress={() => onRemove(source.sourceId)} hitSlop={8}>
          <Ionicons name="close" size={10} color={isManual ? Colors.blue : Colors.accent} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentLight,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: Colors.accent,
    maxWidth: 160,
  },
  tagManual: {
    backgroundColor: Colors.blueLight,
    borderColor: Colors.blue,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.accent,
    flexShrink: 1,
  },
  labelManual: {
    color: Colors.blue,
  },
});
