import { Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/Designsystem';
import { styles } from '../styles';

// Mockup setting row: label | mono value | chevron.
export function Row({
  label,
  value,
  expanded,
  onPress,
  inert,
  last,
}: {
  label: string;
  value: string;
  expanded?: boolean;
  onPress?: () => void;
  inert?: boolean;
  last?: boolean;
}) {
  const body = (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      {!inert && (
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={14}
          color={colors.textFaint}
          style={{ marginLeft: 6 }}
        />
      )}
    </View>
  );
  if (inert || !onPress) return body;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.65}>
      {body}
    </TouchableOpacity>
  );
}
