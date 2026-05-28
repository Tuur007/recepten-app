// app/(tabs)/home.tsx
//
// "Vanavond" — editorial cookbook home.
// Changes vs previous:
//   • Folio met datum links + week / seizoen rechts
//   • Hero in een papier-rand kader (witte mat met zachte schaduw)
//   • Kicker "· het diner van vanavond ·" boven titel
//   • Meta-strip: voorber. / koken / porties (3 kolommen, hairline boven & onder)
//   • "aan tafel" rij met overlappende familie-stippen
//   • "ook deze week" preview met drie volgende dagen
//
// Data-bronnen blijven dezelfde hooks als voorheen.

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
import { useMealPlan, getISOWeek } from '../../store/weekPlannerStore';
import { useFamilyStore } from '../../store/familyStore';
import { useAuthStore } from '../../store/authStore';
import { isSupabaseConfigured } from '../../services/supabase';
import { LoadingScreen } from '../../components/LoadingScreen';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import {
  FolioStrip,
  EditorialTitle,
  MetaStrip,
  FamilyRow,
  RuleWithLabel,
} from '../../components/ui/EditorialBits';

import { colors, spacing, typography, fonts } from '../../constants/Designsystem';
import { useThemeColors } from '../../theme';

const DAY_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
const DAY_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const DAYS_FULL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

function seasonOf(d: Date) {
  const m = d.getMonth();
  if (m >= 2 && m <= 4) return 'lente';
  if (m >= 5 && m <= 7) return 'zomer';
  if (m >= 8 && m <= 10) return 'herfst';
  return 'winter';
}

function weekNumOf(d: Date) {
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
}

/** Splits a title into "lead" + "tail" (last word in italic). */
function splitTitle(title: string) {
  const words = title.trim().split(' ');
  if (words.length === 1) return { lead: '', tail: title };
  return { lead: words.slice(0, -1).join(' '), tail: words[words.length - 1] };
}

