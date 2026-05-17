import { Alert, Linking } from 'react-native';

export async function safeOpenUrl(url: string): Promise<void> {
  const trimmed = url?.trim() ?? '';
  if (!trimmed) {
    Alert.alert('Link is leeg', 'Er is geen URL beschikbaar.');
    return;
  }

  // Only allow http(s) — block javascript: and other dangerous schemes.
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    Alert.alert('Ongeldige link', 'De URL heeft een ongeldig formaat.');
    return;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    Alert.alert('Ongeldige link', 'Alleen http(s)-links kunnen worden geopend.');
    return;
  }

  try {
    const canOpen = await Linking.canOpenURL(trimmed);
    if (!canOpen) {
      Alert.alert('Kan URL niet openen', 'Je browser kan deze link niet openen.');
      return;
    }
    await Linking.openURL(trimmed);
  } catch (err) {
    console.error('[safeOpenUrl]', err);
    Alert.alert('Fout', 'Kon link niet openen. Probeer opnieuw.');
  }
}
