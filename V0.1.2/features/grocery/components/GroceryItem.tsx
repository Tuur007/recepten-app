import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../components/ui/colors';
import { GroceryItem as GroceryItemType } from '../../../types/grocery';
import { formatItemOrigin } from '../../../utils/merge';

interface GroceryItemProps {
  item: GroceryItemType;
  onToggle: () => void;
  onDelete: () => void;
}

export function GroceryItem({ item, onToggle, onDelete }: GroceryItemProps) {
  const origin = formatItemOrigin(item);

  const handleDelete = () => {
    Alert.alert('Item verwijderen', `"${item.name}" verwijderen uit de lijst?`, [
      { text: 'Annuleer', style: 'cancel' },
      { text: 'Verwijder', style: 'destructive', onPress: onDelete },
    ]);
  };

  const quantityLabel =
    item.totalQuantity > 0 && item.totalQuantity !== 1 ? `${item.totalQuantity} ` : '';

  return (
    <View style={[styles.row, item.checked && styles.checkedRow]}>
      {/* Only the checkbox triggers toggle */}
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        hitSlop={8}
        style={[styles.checkbox, item.checked && styles.checkboxChecked]}
      >
        {item.checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.name, item.checked && styles.checkedText]}>
          {quantityLabel}
          {item.unit ? `${item.unit} ` : ''}
          {item.name}
        </Text>
        {origin ? <Text style={styles.origin}>{origin}</Text> : null}
      </View>

      <TouchableOpacity onPress={handleDelete} hitSlop={8} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={16} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  checkedRow: { opacity: 0.55 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  content: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '500', color: Colors.text },
  checkedText: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  origin: { fontSize: 12, color: Colors.textSecondary },
  deleteBtn: { padding: 4 },
});
