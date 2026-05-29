import { useCallback, useState } from 'react';
import { Clipboard, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../../../store/authStore';
import { createInviteCode, listInviteCodes } from '../../../services/inviteService';
import { colors, spacing } from '../../../constants/Designsystem';
import { haptics, toast } from '../../../utils/feedback';
import { RuleWithLabel } from '../../../components/ui/EditorialBits';
import { styles } from '../styles';
import { Row } from './Row';

type InviteCode = { id: string; code: string; expires_at: string; used_by: string | null };

export function InvitesSection({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const router = useRouter();
  const { familyId, user } = useAuthStore();

  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [creatingCode, setCreatingCode] = useState(false);

  const loadInviteCodes = useCallback(async () => {
    const codes = await listInviteCodes().catch(() => []);
    setInviteCodes(codes as InviteCode[]);
  }, []);

  const handleCreateInviteCode = async () => {
    if (creatingCode) return;
    setCreatingCode(true);
    try {
      const code = await createInviteCode();
      setGeneratedCode(code);
      haptics.success();
      await loadInviteCodes();
    } catch (err) {
      toast.error('Fout', err instanceof Error ? err.message : 'Code aanmaken mislukt.');
    } finally {
      setCreatingCode(false);
    }
  };

  return (
    <View style={styles.section}>
      <RuleWithLabel label="uitnodigingen" bold />
      <View style={styles.sectionBody}>
        {!user ? (
          <View style={styles.authPrompt}>
            <Text style={[styles.codeHint, { marginBottom: spacing.sm }]}>
              Log in om gezinsleden uit te nodigen.
            </Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')} style={styles.addBtn} activeOpacity={0.7}>
              <Ionicons name="log-in-outline" size={14} color={colors.primary} />
              <Text style={styles.addBtnLabel}>inloggen</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/auth/register')} style={styles.addBtn} activeOpacity={0.7}>
              <Ionicons name="person-add-outline" size={14} color={colors.primary} />
              <Text style={styles.addBtnLabel}>account aanmaken</Text>
            </TouchableOpacity>
          </View>
        ) : !familyId ? (
          <View style={styles.authPrompt}>
            <Text style={[styles.codeHint, { marginBottom: spacing.sm }]}>
              Maak eerst een gezin aan om uitnodigingscodes te gebruiken.
            </Text>
            <TouchableOpacity onPress={() => router.push('/auth/family-setup')} style={styles.addBtn} activeOpacity={0.7}>
              <Ionicons name="home-outline" size={14} color={colors.primary} />
              <Text style={styles.addBtnLabel}>gezin aanmaken</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Row
              label="codes"
              value={inviteCodes.filter((c) => !c.used_by).length + ' actief'}
              expanded={open}
              onPress={() => {
                if (!open) loadInviteCodes();
                onToggle();
              }}
              last
            />
            {open && (
              <View style={styles.subList}>
                {generatedCode && (
                  <View style={styles.codeBox}>
                    <Text style={styles.codeText}>{generatedCode}</Text>
                    <TouchableOpacity
                      onPress={() => { Clipboard.setString(generatedCode); toast.success('Gekopieerd', generatedCode); haptics.light(); }}
                      hitSlop={8}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="copy-outline" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
                <Text style={styles.codeHint}>Geldig voor 7 dagen · eenmalig gebruik</Text>
                {inviteCodes.filter((c) => !c.used_by).map((c) => (
                  <View key={c.id} style={styles.catRow}>
                    <Text style={styles.codeListItem}>{c.code}</Text>
                    <Text style={styles.codeExpiry}>
                      {new Date(c.expires_at) > new Date() ? 'actief' : 'verlopen'}
                    </Text>
                  </View>
                ))}
                <TouchableOpacity
                  onPress={handleCreateInviteCode}
                  style={styles.addBtn}
                  activeOpacity={0.7}
                  disabled={creatingCode}
                >
                  <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
                  <Text style={styles.addBtnLabel}>{creatingCode ? 'bezig…' : 'uitnodigingscode aanmaken'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}
