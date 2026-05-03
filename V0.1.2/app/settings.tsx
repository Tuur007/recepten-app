import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ui/ThemeContext';
import { useAuth } from '../services/auth/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, toggleTheme, useSystemTheme, setUseSystemTheme, colors } = useTheme();
  const { user, signOut, isAuthenticated } = useAuth();
  const systemColorScheme = useColorScheme();

  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Uitloggen',
      'Weet je zeker dat je wilt uitloggen?',
      [
        { text: 'Annuleer', style: 'cancel' },
        {
          text: 'Uitloggen',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await signOut();
              router.replace('/auth/login');
            } catch {
              Alert.alert('Fout', 'Kon niet uitloggen. Probeer opnieuw.');
            } finally {
              setSigningOut(false);
            }
          },
        },
      ],
    );
  };

  const getSystemThemeLabel = (): string => {
    if (systemColorScheme === 'dark') return 'Donker (systeem)';
    if (systemColorScheme === 'light') return 'Licht (systeem)';
    return 'Onbekend';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Instellingen</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Account Section */}
        {isAuthenticated && user ? (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Account</Text>

            <View style={[styles.row, { borderBottomColor: colors.border }]}>
              <Ionicons name="mail-outline" size={18} color={colors.primary} />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>E-mailadres</Text>
                <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.row}
              onPress={handleSignOut}
              disabled={signingOut}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={[styles.rowLabel, { color: colors.danger, flex: 1, marginLeft: 12 }]}>
                {signingOut ? 'Bezig…' : 'Uitloggen'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Account</Text>
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push('/auth/login')}
              activeOpacity={0.7}
            >
              <Ionicons name="log-in-outline" size={18} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.primary, flex: 1, marginLeft: 12 }]}>
                Inloggen of registreren
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Appearance Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Uiterlijk</Text>

          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
            <Text style={[styles.rowLabel, { color: colors.text, flex: 1, marginLeft: 12 }]}>
              Systeemthema volgen
            </Text>
            <Switch
              value={useSystemTheme}
              onValueChange={setUseSystemTheme}
              trackColor={{ false: colors.border, true: colors.green }}
              thumbColor="#fff"
            />
          </View>

          {!useSystemTheme ? (
            <TouchableOpacity
              style={styles.row}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Ionicons
                name={theme === 'dark' ? 'moon' : 'sunny'}
                size={18}
                color={colors.primary}
              />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Thema</Text>
                <Text style={[styles.rowValue, { color: colors.text }]}>
                  {theme === 'dark' ? '🌙 Donker' : '☀️ Licht'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.row}>
              <Ionicons
                name={systemColorScheme === 'dark' ? 'moon' : 'sunny'}
                size={18}
                color={colors.primary}
              />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
                  Systeemvoorkeur
                </Text>
                <Text style={[styles.rowValue, { color: colors.text }]}>
                  {getSystemThemeLabel()}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* About Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Over</Text>

          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Versie</Text>
              <Text style={[styles.rowValue, { color: colors.text }]}>1.1.0 (Sprint 3)</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <Text style={[styles.rowLabel, { color: colors.text, flex: 1, marginLeft: 12 }]}>
              Privacybeleid
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  section: {
    borderRadius: 12,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 0,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: '500', marginTop: 2 },
});
