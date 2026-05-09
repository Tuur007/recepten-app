import { View, Text } from 'react-native';
import { getAisleLabel } from '../../../utils/groceryGrouping';

interface Props {
  aisle: string;
  count: number;
}

export function CategoryGroupHeader({ aisle, count }: Props) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F6F1E7' }}>
      <Text
        style={{ fontSize: 14, fontWeight: '700', color: '#191613', fontFamily: 'Inter_700Bold' }}
      >
        {getAisleLabel(aisle)} ({count})
      </Text>
      <View style={{ height: 1, backgroundColor: '#E8DDD0', marginTop: 8 }} />
    </View>
  );
}
