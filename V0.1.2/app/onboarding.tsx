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
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';

import {
  EditorialTitle,
  FolioStrip,
  RuleWithLabel,
} from '../components/ui/EditorialBits';
import { colors, fonts, spacing, typography } from '../constants/Designsystem';
import { FAMILY_COLORS, useFamilyActions, useFamilyStore } from '../store/familyStore';
import { savePendingProfile } from '../services/familyMembers';
import { useAuthStore } from '../store/authStore';
import { ALLERGENS } from '../types/recipe';
import { haptics } from '../utils/feedback';
import { requestNotificationPermission } from '../services/notifications';

export default function OnboardingScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const familyName = useFamilyStore((s) => s.familyName);
  const familyId = useAuthStore((s) => s.familyId);
  const { setFamilyName, completeOnboarding, updateMyProfile } = useFamilyActions();

  const [step, setStep] = useState(1);
  const [nameInput, setNameInput] = useState(familyName);

  // Profiel van de huidige gebruiker.
  const [myName, setMyName] = useState('');
  const [myColor, setMyColor] = useState(FAMILY_COLORS[0]);
  const [myAllergies, setMyAllergies] = useState<string[]>([]);

  const trimmedFamilyName = nameInput.trim();
  const canContinueFromStep1 = trimmedFamilyName.length > 0;
  const canFinish = myName.trim().length > 0;

  const handleContinue = () => {
    setFamilyName(trimmedFamilyName);
    haptics.light();
    setStep(2);
  };

  const toggleAllergy = (allergen: string) => {
    setMyAllergies((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen],
    );
    haptics.selection();
  };

  const handleFinish = async () => {
    const profile = {
      displayName: myName.trim(),
      color: myColor,
      allergies: myAllergies,
    };

    completeOnboarding();
    haptics.success();

    // Heeft de gebruiker al een gezin (bv. via uitnodigingscode)? Dan meteen
    // naar de cloud. Anders bewaren we het profiel tot na family-setup.
    try {
      if (familyId) {
        await updateMyProfile(profile);
      } else {
        await savePendingProfile(db, profile);
      }
    } catch (err) {
      console.warn('[onboarding] profiel bewaren mislukt:', err);
    }

    // Vraag notificatiepermissie — niet-blokkerend.
    requestNotificationPermission().catch(() => {});
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FolioStrip
          left={`stap ${step} · 2`}
          right={step === 2 ? 'klaar?' : 'welkom'}
        />

        <View style={styles.titleBlock}>
          {step === 1 ? (
            <EditorialTitle lead="Welkom" tail="thuis." size={42} />
          ) : (
            <EditorialTitle lead="Jouw" tail="profiel." size={42} />
          )}
        </View>

        {step === 1 ? (
          <View style={styles.body}>
            <Text style={styles.intro}>
              Geef jullie keukentafel een naam. Iets korts — wat boven aan de week mag staan.
            </Text>
            <View style={{ marginTop: spacing.lg }}>
              <Text style={styles.fieldLabel}>gezinsnaam</Text>
              <TextInput
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="bv. familie Janssen"
                placeholderTextColor={colors.textFaint}
                returnKeyType="next"
                onSubmitEditing={() => canContinueFromStep1 && handleContinue()}
                autoFocus
              />
            </View>

            <View style={styles.ctaWrap}>
              <TouchableOpacity
                style={[styles.cta, !canContinueFromStep1 && styles.ctaDisabled]}
                onPress={handleContinue}
                disabled={!canContinueFromStep1}
                activeOpacity={0.85}
              >
                <Text style={typography.buttonLabel}>verder</Text>
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={colors.background}
                  style={{ marginLeft: 10 }}
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.body}>
            <Text style={styles.intro}>
              Stel je eigen kaartje in. Andere gezinsleden voeg je later toe met een
              uitnodigingscode.
            </Text>

            <View style={{ marginTop: spacing.lg }}>
              <Text style={styles.fieldLabel}>jouw naam</Text>
              <TextInput
                style={styles.nameInput}
                value={myName}
                onChangeText={setMyName}
                placeholder="bv. Tuur"
                placeholderTextColor={colors.textFaint}
                returnKeyType="done"
                autoFocus
              />
            </View>

            <View style={{ marginTop: spacing.lg }}>
              <Text style={styles.fieldLabel}>jouw kleur</Text>
              <View style={styles.swatchRow}>
                {FAMILY_COLORS.map((c) => {
                  const active = c === myColor;
                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => {
                        setMyColor(c);
                        haptics.selection();
                      }}
                      hitSlop={4}
                      style={[
                        styles.swatch,
                        { backgroundColor: c },
                        active && styles.swatchActive,
                      ]}
                    />
                  );
                })}
              </View>
            </View>

            <View style={{ marginTop: spacing.lg }}>
              <RuleWithLabel label="allergieën" />
              <View style={styles.allergyGrid}>
                {ALLERGENS.map((allergen) => {
                  const active = myAllergies.includes(allergen);
                  return (
                    <TouchableOpacity
                      key={allergen}
                      onPress={() => toggleAllergy(allergen)}
                      style={[styles.allergyChip, active && styles.allergyChipActive]}
                    >
                      <Text style={[styles.allergyChipText, active && styles.allergyChipTextActive]}>
                        {allergen}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Text style={styles.notifHint}>
              · we herinneren je elke dag om 16u aan je diner ·
            </Text>

            <View style={styles.ctaWrap}>
              <TouchableOpacity
                style={[styles.cta, !canFinish && styles.ctaDisabled]}
                onPress={handleFinish}
                disabled={!canFinish}
                activeOpacity={0.85}
              >
                <Text style={typography.buttonLabel}>klaar, begin met koken</Text>
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={colors.background}
                  style={{ marginLeft: 10 }}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  nameInput: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
    paddingVertical: 10,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  swatchActive: { borderColor: colors.textDark },
  allergyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  allergyChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
  },
  allergyChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  allergyChipText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.textLight,
  },
  allergyChipTextActive: {
    color: colors.background,
  },
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
  notifHint: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
