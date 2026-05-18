// app/(tabs)/settings.tsx
//
// "En meer." — MoreScreen volgens de editorial mockup.
//
// Structuur (mockup → code mapping):
//   • Folio    : versie + laatst geupdate
//   • Title    : EditorialTitle "En meer."
//   • Intro    : italic introductie-paragraaf
//   • Family   : "het gezin" — 4 FamilyDots met namen (statisch — geen familie-data
//                model in de app; mockup gebruikt ook hardcoded namen)
//   • Sections : RuleWithLabel header + clickable rijen (label | mono value | →).
//                Tappen op een rij klapt de bijbehorende sub-inhoud uit
//                (categorie-lijst voor het beheer, theme-keuze voor verschijning).
//   • Credit   : italic footer
//
// Bestaande functionaliteit (categorie CRUD, theme-mode) blijft behouden — alleen
// de presentatie is aangepast naar de mockup-stijl.

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
import { colors, spacing, fonts } from '../../constants/Designsystem';
import { useThemeColors, useThemeMode, type ThemeMode } from '../../theme';
import { haptics } from '../../utils/feedback';
import {
  FolioStrip,
  EditorialTitle,
  RuleWithLabel,
  FamilyDot,
  type FamilyKey,
} from '../../components/ui/EditorialBits';

type ExpandKey = 'recipe' | 'grocery' | 'theme' | null;

const FAMILY: { key: FamilyKey; label: string }[] = [
  { key: 'tuur', label: 'Tuur' },
  { key: 'louise', label: 'Louise' },
  { key: 'basiel', label: 'Basiel' },
  { key: 'jules', label: 'Jules' },
];

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Systeem' },
  { value: 'light', label: 'Licht' },
  { value: 'dark', label: 'Donker' },
];

const THEME_LABEL: Record<ThemeMode, string> = {
  system: 'systeem',
  light: 'licht',
  dark: 'donker',
};

export default function SettingsScreen() {
  const themeColors = useThemeColors();
  const {
    recipeCategories,
    groceryCategories,
    addRecipeCategory,
    addGroceryCategory,
    updateCategory,
    removeCategory,
  } = useCategories();
  const { mode, setMode } = useThemeMode();

  const [expanded, setExpanded] = useState<ExpandKey>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [addingType, setAddingType] = useState<'recipe' | 'grocery' | null>(null);
  const [newName, setNewName] = useState('');
  const newInputRef = useRef<TextInput>(null);

  const toggle = (key: Exclude<ExpandKey, null>) =>
    setExpanded((prev) => (prev === key ? null : key));

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

  const cycleTheme = () => {
    const idx = THEME_OPTIONS.findIndex((o) => o.value === mode);
    const next = THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length];
    haptics.selection();
    setMode(next.value);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Folio */}
        <FolioStrip left="versie 1.1.0" right="laatst gesynct · nu" />

        {/* Editorial title */}
        <View style={styles.titleBlock}>
          <EditorialTitle lead="En" tail="meer." size={42} />
        </View>

        {/* Italic intro */}
        <Text style={styles.intro}>
          Een paar knoppen voor wie graag dingen op orde houdt.
        </Text>

        {/* ─── het gezin ─── */}
        <View style={styles.section}>
          <RuleWithLabel label="het gezin" bold />
          <View style={styles.familyRow}>
            {FAMILY.map((m) => (
              <View key={m.key} style={styles.familyCol}>
                <FamilyDot who={m.key} size={42} />
                <Text style={styles.familyLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ─── onze recepten ─── */}
        <View style={styles.section}>
          <RuleWithLabel label="onze recepten" bold />
          <View style={styles.sectionBody}>
            <Row
              label="categorieën"
              value={String(recipeCategories.length)}
              expanded={expanded === 'recipe'}
              onPress={() => toggle('recipe')}
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
              onPress={() => toggle('grocery')}
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

        {/* ─── op het scherm ─── */}
        <View style={styles.section}>
          <RuleWithLabel label="op het scherm" bold />
          <View style={styles.sectionBody}>
            <Row
              label="donker thema"
              value={THEME_LABEL[mode]}
              expanded={expanded === 'theme'}
              onPress={() => toggle('theme')}
              last
            />
            {expanded === 'theme' && (
              <View style={styles.themeRow}>
                {THEME_OPTIONS.map((opt) => {
                  const active = mode === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => {
                        haptics.selection();
                        setMode(opt.value);
                      }}
                      activeOpacity={0.8}
                      style={[
                        styles.themeChip,
                        active && {
                          borderColor: themeColors.primary,
                          backgroundColor: themeColors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.themeChipLabel,
                          active && { color: colors.background },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
          {/* discreet "next" affordance also exists as tap on row itself */}
          <TouchableOpacity onPress={cycleTheme} style={{ height: 0 }} />
        </View>

        {/* ─── over de app ─── */}
        <View style={styles.section}>
          <RuleWithLabel label="over de app" bold />
          <View style={styles.sectionBody}>
            <Row label="versie" value="v1.1.0" inert />
            <Row label="gebouwd met" value="Expo + SQLite" inert last />
          </View>
        </View>

        {/* Editorial credit */}
        <Text style={styles.credit}>
          Gemaakt op de keukentafel,{'\n'}met liefde voor goed eten en mooie pagina's.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Row: mockup setting row ────────────────────────────────────────────────
function Row({
  label,
  value,
  expanded,
  onPress,
  inert,
  last,
}: {
  label: string;
  value: string;
  expanded?: boolean;
  onPress?: () => void;
  inert?: boolean;
  last?: boolean;
}) {
  const body = (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      {!inert && (
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={14}
          color={colors.textFaint}
          style={{ marginLeft: 6 }}
        />
      )}
    </View>
  );
  if (inert || !onPress) return body;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.65}>
      {body}
    </TouchableOpacity>
  );
}

// ── Inline category list (sub-content of "onze recepten" rows) ─────────────
function CategoryList({
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

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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

  // Section block: RuleWithLabel + body
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionBody: { marginTop: 6 },

  // Family row
  familyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
  },
  familyCol: { alignItems: 'center' },
  familyLabel: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.textDark,
    marginTop: 6,
  },

  // Mockup setting row (label / mono value / chevron)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textMedium,
  },
  rowValue: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textLight,
  },

  // Inline expandable content
  subList: {
    paddingLeft: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  catName: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.textDark,
  },
  catInput: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.textDark,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  iconBtn: { padding: 6 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  addBtnLabel: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.primary,
  },

  // Theme chip strip
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  themeChip: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  themeChipLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textMedium,
  },

  // Credit footer
  credit: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
});
