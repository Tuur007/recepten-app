/**
 * Theme Context & Provider
 * Manages application theme (light/dark) with persistence
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ThemeMode, getTheme, ThemeColors } from './themes';

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  setTheme: (theme: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  useSystemTheme: boolean;
  setUseSystemTheme: (use: boolean) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_THEME: ThemeMode = 'light';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>(DEFAULT_THEME);
  const [useSystemTheme, setUseSystemThemeState] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await SecureStore.getItemAsync('themePreference');
      const savedUseSystem = await SecureStore.getItemAsync('useSystemTheme');

      if (saved && (saved === 'light' || saved === 'dark')) {
        setThemeState(saved);
        setUseSystemThemeState(savedUseSystem === 'true');
      } else {
        // Default to system preference
        const defaultTheme: ThemeMode = 
          systemColorScheme === 'dark' ? 'dark' : 'light';
        setThemeState(defaultTheme);
        setUseSystemThemeState(true);
      }
    } catch (error) {
      console.error('[ThemeProvider] Failed to load theme preference:', error);
      // Fallback to default
      setThemeState(DEFAULT_THEME);
      setUseSystemThemeState(true);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    try {
      setThemeState(newTheme);
      await SecureStore.setItemAsync('themePreference', newTheme);
      await SecureStore.setItemAsync('useSystemTheme', 'false');
      setUseSystemThemeState(false);
    } catch (error) {
      console.error('[ThemeProvider] Failed to save theme preference:', error);
      // Still update local state even if storage fails
      setThemeState(newTheme);
    }
  };

  const toggleTheme = async () => {
    const newTheme: ThemeMode = theme === 'light' ? 'dark' : 'light';
    await setTheme(newTheme);
  };

  const setUseSystemTheme = async (use: boolean) => {
    try {
      setUseSystemThemeState(use);
      await SecureStore.setItemAsync('useSystemTheme', use.toString());

      if (use && systemColorScheme) {
        const defaultTheme: ThemeMode = 
          systemColorScheme === 'dark' ? 'dark' : 'light';
        setThemeState(defaultTheme);
        await SecureStore.setItemAsync('themePreference', defaultTheme);
      }
    } catch (error) {
      console.error('[ThemeProvider] Failed to save system theme preference:', error);
      // Still update local state
      setUseSystemThemeState(use);
    }
  };

  // Update theme when system preference changes (if using system theme)
  useEffect(() => {
    if (useSystemTheme && systemColorScheme) {
      const newTheme: ThemeMode = 
        systemColorScheme === 'dark' ? 'dark' : 'light';
      setThemeState(newTheme);
    }
  }, [systemColorScheme, useSystemTheme]);

  // Show default theme while loading to avoid flash
  const displayTheme = isLoading ? DEFAULT_THEME : theme;
  const value: ThemeContextType = {
    theme: displayTheme,
    colors: getTheme(displayTheme),
    setTheme,
    toggleTheme,
    useSystemTheme,
    setUseSystemTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use theme context
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
