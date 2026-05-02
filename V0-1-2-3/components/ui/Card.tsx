import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { Colors } from './colors';

export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
});