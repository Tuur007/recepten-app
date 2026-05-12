import { Alert, View, Pressable, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  totalCount: number;
  uncheckedCount: number;
  checkedCount: number;
  onSelectAllUnchecked: () => void;
  onClearChecked: () => void;
  onClearAll: () => void;
  onShare: () => void;
}

export function BulkActionsBar({
  totalCount,
  uncheckedCount,
  checkedCount,
  onSelectAllUnchecked,
  onClearChecked,
  onClearAll,
  onShare,
}: Props) {
  const handleClearAll = () => {
    Alert.alert(
      'Lijst wissen?',
      `Hiermee verwijder je alle ${totalCount} items.`,
      [
        { text: 'Annuleren', style: 'cancel' },
        { text: 'Wissen', style: 'destructive', onPress: onClearAll },
      ],
    );
  };

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
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        {uncheckedCount > 0 && (
          <Pressable
            onPress={onSelectAllUnchecked}
            style={({ pressed }) => ({
              flex: 1,
              minWidth: 110,
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
              Selecteer ({uncheckedCount})
            </Text>
          </Pressable>
        )}

        {checkedCount > 0 && (
          <Pressable
            onPress={onClearChecked}
            style={({ pressed }) => ({
              flex: 1,
              minWidth: 110,
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
              Ruim op ({checkedCount})
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
            Deel
          </Text>
        </Pressable>

        {totalCount > 0 && (
          <Pressable
            onPress={handleClearAll}
            style={({ pressed }) => ({
              paddingVertical: 10,
              paddingHorizontal: 12,
              backgroundColor: pressed ? 'rgba(194, 73, 42, 0.18)' : 'transparent',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#C2492A',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            })}
          >
            <MaterialCommunityIcons name="delete-sweep-outline" size={16} color="#C2492A" />
            <Text
              style={{ color: '#C2492A', fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' }}
            >
              Wis alles
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
