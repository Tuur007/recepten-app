import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useState } from 'react';
import Toast from 'react-native-toast-message';

import { useEditorialFonts } from '../utils/fonts';
import { colors } from '../constants/Designsystem';
import { LoadingScreen } from '../components/LoadingScreen';
import { SplashScreen } from '../components/Splashscreen';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { initializeDatabase } from '../database';
import { toastConfig } from '../components/ui/ToastConfig';
import { useHydrateTheme, useResolvedScheme, useThemeColors } from '../theme';

export default function RootLayout() {
  const fontsLoaded = useEditorialFonts();
  const [showSplash, setShowSplash] = useState(true);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingScreen />
      </View>
    );
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <SQLiteProvider databaseName="recepten.db" onInit={initializeDatabase}>
            <ThemedRoot />
          </SQLiteProvider>
        </Suspense>
      </ErrorBoundary>
      <Toast config={toastConfig} />
    </SafeAreaProvider>
  );
}

function ThemedRoot() {
  useHydrateTheme();
  const themeColors = useThemeColors();
  const scheme = useResolvedScheme();

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: themeColors.background },
          headerTintColor: themeColors.textDark,
          headerTitleStyle: { fontFamily: 'Fraunces_400Regular', fontSize: 17 },
          headerShadowVisible: false,
          headerBackTitle: 'Terug',
          contentStyle: { backgroundColor: themeColors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recipes/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="recipes/search" options={{ headerShown: false }} />
        <Stack.Screen name="recipes/new" options={{ headerShown: false }} />
        <Stack.Screen name="recipes/import" options={{ headerShown: false }} />
        <Stack.Screen name="recipes/edit/[id]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
