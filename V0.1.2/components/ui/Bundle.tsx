// components/ui/Bundle.tsx
//
// "Boekrug"-component voor de Verzamelingen-look — een rechthoek in een donkere
// linnen-kleur met de titel verticaal-italic en folio-labels (vol. + count).

import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../constants/Designsystem';
import type { BundleData } from '../../features/collections/presenter';

interface Props {
  data: BundleData;
  /** Width in dp (default 100). */
  w?: number;
  /** Height in dp (default 140). */
  h?: number;
}

const PAPER = '#FBF6EA';

export function Bundle({ data, w = 100, h = 140 }: Props) {
  const titleSize = w >= 110 ? 18 : 15;
  return (
    <View style={[styles.spine, { width: w, height: h, backgroundColor: data.spine }]}>
      {/* binding hinge links + donkere rand rechts */}
      <View style={styles.hingeLeft} />
      <View style={styles.hingeRight} />

      <View style={styles.body}>
        <Text style={styles.vol}>vol. {data.vol}</Text>
        <View>
          <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize }]}>
            {data.title}
          </Text>
          <Text style={styles.count}>{data.count} recepten</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spine: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  hingeLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 6,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  hingeRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 4,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  body: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    left: 12,
    right: 10,
    justifyContent: 'space-between',
  },
  vol: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1.5,
    color: 'rgba(251,246,234,0.75)',
  },
  title: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    color: PAPER,
  },
  count: {
    fontFamily: fonts.mono,
    fontSize: 7,
    letterSpacing: 1.5,
    color: 'rgba(251,246,234,0.65)',
    marginTop: 6,
  },
});
