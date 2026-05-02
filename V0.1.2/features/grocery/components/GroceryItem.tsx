import React from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
    Alert.alert('Remove Item', `Remove "${item.name}" from the list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.row, item.checked && styles.checkedRow]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
        {item.checked ? (
          <Ionicons name="checkmark" size={14} color="#fff" />
        ) : null}
      </View>

      <View style={styles.content}>
        <Text style={[styles.name, item.checked && styles.checkedText]}>
          {item.quantity > 0 && item.quantity !== 1
            ? `${item.quantity} `
            : ''}
          {item.unit ? `${item.unit} ` : ''}
          {item.name}
        </Text>
        {origin ? (
          <Text style={styles.origin}>{origin}</Text>
        ) : null}
      </View>

      <TouchableOpacity onPress={handleDelete} hitSlop={8} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={16} color={Colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  checkedRow: { opacity: 0.6 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  content: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '500', color: Colors.text },
  checkedText: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  origin: { fontSize: 12, color: Colors.textSecondary },
  deleteBtn: { padding: 4 },
});
