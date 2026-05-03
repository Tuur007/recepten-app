import { Suspense } from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initializeDatabase } from '../database';
import { LoadingScreen } from '../components/LoadingScreen';
import { ThemeProvider, useTheme } from '../components/ui/ThemeContext';
import { AuthProvider } from '../services/auth/AuthContext';

/**
 * Inner component that can safely use useTheme()
 * (must be a child of ThemeProvider)
 */
function AppStack() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="recipes/new"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="recipes/[id]"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="recipes/import"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="auth/login"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="auth/register"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="settings"
        options={{ presentation: 'modal', headerShown: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Suspense fallback={<LoadingScreen message="Database openen…" />}>
            <SQLiteProvider
              databaseName="recepten.db"
              onInit={initializeDatabase}
              useSuspense
            >
              <AppStack />
            </SQLiteProvider>
          </Suspense>
        </GestureHandlerRootView>
      </AuthProvider>
    </ThemeProvider>
  );
}
