/**
 * 🎨 DESIGN SYSTEM V1
 * Warm & Inviting + Multi-Color + Premium Feel
 * 
 * Usage:
 * import { colors, spacing, typography, shadows } from './designSystem'
 * 
 * In styles:
 * style={{ color: colors.textDark, marginVertical: spacing.md }}
 */

// ============================================================================
// 🎨 COLORS: Warm & Multi-Color Palette
// ============================================================================

export const colors = {
  // PRIMARY: Orange (Main CTA, highlights, active states)
  primary: '#FF6B35',        // Vibrant orange (appetite-inducing)
  primaryLight: '#FF8551',   // Lighter tint (hover state)
  primaryDark: '#E55100',    // Darker shade (pressed state)

  // SECONDARY: Green (Done, success, saved, checked)
  secondary: '#2D6A4F',      // Deep, organic green
  secondaryLight: '#40916C', // Medium green
  secondaryLighter: '#52B788', // Light green (accent)

  // TERTIARY: Yellow (Badges, labels, ratings, accent)
  tertiary: '#FFB703',       // Golden yellow
  tertiaryLight: '#FFA500',  // Orange-yellow

  // BACKGROUNDS: Warm creams (inviting, not clinical)
  background: '#FEF9E7',     // Warm white (main bg)
  backgroundCard: '#FFF8DC', // Cornsilk (card bg)
  backgroundLight: '#F5F5F0', // Very light neutral

  // NEUTRAL: Grays (Text, borders, disabled)
  textDark: '#1F1F1F',       // Near black (titles, primary text)
  textMedium: '#4A4A4A',     // Dark gray (secondary text)
  textLight: '#8B8B8B',      // Medium gray (tertiary text, placeholders)
  borderColor: '#D1D1D1',    // Light gray (borders, dividers)
  disabled: '#C0C0C0',       // Disabled state

  // SEMANTIC: Feedback colors
  success: '#2D6A4F',        // Same as secondary (green)
  error: '#E63946',          // Red (errors, warnings)
  warning: '#FFB703',        // Yellow (warnings)
  info: '#1E90FF',           // Blue (info messages)

  // WHITE & SHADOWS
  white: '#FFFFFF',
  black: '#000000',
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.15)',

  // ALIASES FOR CONVENIENCE (commonly used shortcuts)
  text: '#1F1F1F',           // Same as textDark
  textSecondary: '#8B8B8B',  // Same as textLight
  surface: '#FFFFFF',        // Card/panel background
  surfaceAlt: '#F5F5F0',     // Alternative surface (same as backgroundLight)
  border: '#D1D1D1',         // Same as borderColor
  green: '#2D6A4F',          // Same as secondary (for checkbox)
  danger: '#E63946',         // Same as error (for delete buttons)

  // DARK MODE (Optional, implement later)
  dark: {
    background: '#1A1A1A',
    backgroundCard: '#2A2A2A',
    text: '#F5F5F0',
    textSecondary: '#D1D1D1',
    border: '#444444',
  },
};

// ============================================================================
// 📐 SPACING: 8px Grid System
// ============================================================================

export const spacing = {
  xs: 4,      // Extra small gaps
  sm: 8,      // Small gaps
  md: 16,     // Standard padding (DEFAULT)
  lg: 24,     // Large spacing between sections
  xl: 32,     // Extra large spacing
  xxl: 48,    // Hero spacing

  // Aliases for readability
  none: 0,
  tiny: 4,
  small: 8,
  medium: 16,
  large: 24,
  extraLarge: 32,
  massive: 48,
};

// ============================================================================
// 🔤 TYPOGRAPHY: Font sizes, weights, line heights
// ============================================================================

export const typography = {
  // HERO: 32px, Bold, Tight (1.2 line height)
  hero32Bold: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 32 * 1.2,
    fontFamily: 'Poppins', // Use system font as fallback
  },

  // TITLE: 24px, SemiBold
  title24: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 24 * 1.2,
    fontFamily: 'Poppins',
  },

  // SUBTITLE: 20px, SemiBold
  title20: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 20 * 1.2,
    fontFamily: 'Poppins',
  },

  // CARD TITLE: 18px, Bold
  title18: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 18 * 1.2,
    fontFamily: 'Poppins',
  },

  // BODY: 16px, Regular (default for most text)
  body16: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 16 * 1.4,
    fontFamily: 'Inter', // Or system font
  },

  // BODY MEDIUM: 16px, Medium weight
  body16Medium: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 16 * 1.4,
    fontFamily: 'Inter',
  },

  // CAPTION: 14px, Regular (metadata, timestamps)
  caption14: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 14 * 1.4,
    fontFamily: 'Inter',
  },

  // CAPTION MEDIUM: 14px, Medium (labels, badges)
  caption14Medium: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 14 * 1.4,
    fontFamily: 'Inter',
  },

  // LABEL: 12px, Medium (small badges, tags)
  label12: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 12 * 1.4,
    fontFamily: 'Inter',
  },

  // SMALL: 12px, Regular (fine print)
  small12: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 12 * 1.6,
    fontFamily: 'Inter',
  },
};

