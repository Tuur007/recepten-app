import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { GroceryItem, GroceryItemUpdate } from '../../../types/grocery';
import { useCategories } from '../../../store/categoriesStore';
import { useShopsStore } from '../../../store/shopsStore';
import { DEFAULT_AISLES } from '../../../constants/aisles';
import { colors, spacing, fonts } from '../../../constants/Designsystem';

interface Props {
  item: GroceryItem | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, changes: GroceryItemUpdate) => Promise<void>;
}

export function GroceryItemDetailModal({ item, visible, onClose, onSave }: Props) {
  const { groceryCategories } = useCategories();
  const shops = useShopsStore((s) => s.shops);

  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [aisle, setAisle] = useState('');
  const [storeId, setStoreId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setQty(item.totalQuantity > 0 ? String(item.totalQuantity) : '');
      setUnit(item.unit);
      setPrice(item.price != null ? String(item.price) : '');
      setCategory(item.category);
      setAisle(item.aisle ?? '');
      setStoreId(item.storeId);
    }
  }, [item]);

  if (!item) return null;

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const parsedQty = parseFloat(qty);
      const newQty = isNaN(parsedQty) || parsedQty <= 0 ? item.totalQuantity : parsedQty;
      const updatedSources = item.sources.map((s, idx) =>
        idx === 0 ? { ...s, quantity: newQty } : s,
      );
      const changes: GroceryItemUpdate = {
        name: name.trim(),
        unit: unit.trim(),
        category,
        aisle: aisle || undefined,
        price: parseFloat(price) || undefined,
        storeId: storeId || undefined,
        sources: updatedSources,
      };
      await onSave(item.id, changes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textLight} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Item bewerken</Text>
            <TouchableOpacity onPress={handleSave} disabled={!name.trim() || saving} hitSlop={8}>
              <Text style={[styles.saveBtn, (!name.trim() || saving) && { opacity: 0.35 }]}>
                Bewaar
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <Text style={styles.label}>Naam</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="bv. melk"
                placeholderTextColor={colors.textFaint}
                autoFocus
                returnKeyType="next"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Hoeveelheid</Text>
                <TextInput
                  style={styles.input}
                  value={qty}
                  onChangeText={setQty}
                  placeholder="1"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Eenheid</Text>
                <TextInput
                  style={styles.input}
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="bv. liter"
                  placeholderTextColor={colors.textFaint}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Prijs (€)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={colors.textFaint}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Categorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                <TouchableOpacity
                  style={[styles.chip, category === '' && styles.chipActive]}
                  onPress={() => setCategory('')}
                >
                  <Text style={[styles.chipText, category === '' && styles.chipTextActive]}>Geen</Text>
                </TouchableOpacity>
                {groceryCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, category === cat.name && styles.chipActive]}
                    onPress={() => setCategory(cat.name)}
                  >
                    <Text style={[styles.chipText, category === cat.name && styles.chipTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Gang</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                <TouchableOpacity
                  style={[styles.chip, aisle === '' && styles.chipActive]}
                  onPress={() => setAisle('')}
                >
                  <Text style={[styles.chipText, aisle === '' && styles.chipTextActive]}>Geen</Text>
                </TouchableOpacity>
                {DEFAULT_AISLES.map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.chip, aisle === a && styles.chipActive]}
                    onPress={() => setAisle(a)}
                  >
                    <Text style={[styles.chipText, aisle === a && styles.chipTextActive]}>{a}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Winkel</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                <TouchableOpacity
                  style={[styles.chip, !storeId && styles.chipActive]}
                  onPress={() => setStoreId(undefined)}
                >
                  <Text style={[styles.chipText, !storeId && styles.chipTextActive]}>Geen</Text>
                </TouchableOpacity>
                {shops.map((shop) => (
                  <TouchableOpacity
                    key={shop.id}
                    style={[styles.chip, storeId === shop.id && styles.chipActive]}
                    onPress={() => setStoreId(shop.id)}
                  >
                    <Text style={[styles.chipText, storeId === shop.id && styles.chipTextActive]}>
                      {shop.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderColor,
  },
  headerTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.textDark },
  saveBtn: { fontFamily: fonts.display, fontSize: 15, color: colors.primary },
  content: { padding: spacing.lg, gap: spacing.lg },
  field: { gap: 6 },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  input: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    paddingVertical: 8,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderColor,
    backgroundColor: colors.background,
  },
  chipActive: { backgroundColor: colors.textDark, borderColor: colors.textDark },
  chipText: { fontFamily: fonts.display, fontSize: 13, color: colors.textLight },
  chipTextActive: { color: colors.background },
});
