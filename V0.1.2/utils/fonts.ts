import {
  useFonts as useDisplay,
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
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
  const [loaded, error] = useDisplay({
    // Cormorant Garamond is geserveerd onder de bestaande Fraunces-aliassen
    // zodat alle 'fontFamily: Fraunces_xxx' references in de codebase blijven
    // werken zonder die te touchen.
    Fraunces_400Regular: CormorantGaramond_500Medium,
    Fraunces_400Italic: CormorantGaramond_500Medium_Italic,
    Fraunces_500Medium: CormorantGaramond_600SemiBold,
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