// ============================================================================
// 🎯 SHADOWS: Depth levels
// ============================================================================

export const shadows = {
  // Subtle shadow (cards, light elevation)
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2, // Android
  },

  // Medium shadow (important cards, buttons)
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  // Strong shadow (modals, featured content)
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },

  // Extra strong shadow (floating elements)
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },

  // Color-tinted shadow (orange accent)
  orangeGlow: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
};

// ============================================================================
// 🎨 BORDER RADIUS: Rounded corners
// ============================================================================

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,      // Standard (buttons, inputs)
  lg: 16,      // Cards, larger elements
  xl: 20,      // Very rounded (search bar)
  full: 9999,  // Fully rounded (circles)
};

// ============================================================================
// ⏱️ ANIMATIONS: Timing and easing
// ============================================================================

export const animations = {
  // Fast interactions (button press)
  fast: {
    duration: 150,
    easing: 'easeInOut',
  },

  // Standard transitions (tab switch, modal)
  standard: {
    duration: 300,
    easing: 'easeInOut',
  },

  // Slow animations (page transition, complex)
  slow: {
    duration: 500,
    easing: 'easeInOut',
  },

  // Easing functions (use with Animated API)
  easing: {
    easeInOut: 'easeInOut',
    easeIn: 'easeIn',
    easeOut: 'easeOut',
    linear: 'linear',
  },
};

// ============================================================================
// 🔘 COMPONENT PRESETS: Ready-to-use style objects
// ============================================================================

export const componentStyles = {
  // BUTTONS
  button: {
    primary: {
      backgroundColor: colors.primary,
      color: colors.white,
      paddingVertical: spacing.md - 4, // 12
      paddingHorizontal: spacing.lg,   // 24
      borderRadius: borderRadius.md,
      ...typography.body16Medium,
      ...shadows.medium,
    },

    secondary: {
      backgroundColor: colors.secondary,
      color: colors.white,
      paddingVertical: spacing.md - 4,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      ...typography.body16Medium,
    },

    tertiary: {
      backgroundColor: 'transparent',
      borderColor: colors.borderColor,
      borderWidth: 1.5,
      color: colors.textDark,
      paddingVertical: spacing.md - 4,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      ...typography.body16Medium,
    },

    icon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      backgroundColor: colors.backgroundLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
  },

  // CARDS
  card: {
    container: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      marginVertical: spacing.sm,
      marginHorizontal: spacing.md,
      overflow: 'hidden',
      ...shadows.medium,
    },

    recipe: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      ...shadows.medium,
    },

    stat: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.lg,
      ...shadows.sm,
    },
  },

  // INPUTS
  input: {
    base: {
      backgroundColor: colors.backgroundLight,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.borderColor,
      paddingVertical: spacing.md - 4,
      paddingHorizontal: spacing.md,
      ...typography.body16,
    },

    focused: {
      borderWidth: 2,
      borderColor: colors.primary,
    },

    search: {
      backgroundColor: colors.backgroundLight,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md - 4,
      paddingHorizontal: spacing.lg,
      ...typography.body16,
    },
  },

  // BADGES
  badge: {
    category: {
      backgroundColor: colors.tertiary,
      color: colors.textDark,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.full,
      ...typography.label12,
    },

    time: {
      backgroundColor: colors.backgroundLight,
      color: colors.textMedium,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.sm,
      ...typography.caption14,
    },
  },

  // DIVIDER
  divider: {
    height: 1,
    backgroundColor: colors.borderColor,
    marginVertical: spacing.md,
  },
};

// ============================================================================
// 🎬 RESPONSIVE HELPERS
// ============================================================================

export const responsive = {
  // Screen breakpoints (mobile-first)
  breakpoints: {
    small: 320,    // iPhone SE
    regular: 375,  // iPhone 12/13
    large: 428,    // iPhone 14 Plus
    tablet: 768,   // iPad
  },

  // Safe area helper (for notches)
  safeArea: {
    // Implement with useSafeAreaInsets() hook
    // paddingTop: insets.top
    // paddingBottom: insets.bottom
  },

  // Scale text based on screen size (optional)
  fontSize: (baseSize: number, width: number): number => {
    if (width < 375) return baseSize * 0.9;
    if (width > 428) return baseSize * 1.1;
    return baseSize;
  },
};

// ============================================================================
// 🌙 DARK MODE SUPPORT (Future)
// ============================================================================

export const darkModeColors = {
  ...colors.dark,
  primary: colors.primary,    // Keep primary vibrant even in dark mode
  tertiary: colors.tertiary,  // Keep tertiary vibrant
};

// ============================================================================
// ✅ EXPORT EVERYTHING
// ============================================================================

export default {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius,
  animations,
  componentStyles,
  responsive,
  darkModeColors,
};
