import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { EditorialTitle, FolioStrip } from '../components/ui/EditorialBits';
import { colors, fonts, spacing, typography } from '../constants/Designsystem';
import { ACCESS_CODE, useLockActions } from '../store/lockStore';
import { useFamilyStore } from '../store/familyStore';
import { haptics, toast } from '../utils/feedback';

export default function LockScreen() {
  const router = useRouter();
  const { unlock } = useLockActions();
  const onboardingComplete = useFamilyStore((s) => s.onboardingComplete);

  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (!code.trim()) return;
    if (code.trim() === ACCESS_CODE) {
      unlock();
      haptics.success();
      router.replace(onboardingComplete ? '/(tabs)/home' : '/onboarding');
    } else {
      haptics.error();
      setError(true);
      setCode('');
      toast.error('Onjuiste code', 'Vraag de code aan de eigenaar van de app.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FolioStrip left="toegang" right="privé" />

        <View style={styles.titleBlock}>
          <EditorialTitle lead="Voer je" tail="code in." size={42} />
        </View>

        <View style={styles.body}>
          <Text style={styles.intro}>
            Deze keuken is privé. Voer de code in die je van de eigenaar kreeg om
            de app te ontgrendelen.
          </Text>

          <View style={{ marginTop: spacing.xl }}>
            <Text style={styles.fieldLabel}>toegangscode</Text>
            <TextInput
              style={[styles.codeInput, error && styles.codeInputError]}
              value={code}
              onChangeText={(t) => {
                setCode(t);
                if (error) setError(false);
              }}
              placeholder="••••"
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          <View style={styles.ctaWrap}>
            <TouchableOpacity
              style={[styles.cta, !code.trim() && styles.ctaDisabled]}
              onPress={handleSubmit}
              disabled={!code.trim()}
              activeOpacity={0.85}
            >
              <Text style={typography.buttonLabel}>ontgrendel</Text>
              <Ionicons
                name="lock-open-outline"
                size={14}
                color={colors.background}
                style={{ marginLeft: 10 }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  titleBlock: { marginTop: spacing.md },
  body: { flex: 1, marginTop: spacing.md },
  intro: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
  },
  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textLight,
    marginBottom: 8,
  },
  codeInput: {
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: 6,
    color: colors.textDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    paddingVertical: 10,
  },
  codeInputError: { borderBottomColor: colors.primary },
  ctaWrap: { alignItems: 'center', marginTop: spacing.xl },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  ctaDisabled: { backgroundColor: colors.disabled },
});
