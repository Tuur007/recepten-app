// app/(tabs)/settings/index.tsx
//
// "En meer." — instellingen. De secties zijn opgesplitst in ./sections/*;
// deze container houdt enkel de accordion-state en de layout.

import { useState } from 'react';
import { Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { useFamilyStore } from '../../../store/familyStore';
import { spacing } from '../../../constants/Designsystem';
import { useThemeColors } from '../../../theme';
import { FolioStrip, EditorialTitle, RuleWithLabel } from '../../../components/ui/EditorialBits';
import { styles } from '../../../features/settings/styles';
import { Row } from '../../../features/settings/sections/Row';
import { FamilySection } from '../../../features/settings/sections/FamilySection';
import { InvitesSection } from '../../../features/settings/sections/InvitesSection';
import { CategorySection } from '../../../features/settings/sections/CategorySection';
import { ShopsSection } from '../../../features/settings/sections/ShopsSection';
import { ThemeSection } from '../../../features/settings/sections/ThemeSection';
import { BackupSection } from '../../../features/settings/sections/BackupSection';
import { SyncSection } from '../../../features/settings/sections/SyncSection';

export default function SettingsScreen() {
  const themeColors = useThemeColors();
  const familyName = useFamilyStore((s) => s.familyName);
  const appVersion = Constants.expoConfig?.version ?? '–';

  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (key: string) => setExpanded((prev) => (prev === key ? null : key));

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <FolioStrip
          left={`versie ${appVersion}`}
          right={familyName.trim() ? familyName : 'instellingen'}
        />

        <View style={styles.titleBlock}>
          <EditorialTitle lead="En" tail="meer." size={42} />
        </View>

        <Text style={styles.intro}>
          Een paar knoppen voor wie graag dingen op orde houdt.
        </Text>

        <FamilySection />
        <InvitesSection open={expanded === 'invites'} onToggle={() => toggle('invites')} />
        <CategorySection expanded={expanded} onToggle={toggle} />
        <ShopsSection open={expanded === 'shops'} onToggle={() => toggle('shops')} />
        <ThemeSection open={expanded === 'theme'} onToggle={() => toggle('theme')} />
        <BackupSection />
        <SyncSection />

        <View style={styles.section}>
          <RuleWithLabel label="over de app" bold />
          <View style={styles.sectionBody}>
            <Row label="versie" value={`v${appVersion}`} inert />
            <Row label="gebouwd met" value="Expo + SQLite" inert last />
          </View>
        </View>

        <Text style={styles.credit}>
          Gemaakt op de keukentafel,{'\n'}met liefde voor goed eten en mooie pagina's.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
