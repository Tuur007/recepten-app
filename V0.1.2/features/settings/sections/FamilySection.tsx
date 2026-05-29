import { useState } from 'react';
import { Text, View, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FAMILY_COLORS, useFamilyActions, useFamilyStore } from '../../../store/familyStore';
import { useAuthStore } from '../../../store/authStore';
import { ALLERGENS } from '../../../types/recipe';
import { colors } from '../../../constants/Designsystem';
import { haptics, toast } from '../../../utils/feedback';
import { RuleWithLabel, FamilyDot } from '../../../components/ui/EditorialBits';
import { styles } from '../styles';

// "Het gezin" — toont cloud family-leden. Alleen het eigen profiel (auth.uid)
// is bewerkbaar; andere leden zijn read-only.
export function FamilySection() {
  const members = useFamilyStore((s) => s.members);
  const user = useAuthStore((s) => s.user);
  const { updateMyProfile, setActive } = useFamilyActions();

  const [familyMemberDraft, setFamilyMemberDraft] = useState<Record<string, string>>({});
  const [allergyExpandedId, setAllergyExpandedId] = useState<string | null>(null);

  const handleNameDraftChange = (id: string, value: string) => {
    setFamilyMemberDraft((prev) => ({ ...prev, [id]: value }));
  };
  const commitNameDraft = (id: string) => {
    const draft = familyMemberDraft[id];
    if (draft === undefined) return;
    updateMyProfile({ displayName: draft.trim() }).catch(() =>
      toast.error('Niet opgeslagen', 'Wijziging is niet bewaard.'),
    );
    setFamilyMemberDraft((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const handlePickColor = (color: string) => {
    updateMyProfile({ color }).catch(() =>
      toast.error('Niet opgeslagen', 'Wijziging is niet bewaard.'),
    );
    haptics.selection();
  };
  const handleToggleAllergy = (current: string[], allergen: string) => {
    const next = current.includes(allergen)
      ? current.filter((a) => a !== allergen)
      : [...current, allergen];
    updateMyProfile({ allergies: next }).catch(() =>
      toast.error('Niet opgeslagen', 'Wijziging is niet bewaard.'),
    );
    haptics.selection();
  };
  const handleToggleActive = (active: boolean) => {
    setActive(active).catch(() =>
      toast.error('Niet opgeslagen', 'Wijziging is niet bewaard.'),
    );
  };

  return (
    <View style={styles.section}>
      <RuleWithLabel label="het gezin" bold />
      <View style={styles.sectionBody}>
        {members.length === 0 ? (
          <Text style={styles.emptyHint}>
            Nog geen gezinsleden. Log in en maak of join een gezin via een
            uitnodigingscode.
          </Text>
        ) : (
          members.map((member) => {
            const isMe = !!user && member.userId === user.id;
            const draft = familyMemberDraft[member.id];
            const value = draft ?? member.displayName;
            const allergyCount = member.allergies.length;
            return (
              <View key={member.id} style={styles.memberBlock}>
                <View style={styles.memberRow}>
                  <FamilyDot member={member} size={32} />
                  {isMe ? (
                    <TextInput
                      style={[
                        styles.memberInput,
                        !member.active && { color: colors.textFaint },
                      ]}
                      value={value}
                      onChangeText={(v) => handleNameDraftChange(member.id, v)}
                      onBlur={() => commitNameDraft(member.id)}
                      onSubmitEditing={() => commitNameDraft(member.id)}
                      placeholder="jouw naam"
                      placeholderTextColor={colors.textFaint}
                      returnKeyType="done"
                    />
                  ) : (
                    <Text
                      style={[
                        styles.memberReadonlyName,
                        !member.active && { color: colors.textFaint },
                      ]}
                    >
                      {member.displayName.trim() || '—'}
                    </Text>
                  )}
                  {isMe && <Text style={styles.meBadge}>JIJ</Text>}
                  {member.role === 'owner' && <Text style={styles.ownerBadge}>EIGENAAR</Text>}
                  {isMe ? (
                    <TouchableOpacity
                      onPress={() => handleToggleActive(!member.active)}
                      hitSlop={8}
                      style={styles.iconBtn}
                    >
                      <Ionicons
                        name={member.active ? 'eye-outline' : 'eye-off-outline'}
                        size={16}
                        color={member.active ? colors.primary : colors.textFaint}
                      />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons
                      name={member.active ? 'eye-outline' : 'eye-off-outline'}
                      size={16}
                      color={colors.textFaint}
                      style={styles.iconBtn}
                    />
                  )}
                </View>

                {isMe && (
                  <View style={styles.swatchRow}>
                    {FAMILY_COLORS.map((c) => {
                      const active = c === member.color;
                      return (
                        <TouchableOpacity
                          key={c}
                          onPress={() => handlePickColor(c)}
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
                )}

                {/* Allergieën */}
                {isMe ? (
                  <>
                    <TouchableOpacity
                      onPress={() => setAllergyExpandedId((prev) => (prev === member.id ? null : member.id))}
                      activeOpacity={0.7}
                      style={styles.allergyToggle}
                    >
                      <Text style={styles.allergyToggleLabel}>
                        {allergyCount > 0
                          ? `${allergyCount} allergie${allergyCount === 1 ? '' : 'ën'}`
                          : 'allergieën'}
                      </Text>
                      <Ionicons
                        name={allergyExpandedId === member.id ? 'chevron-down' : 'chevron-forward'}
                        size={12}
                        color={colors.textFaint}
                      />
                    </TouchableOpacity>
                    {allergyExpandedId === member.id && (
                      <View style={styles.allergyGrid}>
                        {ALLERGENS.map((allergen) => {
                          const active = member.allergies.includes(allergen);
                          return (
                            <TouchableOpacity
                              key={allergen}
                              onPress={() => handleToggleAllergy(member.allergies, allergen)}
                              style={[styles.allergyChip, active && styles.allergyChipActive]}
                            >
                              <Text style={[styles.allergyChipText, active && styles.allergyChipTextActive]}>
                                {allergen}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </>
                ) : (
                  allergyCount > 0 && (
                    <View style={styles.allergyToggle}>
                      <Text style={styles.allergyToggleLabel}>
                        {`${allergyCount} allergie${allergyCount === 1 ? '' : 'ën'}`}
                      </Text>
                    </View>
                  )
                )}
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}
