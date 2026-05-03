import React, { useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../services/auth/AuthContext';
import { useTheme } from '../../components/ui/ThemeContext';
import { AppTextInput } from '../../components/ui/AppTextInput';
import { Button } from '../../components/ui/Button';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInAnonymously, error, clearError } = useAuth();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(null);

  // Clear error on component mount
  useEffect(() => {
    clearError();
    setDisplayError(null);
  }, []);

  // Update display error when context error changes
  useEffect(() => {
    if (error) {
      setDisplayError(error);
    }
  }, [error]);

  const handleSignIn = async () => {
    if (!email.trim()) {
      setDisplayError('E-mailadres is verplicht');
      return;
    }

    if (!password.trim()) {
      setDisplayError('Wachtwoord is verplicht');
      return;
    }

    setDisplayError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Aanmelden mislukt';
      setDisplayError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymous = async () => {
    setDisplayError(null);
    setLoading(true);

    try {
      await signInAnonymously();
      router.replace('/(tabs)');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Aanmelden mislukt';
      setDisplayError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.logo, { color: colors.primary }]}>👨‍🍳</Text>
            <Text style={[styles.title, { color: colors.text }]}>Recepten</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Beheer je recepten en boodschappen
            </Text>
          </View>

          {displayError && (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {displayError}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setDisplayError(null);
                  clearError();
                }}
              >
                <Ionicons name="close" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.form}>
            <AppTextInput
              label="E-mailadres"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setDisplayError(null);
              }}
              placeholder="jouw@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />

            <View style={styles.passwordWrapper}>
              <AppTextInput
                label="Wachtwoord"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setDisplayError(null);
                }}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.togglePassword}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <Button
              label={loading ? 'Aanmelden…' : 'Aanmelden'}
              onPress={handleSignIn}
              loading={loading}
              fullWidth
              disabled={loading}
            />
          </View>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
              of zonder account
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Button
            label="Verder zonder inloggen"
            variant="secondary"
            onPress={handleAnonymous}
            loading={loading}
            fullWidth
            disabled={loading}
          />

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Nog geen account?
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/auth/register')}
              disabled={loading}
            >
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Registreren
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 24, paddingBottom: 40 },
  header: { alignItems: 'center', gap: 8, marginBottom: 24 },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 13, fontWeight: '500' },
  form: { gap: 16 },
  passwordWrapper: { position: 'relative' },
  togglePassword: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -9 }],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '500' },
  footer: { alignItems: 'center', gap: 4 },
  footerText: { fontSize: 13 },
  footerLink: { fontSize: 13, fontWeight: '700', marginTop: 4 },
});
