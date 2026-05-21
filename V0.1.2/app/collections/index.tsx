// app/collections/index.tsx
//
// "De collecties." — overzicht van alle gebruikersgemaakte recipe collections.
// Volgt het editorial-design uit recipes.tsx: folio, EditorialTitle, hairline
// rule-rows, italic CTA's en mono labels.

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useCollections } from '../../store/collectionsStore';
import { useRecipes } from '../../features/recipes/hooks';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';
import { useThemeColors } from '../../theme';
import { haptics, toast } from '../../utils/feedback';
import {
  FolioStrip,
  EditorialTitle,
  RuleWithLabel,
} from '../../components/ui/EditorialBits';

export default function CollectionsIndexScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const { collections, create, remove } = useCollections();
  const { recipes } = useRecipes();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const created = await create(name, newDesc.trim() || undefined);
      haptics.success();
      toast.success('Collectie aangemaakt', name);
      setNewName('');
      setNewDesc('');
      setCreating(false);
      router.push(`/collections/${created.id}`);
    } catch {
      /* hook toasted already */
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Verwijderen', `Collectie "${name}" verwijderen?`, [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: () => {
          remove(id).then(() => haptics.success()).catch(() => {});
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={typography.folio}>collecties</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <FolioStrip
          left={`collecties · ${collections.length}`}
          right={recipes.length ? `${recipes.length} recepten` : undefined}
        />

        <View style={styles.titleBlock}>
          <EditorialTitle lead="De" tail="collecties." size={40} />
        </View>

        <Text style={styles.intro}>
          Groepeer recepten in jouw eigen mappen — "BBQ", "snel doordeweeks",
          "kerst", wat je maar wil.
        </Text>

        <TouchableOpacity
          style={styles.newLine}
          activeOpacity={0.6}
          onPress={() => setCreating(true)}
        >
          <Text style={styles.newLineText}>+ maak een nieuwe collectie</Text>
          <Text style={[typography.folio, { color: colors.primary }]}>nieuw</Text>
        </TouchableOpacity>

        {collections.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[typography.bodyItalic, { textAlign: 'center' }]}>
              Nog geen collecties.{'\n'}Maak er één om snel terug te vinden.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
            <RuleWithLabel label="alle collecties" bold />
            {collections.map((col) => {
              const count = col.recipeIds.length;
              return (
                <TouchableOpacity
                  key={col.id}
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/collections/${col.id}`)}
                  onLongPress={() => handleDelete(col.id, col.name)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {col.name}
                    </Text>
                    {col.description ? (
                      <Text style={styles.rowDesc} numberOfLines={1}>
                        {col.description}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.rowCount}>
                    {count} {count === 1 ? 'recept' : 'recepten'}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={colors.textFaint}
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={creating}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreating(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCreating(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textLight} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Nieuwe collectie</Text>
              <TouchableOpacity onPress={handleCreate} hitSlop={8} disabled={!newName.trim()}>
                <Text style={[styles.modalSave, !newName.trim() && { opacity: 0.35 }]}>
                  Maak aan
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
              <View style={{ gap: 6 }}>
                <Text style={styles.fieldLabel}>Naam</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="bv. BBQ favorieten"
                  placeholderTextColor={colors.textFaint}
                  autoFocus
                />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={styles.fieldLabel}>Omschrijving (optioneel)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={newDesc}
                  onChangeText={setNewDesc}
                  placeholder="korte note"
                  placeholderTextColor={colors.textFaint}
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  titleBlock: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  intro: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textLight,
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },
  newLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    marginTop: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderColor,
  },
  newLineText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 15,
    color: colors.primary,
  },
  empty: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
    gap: 8,
  },
  rowTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.textDark,
  },
  rowDesc: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  rowCount: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textLight,
  },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderColor,
  },
  modalTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.textDark },
  modalSave: { fontFamily: fonts.display, fontSize: 15, color: colors.primary },
  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  fieldInput: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    paddingVertical: 8,
  },
});
