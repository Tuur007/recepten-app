import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../constants/Designsystem'; // ✅ FIXED

interface ErrorBoundaryProps {
  children: React.ReactNode;
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

  componentDidCatch(error: Error) {
    console.error('Error caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={[typography.title18, styles.title]}>⚠️ Oops!</Text>
          <Text style={[typography.body16, styles.message]}>
            Er is iets misgegaan.
          </Text>
          <Text style={[typography.caption14, styles.error]}>
            {this.state.error?.message}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // ✅ WARM CREAM
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  message: {
    color: colors.textMedium,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
