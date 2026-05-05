/**
 * 🎨 DESIGN SYSTEM — "Onze Tafel" Editorial
 *
 * Vervang de inhoud van: V0.1.2/constants/Designsystem.ts
 *
 * Aesthetic: warm crème papier · ink deep · terracotta italic accent.
 * Type: Fraunces (display, italic accent), Inter (body), JetBrains Mono (folios/labels).
 *
 * BELANGRIJK: Voor de fonts moet je in expo-font de families laden.
 * Zie /utils/fonts.ts (apart bestand) voor de loader.
 */

// ============================================================================
// 🎨 COLORS — Warm cream paper + deep ink + terracotta
// ============================================================================

export const colors = {
  // Brand
  primary: '#C2492A',         // Terracotta (CTA, accent, italic emphasis)
  primaryLight: '#E6A386',    // Soft terracotta (hover/pressed)
  primaryDark: '#8A3119',     // Deep terracotta

  // Secondary palette (sparingly)
  secondary: '#5A6B3A',       // Olive (vegetarian / saved)
  secondaryLight: '#7A8B5A',
  secondaryLighter: '#A0B07F',

  tertiary: '#D49A3A',        // Saffron (special / featured)
  tertiaryLight: '#E6B566',

  // Backgrounds — warm cream "paper"
  background: '#F6F1E7',      // Main paper
  backgroundCard: '#FFFFFF',  // Card surfaces (rare)
  backgroundLight: '#EDE4D0', // Toasted cream (warm panel)

  // Ink (text)
  textDark: '#191613',        // Near-black, warm
  textMedium: '#3A342E',      // Soft ink
  textLight: 'rgba(25,22,19,0.55)', // Muted
  textFaint: 'rgba(25,22,19,0.35)', // Hairline metadata

  // Lines
  borderColor: 'rgba(25,22,19,0.15)',
  borderSoft: 'rgba(25,22,19,0.08)',
  disabled: 'rgba(25,22,19,0.25)',

  // Semantic
  success: '#5A6B3A',
  error: '#C2492A',
  warning: '#D49A3A',
  info: '#3A5A6B',

  // White & shadows (we use them sparingly)
  white: '#FFFFFF',
  black: '#191613',
  shadow: 'rgba(25, 22, 19, 0.08)',
  shadowDark: 'rgba(25, 22, 19, 0.15)',

  // Aliases
  text: '#191613',
  textSecondary: 'rgba(25,22,19,0.55)',
  surface: '#F6F1E7',
  surfaceAlt: '#EDE4D0',
  border: 'rgba(25,22,19,0.15)',
  green: '#5A6B3A',
  danger: '#C2492A',

  // Family member colors (zelfde als bestaand, lichtjes herschikt naar editorial)
  family: {
    tuur: '#C2492A',
    louise: '#B56B3F',
    basiel: '#5A6B3A',
    jules: '#3A5A6B',
  },

  // Dark mode (later)
  dark: {
    background: '#1A1714',
    backgroundCard: '#2A2520',
    text: '#F6F1E7',
    textSecondary: 'rgba(246,241,231,0.55)',
    border: 'rgba(246,241,231,0.15)',
  },
};

// ============================================================================
// 📐 SPACING — 8pt grid
// ============================================================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,

  // Aliases
  none: 0,
  tiny: 4,
  small: 8,
  medium: 16,
  large: 24,
  extraLarge: 32,
  massive: 48,
};

// ============================================================================
// 🔤 TYPOGRAPHY — Fraunces (display) · Inter (body) · JetBrains Mono (folio)
// ============================================================================

const FONT_DISPLAY = 'Fraunces_400Regular';
const FONT_DISPLAY_ITALIC = 'Fraunces_400Italic';
const FONT_BODY = 'Inter_400Regular';
const FONT_BODY_MEDIUM = 'Inter_500Medium';
const FONT_BODY_SEMIBOLD = 'Inter_600SemiBold';
const FONT_MONO = 'JetBrainsMono_400Regular';
const FONT_MONO_MEDIUM = 'JetBrainsMono_500Medium';

