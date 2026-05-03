/**
 * Dark Mode Theme Configuration
 * Defines color schemes for light and dark modes
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  // Primary
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Accent
  accent: string;
  accentLight: string;

  // Green accent
  green: string;
  greenLight: string;

  // Blue accent
  blue: string;
  blueLight: string;

  // Backgrounds
  background: string;
  surface: string;
  surfaceAlt: string;

  // Borders
  border: string;
  borderSecondary: string;

  // Text
  text: string;
  textSecondary: string;

  // Status
  danger: string;
  dangerLight: string;
  warning: string;
  success: string;
  successLight: string;
}

export const lightTheme: ThemeColors = {
  // Primary — warm taupe/brown (refined)
  primary: '#8B7B6B',
  primaryLight: '#f5f3f0',
  primaryDark: '#6B5B4E',

  // Accent — warm gold
  accent: '#d4a574',
  accentLight: '#faf9f7',

  // Green accent — fresh, family vibes
  green: '#639922',
  greenLight: '#e8f5e1',

  // Blue accent — sky blue for variation
  blue: '#378ADD',
  blueLight: '#e6f2ff',

  // Backgrounds
  background: '#fafaf7',
  surface: '#ffffff',
  surfaceAlt: '#f5f3f0',

  // Borders
  border: '#f0ede6',
  borderSecondary: '#e8ddd0',

  // Text
  text: '#4a4a4a',
  textSecondary: '#8a7a70',

  // Status
  danger: '#C0392B',
  dangerLight: '#FDEDEC',
  warning: '#D4A017',
  success: '#6AAB7A',
  successLight: '#EDF7F0',
};

export const darkTheme: ThemeColors = {
  // Primary — slightly lighter for dark mode
  primary: '#a89989',
  primaryLight: '#2a251f',
  primaryDark: '#8B7B6B',

  // Accent — warm gold (adjusted for dark)
  accent: '#d4a574',
  accentLight: '#3a3530',

  // Green accent
  green: '#7fb069',
  greenLight: '#2a3d1a',

  // Blue accent
  blue: '#5ba3ff',
  blueLight: '#1a3a5c',

  // Backgrounds
  background: '#0f0c0a',
  surface: '#1a1816',
  surfaceAlt: '#2a2420',

  // Borders
  border: '#3a3430',
  borderSecondary: '#4a3f38',

  // Text
  text: '#f5f3f0',
  textSecondary: '#c9b8a8',

  // Status
  danger: '#ff6b63',
  dangerLight: '#5c1810',
  warning: '#ffc966',
  success: '#8fd48f',
  successLight: '#1a4d2e',
};

export const getTheme = (mode: ThemeMode): ThemeColors => {
  return mode === 'dark' ? darkTheme : lightTheme;
};
