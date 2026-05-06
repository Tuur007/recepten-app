import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useCategories } from '../../store/categoriesStore';
import { Category } from '../../features/categories/repository';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';

export default function SettingsScreen() {
  const {
    recipeCategories,
    groceryCategories,
    addRecipeCategory,
    addGroceryCategory,
    updateCategory,
    removeCategory,
  } = useCategories();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [addingType, setAddingType] = useState<'recipe' | 'grocery' | null>(null);
  const [newName, setNewName] = useState('');
  const newInputRef = useRef<TextInput>(null);

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setAddingType(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null);
      return;
    }
    await updateCategory(editingId, editingName.trim());
    setEditingId(null);
    setEditingName('');
  };

  const confirmDelete = (cat: Category) => {
    Alert.alert(
      'Categorie verwijderen',
      `Weet je zeker dat je "${cat.name}" wilt verwijderen?`,
      [
        { text: 'Annuleren', style: 'cancel' },
        { text: 'Verwijderen', style: 'destructive', onPress: () => removeCategory(cat.id) },
      ],
    );
  };

  const startAdd = (type: 'recipe' | 'grocery') => {
    setAddingType(type);
    setNewName('');
    setEditingId(null);
    setTimeout(() => newInputRef.current?.focus(), 100);
  };

  const saveNew = async () => {
    if (!newName.trim() || !addingType) {
      setAddingType(null);
      return;
    }
    if (addingType === 'recipe') {
      await addRecipeCategory(newName.trim());
    } else {
      await addGroceryCategory(newName.trim());
    }
    setNewName('');
    setAddingType(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Folio */}
        <View style={styles.folio}>
          <Text style={typography.folio}>instellingen</Text>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={[typography.hero32Bold, { fontSize: 38 }]}>Meer</Text>
          <Text style={[typography.heroItalic, { fontSize: 38 }]}>opties.</Text>
        </View>

        {/* Section: Receptcategorieën */}
        <SectionHeader title="Receptcategorieën" />
        {recipeCategories.map((cat) => (
          <CategoryRow
            key={cat.id}
            cat={cat}
            isEditing={editingId === cat.id}
            editValue={editingName}
            onEditChange={setEditingName}
            onEditSubmit={saveEdit}
            onEditStart={() => startEdit(cat)}
            onDelete={() => confirmDelete(cat)}
          />
        ))}
        {addingType === 'recipe' ? (
          <AddRow
            inputRef={newInputRef}
            value={newName}
            onChange={setNewName}
            onSubmit={saveNew}
            onCancel={() => setAddingType(null)}
          />
        ) : (
          <AddButton onPress={() => startAdd('recipe')} />
        )}

        {/* Section: Boodschappencategorieën */}
        <SectionHeader title="Boodschappencategorieën" />
        {groceryCategories.map((cat) => (
          <CategoryRow
            key={cat.id}
            cat={cat}
            isEditing={editingId === cat.id}
            editValue={editingName}
            onEditChange={setEditingName}
            onEditSubmit={saveEdit}
            onEditStart={() => startEdit(cat)}
            onDelete={() => confirmDelete(cat)}
          />
        ))}
        {addingType === 'grocery' ? (
          <AddRow
            inputRef={newInputRef}
            value={newName}
            onChange={setNewName}
            onSubmit={saveNew}
            onCancel={() => setAddingType(null)}
          />
        ) : (
          <AddButton onPress={() => startAdd('grocery')} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={typography.folioBold}>{title}</Text>
      <View style={styles.rule} />
    </View>
  );
}

interface CategoryRowProps {
  cat: Category;
  isEditing: boolean;
  editValue: string;
  onEditChange: (v: string) => void;
  onEditSubmit: () => void;
  onEditStart: () => void;
  onDelete: () => void;
}

function CategoryRow({
  cat,
  isEditing,
  editValue,
  onEditChange,
  onEditSubmit,
  onEditStart,
  onDelete,
}: CategoryRowProps) {
  return (
    <View style={styles.catRow}>
      {isEditing ? (
        <TextInput
          style={styles.catInput}
          value={editValue}
          onChangeText={onEditChange}
          onSubmitEditing={onEditSubmit}
          onBlur={onEditSubmit}
          autoFocus
          returnKeyType="done"
        />
      ) : (
        <Text style={styles.catName}>{cat.name}</Text>
      )}
      <View style={styles.catActions}>
        <TouchableOpacity onPress={onEditStart} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="pencil-outline" size={16} color={colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={16} color={colors.textLight} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface AddRowProps {
  inputRef: React.RefObject<TextInput>;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function AddRow({ inputRef, value, onChange, onSubmit, onCancel }: AddRowProps) {
  return (
    <View style={styles.catRow}>
      <TextInput
        ref={inputRef}
        style={styles.catInput}
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        placeholder="Nieuwe categorie..."
        placeholderTextColor={colors.textFaint}
        returnKeyType="done"
        autoFocus
      />
      <View style={styles.catActions}>
        <TouchableOpacity onPress={onSubmit} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="checkmark" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="close" size={18} color={colors.textLight} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.addRow} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="add" size={16} color={colors.primary} />
      <Text style={styles.addText}>Voeg categorie toe</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  folio: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  titleBlock: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  rule: { flex: 1, height: 1, backgroundColor: colors.borderColor },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  catName: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textDark,
  },
  catInput: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textDark,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  catActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    padding: 8,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  addText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 14,
    color: colors.primary,
  },
});
