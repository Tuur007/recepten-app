import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '../../theme';
import { spacing, fonts } from '../../constants/Designsystem';
import { FolioStrip, EditorialTitle, RuleWithLabel } from '../../components/ui/EditorialBits';
import { Button } from '../../components/ui/Button';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { useAuthStore } from '../../store/authStore';
import { redeemInviteCode } from '../../services/inviteService';

export default function RegisterScreen() {
  const themeColors = useThemeColors();
  const router = useRouter();
  const { signUp, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister() {
    setEmailError('');
    setPasswordError('');
    setCodeError('');

    if (!email.trim()) { setEmailError('E-mailadres is verplicht.'); return; }
    if (password.length < 8) { setPasswordError('Wachtwoord moet minstens 8 tekens zijn.'); return; }

    setSubmitting(true);
    try {
      await signUp(email.trim(), password);

      // Wacht tot onAuthStateChange de user heeft gezet i.p.v. een broze
      // vaste setTimeout; waitForUser throwt met een Dutch melding na time-out.
      await useAuthStore.getState().waitForUser();

      if (inviteCode.trim()) {
        const familyId = await redeemInviteCode(inviteCode.trim());
        useAuthStore.getState().setFamilyId(familyId);
      } else {
        // Geen code → gezin aanmaken als eigenaar
        router.replace('/auth/family-setup');
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registratie mislukt.';
      if (message.toLowerCase().includes('uitnodig') || message.toLowerCase().includes('invite') || message.toLowerCase().includes('code')) {
        setCodeError(message);
      } else {
        Toast.show({ type: 'error', text1: 'Registratie mislukt', text2: message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.closeBtn, { borderColor: themeColors.borderColor }]}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            activeOpacity={0.75}
            hitSlop={8}
            accessibilityLabel="Sluiten"
          >
            <Ionicons name="close" size={18} color={themeColors.textDark} />
          </TouchableOpacity>
        </View>

        <FolioStrip left="recepten" right="registreren" />

        <View style={styles.titleBlock}>
          <EditorialTitle lead="Nieuw" tail="account." size={38} />
        </View>

        <Text style={[styles.intro, { color: themeColors.textLight }]}>
          Maak een account aan. Heb je een uitnodigingscode? Vul die in om lid te worden van een bestaand gezin. Anders maak je daarna een nieuw gezin aan.
        </Text>

        <View style={styles.form}>
          <RuleWithLabel label="jouw gegevens" bold />

          <View style={styles.fieldGroup}>
            <AppTextInput
              label="E-mailadres"
              value={email}
              onChangeText={setEmail}
              error={emailError}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <AppTextInput
              label="Wachtwoord"
              value={password}
              onChangeText={setPassword}
              error={passwordError}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
          </View>

          <RuleWithLabel label="uitnodigingscode (optioneel)" bold />

          <View style={styles.fieldGroup}>
            <AppTextInput
              label="Code (bijv. ABCD-EFGH-1234)"
              value={inviteCode}
              onChangeText={setInviteCode}
              error={codeError}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <Button
            label="Registreren"
            onPress={handleRegister}
            loading={isLoading || submitting}
            fullWidth
            haptic={false}
          />

          <View style={styles.linkRow}>
            <Text style={[styles.linkText, { color: themeColors.textLight }]}>
              Al een account?{' '}
            </Text>
            <Text
              style={[styles.linkText, styles.link, { color: themeColors.primary }]}
              onPress={() => router.push('/auth/login')}
            >
              Inloggen
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: spacing.xxl },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
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
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm },
  linkText: { fontFamily: fonts.body, fontSize: 13 },
  link: { textDecorationLine: 'underline' },
});
