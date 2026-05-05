import { Suspense, useState } from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initializeDatabase } from '../database';
import { LoadingScreen } from '../components/LoadingScreen';
import { SplashScreen } from '../components/SplashScreen';

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Suspense fallback={<LoadingScreen message="Opening database…" />}>
        <SQLiteProvider databaseName="recepten.db" onInit={initializeDatabase} useSuspense>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="recipes/new"
              options={{ presentation: 'modal', title: 'New Recipe', headerShown: false }}
            />
            <Stack.Screen
              name="recipes/[id]"
              options={{ presentation: 'modal', title: 'Edit Recipe', headerShown: false }}
            />
            <Stack.Screen
              name="recipes/import"
              options={{ presentation: 'modal', title: 'Import Recipe', headerShown: false }}
            />
          </Stack>
        </SQLiteProvider>
      </Suspense>
    </GestureHandlerRootView>
  );
}
