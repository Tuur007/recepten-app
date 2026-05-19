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

import React, { useEffect, useState, useRef } from 'react';
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

import { useSQLiteContext } from 'expo-sqlite';

import { useCategories } from '../../store/categoriesStore';
import { Category } from '../../features/categories/repository';
import {
  FAMILY_COLORS,
  useFamilyActions,
  useFamilyStore,
  type FamilyMember,
} from '../../store/familyStore';
import { colors, spacing, fonts } from '../../constants/Designsystem';
import { useThemeColors, useThemeMode, type ThemeMode } from '../../theme';
import { haptics, toast } from '../../utils/feedback';
import {
  FolioStrip,
  EditorialTitle,
  RuleWithLabel,
  FamilyDot,
} from '../../components/ui/EditorialBits';
import {
  exportAppData,
  importAppData,
  loadLastExportAt,
  pickAndPreviewImport,
  shareExport,
  type AppExport,
} from '../../services/sync';

type ExpandKey = 'recipe' | 'grocery' | 'theme' | 'family' | 'backup' | null;

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
  const db = useSQLiteContext();
  const {
    recipeCategories,
    groceryCategories,
    addRecipeCategory,
    addGroceryCategory,
    updateCategory,
    removeCategory,
  } = useCategories();
  const { mode, setMode } = useThemeMode();

  const members = useFamilyStore((s) => s.members);
  const {
    addMember,
    removeMember,
    toggleActive,
    updateName,
    updateColor,
    replaceMembers,
    setFamilyName: setFamilyNamePersisted,
  } = useFamilyActions();

  const [expanded, setExpanded] = useState<ExpandKey>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [addingType, setAddingType] = useState<'recipe' | 'grocery' | null>(null);
  const [newName, setNewName] = useState('');
  const newInputRef = useRef<TextInput>(null);

  const [familyMemberDraft, setFamilyMemberDraft] = useState<Record<string, string>>({});
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadLastExportAt(db).then(setLastExportAt).catch(() => {});
  }, [db]);

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

  const handleNameDraftChange = (id: string, value: string) => {
    setFamilyMemberDraft((prev) => ({ ...prev, [id]: value }));
  };
  const commitNameDraft = (id: string) => {
    const draft = familyMemberDraft[id];
    if (draft === undefined) return;
    updateName(id, draft.trim());
    setFamilyMemberDraft((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const handleAddMember = () => {
    addMember();
    haptics.light();
  };
  const confirmRemoveMember = (member: FamilyMember) => {
    Alert.alert(
      'Verwijderen',
      `${member.name.trim() || 'Dit gezinslid'} verwijderen?`,
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: () => {
            removeMember(member.id);
            haptics.success();
          },
        },
      ],
    );
  };

  const handleExport = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      haptics.light();
      const data = await exportAppData(db);
      await shareExport(db, data);
      const next = await loadLastExportAt(db);
      setLastExportAt(next);
      toast.success('Geëxporteerd', 'Kies waar je de back-up bewaart.');
    } catch (err) {
      console.error('[settings] export failed:', err);
      toast.error('Export mislukt', err instanceof Error ? err.message : undefined);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (importing) return;
    try {
      setImporting(true);
      haptics.light();
      const picked = await pickAndPreviewImport(db);
      if (!picked) {
        setImporting(false);
        return;
      }
      const { preview, data } = picked;
      Alert.alert(
        'Back-up importeren',
        `${preview.recipesIncoming} recepten gevonden — ${preview.recipesExisting} al aanwezig.\n\nDoorgaan?`,
        [
          {
            text: 'Annuleren',
            style: 'cancel',
            onPress: () => setImporting(false),
          },
          {
            text: 'Importeren',
            onPress: () => runImport(data),
          },
        ],
      );
    } catch (err) {
      console.error('[settings] import preview failed:', err);
      toast.error('Importeren mislukt', err instanceof Error ? err.message : undefined);
      setImporting(false);
    }
  };

  const runImport = async (data: AppExport) => {
    try {
      const result = await importAppData(db, data);
      if (data.familyName) setFamilyNamePersisted(data.familyName);
      if (Array.isArray(data.familyMembers)) replaceMembers(data.familyMembers);
      haptics.success();
      toast.success(
        'Import voltooid',
        `+${result.recipesAdded} · ${result.recipesUpdated} bijgewerkt · ${result.conflictsSkipped} overgeslagen`,
      );
    } catch (err) {
      console.error('[settings] import failed:', err);
      toast.error('Import mislukt', err instanceof Error ? err.message : undefined);
    } finally {
      setImporting(false);
    }
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
          <View style={styles.sectionBody}>
            {members.length === 0 ? (
              <Text style={styles.emptyHint}>
                Nog geen gezinsleden. Voeg toe wie er mee aan tafel zit.
              </Text>
            ) : (
              members.map((member) => {
                const draft = familyMemberDraft[member.id];
                const value = draft ?? member.name;
                return (
                  <View key={member.id} style={styles.memberBlock}>
                    <View style={styles.memberRow}>
                      <FamilyDot member={member} size={32} />
                      <TextInput
                        style={[
                          styles.memberInput,
                          !member.active && { color: colors.textFaint },
                        ]}
                        value={value}
                        onChangeText={(v) => handleNameDraftChange(member.id, v)}
                        onBlur={() => commitNameDraft(member.id)}
                        onSubmitEditing={() => commitNameDraft(member.id)}
                        placeholder="naam"
                        placeholderTextColor={colors.textFaint}
                        returnKeyType="done"
                      />
                      <TouchableOpacity
                        onPress={() => toggleActive(member.id)}
                        hitSlop={8}
                        style={styles.iconBtn}
                      >
                        <Ionicons
                          name={member.active ? 'eye-outline' : 'eye-off-outline'}
                          size={16}
                          color={member.active ? colors.primary : colors.textFaint}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => confirmRemoveMember(member)}
                        hitSlop={8}
                        style={styles.iconBtn}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.textFaint} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.swatchRow}>
                      {FAMILY_COLORS.map((c) => {
                        const active = c === member.color;
                        return (
                          <TouchableOpacity
                            key={c}
                            onPress={() => {
                              updateColor(member.id, c);
                              haptics.selection();
                            }}
                            hitSlop={4}
                            style={[
                              styles.swatch,
                              { backgroundColor: c },
                              active && styles.swatchActive,
                            ]}
                          />
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
            <TouchableOpacity onPress={handleAddMember} style={styles.addBtn} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
              <Text style={styles.addBtnLabel}>voeg gezinslid toe</Text>
            </TouchableOpacity>
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

        {/* ─── back-up & herstel ─── */}
        <View style={styles.section}>
          <RuleWithLabel label="back-up & herstel" bold />
          <View style={styles.sectionBody}>
            <Row
              label="laatste export"
              value={lastExportAt ? formatExportDate(lastExportAt) : 'nog niet'}
              inert
            />
            <TouchableOpacity
              onPress={handleExport}
              activeOpacity={0.7}
              disabled={exporting}
              style={[styles.backupAction, !exporting && styles.backupActionPrimary]}
            >
              <Ionicons
                name="share-outline"
                size={14}
                color={exporting ? colors.textFaint : colors.background}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.backupActionLabel, exporting && { color: colors.textFaint }]}>
                {exporting ? 'bezig…' : 'exporteer alles'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleImport}
              activeOpacity={0.7}
              disabled={importing}
              style={[styles.backupAction, styles.backupActionSecondary]}
            >
              <Ionicons
                name="download-outline"
                size={14}
                color={colors.textDark}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.backupActionLabel, { color: colors.textDark }]}>
                {importing ? 'bezig…' : 'importeer back-up'}
              </Text>
            </TouchableOpacity>
          </View>
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

  // Family editor
  emptyHint: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textLight,
    paddingVertical: spacing.sm,
  },
  memberBlock: {
    paddingTop: spacing.sm,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberInput: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingLeft: 44, // align with name input (FamilyDot 32 + gap 12)
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: colors.textDark,
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

  // Back-up actions
  backupAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    marginTop: spacing.sm,
  },
  backupActionPrimary: {
    backgroundColor: colors.textDark,
  },
  backupActionSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: colors.borderColor,
  },
  backupActionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.background,
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

const MONTHS_NL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function formatExportDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS_NL[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}
