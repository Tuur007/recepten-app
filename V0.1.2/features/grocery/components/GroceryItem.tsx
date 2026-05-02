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
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        hitSlop={10}
        style={[styles.checkbox, item.checked && styles.checkboxChecked]}
      >
        {item.checked ? (
          <Ionicons name="checkmark" size={14} color="#fff" />
        ) : null}
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.name, item.checked && styles.checkedText]}>
          {quantityLabel}
          {item.unit ? `${item.unit} ` : ''}
          {item.name}
        </Text>
        {origin ? <Text style={styles.origin}>{origin}</Text> : null}
      </View>

      <TouchableOpacity onPress={handleDelete} hitSlop={10} style={styles.deleteBtn}>
        <Text style={styles.deleteIcon}>×</Text>
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  checkedRow: { opacity: 0.55 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: { 
    backgroundColor: Colors.green, 
    borderColor: Colors.green 
  },
  content: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '500', color: Colors.text },
  checkedText: { 
    textDecorationLine: 'line-through', 
    color: Colors.textSecondary 
  },
  origin: { fontSize: 12, color: Colors.textSecondary },
  deleteBtn: { 
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 20,
    color: Colors.textSecondary,
    fontWeight: '300',
  },
});
