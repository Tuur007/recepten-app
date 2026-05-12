import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

type ToastType = 'success' | 'error' | 'info';

interface ShowToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
  /** Duration in ms — default ~2.4s for success, longer for error. */
  duration?: number;
}

export function showToast({ type = 'success', title, message, duration }: ShowToastOptions) {
  Toast.show({
    type,
    text1: title,
    text2: message,
    visibilityTime: duration ?? (type === 'error' ? 3500 : 2400),
    position: 'bottom',
    bottomOffset: 80,
  });
}

export const toast = {
  success: (title: string, message?: string) => showToast({ type: 'success', title, message }),
  error: (title: string, message?: string) => showToast({ type: 'error', title, message }),
  info: (title: string, message?: string) => showToast({ type: 'info', title, message }),
};

/**
 * Lightweight wrapper around expo-haptics that fails open: if the platform
 * doesn't support haptics (web, some Android devices) we silently swallow the
 * error so callers never need a try/catch around UI feedback.
 */
export const haptics = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
  selection: () => Haptics.selectionAsync().catch(() => {}),
};
