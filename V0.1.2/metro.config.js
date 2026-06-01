// Metro-config met web-support voor expo-sqlite.
// expo-sqlite draait op web via een WASM-build (wa-sqlite). Metro behandelt
// `.wasm` standaard niet als asset, dus voegen we de extensie expliciet toe.
// Native (iOS/Android) blijft volledig ongemoeid — dit raakt enkel de bundler.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

module.exports = config;
