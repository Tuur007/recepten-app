import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, typography } from '../../constants/Designsystem';
import { formatDuration } from '../../utils/parseTimeFromStep';

interface Props {
  /** Total countdown in seconds. Changing this resets the timer to that value. */
  durationSeconds: number;
  /** Optional label shown above the digits (e.g. "Pasta koken"). */
  label?: string;
  /** Auto-start when the component mounts / duration changes. Default: true. */
  autoStart?: boolean;
  /** Called once when the countdown hits zero. */
  onComplete?: () => void;
  /** Called when the user dismisses the timer (the X button). */
  onDismiss?: () => void;
}

export function CookTimer({
  durationSeconds,
  label,
  autoStart = true,
  onComplete,
  onDismiss,
}: Props) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [running, setRunning] = useState(autoStart);
  const [done, setDone] = useState(false);

  // Re-seed when the parent picks a different duration (e.g. user tapped a
  // different chip).
  useEffect(() => {
    setRemaining(durationSeconds);
    setRunning(autoStart);
    setDone(false);
  }, [durationSeconds, autoStart]);

  // Tick loop — use Date diffs rather than naive setInterval(1000) so we stay
  // accurate even when the JS thread is busy or the screen sleeps briefly.
  const endAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!running) {
      endAtRef.current = null;
      return;
    }
    endAtRef.current = Date.now() + remaining * 1000;
    const id = setInterval(() => {
      if (endAtRef.current == null) return;
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        setRunning(false);
        setDone(true);
      }
    }, 250);
    return () => clearInterval(id);
    // We intentionally only re-run when `running` flips so pause/resume work
    // off the live remaining value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Fire onComplete and feedback exactly once when the countdown ends.
  const completedRef = useRef(false);
  useEffect(() => {
    if (!done || completedRef.current) return;
    completedRef.current = true;
    onComplete?.();
    if (Platform.OS !== 'web') Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    Alert.alert(
      '⏰ Timer klaar',
      label ? `${label} is klaar.` : 'De timer is afgelopen.',
      [{ text: 'OK' }],
      { cancelable: true },
    );
  }, [done, label, onComplete]);

  // Pulse animation when done.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!done) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [done, pulse]);

  const toggle = useCallback(() => {
    if (done) {
      // Tapping again after completion resets.
      setRemaining(durationSeconds);
      setDone(false);
      completedRef.current = false;
      setRunning(true);
      return;
    }
    setRunning((r) => !r);
  }, [done, durationSeconds]);

  const reset = useCallback(() => {
    setRemaining(durationSeconds);
    setRunning(false);
    setDone(false);
    completedRef.current = false;
  }, [durationSeconds]);

  const progress = durationSeconds > 0
    ? 1 - Math.min(1, remaining / durationSeconds)
    : 0;

  return (
    <Animated.View style={[styles.wrap, done && styles.wrapDone, { transform: [{ scale: pulse }] }]}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label ?? 'Timer'}</Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} hitSlop={8} style={styles.dismissBtn}>
            <Ionicons name="close" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.digits, done && styles.digitsDone]}>
        {formatDuration(remaining)}
      </Text>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${progress * 100}%` }, done && styles.barFillDone]} />
      </View>

      <View style={styles.controls}>
        <TouchableOpacity onPress={toggle} style={[styles.btn, styles.btnPrimary]} activeOpacity={0.8}>
          <Ionicons
            name={done ? 'refresh' : running ? 'pause' : 'play'}
            size={18}
            color={colors.background}
          />
          <Text style={styles.btnPrimaryText}>
            {done ? 'Opnieuw' : running ? 'Pauzeren' : remaining < durationSeconds ? 'Hervatten' : 'Start'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={reset} style={styles.btn} activeOpacity={0.7}>
          <Ionicons name="stop" size={18} color={colors.textDark} />
          <Text style={styles.btnText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: colors.borderColor,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  wrapDone: {
    borderColor: colors.success,
    backgroundColor: 'rgba(90, 107, 58, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.folio,
    color: colors.textLight,
  },
  dismissBtn: { padding: 2 },
  digits: {
    fontFamily: fonts.monoMedium,
    fontSize: 42,
    color: colors.textDark,
    letterSpacing: 1.5,
    textAlign: 'center',
    lineHeight: 48,
  },
  digitsDone: { color: colors.success },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderSoft,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  barFillDone: { backgroundColor: colors.success },
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderColor,
  },
  btnText: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.textDark,
  },
  btnPrimary: {
    backgroundColor: colors.textDark,
    borderColor: colors.textDark,
  },
  btnPrimaryText: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.background,
    fontWeight: '600',
  },
});
