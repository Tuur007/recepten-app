// app/collections/[id].tsx
//
// Detailweergave van één collectie: lijst recipes binnen de collectie + UI
// om nieuwe recepten toe te voegen vanuit de volledige bibliotheek.

import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useCollections } from '../../store/collectionsStore';
import { useRecipes } from '../../features/recipes/hooks';
import { LoadingScreen } from '../../components/LoadingScreen';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';
import { useThemeColors } from '../../theme';
import { haptics, toast } from '../../utils/feedback';
import {
  FolioStrip,
  EditorialTitle,
  RuleWithLabel,
} from '../../components/ui/EditorialBits';

function splitTail(s: string) {
  const w = s.trim().split(' ');
  if (w.length < 2) return { lead: s, tail: '' };
  return { lead: w.slice(0, -1).join(' '), tail: w[w.length - 1] };
}

export default function CollectionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const themeColors = useThemeColors();
  const { collections, isLoading, remove, addRecipe, removeRecipe } = useCollections();
  const { recipes } = useRecipes();

  const [pickerVisible, setPickerVisible] = useState(false);

  const collection = collections.find((c) => c.id === id);

  const includedRecipes = useMemo(() => {
    if (!collection) return [];
    return collection.recipeIds
      .map((rid) => recipes.find((r) => r.id === rid))
      .filter((r): r is NonNullable<typeof r> => r != null);
  }, [collection, recipes]);

  const availableToAdd = useMemo(() => {
    if (!collection) return [];
    const inside = new Set(collection.recipeIds);
    return recipes.filter((r) => !inside.has(r.id));
  }, [collection, recipes]);

  if (isLoading) return <LoadingScreen />;

  if (!collection) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={typography.folio}>niet gevonden</Text>
          <View style={{ width: 22 }} />
        </View>
        <Text style={[typography.bodyItalic, { textAlign: 'center', marginTop: 40 }]}>
          Collectie niet gevonden.
        </Text>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    Alert.alert('Verwijderen', `"${collection.name}" verwijderen?`, [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: async () => {
          await remove(collection.id);
          haptics.success();
          router.back();
        },
      },
    ]);
  };

  const handleRemove = async (recipeId: string) => {
    await removeRecipe(collection.id, recipeId);
    haptics.medium();
  };

  const handleAdd = async (recipeId: string) => {
    await addRecipe(collection.id, recipeId);
    haptics.light();
    toast.success('Toegevoegd');
  };

  const { lead, tail } = splitTail(collection.name);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={typography.folio}>collectie</Text>
        <TouchableOpacity onPress={handleDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={colors.textLight} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <FolioStrip
          left={`${includedRecipes.length} ${includedRecipes.length === 1 ? 'recept' : 'recepten'}`}
          right="collectie"
        />

        <View style={styles.titleBlock}>
          <EditorialTitle lead={lead} tail={tail ? `${tail}.` : `${collection.name}.`} size={40} />
        </View>

        {collection.description ? (
          <Text style={styles.intro}>{collection.description}</Text>
        ) : null}

        <TouchableOpacity
          style={styles.newLine}
          activeOpacity={0.6}
          onPress={() => setPickerVisible(true)}
        >
          <Text style={styles.newLineText}>+ recepten toevoegen</Text>
          <Text style={[typography.folio, { color: colors.primary }]}>
            {availableToAdd.length} beschikbaar
          </Text>
        </TouchableOpacity>

        {includedRecipes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[typography.bodyItalic, { textAlign: 'center' }]}>
              Nog geen recepten.{'\n'}Voeg er één toe om te beginnen.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
            <RuleWithLabel label="in deze collectie" bold />
            {includedRecipes.map((r, i) => (
              <TouchableOpacity
                key={r.id}
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => router.push(`/recipes/${r.id}`)}
                onLongPress={() => {
                  Alert.alert('Verwijderen uit collectie', `"${r.title}" verwijderen?`, [
                    { text: 'Annuleren', style: 'cancel' },
                    { text: 'Verwijderen', style: 'destructive', onPress: () => handleRemove(r.id) },
                  ]);
                }}
              >
                {r.imageUri ? (
                  <Image source={{ uri: r.imageUri }} style={styles.rowThumb} />
                ) : (
                  <View style={[styles.rowThumb, { backgroundColor: colors.backgroundLight }]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowIdx}>· {String(i + 1).padStart(2, '0')}</Text>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {r.title}
                  </Text>
                  {r.category ? (
                    <Text style={styles.rowCat}>{r.category.toLowerCase()}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={pickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerVisible(false)}
      >
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPickerVisible(false)} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textLight} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Recept kiezen</Text>
            <View style={{ width: 22 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 4 }}>
            {availableToAdd.length === 0 ? (
              <Text style={[typography.bodyItalic, { textAlign: 'center', marginTop: spacing.xl }]}>
                Alle recepten zitten al in deze collectie.
              </Text>
            ) : (
              availableToAdd.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={styles.pickerRow}
                  activeOpacity={0.7}
                  onPress={() => handleAdd(r.id)}
                >
                  {r.imageUri ? (
                    <Image source={{ uri: r.imageUri }} style={styles.pickerThumb} />
                  ) : (
                    <View style={[styles.pickerThumb, { backgroundColor: colors.backgroundLight }]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{r.title}</Text>
                    {r.category ? (
                      <Text style={styles.rowCat}>{r.category.toLowerCase()}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
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
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
    gap: 12,
  },
  rowThumb: {
    width: 54,
    height: 54,
  },
  rowIdx: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  rowTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textDark,
    marginTop: 2,
  },
  rowCat: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
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
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  pickerThumb: {
    width: 44,
    height: 44,
  },
});
