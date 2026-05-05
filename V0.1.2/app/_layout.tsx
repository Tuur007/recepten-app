import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense } from 'react';

import { useEditorialFonts } from '../utils/fonts';
import { colors } from '../constants/Designsystem';
import { LoadingScreen } from '../components/LoadingScreen';
import { initializeDatabase } from '../database';

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
      <Suspense fallback={<LoadingScreen />}>
        <SQLiteProvider databaseName="recepten.db" onInit={initializeDatabase}>
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
  <Stack.Screen name="recipes/search" options={{ headerShown: false }} />
  <Stack.Screen name="recipes/new" options={{ title: 'Nieuw recept' }} />
  <Stack.Screen name="recipes/import" options={{ title: 'Importeren' }} />
  <Stack.Screen name="recipes/edit/[id]" options={{ headerShown: false }} />
</Stack>
        </SQLiteProvider>
      </Suspense>
    </SafeAreaProvider>
  );
}
