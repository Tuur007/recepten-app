// app/grocery/scanner.tsx
//
// Barcode-scanner voor boodschappen. Gebruikt `expo-camera`'s CameraView met
// `onBarcodeScanned`. Na een succesvolle scan:
//
//   1. zoeken we het product op via Open Food Facts (`getProductByBarcode`)
//   2. tonen we een bevestigings-card met naam + merk + thumbnail
//   3. voegen we het toe aan de boodschappenlijst (1 stuk) bij bevestiging
//
// Bij een onbekende barcode tonen we een handmatig-invoer-fallback met de
// EAN-code voorgevuld, zodat de gebruiker het product alsnog kan toevoegen.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { useGrocery } from '../../features/grocery/hooks';
import { getProductByBarcode, type OFFProduct } from '../../services/openFoodFacts';
import { getAisleForItem } from '../../constants/aisles';
import { colors, spacing, typography, fonts } from '../../constants/Designsystem';
import { useThemeColors } from '../../theme';
import { haptics, toast } from '../../utils/feedback';
import { EditorialTitle } from '../../components/ui/EditorialBits';

type ScanState =
  | { phase: 'scanning' }
  | { phase: 'looking_up'; code: string }
  | { phase: 'found'; code: string; product: OFFProduct }
  | { phase: 'unknown'; code: string; nameDraft: string };

export default function BarcodeScannerScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const [permission, requestPermission] = useCameraPermissions();
  const { addManual } = useGrocery();

  const [state, setState] = useState<ScanState>({ phase: 'scanning' });
  // Mutex tegen razendsnel triggeren van onBarcodeScanned terwijl we al
  // bezig zijn met een lookup.
  const busy = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleScan = useCallback(
    async (data: string) => {
      if (busy.current) return;
      busy.current = true;
      haptics.selection();
      setState({ phase: 'looking_up', code: data });
      try {
        const product = await getProductByBarcode(data);
        if (product) {
          setState({ phase: 'found', code: data, product });
        } else {
          setState({ phase: 'unknown', code: data, nameDraft: '' });
        }
      } catch (err) {
        console.error('[scanner] lookup failed:', err);
        setState({ phase: 'unknown', code: data, nameDraft: '' });
      }
    },
    [],
  );

  const resetScan = () => {
    busy.current = false;
    setState({ phase: 'scanning' });
  };

  const addProduct = async (name: string, brand?: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const fullName = brand ? `${trimmedName} (${brand})` : trimmedName;
    try {
      await addManual({
        name: fullName,
        unit: 'stuks',
        category: '',
        aisle: getAisleForItem(trimmedName),
        sources: [
          { sourceId: 'barcode', sourceType: 'manual', sourceName: 'Barcode', quantity: 1 },
        ],
        checked: false,
      });
      haptics.success();
      toast.success('Toegevoegd', fullName);
      resetScan();
    } catch (err) {
      toast.error('Niet toegevoegd', err instanceof Error ? err.message : undefined);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={typography.folio}>scanner</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={[styles.center, { flex: 1, paddingHorizontal: spacing.lg }]}>
          <EditorialTitle lead="Cameratoegang" tail="nodig." size={32} align="center" />
          <Text
            style={[
              typography.bodyItalic,
              { textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.lg },
            ]}
          >
            Geef de app toestemming om de camera te gebruiken om barcodes te
            scannen.
          </Text>
          <TouchableOpacity onPress={requestPermission} style={styles.primaryBtn}>
            <Text style={typography.buttonLabel}>geef toegang</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]} edges={['top']}>
      <View style={styles.cameraHeader}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={[typography.folio, { color: '#fff' }]}>scan een barcode</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={{ flex: 1 }}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
          }}
          onBarcodeScanned={
            state.phase === 'scanning'
              ? ({ data }) => handleScan(data)
              : undefined
          }
        />
        <View style={styles.scanFrame} pointerEvents="none">
          <View style={styles.scanRect} />
          <Text style={styles.scanHint}>
            houd de camera op de barcode
          </Text>
        </View>
      </View>

      {state.phase === 'looking_up' && (
        <View style={styles.resultCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.resultCode}>{state.code}</Text>
          <Text style={styles.resultHint}>Zoeken in Open Food Facts…</Text>
        </View>
      )}

      {state.phase === 'found' && (
        <View style={styles.resultCard}>
          <View style={styles.foundRow}>
            {state.product.imageUrl ? (
              <Image source={{ uri: state.product.imageUrl }} style={styles.foundThumb} />
            ) : (
              <View style={[styles.foundThumb, { backgroundColor: colors.backgroundLight }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.foundName} numberOfLines={2}>
                {state.product.productName || 'Onbekend product'}
              </Text>
              {state.product.brand ? (
                <Text style={styles.foundBrand}>{state.product.brand}</Text>
              ) : null}
              <Text style={styles.resultCode}>{state.code}</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={resetScan}>
              <Text style={[typography.buttonLabel, { color: colors.textDark }]}>opnieuw</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() =>
                addProduct(
                  state.product.productName || 'Onbekend product',
                  state.product.brand,
                )
              }
            >
              <Text style={typography.buttonLabel}>voeg toe</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {state.phase === 'unknown' && (
        <View style={styles.resultCard}>
          <Text style={styles.foundName}>Geen product gevonden</Text>
          <Text style={styles.resultCode}>{state.code}</Text>
          <Text style={styles.resultHint}>Tik een naam in om het toch toe te voegen.</Text>
          <TextInput
            value={state.nameDraft}
            onChangeText={(v) => setState({ ...state, nameDraft: v })}
            placeholder="bv. melk halfvol"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoFocus
          />
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={resetScan}>
              <Text style={[typography.buttonLabel, { color: colors.textDark }]}>opnieuw</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, !state.nameDraft.trim() && { opacity: 0.4 }]}
              disabled={!state.nameDraft.trim()}
              onPress={() => addProduct(state.nameDraft)}
            >
              <Text style={typography.buttonLabel}>voeg toe</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanFrame: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanRect: {
    width: 280,
    height: 160,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  scanHint: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.md,
  },
  resultCard: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: spacing.sm,
  },
  foundRow: { flexDirection: 'row', gap: 12 },
  foundThumb: { width: 64, height: 64, borderRadius: 4 },
  foundName: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.textDark,
  },
  foundBrand: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
  },
  resultCode: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.textFaint,
    marginTop: 4,
  },
  resultHint: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textLight,
  },
  input: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.textDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    paddingVertical: 8,
    marginTop: spacing.sm,
  },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.textDark,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
});
