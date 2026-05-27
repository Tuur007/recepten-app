import { StyleSheet } from 'react-native';
import { colors, spacing, fonts } from '../../../constants/Designsystem';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  titleBlock: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  intro: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textLight,
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },

  // Section block: RuleWithLabel + body
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionBody: { marginTop: 6 },

  // Family editor
  emptyHint: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textLight,
    paddingVertical: spacing.sm,
  },
  memberBlock: {
    paddingTop: spacing.sm,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberInput: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  memberReadonlyName: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textDark,
    paddingVertical: 4,
  },
  meBadge: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.background,
    backgroundColor: colors.primary,
    borderRadius: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingLeft: 44, // align with name input (FamilyDot 32 + gap 12)
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: colors.textDark,
  },

  // Allergen chips per family member
  allergyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingLeft: 44,
  },
  allergyToggleLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  allergyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingLeft: 44,
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

  // Mockup setting row (label / mono value / chevron)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textMedium,
  },
  rowValue: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textLight,
  },

  // Inline expandable content
  subList: {
    paddingLeft: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  catName: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.textDark,
  },
  catInput: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.textDark,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  iconBtn: { padding: 6 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  addBtnLabel: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.primary,
  },

  // Theme chip strip
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  themeChip: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: colors.borderColor,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  themeChipLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textMedium,
  },

  hiddenAffordance: { height: 0 },

  // Back-up actions
  backupIcon: { marginRight: 8 },
  backupAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    marginTop: spacing.sm,
  },
  backupActionPrimary: {
    backgroundColor: colors.textDark,
  },
  backupActionSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: colors.borderColor,
  },
  backupActionLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.background,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderSoft,
  },
  notifLabel: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.textMedium,
  },
  notifAction: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.primary,
  },

  // Credit footer
  credit: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },

  // Invite codes
  authPrompt: {
    paddingVertical: spacing.sm,
    gap: 4,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.borderSoft,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    marginBottom: 4,
  },
  codeText: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 16,
    letterSpacing: 2,
    color: colors.textDark,
  },
  codeHint: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 11,
    color: colors.textFaint,
    marginBottom: 8,
  },
  codeListItem: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 1.4,
    color: colors.textMedium,
  },
  codeExpiry: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },

  // Cloud family members
  ownerBadge: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.primary,
    borderWidth: 0.5,
    borderColor: colors.primary,
    borderRadius: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
});

const MONTHS_NL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export function formatExportDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS_NL[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}
