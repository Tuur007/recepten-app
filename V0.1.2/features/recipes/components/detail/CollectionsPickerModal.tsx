import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, spacing, typography } from '../../../../constants/Designsystem';
import { useThemeColors } from '../../../../theme';
import type { RecipeCollection } from '../../../../types/recipe';

interface Props {
  visible: boolean;
  recipeId: string;
  collections: RecipeCollection[];
  onClose: () => void;
  onToggle: (collectionId: string, currentlyIn: boolean) => void;
  onManage: () => void;
}

export function CollectionsPickerModal({
  visible,
  recipeId,
  collections,
  onClose,
  onToggle,
  onManage,
}: Props) {
  const themeColors = useThemeColors();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.textLight} />
          </TouchableOpacity>
          <Text style={styles.title}>In collectie zetten</Text>
          <TouchableOpacity onPress={onManage} hitSlop={8}>
            <Ionicons name="add" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 4 }}>
          {collections.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[typography.bodyItalic, { textAlign: 'center', marginBottom: spacing.md }]}>
                Nog geen collecties.{'\n'}Maak er één via het + icoon.
              </Text>
              <TouchableOpacity onPress={onManage} style={styles.manageBtn} activeOpacity={0.8}>
                <Text style={typography.buttonLabel}>beheer collecties</Text>
              </TouchableOpacity>
            </View>
          ) : (
            collections.map((col) => {
              const inside = col.recipeIds.includes(recipeId);
              return (
                <TouchableOpacity
                  key={col.id}
                  style={styles.row}
                  onPress={() => onToggle(col.id, inside)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={inside ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={inside ? colors.primary : colors.textFaint}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{col.name}</Text>
                    {col.description ? (
                      <Text style={styles.desc} numberOfLines={1}>
                        {col.description}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.count}>{col.recipeIds.length}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  empty: { paddingTop: spacing.xxl, alignItems: 'center' },
  manageBtn: {
    backgroundColor: colors.textDark,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  name: { fontFamily: fonts.display, fontSize: 16, color: colors.textDark },
  desc: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  count: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.textFaint,
  },
});
