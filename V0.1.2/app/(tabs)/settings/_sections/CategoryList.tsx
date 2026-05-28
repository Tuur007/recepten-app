import React from 'react';
import { Text, View, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../../../../features/categories/repository';
import { colors } from '../../../../constants/Designsystem';
import { styles } from '../styles';

// Inline category list (sub-content of the "onze recepten" rows).
export function CategoryList({
  items,
  editingId,
  editingName,
  addingHere,
  newName,
  newInputRef,
  onEditStart,
  onEditChange,
  onEditSubmit,
  onDelete,
  onAddStart,
  onAddChange,
  onAddSubmit,
  onAddCancel,
}: {
  items: Category[];
  editingId: string | null;
  editingName: string;
  addingHere: boolean;
  newName: string;
  newInputRef: React.RefObject<TextInput>;
  onEditStart: (cat: Category) => void;
  onEditChange: (v: string) => void;
  onEditSubmit: () => void;
  onDelete: (cat: Category) => void;
  onAddStart: () => void;
  onAddChange: (v: string) => void;
  onAddSubmit: () => void;
  onAddCancel: () => void;
}) {
  return (
    <View style={styles.subList}>
      {items.map((cat) => (
        <View key={cat.id} style={styles.catRow}>
          {editingId === cat.id ? (
            <TextInput
              style={styles.catInput}
              value={editingName}
              onChangeText={onEditChange}
              onSubmitEditing={onEditSubmit}
              onBlur={onEditSubmit}
              autoFocus
              returnKeyType="done"
            />
          ) : (
            <Text style={styles.catName}>{cat.name}</Text>
          )}
          <TouchableOpacity onPress={() => onEditStart(cat)} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="pencil-outline" size={14} color={colors.textFaint} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(cat)} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={14} color={colors.textFaint} />
          </TouchableOpacity>
        </View>
      ))}
      {addingHere ? (
        <View style={styles.catRow}>
          <TextInput
            ref={newInputRef}
            style={styles.catInput}
            value={newName}
            onChangeText={onAddChange}
            onSubmitEditing={onAddSubmit}
            placeholder="Nieuwe categorie…"
            placeholderTextColor={colors.textFaint}
            returnKeyType="done"
            autoFocus
          />
          <TouchableOpacity onPress={onAddSubmit} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="checkmark" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onAddCancel} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="close" size={16} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={onAddStart} style={styles.addBtn} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
          <Text style={styles.addBtnLabel}>categorie toevoegen</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
