import { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';

import {
  exportAppData,
  importAppData,
  loadLastExportAt,
  pickAndPreviewImport,
  shareExport,
  type AppExport,
} from '../../../services/sync';
import { requestNotificationPermission } from '../../../services/notifications';
import { colors } from '../../../constants/Designsystem';
import { haptics, toast } from '../../../utils/feedback';
import { RuleWithLabel } from '../../../components/ui/EditorialBits';
import { styles, formatExportDate } from '../styles';
import { Row } from './Row';

export function BackupSection() {
  const db = useSQLiteContext();
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadLastExportAt(db).then(setLastExportAt).catch(() => {});
  }, [db]);

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
          { text: 'Annuleren', style: 'cancel', onPress: () => setImporting(false) },
          { text: 'Importeren', onPress: () => runImport(data) },
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

  return (
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
            style={styles.backupIcon}
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
          <Ionicons name="download-outline" size={14} color={colors.textDark} style={styles.backupIcon} />
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
  );
}
