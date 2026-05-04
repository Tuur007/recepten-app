import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/Designsystem';
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
        color={isManual ? colors.blue : colors.accent}
      />
      <Text style={[styles.label, isManual && styles.labelManual]} numberOfLines={1}>
        {label}
      </Text>
      {onRemove ? (
        <TouchableOpacity onPress={() => onRemove(source.sourceId)} hitSlop={8}>
          <Ionicons name="close" size={10} color={isManual ? colors.blue : colors.accent} />
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
    backgroundColor: colors.accentLight,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: colors.accent,
    maxWidth: 160,
  },
  tagManual: {
    backgroundColor: colors.blueLight,
    borderColor: colors.blue,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.accent,
    flexShrink: 1,
  },
  labelManual: {
    color: colors.blue,
  },
});
