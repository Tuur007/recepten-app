// Entry point shim — required by tools that expect App.js.
// In a normal Expo project the entry is "expo-router/entry" (set in package.json).
// Expo Snack does not support expo-router file-based routing or expo-sqlite
// (native module). Run locally with: npx expo start
import { ExpoRoot } from 'expo-router';
import React from 'react';

const ctx = require.context('./app');

export default function App() {
  return React.createElement(ExpoRoot, { context: ctx });
}
