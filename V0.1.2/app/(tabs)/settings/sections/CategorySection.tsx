import { useRef, useState } from 'react';
import { View, TextInput, Alert } from 'react-native';

import { useCategories } from '../../../../store/categoriesStore';
import { Category } from '../../../../features/categories/repository';
import { RuleWithLabel } from '../../../../components/ui/EditorialBits';
import { styles } from '../styles';
import { Row } from './Row';
import { CategoryList } from './CategoryList';

export function CategorySection({
  expanded,
  onToggle,
}: {
  expanded: string | null;
  onToggle: (key: string) => void;
}) {
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
    Alert.alert('Verwijderen', `"${cat.name}" verwijderen?`, [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: () => {
          removeCategory(cat.id).catch(() => {});
        },
      },
    ]);
  };

  const startAdd = (type: 'recipe' | 'grocery') => {
    setAddingType(type);
    setNewName('');
    setEditingId(null);
    setTimeout(() => newInputRef.current?.focus(), 120);
  };

  const saveNew = async () => {
    if (!newName.trim() || !addingType) {
      setAddingType(null);
      return;
    }
    if (addingType === 'recipe') await addRecipeCategory(newName.trim());
    else await addGroceryCategory(newName.trim());
    setNewName('');
    setAddingType(null);
  };

  return (
    <View style={styles.section}>
      <RuleWithLabel label="onze recepten" bold />
      <View style={styles.sectionBody}>
        <Row
          label="categorieën"
          value={String(recipeCategories.length)}
          expanded={expanded === 'recipe'}
          onPress={() => onToggle('recipe')}
        />
        {expanded === 'recipe' && (
          <CategoryList
            items={recipeCategories}
            editingId={editingId}
            editingName={editingName}
            addingHere={addingType === 'recipe'}
            newName={newName}
            newInputRef={newInputRef}
            onEditStart={startEdit}
            onEditChange={setEditingName}
            onEditSubmit={saveEdit}
            onDelete={confirmDelete}
            onAddStart={() => startAdd('recipe')}
            onAddChange={setNewName}
            onAddSubmit={saveNew}
            onAddCancel={() => setAddingType(null)}
          />
        )}
        <Row
          label="boodschappen"
          value={String(groceryCategories.length)}
          expanded={expanded === 'grocery'}
          onPress={() => onToggle('grocery')}
          last
        />
        {expanded === 'grocery' && (
          <CategoryList
            items={groceryCategories}
            editingId={editingId}
            editingName={editingName}
            addingHere={addingType === 'grocery'}
            newName={newName}
            newInputRef={newInputRef}
            onEditStart={startEdit}
            onEditChange={setEditingName}
            onEditSubmit={saveEdit}
            onDelete={confirmDelete}
            onAddStart={() => startAdd('grocery')}
            onAddChange={setNewName}
            onAddSubmit={saveNew}
            onAddCancel={() => setAddingType(null)}
          />
        )}
      </View>
    </View>
  );
}
