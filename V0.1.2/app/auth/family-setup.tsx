import { useState } from 'react';
import { warn } from '../../utils/logger';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '../../theme';
import { spacing, fonts } from '../../constants/Designsystem';
import { FolioStrip, EditorialTitle, RuleWithLabel } from '../../components/ui/EditorialBits';
import { Button } from '../../components/ui/Button';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { useFamilyStore } from '../../store/familyStore';
import { applyPendingProfile } from '../../services/familyMembers';

export default function FamilySetupScreen() {
  const themeColors = useThemeColors();
  const db = useSQLiteContext();
  const { user, setFamilyId } = useAuthStore();

  // Voorvullen met de naam uit onboarding (lokaal), indien aanwezig.
  const [familyName, setFamilyName] = useState(useFamilyStore.getState().familyName);
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setNameError('');
    if (!familyName.trim()) {
      setNameError('Naam van je gezin is verplicht.');
      return;
    }
    if (!user) {
      Toast.show({ type: 'error', text1: 'Niet ingelogd', text2: 'Log eerst in.' });
      return;
    }
    if (!supabase) {
      Toast.show({ type: 'error', text1: 'Supabase niet geconfigureerd' });
      return;
    }

    setLoading(true);
    try {
      // Atomisch (gezin + owner-lidmaatschap in één transactie) — twee losse
      // inserts lieten bij een fout een gezin zonder leden achter. Zie
      // supabase/migrations/create_family_atomic.sql.
      const { data: familyId, error: createError } = await supabase.rpc(
        'create_family_with_owner',
        { family_name: familyName.trim() },
      );

      if (createError || !familyId) {
        throw createError ?? new Error('Gezin aanmaken mislukt.');
      }

      // Pas een in onboarding bewaard profiel toe op de zojuist aangemaakte rij.
      await applyPendingProfile(db).catch((e) =>
        warn('[family-setup] applyPendingProfile failed:', e),
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFamilyId(familyId as string);
      // Auth guard in _layout will redirect to onboarding or (tabs)/home
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gezin aanmaken mislukt.';
      Toast.show({ type: 'error', text1: 'Fout', text2: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FolioStrip left="recepten" right="gezin aanmaken" />

        <View style={styles.titleBlock}>
          <EditorialTitle lead="Jouw" tail="gezin." size={38} />
        </View>

        <Text style={[styles.intro, { color: themeColors.textLight }]}>
          Geef je gezin een naam. Je kunt daarna gezinsleden uitnodigen via een uitnodigingscode.
        </Text>

        <View style={styles.form}>
          <RuleWithLabel label="gezinsnaam" bold />

          <View style={styles.fieldGroup}>
            <AppTextInput
              label='Bijv. "Familie Janssen"'
              value={familyName}
              onChangeText={setFamilyName}
              error={nameError}
              autoCapitalize="words"
            />
          </View>

          <Button
            label="Gezin aanmaken"
            onPress={handleCreate}
            loading={loading}
            fullWidth
            haptic={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: spacing.xxl },
  titleBlock: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  intro: {
    fontFamily: fonts.displayItalic,
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  form: { paddingHorizontal: spacing.lg, gap: spacing.md },
  fieldGroup: { gap: spacing.sm, marginTop: spacing.sm },
});
