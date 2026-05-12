import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, typography } from '../constants/Designsystem';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional friendly message shown above the technical detail. */
  fallbackMessage?: string;
  /** Optional callback fired when the user taps "Probeer opnieuw". */
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Ionicons name="warning-outline" size={48} color={colors.primary} />
        <Text style={[typography.title20, styles.title]}>Er ging iets mis</Text>
        <Text style={[typography.body16, styles.message]}>
          {this.props.fallbackMessage ?? 'Het scherm kon niet geladen worden.'}
        </Text>
        {this.state.error?.message ? (
          <Text style={styles.errorDetail} numberOfLines={4}>
            {this.state.error.message}
          </Text>
        ) : null}
        <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.85}>
          <Ionicons name="refresh" size={14} color={colors.background} />
          <Text style={styles.buttonLabel}>Probeer opnieuw</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.textDark,
    marginTop: spacing.sm,
  },
  message: {
    color: colors.textMedium,
    textAlign: 'center',
  },
  errorDetail: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textFaint,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.textDark,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    marginTop: spacing.md,
  },
  buttonLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.background,
  },
});
