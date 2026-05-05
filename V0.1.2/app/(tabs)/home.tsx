/**
 * 🎨 HOME SCREEN — "Vanavond"
 *
 * Vervang: V0.1.2/app/(tabs)/home.tsx
 *
 * Editorial: één hero-foto, één recept, "verras me" als italic uitnodiging.
 * Geen stat cards meer — die conflicten met de rust-filosofie.
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useRecipes } from '../../features/recipes/hooks';
import { LoadingScreen } from '../../components/LoadingScreen';
import { ErrorBoundary } from '../../components/ErrorBoundary';

import { colors, spacing, typography, fonts } from '../../constants/Designsystem';

const PAPER = colors.background;

export default function HomeScreen() {
  const router = useRouter();
  const { recipes, isLoading } = useRecipes();

  // Pak vandaag's "voorgestelde" recept — eerste favoriet, anders eerste recept
  const tonight = useMemo(() => {
    if (!recipes.length) return null;
    return recipes.find((r) => r.isFavorite) ?? recipes[0];
  }, [recipes]);

  const dateLabel = useMemo(() => {
    const days = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
    const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    const d = new Date();
    return `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]}`;
  }, []);

  if (isLoading) return <LoadingScreen />;

  // Splits titel in 2 woorden: laatste = italic terracotta accent
  const splitTitle = (title: string) => {
    const words = title.trim().split(' ');
    if (words.length === 1) return { lead: '', tail: title };
    return { lead: words.slice(0, -1).join(' '), tail: words[words.length - 1] };
  };

  const { lead, tail } = tonight
    ? splitTitle(tonight.title)
    : { lead: 'Niets', tail: 'gepland' };

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Folio header */}
          <View style={styles.folio}>
            <Text style={typography.folio}>{dateLabel}</Text>
          </View>

          {/* Spacer */}
          <View style={{ flex: 1, minHeight: 40 }} />

          {/* Hero photo (round-cornered tall portrait) */}
          <View style={styles.heroWrap}>
            {tonight?.imageUri ? (
              <Image source={{ uri: tonight.imageUri }} style={styles.heroImage} />
            ) : (
              <View style={[styles.heroImage, styles.heroPlaceholder]}>
                <Text style={[typography.label12, { color: colors.textLight }]}>
                  vanavond
                </Text>
              </View>
            )}
          </View>

          {/* Kicker */}
          <Text style={[typography.folio, styles.kicker]}>vanavond</Text>

          {/* Title — Fraunces with italic terracotta accent */}
          <View style={styles.titleBlock}>
            {lead.length > 0 && (
              <Text style={[typography.hero32Bold, styles.titleLine]}>{lead}</Text>
            )}
            <Text style={[typography.heroItalic, styles.titleLine]}>{tail}</Text>
          </View>

          {/* Meta row */}
          {tonight && (
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color={colors.textLight} />
                <Text style={styles.metaText}>{tonight.totalTime ?? 45} min</Text>
              </View>
              <View style={styles.metaDot} />
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={13} color={colors.textLight} />
                <Text style={styles.metaText}>voor {tonight.servings ?? 4}</Text>
              </View>
            </View>
          )}

          {/* Spacer */}
          <View style={{ flex: 1, minHeight: 40 }} />

          {/* CTA stack */}
          <View style={styles.ctaStack}>
            {tonight && (
              <TouchableOpacity
                style={styles.cta}
                onPress={() => router.push(`/recipes/${tonight.id}`)}
                activeOpacity={0.85}
              >
                <Text style={typography.buttonLabel}>begin met koken</Text>
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={PAPER}
                  style={{ marginLeft: 10 }}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.surpriseLink}
              onPress={() => router.push('/(tabs)/recipes')}
              activeOpacity={0.6}
            >
              <Ionicons name="sparkles-outline" size={12} color={colors.textLight} />
              <Text style={styles.surpriseText}>verras me met iets anders</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAPER },

  scrollContent: {
    flexGrow: 1,
    minHeight: '100%',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

  folio: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },

  heroWrap: { alignItems: 'center', marginVertical: spacing.md },

  heroImage: {
    width: 240,
    height: 300,
    borderRadius: 12,
    backgroundColor: colors.backgroundLight,
  },

  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  kicker: { textAlign: 'center', marginTop: spacing.lg },

  titleBlock: { alignItems: 'center', marginTop: spacing.sm },

  titleLine: { textAlign: 'center', fontSize: 42, lineHeight: 44 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },

  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  metaText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textLight,
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textFaint,
  },

  ctaStack: {
    alignItems: 'center',
    gap: 14,
    marginBottom: spacing.md,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textDark,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
  },

  surpriseLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },

  surpriseText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textLight,
  },
});
