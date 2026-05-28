// app/cook/[recipeId].tsx
//
// Fullscreen donker kook-scherm met groot stapnummer (Cormorant italic),
// progress-dots, step-tekst en een meelopende stopwatch. Bedoeld als
// alternatief op de inline CookOverlay; bereikbaar via router.push('/cook/<id>').

import { useEffect, useMemo, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { useRecipes } from '../../features/recipes/hooks';
import { fonts } from '../../constants/Designsystem';

const INK = '#1A1612';
const PAPER = '#F6E8D2';
const ACCENT = '#E6A879';
const DIM = 'rgba(246,232,210,0.5)';
const SOFT = 'rgba(246,232,210,0.3)';
const SOFTER = 'rgba(246,232,210,0.18)';
const SOFTEST = 'rgba(246,232,210,0.25)';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatStopwatch(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

export default function CookMode() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const { recipes } = useRecipes();
  const recipe = useMemo(() => recipes.find((r) => r.id === recipeId), [recipes, recipeId]);
  const steps = recipe?.steps ?? [];
  const totalSteps = steps.length;

  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Stopwatch tikt door zolang de cook-mode open is; reset bij stap-wissel.
  useEffect(() => {
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [step]);

  if (!recipe) {
    return (
      <SafeAreaView style={styles.fallback}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.fallbackText}>Recept niet gevonden.</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.fallbackBack}>← terug</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (totalSteps === 0) {
    return (
      <SafeAreaView style={styles.fallback}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.fallbackText}>Dit recept heeft nog geen stappen.</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.fallbackBack}>← terug</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const safeStep = Math.min(step, totalSteps - 1);
  const isFirst = safeStep === 0;
  const isLast = safeStep >= totalSteps - 1;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {recipe.title}
          </Text>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
            <Text style={styles.closeGlyph}>×</Text>
          </Pressable>
        </View>

        {/* Progress dots */}
        <View style={styles.dots}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === safeStep && styles.dotActive,
                i <= safeStep && styles.dotFilled,
              ]}
            />
          ))}
        </View>

        {/* Big numeral */}
        <View style={styles.numeralWrap}>
          <Text style={styles.stapLabel}>
            STAP {pad2(safeStep + 1)} VAN {pad2(totalSteps)}
          </Text>
          <Text style={styles.numeral}>{pad2(safeStep + 1)}</Text>
        </View>

        {/* Step body */}
        <Text style={styles.stepBody}>{steps[safeStep]}</Text>

        <View style={styles.spacer} />

        {/* Stopwatch */}
        <View style={styles.timer}>
          <View style={styles.timerDot} />
          <Text style={styles.timerText}>{formatStopwatch(elapsed)}</Text>
        </View>

        {/* Nav */}
        <View style={styles.nav}>
          <Pressable
            onPress={() => setStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            style={[styles.prevBtn, isFirst && styles.btnDisabled]}
            hitSlop={6}
          >
            <Text style={[styles.prevLabel, isFirst && styles.btnLabelDisabled]}>
              ← vorige
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
            disabled={isLast}
            style={[styles.nextBtn, isLast && styles.btnDisabled]}
            hitSlop={6}
          >
            <Text style={[styles.nextLabel, isLast && styles.btnLabelDisabled]}>
              {isLast ? 'klaar' : 'volgende →'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  safe: { flex: 1, paddingHorizontal: 22 },
  fallback: {
    flex: 1,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  fallbackText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    color: PAPER,
    fontSize: 18,
  },
  fallbackBack: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: PAPER,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  topTitle: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: PAPER,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: { color: PAPER, fontSize: 14 },

  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 24,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: SOFTER,
  },
  dotFilled: { backgroundColor: ACCENT },
  dotActive: { width: 22 },

  numeralWrap: { alignItems: 'center', marginTop: 18 },
  stapLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 3,
    color: DIM,
  },
  numeral: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 160,
    lineHeight: 136,
    color: ACCENT,
  },

  stepBody: {
    marginTop: 18,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 31,
    color: PAPER,
  },

  spacer: { flex: 1 },

  timer: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderWidth: 0.5,
    borderColor: SOFTEST,
    borderRadius: 999,
    marginBottom: 16,
  },
  timerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  timerText: {
    fontFamily: fonts.mono,
    fontSize: 26,
    letterSpacing: 4,
    color: PAPER,
  },

  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  prevBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: SOFT,
  },
  prevLabel: {
    color: PAPER,
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  nextBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  nextLabel: {
    color: INK,
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  btnLabelDisabled: {
    color: DIM,
  },
});
