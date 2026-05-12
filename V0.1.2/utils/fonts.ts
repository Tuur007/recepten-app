import {
  useFonts as useFraunces,
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
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
  const [loaded, error] = useFraunces({
    Fraunces_400Regular,
    // Register under the legacy alias used across the design system so existing
    // `fontFamily: 'Fraunces_400Italic'` references keep working after v0.3.0
    // renamed the export to Fraunces_400Regular_Italic.
    Fraunces_400Italic: Fraunces_400Regular_Italic,
    Fraunces_500Medium,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });
  // Treat a load error as "ready" so the app never stays stuck on the
  // loading screen — it will render with system fonts as fallback.
  return loaded || error != null;
}
