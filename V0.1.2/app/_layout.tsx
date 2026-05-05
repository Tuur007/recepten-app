/**
 * 🎨 ROOT LAYOUT — Onze Tafel Editorial
 *
 * Vervang: V0.1.2/app/_layout.tsx
 *
 * Verandert: laadt Fraunces / Inter / JetBrains Mono fonts vóór render.
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';

import { useEditorialFonts } from '../utils/fonts';
import { colors } from '../constants/Designsystem';
import { LoadingScreen } from '../components/LoadingScreen';

export default function RootLayout() {
  const fontsLoaded = useEditorialFonts();

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingScreen />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textDark,
          headerTitleStyle: { fontFamily: 'Fraunces_400Regular', fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recipes/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="recipes/new" options={{ title: 'Nieuw recept' }} />
        <Stack.Screen name="recipes/import" options={{ title: 'Importeren' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
