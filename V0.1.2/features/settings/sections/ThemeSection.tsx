import { Text, View, TouchableOpacity } from 'react-native';

import { colors } from '../../../constants/Designsystem';
import { useThemeColors, useThemeMode, type ThemeMode } from '../../../theme';
import { haptics } from '../../../utils/feedback';
import { RuleWithLabel } from '../../../components/ui/EditorialBits';
import { styles } from '../styles';
import { Row } from './Row';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Systeem' },
  { value: 'light', label: 'Licht' },
  { value: 'dark', label: 'Donker' },
];

const THEME_LABEL: Record<ThemeMode, string> = {
  system: 'systeem',
  light: 'licht',
  dark: 'donker',
};

export function ThemeSection({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const themeColors = useThemeColors();
  const { mode, setMode } = useThemeMode();

  const cycleTheme = () => {
    const idx = THEME_OPTIONS.findIndex((o) => o.value === mode);
    const next = THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length];
    haptics.selection();
    setMode(next.value);
  };

  return (
    <View style={styles.section}>
      <RuleWithLabel label="op het scherm" bold />
      <View style={styles.sectionBody}>
        <Row
          label="donker thema"
          value={THEME_LABEL[mode]}
          expanded={open}
          onPress={onToggle}
          last
        />
        {open && (
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = mode === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => {
                    haptics.selection();
                    setMode(opt.value);
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.themeChip,
                    active && {
                      borderColor: themeColors.primary,
                      backgroundColor: themeColors.primary,
                    },
                  ]}
                >
                  <Text style={[styles.themeChipLabel, active && { color: colors.background }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
      {/* discreet "next" affordance also exists as tap on row itself */}
      <TouchableOpacity onPress={cycleTheme} style={styles.hiddenAffordance} />
    </View>
  );
}
