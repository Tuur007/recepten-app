import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  Pressable,
  Modal,
  SafeAreaView,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGrocery } from '../../features/grocery/hooks';
import { GroceryItem } from '../../features/grocery/components/GroceryItem';
import { AddFromRecipeModal } from '../../features/grocery/components/AddFromRecipeModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/LoadingScreen';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { colors, spacing, typography, shadows } from '../../constants/Designsystem';

export default function GroceryScreen() {
  const {
    items,
    isLoading,
    toggleItem,
    deleteItem,
    addItem,
    updateItem,
    clearChecked,
  } = useGrocery();

  const [showAddFromRecipe, setShowAddFromRecipe] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');

  const handleAddManual = useCallback(async () => {
    if (!newItemName.trim()) {
      Alert.alert('Fout', 'Voer een artikel in');
      return;
    }
    await addItem({
      name: newItemName,
      unit: newItemUnit || 'stuk',
      sources: [],
      checked: false,
    });
    setNewItemName('');
    setNewItemUnit('');
    setShowManualAdd(false);
  }, [newItemName, newItemUnit, addItem]);

  const checkedCount = useMemo(() => items.filter((i) => i.checked).length, [items]);

  if (isLoading) return <LoadingScreen />;

  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View>
            <Text style={[typography.title20, { color: colors.text }]}>Boodschappen</Text>
            <Text style={[typography.caption14, { color: colors.textSecondary }]}>
              {items.length} artikelen · {checkedCount} afgevinkt
            </Text>
          </View>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GroceryItem
              item={item}
              onToggle={() => toggleItem(item.id)}
              onDelete={() => deleteItem(item.id)}
              onRemoveSource={() => {}}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="🛒"
              title="Geen artikelen"
              message="Voeg recepten toe of voeg handmatig items in."
            />
          }
        />

        <View style={[styles.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {checkedCount > 0 && (
            <Pressable
              style={[styles.button, { backgroundColor: colors.secondary }]}
              onPress={clearChecked}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={[typography.body16Medium, { color: '#fff', marginLeft: spacing.sm }]}>
                Afgevinkt wissen ({checkedCount})
              </Text>
            </Pressable>
          )}

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.fabButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddFromRecipe(true)}
            >
              <Ionicons name="add-circle" size={24} color="#fff" />
            </Pressable>
            <Pressable
              style={[styles.fabButton, { backgroundColor: colors.secondary }]}
              onPress={() => setShowManualAdd(true)}
            >
              <Ionicons name="create" size={24} color="#fff" />
            </Pressable>
          </View>
        </View>

        <AddFromRecipeModal
          visible={showAddFromRecipe}
          onClose={() => setShowAddFromRecipe(false)}
          onSelectRecipe={() => {
            setShowAddFromRecipe(false);
          }}
        />

        <Modal visible={showManualAdd} transparent animationType="slide">
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <Pressable onPress={() => setShowManualAdd(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
              <Text style={[typography.title18, { color: colors.text }]}>Artikel toevoegen</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalContent} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}>
              <View>
                <Text style={[typography.body16Medium, { color: colors.text, marginBottom: spacing.sm }]}>
                  Artikel
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.backgroundLight,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="bijv. Melk, Brood, Kaas"
                  placeholderTextColor={colors.textSecondary}
                  value={newItemName}
                  onChangeText={setNewItemName}
                  editable={!isLoading}
                />
              </View>

              <View>
                <Text style={[typography.body16Medium, { color: colors.text, marginBottom: spacing.sm }]}>
                  Eenheid (optioneel)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.backgroundLight,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="bijv. stuks, liter, kg"
                  placeholderTextColor={colors.textSecondary}
                  value={newItemUnit}
                  onChangeText={setNewItemUnit}
                  editable={!isLoading}
                />
              </View>

              <Pressable
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.primary },
                  (!newItemName.trim() || isLoading) && styles.submitButtonDisabled,
                ]}
                onPress={handleAddManual}
                disabled={!newItemName.trim() || isLoading}
              >
                <Text style={[typography.body16Medium, { color: '#fff' }]}>Toevoegen</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
  },
  actionBar: {
    padding: spacing.md,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  fabButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalContent: {
    padding: spacing.lg,
    flex: 1,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  submitButton: {
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
});
