import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';

import { useEditorialFonts } from '../utils/fonts';
import { colors } from '../constants/Designsystem';
import { LoadingScreen } from '../components/LoadingScreen';
import { SplashScreen } from '../components/Splashscreen';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { initializeDatabase, seedStarterRecipes } from '../database';
import { toastConfig } from '../components/ui/ToastConfig';
import { useHydrateTheme, useResolvedScheme, useThemeColors } from '../theme';
import { useFamilyStore, useHydrateFamily } from '../store/familyStore';
import { useHydrateShops } from '../store/shopsStore';
import { LOCK_ENABLED, useHydrateLock, useLockStore } from '../store/lockStore';
import { useHydrateWeekPlanner } from '../store/weekPlannerStore';
import { useSupabaseSync } from '../services/sync/lifecycle';

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
          <SQLiteProvider
            databaseName="recepten.db"
            onInit={async (db) => {
              await initializeDatabase(db);
              await seedStarterRecipes(db);
            }}
          >
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
  useHydrateFamily();
  useHydrateShops();
  useHydrateWeekPlanner();
  useHydrateLock();
  useSupabaseSync();
  const themeColors = useThemeColors();
  const scheme = useResolvedScheme();

  const router = useRouter();
  const segments = useSegments();
  const firstSegment = segments[0];
  const familyHydrated = useFamilyStore((s) => s.hydrated);
  const onboardingComplete = useFamilyStore((s) => s.onboardingComplete);
  const lockHydrated = useLockStore((s) => s.hydrated);
  const unlocked = useLockStore((s) => s.unlocked);

  useEffect(() => {
    if (!familyHydrated || !lockHydrated) return;
    const onLock = firstSegment === 'lock';
    const onOnboarding = firstSegment === 'onboarding';

    // 1. Toegangsslot — alleen relevant als er een code is ingesteld.
    if (LOCK_ENABLED && !unlocked) {
      if (!onLock) router.replace('/lock');
      return;
    }
    // Ontgrendeld maar nog op het slot-scherm → door naar de app.
    if (onLock) {
      router.replace(onboardingComplete ? '/(tabs)/home' : '/onboarding');
      return;
    }
    // 2. Onboarding-gate.
    if (!onboardingComplete && !onOnboarding) {
      router.replace('/onboarding');
    } else if (onboardingComplete && onOnboarding) {
      router.replace('/(tabs)/home');
    }
  }, [familyHydrated, lockHydrated, unlocked, onboardingComplete, firstSegment, router]);

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
        <Stack.Screen
          name="lock"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="recipes/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="recipes/search" options={{ headerShown: false }} />
        <Stack.Screen name="recipes/new" options={{ headerShown: false }} />
        <Stack.Screen name="recipes/import" options={{ headerShown: false }} />
        <Stack.Screen name="recipes/edit/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="collections/index" options={{ headerShown: false }} />
        <Stack.Screen name="collections/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="grocery/scanner" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
