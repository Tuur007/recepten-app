import { Alert, Linking } from 'react-native';

export async function safeOpenUrl(url: string): Promise<void> {
  if (!url || !url.trim()) {
    Alert.alert('Link is leeg', 'Er is geen URL beschikbaar.');
    return;
  }

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Kan URL niet openen', 'Je browser kan deze link niet openen.');
      return;
    }
    await Linking.openURL(url);
  } catch (err) {
    console.error('[safeOpenUrl]', err);
    Alert.alert('Fout', 'Kon link niet openen. Probeer opnieuw.');
  }
}