export const typography = {
  // HERO — grote serif titel (Fraunces light)
  hero32Bold: {
    fontFamily: FONT_DISPLAY,
    fontSize: 38,
    fontWeight: '300' as const,
    lineHeight: 38 * 1.0,
    letterSpacing: -0.8,
    color: colors.textDark,
  },

  // ITALIC accent — voor één-woord highlights in terracotta
  heroItalic: {
    fontFamily: FONT_DISPLAY_ITALIC,
    fontSize: 38,
    fontWeight: '300' as const,
    lineHeight: 38 * 1.0,
    letterSpacing: -0.8,
    color: colors.primary,
    fontStyle: 'italic' as const,
  },

  title24: {
    fontFamily: FONT_DISPLAY,
    fontSize: 26,
    fontWeight: '400' as const,
    lineHeight: 26 * 1.1,
    letterSpacing: -0.4,
    color: colors.textDark,
  },

  title20: {
    fontFamily: FONT_DISPLAY,
    fontSize: 22,
    fontWeight: '400' as const,
    lineHeight: 22 * 1.15,
    letterSpacing: -0.3,
    color: colors.textDark,
  },

  title18: {
    fontFamily: FONT_DISPLAY,
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 18 * 1.2,
    color: colors.textDark,
  },

  // BODY ITALIC — Fraunces italic, voor zachte introtekst en credit-lines
  bodyItalic: {
    fontFamily: FONT_DISPLAY_ITALIC,
    fontStyle: 'italic' as const,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 14 * 1.5,
    color: colors.textMedium,
  },

  body16: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 15 * 1.5,
    color: colors.textDark,
  },

  body16Medium: {
    fontFamily: FONT_BODY_MEDIUM,
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 15 * 1.5,
    color: colors.textDark,
  },

  caption14: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 13 * 1.4,
    color: colors.textMedium,
  },

  caption14Medium: {
    fontFamily: FONT_BODY_MEDIUM,
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 13 * 1.4,
    color: colors.textDark,
  },

  // FOLIO / mono — paginanummers, sectienummers, kleine labels
  folio: {
    fontFamily: FONT_MONO,
    fontSize: 9,
    fontWeight: '400' as const,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    color: colors.textLight,
  },

  folioBold: {
    fontFamily: FONT_MONO_MEDIUM,
    fontSize: 9,
    fontWeight: '500' as const,
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
    color: colors.textDark,
  },

  label12: {
    fontFamily: FONT_MONO_MEDIUM,
    fontSize: 10,
    fontWeight: '500' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: colors.textMedium,
  },

  small12: {
    fontFamily: FONT_BODY,
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 11 * 1.5,
    color: colors.textLight,
  },

  // CTA button label — Inter caps
  buttonLabel: {
    fontFamily: FONT_BODY_MEDIUM,
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    color: colors.background,
  },
};

// Font-family constants exporteren voor inline gebruik
export const fonts = {
  display: FONT_DISPLAY,
  displayItalic: FONT_DISPLAY_ITALIC,
  body: FONT_BODY,
  bodyMedium: FONT_BODY_MEDIUM,
  bodySemibold: FONT_BODY_SEMIBOLD,
  mono: FONT_MONO,
  monoMedium: FONT_MONO_MEDIUM,
};

// ============================================================================
// 🎯 SHADOWS — heel zacht, papier-achtig (geen drukke schaduwen)
// ============================================================================

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 8,
  },
  orangeGlow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

// ============================================================================
// 🎨 BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// ============================================================================
// ⏱️ ANIMATIONS
// ============================================================================

export const animations = {
  fast: { duration: 150, easing: 'easeInOut' },
  standard: { duration: 300, easing: 'easeInOut' },
  slow: { duration: 500, easing: 'easeInOut' },
  easing: {
    easeInOut: 'easeInOut',
    easeIn: 'easeIn',
    easeOut: 'easeOut',
    linear: 'linear',
  },
};

// ============================================================================
// 🔘 COMPONENT PRESETS
// ============================================================================

export const componentStyles = {
  button: {
    primary: {
      backgroundColor: colors.textDark,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: borderRadius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.textDark,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: borderRadius.full,
    },
    tertiary: {
      backgroundColor: 'transparent',
      paddingVertical: 8,
      paddingHorizontal: 0,
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.borderColor,
      backgroundColor: 'transparent',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
  },

  card: {
    container: {
      backgroundColor: 'transparent',
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
      paddingVertical: spacing.md,
    },
    recipe: {
      backgroundColor: 'transparent',
      paddingVertical: spacing.sm,
    },
    stat: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      alignItems: 'center' as const,
    },
  },

  input: {
    base: {
      backgroundColor: 'transparent',
      borderBottomWidth: 1,
      borderBottomColor: colors.borderColor,
      paddingVertical: 12,
      fontFamily: FONT_DISPLAY,
      fontSize: 16,
      color: colors.textDark,
    },
    focused: { borderBottomColor: colors.primary },
    search: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.borderColor,
      borderRadius: borderRadius.full,
      paddingVertical: 12,
      paddingHorizontal: 20,
      fontFamily: FONT_BODY,
      fontSize: 14,
    },
  },

  badge: {
    category: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      paddingVertical: 4,
      paddingHorizontal: 0,
    },
    time: {
      backgroundColor: 'transparent',
      paddingVertical: 0,
      paddingHorizontal: 0,
    },
  },

  divider: {
    height: 1,
    backgroundColor: colors.borderColor,
    marginVertical: spacing.md,
  },
};

// ============================================================================
// 🎬 RESPONSIVE
// ============================================================================

export const responsive = {
  breakpoints: { small: 320, regular: 375, large: 428, tablet: 768 },
  safeArea: {},
  fontSize: (baseSize: number, width: number): number => {
    if (width < 375) return baseSize * 0.9;
    if (width > 428) return baseSize * 1.1;
    return baseSize;
  },
};

export const darkModeColors = {
  ...colors.dark,
  primary: colors.primary,
  tertiary: colors.tertiary,
};

export default {
  colors,
  spacing,
  typography,
  fonts,
  shadows,
  borderRadius,
  animations,
  componentStyles,
  responsive,
  darkModeColors,
};
