// Node ESM loader die RN-only modules vervangt door lege stubs zodat
// pure-logic tests onder tsx kunnen draaien zonder Metro.

const STUBS = new Set([
  'react-native',
  '@react-native-async-storage/async-storage',
  'expo-sqlite',
  'expo-image-manipulator',
  'expo-haptics',
  'react-native-toast-message',
  'expo-file-system/legacy',
  'expo-file-system',
  '@react-native-community/netinfo',
  'expo-router',
  'expo-constants',
  'expo-camera',
  'expo-image-picker',
  'expo-document-picker',
  'expo-sharing',
  'expo-notifications',
  'expo-keep-awake',
  'expo-linking',
  'expo-status-bar',
  'expo-font',
  '@expo/vector-icons',
  'react-native-view-shot',
  'react-native-gesture-handler',
  'react-native-reanimated',
  'react-native-screens',
  'react-native-safe-area-context',
  'react-native-url-polyfill',
  'react-native-url-polyfill/auto',
  '@expo-google-fonts/fraunces',
  '@expo-google-fonts/inter',
  '@expo-google-fonts/jetbrains-mono',
]);

export async function resolve(specifier, context, nextResolve) {
  if (STUBS.has(specifier)) {
    return {
      shortCircuit: true,
      url: new URL('./empty-stub.mjs', import.meta.url).href,
    };
  }
  return nextResolve(specifier, context);
}
