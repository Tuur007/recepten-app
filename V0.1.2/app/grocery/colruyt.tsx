// app/grocery/colruyt.tsx
//
// Zoekscherm dat producten uit het Colruyt-assortiment opzoekt en — bij
// bevestiging — toevoegt aan de boodschappenlijst, mét prijs en (indien
// gekend) barcode. Bedoeld als snel-toevoegen workflow voor mensen die hun
// week-aankopen vanaf de Colruyt-catalogus willen samenstellen.

import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { searchColruytProducts, type ColruytProduct } from '../../services/colruyt';
import { useGrocery } from '../../features/grocery/hooks';
import { getAisleForItem } from '../../constants/aisles';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';
import { useThemeColors } from '../../theme';
import { EditorialTitle, FolioStrip } from '../../components/ui/EditorialBits';

export default function ColruytSearchScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const { addManual } = useGrocery();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ColruytProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce — 350ms is genoeg om geen API-spam te genereren maar wel snappy te
  // voelen tijdens het typen.
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    const t = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      searchColruytProducts(query, { limit: 20, signal: controller.signal })
        .then((items) => setResults(items))
        .catch((err) => {
          if (err instanceof Error && err.name !== 'AbortError') {
            console.warn('[colruyt] search error:', err);
          }
        })
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const handlePick = async (p: ColruytProduct) => {
    try {
      await addManual({
        name: p.name,
        unit: 'stuks',
        category: '',
        aisle: getAisleForItem(p.name),
        price: p.price,
        sources: [
          { sourceId: 'colruyt', sourceType: 'manual', sourceName: 'Colruyt', quantity: 1 },
        ],
        checked: false,
      });
      // addManual toast't zelf al.
    } catch {
      // useGrocery toast't bij fout.
    }
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
        <Text style={typography.folio}>colruyt</Text>
        <View style={{ width: 22 }} />
      </View>

      <FolioStrip left="zoek in het assortiment" right="met prijs" />

      <View style={styles.titleBlock}>
        <EditorialTitle lead="Bij" tail="Colruyt." size={36} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.textLight} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="zoek een product…"
          placeholderTextColor={colors.textFaint}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : results.length === 0 && query.trim().length > 0 ? (
        <View style={styles.center}>
          <Text style={[typography.bodyItalic, { textAlign: 'center' }]}>
            Geen treffers in het Colruyt-assortiment.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => handlePick(item)}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { backgroundColor: colors.backgroundLight }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}
                {item.unitPrice ? (
                  <Text style={styles.unitPrice}>{item.unitPrice}</Text>
                ) : null}
              </View>
              {item.price != null ? (
                <Text style={styles.price}>€{item.price.toFixed(2)}</Text>
              ) : null}
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        />
      )}
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
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  searchBar: {
    marginHorizontal: spacing.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
    paddingVertical: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
    gap: 12,
  },
  thumb: { width: 50, height: 50, borderRadius: 4 },
  name: { fontFamily: fonts.display, fontSize: 14, color: colors.textDark, lineHeight: 18 },
  brand: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  unitPrice: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.textFaint,
    marginTop: 2,
  },
  price: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.textDark,
  },
});
