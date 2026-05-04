/**
 * 🎬 SPLASH SCREEN COMPONENT
 * 
 * Animated logo, app name, loading progress bar
 * Premium feel with warm colors and smooth animations
 * 
 * Usage:
 * <SplashScreen isLoading={isLoading} progress={progress} />
 */

import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { colors, spacing, typography, animations } from '../designSystem'

interface SplashScreenProps {
  isLoading?: boolean
  progress?: number  // 0-100
  onComplete?: () => void
  minDuration?: number  // Min milliseconds to show splash
}

export function SplashScreen({
  isLoading = true,
  progress = 0,
  onComplete,
  minDuration = 2000,
}: SplashScreenProps) {
  const [fadeAnim] = useState(new Animated.Value(0))
  const [scaleAnim] = useState(new Animated.Value(0.8))
  const [startTime] = useState(Date.now())

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()
  }, [fadeAnim, scaleAnim])

  // Handle completion with minimum duration
  useEffect(() => {
    if (!isLoading && progress >= 100) {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, minDuration - elapsed)

      const timer = setTimeout(() => {
        // Fade out
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onComplete?.()
        })
      }, remaining)

      return () => clearTimeout(timer)
    }
  }, [isLoading, progress, fadeAnim, scaleAnim, startTime, minDuration, onComplete])

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Background gradient effect (simple with color) */}
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.background,
        }}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo (Animated) */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🍽️</Text>
          </View>
        </Animated.View>

        {/* App Name */}
        <Text style={[typography.hero32Bold, styles.appName]}>
          RECEPTEN
        </Text>

        {/* Tagline */}
        <Text style={[typography.body16, styles.tagline]}>
          Plan • Cook • Share
        </Text>

        {/* Spacer */}
        <View style={{ height: spacing.lg }} />

        {/* Loading State */}
        {isLoading ? (
          <>
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(progress, 100)}%`,
                  },
                ]}
              />
            </View>

            {/* Progress Text */}
            <Text style={[typography.caption14, styles.progressText]}>
              {Math.round(progress)}%
            </Text>

            {/* Loading Message */}
            <View style={{ height: spacing.md }} />
            <Text style={[typography.caption14, styles.loadingMessage]}>
              {getLoadingMessage(progress)}
            </Text>
          </>
        ) : (
          <>
            {/* Success state */}
            <Text style={[typography.caption14Medium, styles.readyText]}>
              ✅ Ready to cook!
            </Text>
          </>
        )}
      </View>

      {/* Footer: Optional branding */}
      <View style={styles.footer}>
        <Text style={[typography.small12, { color: colors.textLight }]}>
          Made with ❤️ for home cooks
        </Text>
      </View>
    </Animated.View>
  )
}

// ============================================================================
// HELPER: Dynamic loading messages
// ============================================================================

function getLoadingMessage(progress: number): string {
  if (progress < 20) return 'Warming up the kitchen...'
  if (progress < 40) return 'Gathering ingredients...'
  if (progress < 60) return 'Organizing recipes...'
  if (progress < 80) return 'Setting the table...'
  return 'Almost ready...'
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },

  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Logo
  logoContainer: {
    marginBottom: spacing.lg,
  },

  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },

  logoEmoji: {
    fontSize: 64,
  },

  // App name
  appName: {
    color: colors.primary,
    marginBottom: spacing.sm,
    letterSpacing: 2,
  },

  // Tagline
  tagline: {
    color: colors.textMedium,
    marginBottom: spacing.xl,
    fontStyle: 'italic',
  },

  // Progress bar
  progressBarContainer: {
    width: 200,
    height: 4,
    backgroundColor: colors.borderColor,
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: spacing.md,
  },

  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  // Progress text
  progressText: {
    color: colors.textMedium,
    marginTop: spacing.sm,
  },

  // Loading message
  loadingMessage: {
    color: colors.textMedium,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Ready text
  readyText: {
    color: colors.secondary,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: spacing.lg,
    alignItems: 'center',
  },
})

// ============================================================================
// 🎨 ALTERNATIVE SPLASH SCREENS (Pick your favorite)
// ============================================================================

/**
 * VARIANT 1: Minimalist (Just logo + spinner)
 */
export function SplashScreenMinimal({
  isLoading = true,
}: Pick<SplashScreenProps, 'isLoading'>) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoEmoji}>🍽️</Text>
      </View>

      <Text style={[typography.hero32Bold, styles.appName]}>RECEPTEN</Text>

      {isLoading && (
        <View style={{ marginTop: spacing.xl }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  )
}

/**
 * VARIANT 2: Modern (With animated gradient background)
 */
export function SplashScreenModern({
  isLoading = true,
  progress = 0,
}: Pick<SplashScreenProps, 'isLoading' | 'progress'>) {
  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      {/* Logo with different color for contrast */}
      <View
        style={[
          styles.logoCircle,
          { backgroundColor: colors.white, shadowColor: colors.primary },
        ]}
      >
        <Text style={styles.logoEmoji}>🍽️</Text>
      </View>

      <Text style={[typography.hero32Bold, { color: colors.white, marginTop: spacing.lg }]}>
        RECEPTEN
      </Text>

      {isLoading && (
        <>
          <View style={{ marginTop: spacing.xl }}>
            <ActivityIndicator size="large" color={colors.white} />
          </View>
          <Text style={[typography.caption14, { color: colors.white, marginTop: spacing.md }]}>
            {Math.round(progress)}%
          </Text>
        </>
      )}
    </View>
  )
}

/**
 * VARIANT 3: Food-Focused (With emoji animation)
 */
export function SplashScreenFood({ isLoading = true }: Omit<SplashScreenProps, 'progress'>) {
  const rotateAnim = useState(new Animated.Value(0))[0]

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start()
    }
  }, [isLoading, rotateAnim])

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={{
          transform: [{ rotate: rotation }],
        }}
      >
        <Text style={{ fontSize: 100 }}>🍳</Text>
      </Animated.View>

      <Text style={[typography.hero32Bold, styles.appName]}>RECEPTEN</Text>
      <Text style={[typography.body16, styles.tagline]}>Cooking made easy</Text>

      {isLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.lg }} />
      )}
    </View>
  )
}

// ============================================================================
// 📱 USAGE IN APP
// ============================================================================

/*
// In your root App.tsx or _layout.tsx:

import { SplashScreen } from './components/SplashScreen'

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Simulate loading steps
    const steps = [10, 25, 50, 75, 95]
    let stepIndex = 0

    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        setProgress(steps[stepIndex])
        stepIndex++
      }
    }, 300)

    // Real loading logic here (Firebase init, etc.)
    const timer = setTimeout(() => {
      setProgress(100)
      setIsLoading(false)
    }, 2000)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [])

  if (isLoading) {
    return <SplashScreen isLoading={isLoading} progress={progress} />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  )
}
*/
