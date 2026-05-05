/**
 * 🔤 FONT LOADER — Onze Tafel Editorial
 *
 * Plaats dit bestand op: V0.1.2/utils/fonts.ts
 *
 * INSTALLEREN (run in V0.1.2/):
 *   npx expo install expo-font @expo-google-fonts/fraunces @expo-google-fonts/inter @expo-google-fonts/jetbrains-mono
 *
 * Daarna gebruiken in V0.1.2/app/_layout.tsx:
 *   import { useEditorialFonts } from '../utils/fonts';
 *   const fontsLoaded = useEditorialFonts();
 *   if (!fontsLoaded) return null;
 */

import {
  useFonts as useFraunces,
  Fraunces_400Regular,
  Fraunces_400Italic,
  Fraunces_500Medium,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';

export function useEditorialFonts(): boolean {
  const [loaded] = useFraunces({
    Fraunces_400Regular,
    Fraunces_400Italic,
    Fraunces_500Medium,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });
  return loaded;
}
