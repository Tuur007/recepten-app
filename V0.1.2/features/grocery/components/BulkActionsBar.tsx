import { View, Pressable, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  uncheckedCount: number;
  checkedCount: number;
  onSelectAllUnchecked: () => void;
  onClearChecked: () => void;
  onShare: () => void;
}

export function BulkActionsBar({
  uncheckedCount,
  checkedCount,
  onSelectAllUnchecked,
  onClearChecked,
  onShare,
}: Props) {
  return (
    <View
      style={{
        backgroundColor: '#F6F1E7',
        borderTopWidth: 1,
        borderTopColor: '#E8DDD0',
        padding: 12,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
        {uncheckedCount > 0 && (
          <Pressable
            onPress={onSelectAllUnchecked}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              backgroundColor: pressed ? '#D49A3A' : '#C2492A',
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            })}
          >
            <MaterialCommunityIcons name="checkbox-multiple-marked" size={16} color="#F6F1E7" />
            <Text
              style={{ color: '#F6F1E7', fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}
            >
              Select ({uncheckedCount})
            </Text>
          </Pressable>
        )}

        {checkedCount > 0 && (
          <Pressable
            onPress={onClearChecked}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              backgroundColor: pressed ? '#5A7B3A' : '#5A6B3A',
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            })}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#F6F1E7" />
            <Text
              style={{ color: '#F6F1E7', fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}
            >
              Clear ({checkedCount})
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={onShare}
          style={({ pressed }) => ({
            paddingVertical: 10,
            paddingHorizontal: 12,
            backgroundColor: pressed ? '#D4A93A' : '#D49A3A',
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          })}
        >
          <MaterialCommunityIcons name="share-variant" size={16} color="#F6F1E7" />
          <Text
            style={{ color: '#F6F1E7', fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}
          >
            Share
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
