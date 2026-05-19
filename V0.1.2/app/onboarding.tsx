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

import {
  EditorialTitle,
  FamilyDot,
  FolioStrip,
  RuleWithLabel,
} from '../components/ui/EditorialBits';
import { colors, fonts, spacing, typography } from '../constants/Designsystem';
import {
  FAMILY_COLORS,
  useFamilyActions,
  useFamilyStore,
  type FamilyMember,
} from '../store/familyStore';
import { haptics } from '../utils/feedback';
import { requestNotificationPermission } from '../services/notifications';

type Step = 1 | 2;

export default function OnboardingScreen() {
  const router = useRouter();
  const familyName = useFamilyStore((s) => s.familyName);
  const members = useFamilyStore((s) => s.members);
  const {
    addMember,
    removeMember,
    updateName,
    updateColor,
    setFamilyName,
    completeOnboarding,
  } = useFamilyActions();

  const [step, setStep] = useState<Step>(1);
  const [nameInput, setNameInput] = useState(familyName);
  const [memberDraft, setMemberDraft] = useState<Record<string, string>>({});

  const trimmedName = nameInput.trim();
  const canContinueFromStep1 = trimmedName.length > 0;
  const canFinish = members.length > 0 && members.every((m) => m.name.trim().length > 0);

  const handleContinue = () => {
    setFamilyName(trimmedName);
    haptics.light();
    setStep(2);
  };

  const handleAddMember = () => {
    if (members.length >= 6) return;
    addMember();
    haptics.light();
  };

  const commitName = (id: string) => {
    const draft = memberDraft[id];
    if (draft === undefined) return;
    updateName(id, draft.trim());
    setMemberDraft((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleFinish = () => {
    // Make sure any in-flight name drafts are committed before persisting.
    Object.keys(memberDraft).forEach((id) => commitName(id));
    completeOnboarding();
    haptics.success();
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
            <EditorialTitle lead="Wie eten" tail="er mee?" size={42} />
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
              Voeg een tot zes gezinsleden toe. Je kunt dit later altijd aanpassen.
            </Text>

            <View style={{ marginTop: spacing.md }}>
              <RuleWithLabel label="aan tafel" />
            </View>

            <View style={{ marginTop: spacing.sm }}>
              {members.length === 0 ? (
                <Text style={styles.emptyHint}>— nog niemand toegevoegd</Text>
              ) : (
                members.map((member) => (
                  <MemberEditor
                    key={member.id}
                    member={member}
                    draftValue={memberDraft[member.id] ?? member.name}
                    onChangeDraft={(v) =>
                      setMemberDraft((prev) => ({ ...prev, [member.id]: v }))
                    }
                    onCommit={() => commitName(member.id)}
                    onPickColor={(c) => {
                      updateColor(member.id, c);
                      haptics.selection();
                    }}
                    onRemove={() => {
                      removeMember(member.id);
                      haptics.light();
                    }}
                  />
                ))
              )}
            </View>

            {members.length < 6 && (
              <TouchableOpacity
                onPress={handleAddMember}
                style={styles.addRow}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.addLabel}>voeg gezinslid toe</Text>
              </TouchableOpacity>
            )}

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

function MemberEditor({
  member,
  draftValue,
  onChangeDraft,
  onCommit,
  onPickColor,
  onRemove,
}: {
  member: FamilyMember;
  draftValue: string;
  onChangeDraft: (v: string) => void;
  onCommit: () => void;
  onPickColor: (c: string) => void;
  onRemove: () => void;
}) {
  return (
    <View style={memberStyles.block}>
      <View style={memberStyles.row}>
        <FamilyDot member={member} size={32} />
        <TextInput
          style={memberStyles.input}
          value={draftValue}
          onChangeText={onChangeDraft}
          onBlur={onCommit}
          onSubmitEditing={onCommit}
          placeholder="naam"
          placeholderTextColor={colors.textFaint}
          returnKeyType="done"
        />
        <TouchableOpacity onPress={onRemove} hitSlop={8} style={memberStyles.iconBtn}>
          <Ionicons name="trash-outline" size={14} color={colors.textFaint} />
        </TouchableOpacity>
      </View>
      <View style={memberStyles.swatchRow}>
        {FAMILY_COLORS.map((c) => {
          const active = c === member.color;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => onPickColor(c)}
              hitSlop={4}
              style={[
                memberStyles.swatch,
                { backgroundColor: c },
                active && memberStyles.swatchActive,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const memberStyles = StyleSheet.create({
  block: {
    paddingTop: spacing.sm,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  iconBtn: { padding: 6 },
  swatchRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingLeft: 44,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  swatchActive: { borderColor: colors.textDark },
});

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
  emptyHint: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textFaint,
    paddingVertical: spacing.sm,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.md,
  },
  addLabel: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 14,
    color: colors.primary,
  },
  notifHint: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
