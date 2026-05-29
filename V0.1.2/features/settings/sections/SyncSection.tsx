import { useCallback, useState } from 'react';
import { Modal, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';

import {
  getQueueDepth,
  getDeadRows,
  retryDeadRows,
  deleteQueueRow,
  flushQueue,
  type QueueRow,
} from '../../../services/sync/queue';
import { colors } from '../../../constants/Designsystem';
import { haptics, toast } from '../../../utils/feedback';
import { RuleWithLabel } from '../../../components/ui/EditorialBits';
import { styles } from '../styles';
import { Row } from './Row';

const ERROR_MAX = 200;

export function SyncSection() {
  const db = useSQLiteContext();
  const [queueDepth, setQueueDepth] = useState(0);
  const [deadRows, setDeadRows] = useState<QueueRow[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [depth, dead] = await Promise.all([getQueueDepth(db), getDeadRows(db)]);
      setQueueDepth(depth);
      setDeadRows(dead);
    } catch (err) {
      console.error('[settings] sync refresh failed:', err);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handlePullRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleRetry = async () => {
    if (retrying || deadRows.length === 0) return;
    setRetrying(true);
    haptics.light();
    try {
      await retryDeadRows(db);
      await flushQueue(db);
      await refresh();
      toast.success('Opnieuw geprobeerd', 'Vastgelopen items staan terug in de wachtrij.');
    } catch (err) {
      console.error('[settings] retry dead rows failed:', err);
      toast.error('Mislukt', err instanceof Error ? err.message : undefined);
    } finally {
      setRetrying(false);
    }
  };

  const handleDelete = async (id: string) => {
    haptics.light();
    try {
      await deleteQueueRow(db, id);
      await refresh();
    } catch (err) {
      console.error('[settings] delete queue row failed:', err);
    }
  };

  const closeModal = () => setModalVisible(false);

  return (
    <View style={styles.section}>
      <RuleWithLabel label="synchronisatie" bold />
      <View style={styles.sectionBody}>
        <Row label="in wachtrij" value={String(queueDepth)} inert />
        <Row
          label="vastgelopen"
          value={String(deadRows.length)}
          onPress={
            deadRows.length > 0
              ? () => {
                  haptics.light();
                  setModalVisible(true);
                }
              : undefined
          }
          inert={deadRows.length === 0}
          last
        />
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.syncModal} edges={['top']}>
          <View style={styles.syncModalHeader}>
            <Text style={styles.syncModalTitle}>vastgelopen · {deadRows.length}</Text>
            <TouchableOpacity
              style={styles.syncModalClose}
              onPress={closeModal}
              activeOpacity={0.75}
              hitSlop={8}
              accessibilityLabel="Sluiten"
            >
              <Ionicons name="close" size={18} color={colors.textDark} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.syncModalScroll}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handlePullRefresh} />
            }
          >
            {deadRows.length === 0 ? (
              <Text style={styles.syncModalEmpty}>Niets vastgelopen — alles loopt door.</Text>
            ) : (
              deadRows.map((row) => (
                <View key={row.id} style={styles.deadRow}>
                  <View style={styles.deadRowBody}>
                    <Text style={styles.deadRowEntity}>
                      {row.entity} · {row.op}
                    </Text>
                    <Text style={styles.deadRowError}>
                      {(row.last_error ?? 'onbekende fout').slice(0, ERROR_MAX)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(row.id)}
                    activeOpacity={0.65}
                    hitSlop={8}
                  >
                    <Text style={styles.deadRowDelete}>verwijder</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          {deadRows.length > 0 && (
            <View style={styles.syncRetryWrap}>
              <TouchableOpacity
                onPress={handleRetry}
                activeOpacity={0.7}
                disabled={retrying}
                style={[styles.backupAction, styles.backupActionSecondary]}
              >
                <Ionicons
                  name="refresh-outline"
                  size={14}
                  color={colors.textDark}
                  style={styles.backupIcon}
                />
                <Text style={[styles.backupActionLabel, { color: colors.textDark }]}>
                  {retrying ? 'bezig…' : 'probeer opnieuw'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}
