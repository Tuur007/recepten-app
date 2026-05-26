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

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Clipboard,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useSQLiteContext } from 'expo-sqlite';
import Constants from 'expo-constants';

import { useCategories } from '../../store/categoriesStore';
import { Category } from '../../features/categories/repository';
import {
  FAMILY_COLORS,
  useFamilyActions,
  useFamilyStore,
} from '../../store/familyStore';
import { useShopsStore, useShopsActions } from '../../store/shopsStore';
import { ALLERGENS } from '../../types/recipe';
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
import { requestNotificationPermission } from '../../services/notifications';
import { useAuthStore } from '../../store/authStore';
import { createInviteCode, listInviteCodes } from '../../services/inviteService';

type ExpandKey = 'recipe' | 'grocery' | 'theme' | 'family' | 'backup' | 'shops' | 'invites' | null;

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

  const router = useRouter();
  const members = useFamilyStore((s) => s.members);
  const familyName = useFamilyStore((s) => s.familyName);
  const appVersion = Constants.expoConfig?.version ?? '–';
  const { updateMyProfile, setActive } = useFamilyActions();

  const shops = useShopsStore((s) => s.shops);
  const { addShop, removeShop } = useShopsActions();
  const [newShopName, setNewShopName] = useState('');
  const [addingShop, setAddingShop] = useState(false);
  const newShopInputRef = useRef<TextInput>(null);

  const [allergyExpandedId, setAllergyExpandedId] = useState<string | null>(null);

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

  // Invite codes
  const [inviteCodes, setInviteCodes] = useState<Array<{ id: string; code: string; expires_at: string; used_by: string | null }>>([]);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [creatingCode, setCreatingCode] = useState(false);

  const { familyId, user } = useAuthStore();

  const loadInviteCodes = useCallback(async () => {
    const codes = await listInviteCodes().catch(() => []);
    setInviteCodes(codes as typeof inviteCodes);
  }, []);

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

  // Alleen het eigen profiel is bewerkbaar (RLS + UI). Andere leden read-only.
  const handleNameDraftChange = (id: string, value: string) => {
    setFamilyMemberDraft((prev) => ({ ...prev, [id]: value }));
  };
  const commitNameDraft = (id: string) => {
    const draft = familyMemberDraft[id];
    if (draft === undefined) return;
    updateMyProfile({ displayName: draft.trim() }).catch(() =>
      toast.error('Niet opgeslagen', 'Wijziging is niet bewaard.'),
    );
    setFamilyMemberDraft((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const handlePickColor = (color: string) => {
    updateMyProfile({ color }).catch(() =>
      toast.error('Niet opgeslagen', 'Wijziging is niet bewaard.'),
    );
    haptics.selection();
  };
  const handleToggleAllergy = (current: string[], allergen: string) => {
    const next = current.includes(allergen)
      ? current.filter((a) => a !== allergen)
      : [...current, allergen];
    updateMyProfile({ allergies: next }).catch(() =>
      toast.error('Niet opgeslagen', 'Wijziging is niet bewaard.'),
    );
    haptics.selection();
  };
  const handleToggleActive = (active: boolean) => {
    setActive(active).catch(() =>
      toast.error('Niet opgeslagen', 'Wijziging is niet bewaard.'),
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

  const handleRequestNotifications = async () => {
    haptics.light();
    const granted = await requestNotificationPermission();
    if (granted) {
      toast.success('Meldingen aan', 'Je hoort het wel rond 16u.');
    } else {
      toast.error(
        'Meldingen geweigerd',
        'Zet ze aan in de iOS/Android-instellingen om herinneringen te krijgen.',
      );
    }
  };

  const handleCreateInviteCode = async () => {
    if (creatingCode) return;
    setCreatingCode(true);
    try {
      const code = await createInviteCode();
      setGeneratedCode(code);
      haptics.success();
      await loadInviteCodes();
    } catch (err) {
      toast.error('Fout', err instanceof Error ? err.message : 'Code aanmaken mislukt.');
    } finally {
      setCreatingCode(false);
    }
  };

  const runImport = async (data: AppExport) => {
    try {
      const result = await importAppData(db, data);
      // Family is sinds cluster 2 een cloud-resource; een back-up herstelt
      // enkel recepten, boodschappen en de weekplanner.
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
        <FolioStrip
          left={`versie ${appVersion}`}
          right={familyName.trim() ? familyName : 'instellingen'}
        />

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
                Nog geen gezinsleden. Log in en maak of join een gezin via een
                uitnodigingscode.
              </Text>
            ) : (
              members.map((member) => {
                const isMe = !!user && member.userId === user.id;
                const draft = familyMemberDraft[member.id];
                const value = draft ?? member.displayName;
                const allergyCount = member.allergies.length;
                return (
                  <View key={member.id} style={styles.memberBlock}>
                    <View style={styles.memberRow}>
                      <FamilyDot member={member} size={32} />
                      {isMe ? (
                        <TextInput
                          style={[
                            styles.memberInput,
                            !member.active && { color: colors.textFaint },
                          ]}
                          value={value}
                          onChangeText={(v) => handleNameDraftChange(member.id, v)}
                          onBlur={() => commitNameDraft(member.id)}
                          onSubmitEditing={() => commitNameDraft(member.id)}
                          placeholder="jouw naam"
                          placeholderTextColor={colors.textFaint}
                          returnKeyType="done"
                        />
                      ) : (
                        <Text
                          style={[
                            styles.memberReadonlyName,
                            !member.active && { color: colors.textFaint },
                          ]}
                        >
                          {member.displayName.trim() || '—'}
                        </Text>
                      )}
                      {isMe && <Text style={styles.meBadge}>JIJ</Text>}
                      {member.role === 'owner' && <Text style={styles.ownerBadge}>EIGENAAR</Text>}
                      {isMe ? (
                        <TouchableOpacity
                          onPress={() => handleToggleActive(!member.active)}
                          hitSlop={8}
                          style={styles.iconBtn}
                        >
                          <Ionicons
                            name={member.active ? 'eye-outline' : 'eye-off-outline'}
                            size={16}
                            color={member.active ? colors.primary : colors.textFaint}
                          />
                        </TouchableOpacity>
                      ) : (
                        <Ionicons
                          name={member.active ? 'eye-outline' : 'eye-off-outline'}
                          size={16}
                          color={colors.textFaint}
                          style={styles.iconBtn}
                        />
                      )}
                    </View>

                    {isMe && (
                      <View style={styles.swatchRow}>
                        {FAMILY_COLORS.map((c) => {
                          const active = c === member.color;
                          return (
                            <TouchableOpacity
                              key={c}
                              onPress={() => handlePickColor(c)}
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
                    )}

                    {/* Allergieën */}
                    {isMe ? (
                      <>
                        <TouchableOpacity
                          onPress={() => setAllergyExpandedId((prev) => (prev === member.id ? null : member.id))}
                          activeOpacity={0.7}
                          style={styles.allergyToggle}
                        >
                          <Text style={styles.allergyToggleLabel}>
                            {allergyCount > 0
                              ? `${allergyCount} allergie${allergyCount === 1 ? '' : 'ën'}`
                              : 'allergieën'}
                          </Text>
                          <Ionicons
                            name={allergyExpandedId === member.id ? 'chevron-down' : 'chevron-forward'}
                            size={12}
                            color={colors.textFaint}
                          />
                        </TouchableOpacity>
                        {allergyExpandedId === member.id && (
                          <View style={styles.allergyGrid}>
                            {ALLERGENS.map((allergen) => {
                              const active = member.allergies.includes(allergen);
                              return (
                                <TouchableOpacity
                                  key={allergen}
                                  onPress={() => handleToggleAllergy(member.allergies, allergen)}
                                  style={[styles.allergyChip, active && styles.allergyChipActive]}
                                >
                                  <Text style={[styles.allergyChipText, active && styles.allergyChipTextActive]}>
                                    {allergen}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </>
                    ) : (
                      allergyCount > 0 && (
                        <View style={styles.allergyToggle}>
                          <Text style={styles.allergyToggleLabel}>
                            {`${allergyCount} allergie${allergyCount === 1 ? '' : 'ën'}`}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* ─── uitnodigingen ─── */}
        <View style={styles.section}>
          <RuleWithLabel label="uitnodigingen" bold />
          <View style={styles.sectionBody}>
            {!user ? (
              <View style={styles.authPrompt}>
                <Text style={[styles.codeHint, { marginBottom: spacing.sm }]}>
                  Log in om gezinsleden uit te nodigen.
                </Text>
                <TouchableOpacity onPress={() => router.push('/auth/login')} style={styles.addBtn} activeOpacity={0.7}>
                  <Ionicons name="log-in-outline" size={14} color={colors.primary} />
                  <Text style={styles.addBtnLabel}>inloggen</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/auth/register')} style={styles.addBtn} activeOpacity={0.7}>
                  <Ionicons name="person-add-outline" size={14} color={colors.primary} />
                  <Text style={styles.addBtnLabel}>account aanmaken</Text>
                </TouchableOpacity>
              </View>
            ) : !familyId ? (
              <View style={styles.authPrompt}>
                <Text style={[styles.codeHint, { marginBottom: spacing.sm }]}>
                  Maak eerst een gezin aan om uitnodigingscodes te gebruiken.
                </Text>
                <TouchableOpacity onPress={() => router.push('/auth/family-setup')} style={styles.addBtn} activeOpacity={0.7}>
                  <Ionicons name="home-outline" size={14} color={colors.primary} />
                  <Text style={styles.addBtnLabel}>gezin aanmaken</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Row
                  label="codes"
                  value={inviteCodes.filter((c) => !c.used_by).length + ' actief'}
                  expanded={expanded === 'invites'}
                  onPress={() => {
                    if (expanded !== 'invites') loadInviteCodes();
                    toggle('invites');
                  }}
                  last
                />
                {expanded === 'invites' && (
                  <View style={styles.subList}>
                    {generatedCode && (
                      <View style={styles.codeBox}>
                        <Text style={styles.codeText}>{generatedCode}</Text>
                        <TouchableOpacity
                          onPress={() => { Clipboard.setString(generatedCode); toast.success('Gekopieerd', generatedCode); haptics.light(); }}
                          hitSlop={8}
                          style={styles.iconBtn}
                        >
                          <Ionicons name="copy-outline" size={16} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    )}
                    <Text style={styles.codeHint}>Geldig voor 7 dagen · eenmalig gebruik</Text>
                    {inviteCodes.filter((c) => !c.used_by).map((c) => (
                      <View key={c.id} style={styles.catRow}>
                        <Text style={styles.codeListItem}>{c.code}</Text>
                        <Text style={styles.codeExpiry}>
                          {new Date(c.expires_at) > new Date() ? 'actief' : 'verlopen'}
                        </Text>
                      </View>
                    ))}
                    <TouchableOpacity
                      onPress={handleCreateInviteCode}
                      style={styles.addBtn}
                      activeOpacity={0.7}
                      disabled={creatingCode}
                    >
                      <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
                      <Text style={styles.addBtnLabel}>{creatingCode ? 'bezig…' : 'uitnodigingscode aanmaken'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
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

        {/* ─── de winkels ─── */}
        <View style={styles.section}>
          <RuleWithLabel label="de winkels" bold />
          <View style={styles.sectionBody}>
            <Row
              label="supermarkten"
              value={String(shops.length)}
              expanded={expanded === 'shops'}
              onPress={() => toggle('shops')}
              last
            />
            {expanded === 'shops' && (
              <View style={styles.subList}>
                {shops.map((shop) => (
                  <View key={shop.id} style={styles.catRow}>
                    <Text style={styles.catName}>{shop.name}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert('Verwijderen', `"${shop.name}" verwijderen?`, [
                          { text: 'Annuleren', style: 'cancel' },
                          { text: 'Verwijderen', style: 'destructive', onPress: () => { removeShop(shop.id); haptics.medium(); } },
                        ]);
                      }}
                      hitSlop={8}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.textFaint} />
                    </TouchableOpacity>
                  </View>
                ))}
                {addingShop ? (
                  <View style={styles.catRow}>
                    <TextInput
                      ref={newShopInputRef}
                      style={styles.catInput}
                      value={newShopName}
                      onChangeText={setNewShopName}
                      onSubmitEditing={() => {
                        if (newShopName.trim()) { addShop(newShopName.trim()); haptics.light(); }
                        setNewShopName('');
                        setAddingShop(false);
                      }}
                      placeholder="Naam winkel…"
                      placeholderTextColor={colors.textFaint}
                      returnKeyType="done"
                      autoFocus
                    />
                    <TouchableOpacity
                      onPress={() => {
                        if (newShopName.trim()) { addShop(newShopName.trim()); haptics.light(); }
                        setNewShopName('');
                        setAddingShop(false);
                      }}
                      hitSlop={8}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="checkmark" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setAddingShop(false); setNewShopName(''); }} hitSlop={8} style={styles.iconBtn}>
                      <Ionicons name="close" size={16} color={colors.textLight} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => { setAddingShop(true); setTimeout(() => newShopInputRef.current?.focus(), 120); }}
                    style={styles.addBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
                    <Text style={styles.addBtnLabel}>winkel toevoegen</Text>
                  </TouchableOpacity>
                )}
              </View>
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
            <View style={styles.notifRow}>
              <Text style={styles.notifLabel}>meldingen</Text>
              <TouchableOpacity onPress={handleRequestNotifications} activeOpacity={0.7}>
                <Text style={styles.notifAction}>opnieuw toestaan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ─── over de app ─── */}
        <View style={styles.section}>
          <RuleWithLabel label="over de app" bold />
          <View style={styles.sectionBody}>
            <Row label="versie" value={`v${appVersion}`} inert />
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
  memberReadonlyName: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
    paddingVertical: 4,
  },
  meBadge: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.background,
    backgroundColor: colors.primary,
    borderRadius: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    overflow: 'hidden',
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

  // Allergen chips per family member
  allergyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingLeft: 44,
  },
  allergyToggleLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  allergyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingLeft: 44,
  },
  allergyChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
  },
  allergyChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  allergyChipText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.textLight,
  },
  allergyChipTextActive: {
    color: colors.background,
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
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderSoft,
  },
  notifLabel: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textMedium,
  },
  notifAction: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.primary,
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

  // Invite codes
  authPrompt: {
    paddingVertical: spacing.sm,
    gap: 4,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.borderSoft,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    marginBottom: 4,
  },
  codeText: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 16,
    letterSpacing: 2,
    color: colors.textDark,
  },
  codeHint: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 11,
    color: colors.textFaint,
    marginBottom: 8,
  },
  codeListItem: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1.4,
    color: colors.textMedium,
  },
  codeExpiry: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },

  // Cloud family members
  ownerBadge: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.primary,
    borderWidth: 0.5,
    borderColor: colors.primary,
    borderRadius: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
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
