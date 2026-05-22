import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';

import { colors, fonts, spacing, typography } from '../../../../constants/Designsystem';
import { CookTimer } from '../../../../components/ui/CookTimer';
import { findTimesInStep } from '../../../../utils/parseTimeFromStep';

export interface ActiveTimer {
  id: string;
  seconds: number;
  label: string;
}

interface Props {
  stepIndex: number;
  totalSteps: number;
  stepBody: string;
  recipeTitle: string;
  activeTimers: ActiveTimer[];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onStartTimer: (seconds: number, label: string) => void;
  onDismissTimer: (id: string) => void;
}

export function CookOverlay({
  stepIndex,
  totalSteps,
  stepBody,
  recipeTitle,
  activeTimers,
  onClose,
  onPrev,
  onNext,
  onStartTimer,
  onDismissTimer,
}: Props) {
  // Hands-on cooking: keep the screen awake while this overlay is mounted so
  // the user doesn't have to wake the phone with greasy hands.
  useKeepAwake('cook-mode');
  const matches = useMemo(() => findTimesInStep(stepBody), [stepBody]);
  const isLast = stepIndex >= totalSteps - 1;
  const stepNumStr = String(stepIndex + 1).padStart(2, '0');
  const totalNumStr = String(totalSteps).padStart(2, '0');

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <View style={styles.awakeDot}>
            <View style={styles.awakeBullet} />
            <Text style={[typography.folio, { color: colors.green }]}>scherm wakker</Text>
          </View>
          <Text
            style={[typography.folio, { color: colors.textFaint }]}
            numberOfLines={1}
          >
            {recipeTitle.toLowerCase()}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={colors.textDark} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.stepRow}>
            <Text style={styles.stepLabel}>
              · stap {stepNumStr} van {totalNumStr} ·
            </Text>
            <View style={styles.progress}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.progressPill, i <= stepIndex && styles.progressPillOn]}
                />
              ))}
            </View>
          </View>

          <Text style={styles.dropCap}>{stepNumStr}</Text>
          <Text style={styles.stepText}>{stepBody}</Text>

          {matches.length > 0 && (
            <View style={styles.timerChipsRow}>
              {matches.map((m) => (
                <TouchableOpacity
                  key={`${m.start}-${m.end}`}
                  onPress={() => onStartTimer(m.seconds, `${m.text} timer`)}
                  style={styles.timerChip}
                  activeOpacity={0.75}
                >
                  <Ionicons name="timer-outline" size={12} color={colors.primary} />
                  <Text style={styles.timerChipText}>
                    {m.text}{' · '}<Text style={styles.timerChipDuration}>start</Text>
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeTimers.length > 0 && (
            <View style={styles.timerStack}>
              {activeTimers.map((t) => (
                <CookTimer
                  key={t.id}
                  durationSeconds={t.seconds}
                  label={t.label}
                  onDismiss={() => onDismissTimer(t.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={onPrev} disabled={stepIndex === 0} hitSlop={10}>
            <Text
              style={[styles.footerLabel, stepIndex === 0 && { color: colors.borderColor }]}
            >
              ‹  stap {String(stepIndex).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
          <Text style={[typography.folio, { color: colors.textFaint }]}>
            · {stepNumStr} / {totalNumStr} ·
          </Text>
          <TouchableOpacity onPress={isLast ? onClose : onNext} hitSlop={10}>
            <Text style={[styles.footerLabel, { color: colors.primary }]}>
              {isLast ? 'klaar!  ›' : `stap ${String(stepIndex + 2).padStart(2, '0')}  ›`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 100,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: 12,
  },
  awakeDot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  awakeBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  progress: { flexDirection: 'row', gap: 4 },
  progressPill: { width: 18, height: 2, backgroundColor: colors.borderColor },
  progressPillOn: { backgroundColor: colors.primary },
  dropCap: {
    fontFamily: fonts.display,
    fontWeight: '300',
    fontSize: 92,
    lineHeight: 92,
    letterSpacing: -3,
    color: colors.textDark,
    marginTop: spacing.lg,
  },
  stepText: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 30,
    color: colors.textMedium,
    marginTop: spacing.lg,
  },
  timerChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.lg },
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: colors.primary,
    backgroundColor: 'rgba(194,73,42,0.06)',
  },
  timerChipText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  timerChipDuration: { fontFamily: fonts.monoMedium, color: colors.primary },
  timerStack: { marginTop: spacing.md, gap: spacing.md },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderColor,
  },
  footerLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.textDark,
  },
});
