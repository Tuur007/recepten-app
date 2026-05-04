import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../../constants/Designsystem';
import { GroceryItem as GroceryItemType } from '../../../types/grocery';
import { GrocerySourceTag } from './GrocerySourceTag';

interface GroceryItemProps {
  item: GroceryItemType;
  onToggle: () => void;
  onDelete: () => void;
  onRemoveSource?: (sourceId: string) => void;
}

export function GroceryItem({ item, onToggle, onDelete, onRemoveSource }: GroceryItemProps) {
  const [expanded, setExpanded] = useState(false);

  const handleDelete = () => {
    Alert.alert('Item verwijderen', `"${item.name}" verwijderen uit de lijst?`, [
      { text: 'Annuleer', style: 'cancel' },
      { text: 'Verwijder', style: 'destructive', onPress: onDelete },
    ]);
  };

  const quantityLabel =
    item.totalQuantity > 0 && item.totalQuantity !== 1 ? `${item.totalQuantity} ` : '';

  const hasMultipleSources = item.sources.length > 1;

  return (
    <View style={[styles.row, item.checked && styles.checkedRow]}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        hitSlop={10}
        style={[styles.checkbox, item.checked && styles.checkboxChecked]}
      >
        {item.checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.content}
        onPress={() => hasMultipleSources && setExpanded((v) => !v)}
        activeOpacity={hasMultipleSources ? 0.7 : 1}
      >
        <View style={styles.nameRow}>
          <Text style={[styles.name, item.checked && styles.checkedText]} numberOfLines={1}>
            {quantityLabel}
            {item.unit ? `${item.unit} ` : ''}
            {item.name}
          </Text>
          {hasMultipleSources ? (
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={colors.textSecondary}
            />
          ) : null}
        </View>

        {item.sources.length > 0 ? (
          <View style={styles.sources}>
            {(expanded ? item.sources : item.sources.slice(0, 2)).map((source) => (
              <GrocerySourceTag
                key={source.sourceId}
                source={source}
                onRemove={onRemoveSource}
              />
            ))}
            {!expanded && item.sources.length > 2 ? (
              <Text style={styles.moreLabel}>+{item.sources.length - 2}</Text>
            ) : null}
          </View>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleDelete} hitSlop={10} style={styles.deleteBtn}>
        <Text style={styles.deleteIcon}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  checkedRow: { opacity: 0.55 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  content: { flex: 1, gap: 6 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: { fontSize: 15, fontWeight: '500', color: colors.text, flex: 1 },
  checkedText: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  sources: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  moreLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    alignSelf: 'center',
  },
  deleteBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -2,
  },
  deleteIcon: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: '300',
  },
});
