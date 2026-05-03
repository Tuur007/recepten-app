import React, { useState, useEffect } from 'react';
import {
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

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, error, clearError } = useAuth();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(null);

  // Clear error on mount
  useEffect(() => {
    clearError();
    setDisplayError(null);
  }, []);

  // Sync auth context error to display error
  useEffect(() => {
    if (error) {
      setDisplayError(error);
    }
  }, [error]);

  const validateForm = (): boolean => {
    setDisplayError(null);

    if (!email.trim()) {
      setDisplayError('E-mailadres is verplicht');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setDisplayError('Ongeldig e-mailadres');
      return false;
    }

    if (password.length < 6) {
      setDisplayError('Wachtwoord moet minstens 6 karakters lang zijn');
      return false;
    }

    if (password !== confirmPassword) {
      setDisplayError('Wachtwoorden komen niet overeen');
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      await signUp(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Registreren mislukt';
      setDisplayError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const dismissError = () => {
    setDisplayError(null);
    clearError();
  };

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const passwordLongEnough = password.length >= 6;

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
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={8}
              style={styles.backBtn}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Account aanmaken</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Maak een account aan om je recepten te synchroniseren
            </Text>
          </View>

          {displayError ? (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {displayError}
              </Text>
              <TouchableOpacity onPress={dismissError} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ) : null}

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
                placeholder="Minimaal 6 karakters"
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

            <View style={styles.passwordWrapper}>
              <AppTextInput
                label="Bevestig wachtwoord"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setDisplayError(null);
                }}
                placeholder="Herhaal wachtwoord"
                secureTextEntry={!showConfirm}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.togglePassword}
                onPress={() => setShowConfirm(!showConfirm)}
                hitSlop={8}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.requirements}>
              <PasswordRequirement met={passwordLongEnough} text="Minimaal 6 karakters" />
              <PasswordRequirement met={passwordsMatch} text="Wachtwoorden komen overeen" />
            </View>

            <Button
              label={loading ? 'Account aanmaken…' : 'Account aanmaken'}
              onPress={handleSignUp}
              loading={loading}
              fullWidth
              disabled={loading}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Heb je al een account?
            </Text>
            <TouchableOpacity onPress={() => router.back()} disabled={loading}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Inloggen
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

interface PasswordRequirementProps {
  met: boolean;
  text: string;
}

function PasswordRequirement({ met, text }: PasswordRequirementProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.requirement}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={met ? colors.green : colors.border}
      />
      <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 24, paddingBottom: 40 },
  header: { gap: 8, marginBottom: 12 },
  backBtn: { marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
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
  requirements: { gap: 8 },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: { fontSize: 12 },
  footer: { alignItems: 'center', gap: 4 },
  footerText: { fontSize: 13 },
  footerLink: { fontSize: 13, fontWeight: '700', marginTop: 4 },
});
