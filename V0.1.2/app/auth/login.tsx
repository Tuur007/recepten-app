import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '../../theme';
import { spacing, fonts } from '../../constants/Designsystem';
import { FolioStrip, EditorialTitle, RuleWithLabel } from '../../components/ui/EditorialBits';
import { Button } from '../../components/ui/Button';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen() {
  const themeColors = useThemeColors();
  const router = useRouter();
  const { signIn, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  async function handleLogin() {
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) { setEmailError('E-mailadres is verplicht.'); return; }
    if (!password) { setPasswordError('Wachtwoord is verplicht.'); return; }

    try {
      await signIn(email.trim(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Inloggen mislukt.';
      Toast.show({ type: 'error', text1: 'Inloggen mislukt', text2: message });
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FolioStrip left="recepten" right="inloggen" />

        <View style={styles.titleBlock}>
          <EditorialTitle lead="Welkom" tail="terug." size={38} />
        </View>

        <Text style={[styles.intro, { color: themeColors.textLight }]}>
          Log in om je recepten en boodschappen te synchroniseren met je gezin.
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
              autoComplete="password"
              textContentType="password"
            />
          </View>

          <Button
            label="Inloggen"
            onPress={handleLogin}
            loading={isLoading}
            fullWidth
            haptic={false}
          />

          <View style={styles.linkRow}>
            <Text style={[styles.linkText, { color: themeColors.textLight }]}>
              Nog geen account?{' '}
            </Text>
            <Text
              style={[styles.linkText, styles.link, { color: themeColors.primary }]}
              onPress={() => router.push('/auth/register')}
            >
              Registreer hier
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
  fieldGroup: { gap: spacing.sm, marginTop: spacing.md },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm },
  linkText: { fontFamily: fonts.body, fontSize: 13 },
  link: { textDecorationLine: 'underline' },
});