export default function HomeScreen() {
  const router = useRouter();
  const { recipes, isLoading } = useRecipes();
  const currentWeekKey = useMemo(() => getISOWeek(new Date()), []);
  const mealPlan = useMealPlan(currentWeekKey);
  const members = useFamilyStore((s) => s.members);
  const activeMembers = useMemo(() => members.filter((m) => m.active), [members]);
  const familyName = useFamilyStore((s) => s.familyName);
  const familyId = useAuthStore((s) => s.familyId);
  const showSyncBanner = familyId === null && isSupabaseConfigured();
  const themeColors = useThemeColors();

  const todayIdx = new Date().getDay();
  const todayKey = DAY_KEYS[todayIdx];

  const tonight = useMemo(() => {
    const dinnerId = mealPlan[todayKey]?.dinner;
    return dinnerId ? recipes.find((r) => r.id === dinnerId) ?? null : null;
  }, [recipes, mealPlan, todayKey]);

  // Next 3 days for "ook deze week"
  const upcoming = useMemo(() => {
    const out: { dayShort: string; recipe: ReturnType<typeof recipes.find> }[] = [];
    for (let i = 1; i <= 3; i++) {
      const idx = (todayIdx + i) % 7;
      const key = DAY_KEYS[idx];
      const dinnerId = mealPlan[key]?.dinner;
      out.push({
        dayShort: DAY_SHORT[idx],
        recipe: dinnerId ? recipes.find((r) => r.id === dinnerId) : undefined,
      });
    }
    return out;
  }, [recipes, mealPlan, todayIdx]);

  const d = new Date();
  const dateLabel = `${DAYS_FULL[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const weekLabel = `week ${weekNumOf(d)} · ${seasonOf(d)}`;

  if (isLoading) return <LoadingScreen />;

  const { lead, tail } = tonight ? splitTitle(tonight.title) : { lead: '', tail: '' };

  // Format duration into voorber + koken if both fields exist; otherwise show total.
  const prepNum = tonight?.preparationTime ?? null;
  const cookNum = tonight?.cookingTime ?? null;
  const portions = tonight?.servings ?? 4;

  const metaItems = [
    { num: prepNum ? String(prepNum).padStart(2, '0') : '–', unit: 'voorber.' },
    { num: cookNum ? String(cookNum).padStart(2, '0') : '–', unit: 'koken' },
    { num: String(portions).padStart(2, '0'), unit: 'porties' },
  ];

  return (
    <ErrorBoundary>
      <SafeAreaView
        style={[styles.container, { backgroundColor: themeColors.background }]}
        edges={['top']}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Sync-banner: enkel zichtbaar zonder gekoppeld gezin */}
          {showSyncBanner && (
            <TouchableOpacity
              style={styles.syncBanner}
              onPress={() => router.push('/auth/login')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Log in om met je gezin te delen"
            >
              <Text style={typography.folio}>synchronisatie · uit</Text>
              <Text style={styles.syncBannerText}>Log in om met je gezin te delen</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.textFaint} />
            </TouchableOpacity>
          )}

          {/* Folio */}
          <FolioStrip left={dateLabel} right={familyName.trim() ? familyName : weekLabel} />

          {/* Nr. centered */}
          <View style={styles.nrWrap}>
            <Text style={[typography.folio, { letterSpacing: 3, color: colors.textFaint }]}>
              · nr. {String((tonight?.id ?? '047').toString().slice(-3))} ·
            </Text>
          </View>

          {tonight ? (
            <>
              {/* Hero photo, with paper-edge frame */}
              <View style={styles.heroWrap}>
                <View style={styles.heroMat}>
                  {tonight.imageUri ? (
                    <Image source={{ uri: tonight.imageUri }} style={styles.heroImage} />
                  ) : (
                    <View style={[styles.heroImage, styles.heroPlaceholder]}>
                      <Text style={[typography.label12, { color: colors.textFaint }]}>
                        {tonight.title}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Kicker */}
              <Text
                style={[
                  typography.folioBold,
                  { color: colors.primary, textAlign: 'center', marginTop: spacing.lg },
                ]}
              >
                · het diner van vanavond ·
              </Text>

              {/* Title */}
              <View style={styles.titleBlock}>
                <EditorialTitle lead={lead} tail={tail + '.'} size={42} align="center" />
              </View>

              {/* Meta strip */}
              <MetaStrip items={metaItems} style={{ marginTop: spacing.lg }} />

              {/* Aan tafel */}
              {activeMembers.length > 0 && (
                <View style={styles.tableRow}>
                  <Text style={typography.folio}>aan tafel · {activeMembers.length}</Text>
                  <FamilyRow members={activeMembers} size={18} />
                </View>
              )}

              {/* CTA */}
              <View style={styles.ctaStack}>
                <TouchableOpacity
                  style={styles.cta}
                  onPress={() => router.push(`/recipes/${tonight.id}`)}
                  activeOpacity={0.85}
                >
                  <Text style={typography.buttonLabel}>begin met koken</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={colors.background}
                    style={{ marginLeft: 10 }}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.surpriseLink}
                  onPress={() => router.push('/(tabs)/recipes')}
                  activeOpacity={0.6}
                >
                  <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
                  <Text style={styles.surpriseText}>verras me met iets anders</Text>
                </TouchableOpacity>
              </View>

              {/* Ook deze week */}
              <View style={styles.weekPeek}>
                <RuleWithLabel label="ook deze week" />
                <View style={styles.peekGrid}>
                  {upcoming.map((u, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.peekCell}
                      disabled={!u.recipe}
                      onPress={() => u.recipe && router.push(`/recipes/${u.recipe.id}`)}
                      activeOpacity={0.7}
                    >
                      {u.recipe?.imageUri ? (
                        <Image source={{ uri: u.recipe.imageUri }} style={styles.peekImg} />
                      ) : (
                        <View style={[styles.peekImg, styles.heroPlaceholder]} />
                      )}
                      <Text style={[typography.folio, { color: colors.textFaint, marginTop: 6 }]}>
                        {u.dayShort}
                      </Text>
                      <Text style={styles.peekTitle} numberOfLines={1}>
                        {u.recipe ? u.recipe.title : '— nog leeg'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          ) : (
            /* Empty state */
            <View style={styles.emptyWrap}>
              <View style={styles.heroMat}>
                <View style={[styles.heroImage, styles.heroPlaceholder]}>
                  <Ionicons name="moon-outline" size={36} color={colors.textFaint} />
                </View>
              </View>
              <Text
                style={[
                  typography.folioBold,
                  { color: colors.primary, textAlign: 'center', marginTop: spacing.lg },
                ]}
              >
                · niets gepland ·
              </Text>
              <View style={styles.titleBlock}>
                <EditorialTitle lead="Vanavond" tail="vrij." size={42} align="center" />
              </View>
              <Text
                style={[
                  typography.bodyItalic,
                  { textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.lg },
                ]}
              >
                Een avond zonder plan, kies wat uit de week of laat je verrassen.
              </Text>
              <View style={styles.ctaStack}>
                <TouchableOpacity
                  style={styles.cta}
                  onPress={() => router.push('/(tabs)/weekplanner')}
                  activeOpacity={0.85}
                >
                  <Text style={typography.buttonLabel}>plan iets in</Text>
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
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: colors.borderColor,
  },
  syncBannerText: {
    flex: 1,
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textMedium,
  },

  nrWrap: { alignItems: 'center', paddingVertical: 6 },

  heroWrap: { alignItems: 'center', marginTop: spacing.sm },
  heroMat: {
    padding: 10,
    backgroundColor: colors.backgroundCard,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 26,
    elevation: 5,
  },
  heroImage: {
    width: 280,
    height: 260,
    backgroundColor: colors.backgroundLight,
  },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  titleBlock: { marginTop: spacing.sm, paddingHorizontal: spacing.sm },

  tableRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  ctaStack: {
    alignItems: 'center',
    gap: 14,
    marginTop: spacing.xl,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textDark,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  surpriseLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  surpriseText: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.primary,
  },

  weekPeek: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderSoft,
  },
  peekGrid: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  peekCell: { flex: 1 },
  peekImg: {
    width: '100%',
    height: 70,
    backgroundColor: colors.backgroundLight,
  },
  peekTitle: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.textDark,
    lineHeight: 16,
    marginTop: 2,
  },

  emptyWrap: { alignItems: 'center', marginTop: spacing.lg },
});
