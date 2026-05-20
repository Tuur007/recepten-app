import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, Linking, View } from 'react-native';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { Suspense, useEffect, useRef, useState } from 'react';
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
import { useHydrateWeekPlanner } from '../store/weekPlannerStore';
import { useAuthStore } from '../store/authStore';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { fetchSharedRecipe } from '../services/recipeShareService';
import { RecipeRepository } from '../features/recipes/repository';
import { useRecipeStore } from '../store/recipeStore';

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
  useNetworkSync();
  const themeColors = useThemeColors();
  const scheme = useResolvedScheme();
  const db = useSQLiteContext();

  const router = useRouter();
  const segments = useSegments();
  const firstSegment = segments[0];
  const familyHydrated = useFamilyStore((s) => s.hydrated);
  const onboardingComplete = useFamilyStore((s) => s.onboardingComplete);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const session = useAuthStore((s) => s.session);
  const familyId = useAuthStore((s) => s.familyId);
  const authInitRef = useRef(false);

  // Initialize auth once on mount
  useEffect(() => {
    if (authInitRef.current) return;
    authInitRef.current = true;
    useAuthStore.getState().initialize().catch(console.error);
  }, []);

  // Auth-based routing
  useEffect(() => {
    if (!familyHydrated || !isInitialized) return;

    const onAuth = firstSegment === 'auth';
    const onOnboarding = firstSegment === 'onboarding';

    if (!session) {
      if (!onAuth) router.replace('/auth/login');
    } else if (!familyId) {
      router.replace('/auth/family-setup');
    } else if (!onboardingComplete && !onOnboarding) {
      router.replace('/onboarding');
    } else if (onboardingComplete && (onAuth || onOnboarding)) {
      router.replace('/(tabs)/home');
    }
  }, [familyHydrated, isInitialized, session, familyId, onboardingComplete, firstSegment, router]);

  // Deep link handling
  useEffect(() => {
    async function handleDeepLink(url: string) {
      const match = url.match(/recipe\/share\/([a-f0-9]+)/);
      if (!match) return;
      const token = match[1];
      try {
        const recipe = await fetchSharedRecipe(token);
        if (!recipe) return;
        Alert.alert(
          'Recept ontvangen',
          `"${recipe.title}" toevoegen aan jouw recepten?`,
          [
            { text: 'Annuleren', style: 'cancel' },
            {
              text: 'Toevoegen',
              onPress: async () => {
                try {
                  const { id: _id, createdAt: _c, updatedAt: _u, ...input } = recipe;
                  const saved = await RecipeRepository.create(db, input);
                  useRecipeStore.getState().addRecipe(saved);
                  Toast.show({ type: 'success', text1: 'Recept toegevoegd', text2: recipe.title });
                } catch (err) {
                  Toast.show({ type: 'error', text1: 'Fout', text2: 'Kon recept niet opslaan.' });
                }
              },
            },
          ],
        );
      } catch {
        // Silently ignore if link is invalid
      }
    }

    Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, [db]);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

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
      </Stack>
    </>
  );
}
