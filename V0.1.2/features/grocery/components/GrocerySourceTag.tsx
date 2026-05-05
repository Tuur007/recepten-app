import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/Designsystem';
import { SourceLineage } from '../../../types/grocery';

// Derived from design system tokens
const RECIPE_BG = 'rgba(194,73,42,0.08)';
const RECIPE_COLOR = colors.primary;
const MANUAL_BG = 'rgba(58,90,107,0.08)';
const MANUAL_COLOR = colors.info;

interface GrocerySourceTagProps {
  source: SourceLineage;
  onRemove?: (sourceId: string) => void;
}

export function GrocerySourceTag({ source, onRemove }: GrocerySourceTagProps) {
  const isManual = source.sourceType === 'manual';
  const label = `${source.quantity > 0 && source.quantity !== 1 ? `${source.quantity}× ` : ''}${source.sourceName}`;

  const tagColor = isManual ? MANUAL_COLOR : RECIPE_COLOR;
  const tagBg = isManual ? MANUAL_BG : RECIPE_BG;

  return (
    <View style={[styles.tag, { backgroundColor: tagBg, borderColor: tagColor }]}>
      <Ionicons
        name={isManual ? 'pencil-outline' : 'book-outline'}
        size={10}
        color={tagColor}
      />
      <Text style={[styles.label, { color: tagColor }]} numberOfLines={1}>
        {label}
      </Text>
      {onRemove ? (
        <TouchableOpacity onPress={() => onRemove(source.sourceId)} hitSlop={8}>
          <Ionicons name="close" size={10} color={tagColor} />
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
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.5,
    maxWidth: 160,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
  },
});
