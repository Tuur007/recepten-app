import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, spacing, typography } from '../../../../constants/Designsystem';
import type { ScaledIngredient } from '../../../../utils/servingsScaler';

interface Props {
  visible: boolean;
  ingredients: ScaledIngredient[];
  selectedIds: Set<string>;
  onClose: () => void;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onConfirm: () => void;
}

export function GroceryPickerModal({
  visible,
  ingredients,
  selectedIds,
  onClose,
  onToggle,
  onToggleAll,
  onConfirm,
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.title}>Ingrediënten kiezen</Text>
          <TouchableOpacity onPress={onToggleAll} hitSlop={8}>
            <Text style={styles.selectAll}>
              {selectedIds.size === ingredients.length ? 'Geen' : 'Alles'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 2 }}>
          {ingredients.map((ing) => {
            const checked = selectedIds.has(ing.id);
            return (
              <TouchableOpacity
                key={ing.id}
                style={styles.row}
                onPress={() => onToggle(ing.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={checked ? colors.primary : colors.textFaint}
                />
                <Text style={styles.qty}>{ing.displayQty}</Text>
                <Text style={styles.unit}>{ing.unit}</Text>
                <Text style={styles.name}>{ing.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} onPress={onConfirm} activeOpacity={0.85}>
            <Ionicons
              name="bag-outline"
              size={16}
              color={colors.background}
              style={{ marginRight: 8 }}
            />
            <Text style={typography.buttonLabel}>
              voeg {selectedIds.size} toe aan lijst
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderColor,
  },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.textDark },
  selectAll: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  qty: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    color: colors.primary,
    width: 34,
    textAlign: 'right',
  },
  unit: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textLight,
    textTransform: 'uppercase',
    width: 50,
  },
  name: { flex: 1, fontFamily: fonts.display, fontSize: 15, color: colors.textDark },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderColor,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textDark,
    paddingVertical: 14,
    borderRadius: 999,
  },
});
