import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import { colors, typography, spacing, fonts } from '../constants/Designsystem';

// ────────────────────────────────────────────────────────────────
// Splash 02 — "Stille page-turn"
// Editorial cookbook splash: folio kicker, big serif title with
// terracotta italic tail, hairline progress bar that fills, and a
// closing folio. Total runtime 2.8s — same as previous splash.
// ────────────────────────────────────────────────────────────────

interface SplashScreenProps {
  onFinish: () => void;
}

// Animation timeline (in ms) ── tweak here if pacing feels off.
const T = {
  folioIn:    { delay: 200,  duration: 320 },
  titleIn:    { delay: 600,  duration: 650 },
  tailIn:     { delay: 850,  duration: 550 },
  progress:   { delay: 1450, duration: 1200 },
  openenIn:   { delay: 2550, duration: 300 },
  total: 2800,
};

const EASE = Easing.bezier(0.2, 0.6, 0.2, 1);
const EASE_PROGRESS = Easing.bezier(0.35, 0, 0.2, 1);

export function SplashScreen({ onFinish }: SplashScreenProps) {
  // Shared values — one per animated property.
  const folioOpacity   = useSharedValue(0);
  const titleOpacity   = useSharedValue(0);
  const titleY         = useSharedValue(8);
  const titleScale     = useSharedValue(0.985);
  const tailOpacity    = useSharedValue(0);
  const tailY          = useSharedValue(6);
  const progressWidth  = useSharedValue(0);
  const openenOpacity  = useSharedValue(0);

  // Format current weekday + day in Dutch ("dinsdag · 12 mei")
  const dateLabel = useMemo(() => formatDutchDate(new Date()), []);

  useEffect(() => {
    folioOpacity.value = withDelay(T.folioIn.delay,
      withTiming(1, { duration: T.folioIn.duration, easing: EASE }));

    titleOpacity.value = withDelay(T.titleIn.delay,
      withTiming(1, { duration: T.titleIn.duration, easing: EASE }));
    titleY.value = withDelay(T.titleIn.delay,
      withTiming(0, { duration: T.titleIn.duration, easing: EASE }));
    titleScale.value = withDelay(T.titleIn.delay,
      withTiming(1, { duration: T.titleIn.duration, easing: EASE }));

    tailOpacity.value = withDelay(T.tailIn.delay,
      withTiming(1, { duration: T.tailIn.duration, easing: EASE }));
    tailY.value = withDelay(T.tailIn.delay,
      withTiming(0, { duration: T.tailIn.duration, easing: EASE }));

    progressWidth.value = withDelay(T.progress.delay,
      withTiming(1, { duration: T.progress.duration, easing: EASE_PROGRESS }));

    openenOpacity.value = withDelay(T.openenIn.delay,
      withTiming(1, { duration: T.openenIn.duration, easing: EASE }));

    // Fire onFinish on UI thread once total runtime elapses.
    const finish = setTimeout(() => onFinish(), T.total);
    return () => clearTimeout(finish);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const folioStyle = useAnimatedStyle(() => ({
    opacity: folioOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [
      { translateY: titleY.value },
      { scale: titleScale.value },
    ],
  }));

  const tailStyle = useAnimatedStyle(() => ({
    opacity: tailOpacity.value,
    transform: [{ translateY: tailY.value }],
  }));

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const openenStyle = useAnimatedStyle(() => ({
    opacity: openenOpacity.value,
  }));

  return (
    <View style={styles.container} accessibilityRole="none" accessible>
      <Animated.Text
        style={[styles.folio, folioStyle]}
        accessibilityLabel={dateLabel}
      >
        {dateLabel}
      </Animated.Text>

      <View style={styles.titleWrap}>
        <Animated.Text
          style={[styles.title, titleStyle]}
          accessibilityLabel="Recepten uit ons huis"
        >
          Recepten
        </Animated.Text>
        <Animated.Text style={[styles.tail, tailStyle]}>
          uit ons huis.
        </Animated.Text>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressFillStyle]} />
      </View>

      <Animated.Text style={[styles.openen, openenStyle]}>
        · openen ·
      </Animated.Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function formatDutchDate(d: Date): string {
  const weekdays = [
    'zondag', 'maandag', 'dinsdag', 'woensdag',
    'donderdag', 'vrijdag', 'zaterdag',
  ];
  const months = [
    'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
    'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
  ];
  const weekday = weekdays[d.getDay()];
  const day = d.getDate();
  const month = months[d.getMonth()];
  return `${weekday} · ${day} ${month}`;
}

// ────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },

  folio: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },

  titleWrap: {
    marginTop: 38,
    alignItems: 'center',
  },

  title: {
    fontFamily: fonts.display,
    fontWeight: '300',
    fontSize: 68,
    lineHeight: 68,
    letterSpacing: -1.7,
    color: colors.textDark,
    textAlign: 'center',
  },

  tail: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontWeight: '300',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: colors.primary,
    marginTop: 6,
    textAlign: 'center',
  },

  progressTrack: {
    marginTop: 72,
    width: 180,
    height: 1,
    backgroundColor: colors.borderColor,
    overflow: 'hidden',
  },

  progressFill: {
    height: 1,
    backgroundColor: colors.primary,
  },

  openen: {
    marginTop: 16,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    color: colors.textLight,
  },
});

export default SplashScreen;
