// app/(tabs)/grocery.tsx
//
// "De boodschappen" — marktbonnetje-feel grocery list.
// Changes vs previous:
//   • Folio links + rechts: aantal items   ·   totaal in olijfgroen
//   • Masthead: ghost-knoppen voor "uit recept" + "+" toevoegen
//   • Progress ribbon ("X van Y geplukt") met dunne voortgangsbalk in olijfgroen
//   • Italic empty state met "+ haal uit een recept" link
//
// De feitelijke item-rijen (GroceryItemEnhanced) en categorie-headers
// (CategoryGroupHeader) blijven ongewijzigd — die bevatten alle bulk-actions
// en swipe-gestures. De editorial verfijning zit in de chrome rondom.

import React, { useMemo, useState } from 'react';
import {
  FlatList,
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

import { useRouter } from 'expo-router';
import { useGrocery } from '../../features/grocery/hooks';
import { useBulkActions } from '../../features/grocery/hooks/useBulkActions';
import { useGroceryStore } from '../../store/groceryStore';
import { useShopsStore } from '../../store/shopsStore';
import { exportGroceryListAsPdf } from '../../services/exports/pdf';
import { haptics, toast } from '../../utils/feedback';
import { useRecipes } from '../../features/recipes/hooks';
import { useCategories } from '../../store/categoriesStore';
import { GroceryItemEnhanced } from '../../features/grocery/components/GroceryItemEnhanced';
import { GroceryItemDetailModal } from '../../features/grocery/components/GroceryItemDetailModal';
import { BulkActionsBar } from '../../features/grocery/components/BulkActionsBar';
import { CategoryGroupHeader } from '../../features/grocery/components/CategoryGroupHeader';
import { AddFromRecipeModal } from '../../features/grocery/components/AddFromRecipeModal';
import { LoadingScreen } from '../../components/LoadingScreen';
import { groupItems } from '../../utils/groceryGrouping';
import { DEFAULT_AISLES, getAisleForItem } from '../../constants/aisles';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';
import { useThemeColors } from '../../theme';
import type { Recipe } from '../../types/recipe';
import type { GroceryItem } from '../../types/grocery';
import { FolioStrip, EditorialTitle } from '../../components/ui/EditorialBits';

type ListRow =
  | { type: 'header'; aisle: string; count: number }
  | { type: 'item'; data: ReturnType<typeof useGroceryStore.getState>['items'][number] };

export default function GroceryScreen() {
  const {
    items,
    isLoading,
    addManual,
    addFromRecipe,
    toggleChecked,
    updateItem,
    remove,
    removeMany,
    clearAll,
  } = useGrocery();
  const { selectAll, clearChecked, share } = useBulkActions();
  const { recipes } = useRecipes();
  const { groceryCategories } = useCategories();
  const shops = useShopsStore((s) => s.shops);
  const themeColors = useThemeColors();
  const router = useRouter();

  const [storeFilter, setStoreFilter] = useState<string | null>(null);

  // Winkels die effectief aan items hangen — enkel die tonen we als filter-chip.
  const shopIdsWithItems = useMemo(
    () => new Set(items.map((i) => i.storeId).filter(Boolean) as string[]),
    [items],
  );
  const shopsInList = useMemo(
    () => shops.filter((s) => shopIdsWithItems.has(s.id)),
    [shops, shopIdsWithItems],
  );
  // Een filter dat naar een winkel zonder items wijst, valt terug op "Alle".
  const effectiveFilter = storeFilter && shopIdsWithItems.has(storeFilter) ? storeFilter : null;

  // Items zonder winkel tonen we altijd, ook bij een actieve winkel-filter.
  const visibleItems = useMemo(
    () =>
      effectiveFilter
        ? items.filter((i) => i.storeId === effectiveFilter || i.storeId == null)
        : items,
    [items, effectiveFilter],
  );

  const checkedCount = visibleItems.filter((i) => i.checked).length;
  const uncheckedCount = visibleItems.length - checkedCount;
  const total = visibleItems.reduce(
    (sum, i) => (i.price == null ? sum : sum + i.price * i.totalQuantity),
    0,
  );

  const [recipeModalVisible, setRecipeModalVisible] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<GroceryItem | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState('');
  const [manualUnit, setManualUnit] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualAisle, setManualAisle] = useState<string>(DEFAULT_AISLES[8]);
  const [manualAisleTouched, setManualAisleTouched] = useState(false);

  const handleManualNameChange = (text: string) => {
    setManualName(text);
    if (!manualAisleTouched && text.trim().length > 0) {
      setManualAisle(getAisleForItem(text));
    }
  };
  const handleManualAislePick = (a: string) => { setManualAisle(a); setManualAisleTouched(true); };

  const listData = useMemo<ListRow[]>(() => {
    const grouped = groupItems(visibleItems);
    const rows: ListRow[] = [];
    grouped.forEach((aisleItems, aisle) => {
      rows.push({ type: 'header', aisle, count: aisleItems.length });
      aisleItems.forEach((item) => rows.push({ type: 'item', data: item }));
    });
    return rows;
  }, [visibleItems]);

  // Bulk-acties respecteren de actieve winkel-filter: zonder filter werken ze
  // op de volledige lijst (snelle paden), met filter enkel op wat zichtbaar is.
  const isFiltered = effectiveFilter != null;
  const handleSelectAll = () => {
    if (isFiltered) {
      const ids = visibleItems.filter((i) => !i.checked).map((i) => i.id);
      useGroceryStore.getState().setCheckedByIds(ids, true);
    } else {
      selectAll();
    }
  };
  const handleClearChecked = async () => {
    if (isFiltered) {
      await removeMany(visibleItems.filter((i) => i.checked).map((i) => i.id));
    } else {
      await clearChecked();
    }
  };
  const handleClearAllAction = async () => {
    if (isFiltered) {
      await removeMany(visibleItems.map((i) => i.id));
    } else {
      await clearAll();
    }
  };
  const handleShareAction = () => (isFiltered ? share(visibleItems) : share());

  if (isLoading) return <LoadingScreen />;

  const resetManualForm = () => {
    setManualName(''); setManualQty(''); setManualUnit('');
    setManualCategory(''); setManualPrice('');
    setManualAisle(DEFAULT_AISLES[8]); setManualAisleTouched(false);
  };

  const handleSaveManual = async () => {
    const name = manualName.trim();
    if (!name) return;
    const qty = parseFloat(manualQty) || 1;
    const price = parseFloat(manualPrice) || undefined;
    await addManual({
      name,
      unit: manualUnit.trim(),
      category: manualCategory,
      aisle: manualAisle,
      price,
      sources: [{ sourceId: 'manual', sourceType: 'manual', sourceName: 'Handmatig', quantity: qty }],
      checked: false,
    });
    resetManualForm();
    setManualModalVisible(false);
  };

  const handleAddFromRecipe = async (recipe: Recipe, ingredientIds: string[]) => {
    const filtered = recipe.ingredients.filter((ing) => ingredientIds.includes(ing.id));
    await addFromRecipe(filtered, recipe.id, recipe.title);
    setRecipeModalVisible(false);
  };

  const handleExportPdf = async () => {
    if (items.length === 0) {
      toast.error('Lege lijst', 'Voeg eerst items toe voordat je exporteert.');
      return;
    }
    haptics.light();
    try {
      await exportGroceryListAsPdf(items);
    } catch (err) {
      toast.error('PDF-export mislukt', err instanceof Error ? err.message : undefined);
    }
  };

  const renderItem = ({ item }: { item: ListRow }) => {
    if (item.type === 'header') {
      return <CategoryGroupHeader aisle={item.aisle} count={item.count} />;
    }
    return (
      <GroceryItemEnhanced
        item={item.data}
        onToggleCheck={(id) => toggleChecked(id)}
        onEdit={(groceryItem) => setEditItem(groceryItem)}
        onDelete={(id) => remove(id)}
      />
    );
  };

  const totalItems = visibleItems.length;
  const pct = totalItems ? Math.round((checkedCount / totalItems) * 100) : 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          {/* Folio */}
          <FolioStrip
            left={`lijst · ${totalItems} ${totalItems === 1 ? 'item' : 'items'}`}
            right={total > 0 ? `totaal · €${total.toFixed(2)}` : undefined}
          />

          {/* Masthead */}
          <View style={styles.masthead}>
            <EditorialTitle lead="De" tail="boodschappen." size={38} />
            <View style={styles.actionBtns}>
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => router.push('/grocery/scanner')}
                activeOpacity={0.75}
              >
                <Ionicons name="barcode-outline" size={16} color={colors.textDark} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() => setRecipeModalVisible(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="book-outline" size={15} color={colors.textDark} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={handleExportPdf}
                activeOpacity={0.75}
              >
                <Ionicons name="document-text-outline" size={15} color={colors.textDark} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ghostBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setManualModalVisible(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Winkel-filter — kies in welke winkel je bent */}
          {shopsInList.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <TouchableOpacity
                style={[styles.filterChip, !effectiveFilter && styles.filterChipActive]}
                onPress={() => { setStoreFilter(null); haptics.selection(); }}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipText, !effectiveFilter && styles.filterChipTextActive]}>
                  Alle
                </Text>
              </TouchableOpacity>
              {shopsInList.map((shop) => (
                <TouchableOpacity
                  key={shop.id}
                  style={[styles.filterChip, effectiveFilter === shop.id && styles.filterChipActive]}
                  onPress={() => { setStoreFilter(shop.id); haptics.selection(); }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      effectiveFilter === shop.id && styles.filterChipTextActive,
                    ]}
                  >
                    {shop.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Progress ribbon */}
          {totalItems > 0 && (
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>
                {checkedCount} van {totalItems} geplukt
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={[styles.progressLabel, { color: colors.secondary }]}>{pct}%</Text>
            </View>
          )}

          {/* Grouped list */}
          {totalItems === 0 ? (
            <View style={styles.empty}>
              <Text style={[typography.bodyItalic, { textAlign: 'center' }]}>
                Een lege lijst.{'\n'}Voeg iets toe of haal uit een recept.
              </Text>
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => setRecipeModalVisible(true)}
                activeOpacity={0.6}
              >
                <Text style={styles.emptyActionText}>+ haal uit een recept</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={listData}
              keyExtractor={(row) => (row.type === 'header' ? `h-${row.aisle}` : row.data.id)}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: spacing.md }}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
            />
          )}

          {/* Bulk actions */}
          <BulkActionsBar
            totalCount={totalItems}
            uncheckedCount={uncheckedCount}
            checkedCount={checkedCount}
            onSelectAllUnchecked={handleSelectAll}
            onClearChecked={handleClearChecked}
            onClearAll={handleClearAllAction}
            onShare={handleShareAction}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Manual add modal — unchanged from previous version */}
      <Modal
        visible={manualModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { resetManualForm(); setManualModalVisible(false); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => { resetManualForm(); setManualModalVisible(false); }}
                hitSlop={8}
              >
                <Ionicons name="close" size={22} color={colors.textLight} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Item toevoegen</Text>
              <TouchableOpacity onPress={handleSaveManual} disabled={!manualName.trim()} hitSlop={8}>
                <Text style={[styles.modalSave, !manualName.trim() && { opacity: 0.35 }]}>
                  Voeg toe
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Naam</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={manualName}
                  onChangeText={handleManualNameChange}
                  placeholder="bv. melk"
                  placeholderTextColor={colors.textFaint}
                  autoFocus
                  returnKeyType="next"
                />
              </View>

              <View style={styles.rowFields}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Hoeveelheid</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={manualQty}
                    onChangeText={setManualQty}
                    placeholder="1"
                    placeholderTextColor={colors.textFaint}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Eenheid</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={manualUnit}
                    onChangeText={setManualUnit}
                    placeholder="bv. liter"
                    placeholderTextColor={colors.textFaint}
                    returnKeyType="done"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Prijs (€)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={manualPrice}
                  onChangeText={setManualPrice}
                  placeholder="0.00"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Categorie</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.catChips}
                >
                  <TouchableOpacity
                    key="none"
                    style={[styles.catChip, manualCategory === '' && styles.catChipActive]}
                    onPress={() => setManualCategory('')}
                  >
                    <Text style={[styles.catChipText, manualCategory === '' && styles.catChipTextActive]}>
                      Geen
                    </Text>
                  </TouchableOpacity>
                  {groceryCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.catChip, manualCategory === cat.name && styles.catChipActive]}
                      onPress={() => setManualCategory(cat.name)}
                    >
                      <Text
                        style={[styles.catChipText, manualCategory === cat.name && styles.catChipTextActive]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Gang</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.catChips}
                >
                  {DEFAULT_AISLES.map((a) => (
                    <TouchableOpacity
                      key={a}
                      style={[styles.catChip, manualAisle === a && styles.catChipActive]}
                      onPress={() => handleManualAislePick(a)}
                    >
                      <Text
                        style={[styles.catChipText, manualAisle === a && styles.catChipTextActive]}
                      >
                        {a}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      <AddFromRecipeModal
        visible={recipeModalVisible}
        recipes={recipes}
        onConfirm={handleAddFromRecipe}
        onClose={() => setRecipeModalVisible(false)}
      />

      <GroceryItemDetailModal
        item={editItem}
        visible={!!editItem}
        onClose={() => setEditItem(null)}
        onSave={async (id, changes) => {
          await updateItem(id, changes);
          setEditItem(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  masthead: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  actionBtns: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  ghostBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
    backgroundColor: colors.background,
  },
  filterChipActive: { backgroundColor: colors.textDark, borderColor: colors.textDark },
  filterChipText: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textLight,
  },
  filterChipTextActive: { color: colors.background },

  progressRow: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.backgroundLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textDark,
  },
  progressTrack: {
    flex: 1,
    height: 2,
    backgroundColor: colors.borderSoft,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.secondary,
  },

  empty: {
    flex: 1,
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  emptyAction: {
    marginTop: spacing.lg,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: colors.borderColor,
  },
  emptyActionText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 14,
    color: colors.primary,
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
  modalContent: { padding: spacing.lg, gap: spacing.lg },
  fieldGroup: { gap: 6 },
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
  rowFields: { flexDirection: 'row', gap: spacing.md },
  catChips: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderColor,
    backgroundColor: colors.background,
  },
  catChipActive: { backgroundColor: colors.textDark, borderColor: colors.textDark },
  catChipText: { fontFamily: fonts.display, fontSize: 13, color: colors.textLight },
  catChipTextActive: { color: colors.background },
});
