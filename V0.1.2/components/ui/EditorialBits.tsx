// components/ui/EditorialBits.tsx
//
// Gedeelde editorial-bits voor de nieuwe schermen.
// Niets hier hangt af van data — alleen de design-system imports.
//
//  • <FolioStrip>      monospaced ribbon links + rechts (datum · week, etc.)
//  • <RuleWithLabel>   "uitgelicht ─────"-stijl ruler met inset label
//  • <FamilyDot>       gekleurde initiaal-cirkel (Tuur/Louise/Basiel/Jules)
//  • <FamilyRow>       rij van overlappende family-dots
//  • <EditorialTitle>  twee-regel display titel, laatste woord italic terracotta
//  • <MetaStrip>       voorber. / koken / porties — 3- of 4-kolommen ruler

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { colors, fonts, typography, spacing } from '../../constants/Designsystem';
import type { FamilyMember } from '../../store/familyStore';

// ─── FolioStrip ──────────────────────────────────────────────────────────────
export function FolioStrip({
  left,
  right,
  paddingHorizontal = spacing.lg,
}: {
  left?: string;
  right?: string;
  paddingHorizontal?: number;
}) {
  return (
    <View style={[stylesFolio.row, { paddingHorizontal }]}>
      {left ? <Text style={typography.folio}>{left}</Text> : <View />}
      {right ? (
        <Text style={[typography.folio, { color: colors.textFaint }]}>{right}</Text>
      ) : (
        <View />
      )}
    </View>
  );
}

const stylesFolio = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
});

// ─── RuleWithLabel ───────────────────────────────────────────────────────────
export function RuleWithLabel({
  label,
  bold = false,
  color,
  style,
}: {
  label: string;
  bold?: boolean;
  color?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[stylesRule.row, style]}>
      <Text
        style={[
          bold ? typography.folioBold : typography.folio,
          color ? { color } : null,
        ]}
      >
        {label}
      </Text>
      <View style={stylesRule.line} />
    </View>
  );
}

const stylesRule = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: colors.borderColor },
});

// ─── FamilyDot ───────────────────────────────────────────────────────────────
export function FamilyDot({
  member,
  size = 18,
  ring = false,
}: {
  member: FamilyMember;
  size?: number;
  ring?: boolean;
}) {
  const initial = (member.name.trim()[0] ?? '?').toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: member.color,
        alignItems: 'center',
        justifyContent: 'center',
        ...(ring
          ? { borderWidth: 1.5, borderColor: colors.background }
          : null),
      }}
    >
      <Text
        style={{
          fontFamily: fonts.monoMedium,
          color: '#fff',
          fontSize: size <= 18 ? 8.5 : Math.round(size * 0.45),
          fontWeight: '600',
          letterSpacing: 0.5,
        }}
      >
        {initial}
      </Text>
    </View>
  );
}

// ─── FamilyRow ───────────────────────────────────────────────────────────────
export function FamilyRow({
  members,
  size = 18,
  overlap = 6,
  ring = true,
}: {
  members: FamilyMember[];
  size?: number;
  /** px overlap between adjacent dots */
  overlap?: number;
  ring?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {members.map((m, i) => (
        <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -overlap }}>
          <FamilyDot member={m} size={size} ring={ring} />
        </View>
      ))}
    </View>
  );
}

// ─── EditorialTitle ──────────────────────────────────────────────────────────
export function EditorialTitle({
  lead,
  tail,
  size = 38,
  align = 'left',
  accent,
}: {
  lead?: string;
  tail: string;
  size?: number;
  align?: 'left' | 'center' | 'right';
  accent?: string;
}) {
  const leadStyle: TextStyle = {
    fontFamily: fonts.display,
    fontWeight: '300',
    fontSize: size,
    lineHeight: size,
    letterSpacing: -0.8,
    color: colors.textDark,
    textAlign: align,
  };
  const tailStyle: TextStyle = {
    ...leadStyle,
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    color: accent ?? colors.primary,
  };
  return (
    <View>
      {lead ? <Text style={leadStyle}>{lead}</Text> : null}
      <Text style={tailStyle}>{tail}</Text>
    </View>
  );
}

// ─── MetaStrip ───────────────────────────────────────────────────────────────
export function MetaStrip({
  items,
  style,
}: {
  items: { num: string; unit: string }[];
  style?: ViewStyle;
}) {
  return (
    <View style={[stylesMeta.wrap, style]}>
      {items.map((m, i) => (
        <View
          key={i}
          style={[
            stylesMeta.col,
            i > 0 && { borderLeftWidth: 0.5, borderLeftColor: colors.borderSoft },
          ]}
        >
          <Text style={stylesMeta.num}>{m.num}</Text>
          <Text style={[typography.folio, { color: colors.textFaint, marginTop: 4 }]}>
            {m.unit}
          </Text>
        </View>
      ))}
    </View>
  );
}

const stylesMeta = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: colors.borderColor,
    paddingVertical: 10,
  },
  col: { flex: 1, alignItems: 'center' },
  num: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textDark,
    lineHeight: 22,
  },
});
