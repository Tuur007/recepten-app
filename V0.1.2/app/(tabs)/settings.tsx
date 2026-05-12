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
import { useThemeColors, useThemeMode, type ThemeMode } from '../../theme';
import { haptics } from '../../utils/feedback';

type SectionKey = 'recipe' | 'grocery' | null;

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [addingType, setAddingType] = useState<SectionKey>(null);
  const [newName, setNewName] = useState('');
  const [expandedSection, setExpandedSection] = useState<SectionKey>(null);
  const newInputRef = useRef<TextInput>(null);

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setAddingType(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) { setEditingId(null); return; }
    await updateCategory(editingId, editingName.trim());
    setEditingId(null);
    setEditingName('');
  };

  const confirmDelete = (cat: Category) => {
    Alert.alert(
      'Verwijderen',
      `"${cat.name}" verwijderen?`,
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: () => {
            // Hook already surfaces a toast on failure; swallow the rejection.
            removeCategory(cat.id).catch(() => {});
          },
        },
      ],
    );
  };

  const startAdd = (type: 'recipe' | 'grocery') => {
    setAddingType(type);
    setExpandedSection(type);
    setNewName('');
    setEditingId(null);
    setTimeout(() => newInputRef.current?.focus(), 120);
  };

  const saveNew = async () => {
    if (!newName.trim() || !addingType) { setAddingType(null); return; }
    if (addingType === 'recipe') await addRecipeCategory(newName.trim());
    else await addGroceryCategory(newName.trim());
    setNewName('');
    setAddingType(null);
  };

  const toggleSection = (key: 'recipe' | 'grocery') =>
    setExpandedSection((prev) => (prev === key ? null : key));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Folio */}
        <View style={styles.folio}>
          <Text style={typography.folio}>instellingen</Text>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={[typography.hero32Bold, { fontSize: 36 }]}>Meer</Text>
          <Text style={[typography.heroItalic, { fontSize: 36 }]}>opties.</Text>
        </View>

        {/* ── Receptcategorieën ── */}
        <SectionCard
          icon="book-outline"
          title="Receptcategorieën"
          count={recipeCategories.length}
          expanded={expandedSection === 'recipe'}
          onToggle={() => toggleSection('recipe')}
        >
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
            <AddButton label="Categorie toevoegen" onPress={() => startAdd('recipe')} />
          )}
        </SectionCard>

        {/* ── Boodschappencategorieën ── */}
        <SectionCard
          icon="bag-outline"
          title="Boodschappencategorieën"
          count={groceryCategories.length}
          expanded={expandedSection === 'grocery'}
          onToggle={() => toggleSection('grocery')}
        >
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
            <AddButton label="Categorie toevoegen" onPress={() => startAdd('grocery')} />
          )}
        </SectionCard>

        {/* ── Verschijning ── */}
        <ThemeSection />

        {/* ── Over de app ── */}
        <View style={[styles.sectionCard, { marginTop: spacing.md }]}>
          <View style={styles.cardHeaderStatic}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textLight} />
            </View>
            <Text style={styles.cardTitle}>Over de app</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Versie</Text>
              <Text style={styles.infoValue}>v1.1.0</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Gebouwd met</Text>
              <Text style={styles.infoValue}>Expo + SQLite</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Theme section ──────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', label: 'Systeem', icon: 'phone-portrait-outline' },
  { value: 'light',  label: 'Licht',   icon: 'sunny-outline' },
  { value: 'dark',   label: 'Donker',  icon: 'moon-outline' },
];

function ThemeSection() {
  const { mode, setMode } = useThemeMode();
  const themeColors = useThemeColors();

  return (
    <View style={[styles.sectionCard, { marginTop: spacing.md }]}>
      <View style={styles.cardHeaderStatic}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="contrast-outline" size={18} color={colors.textLight} />
        </View>
        <Text style={styles.cardTitle}>Verschijning</Text>
      </View>
      <View style={[styles.cardBody, { padding: spacing.md, gap: 8 }]}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
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
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: active ? themeColors.primary : colors.borderColor,
                  backgroundColor: active ? themeColors.primary : 'transparent',
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Ionicons
                  name={opt.icon}
                  size={18}
                  color={active ? colors.background : colors.textMedium}
                />
                <Text
                  style={{
                    fontFamily: fonts.bodyMedium,
                    fontSize: 12,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: active ? colors.background : colors.textMedium,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[typography.bodyItalic, { marginTop: 4 }]}>
          Donkere modus loopt nog uit. Sommige schermen blijven licht totdat ze zijn aangepast.
        </Text>
      </View>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface SectionCardProps {
  icon: string;
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function SectionCard({ icon, title, count, expanded, onToggle, children }: SectionCardProps) {
  return (
    <View style={[styles.sectionCard, { marginTop: spacing.md }]}>
      <TouchableOpacity style={styles.cardHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.cardIconWrap}>
          <Ionicons name={icon as any} size={18} color={colors.textLight} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardCount}>{count}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textFaint}
        />
      </TouchableOpacity>
      {expanded && <View style={styles.cardBody}>{children}</View>}
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
  cat, isEditing, editValue, onEditChange, onEditSubmit, onEditStart, onDelete,
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
          <Ionicons name="pencil-outline" size={15} color={colors.textFaint} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={15} color={colors.textFaint} />
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

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.addRow} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
      <Text style={styles.addText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  folio: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  titleBlock: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  sectionCard: {
    marginHorizontal: spacing.lg,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
  },
  cardHeaderStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
  },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
  },
  cardCount: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 1,
    marginRight: 4,
  },
  cardBody: {
    borderTopWidth: 0.5,
    borderTopColor: colors.borderSoft,
  },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  catName: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
  },
  catInput: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  catActions: { flexDirection: 'row', gap: 2 },
  iconBtn: { padding: 8 },

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.primary,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  infoLabel: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.textLight,
  },
  infoValue: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textDark,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
