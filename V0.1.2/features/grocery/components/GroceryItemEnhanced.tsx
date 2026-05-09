import { View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GroceryItem } from '../../../types/grocery';
import { QuantityControls } from './QuantityControls';

interface Props {
  item: GroceryItem;
  onToggleCheck: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onDelete: (id: string) => void;
}

export function GroceryItemEnhanced({ item, onToggleCheck, onQuantityChange, onDelete }: Props) {
  const textColor = item.checked ? '#B0A9A0' : '#191613';
  const bg = item.checked ? '#F0E8DF' : '#F6F1E7';
  const displayQty = item.totalQuantity;

  return (
    <View
      style={{
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: bg,
        borderBottomWidth: 1,
        borderBottomColor: '#E8DDD0',
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Pressable
          onPress={() => onToggleCheck(item.id)}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <MaterialCommunityIcons
            name={item.checked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
            size={24}
            color={item.checked ? '#5A6B3A' : '#C2492A'}
          />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: textColor,
              fontFamily: 'Inter_600SemiBold',
              textDecorationLine: item.checked ? 'line-through' : 'none',
            }}
          >
            {item.name}
          </Text>
          {item.sources.length > 0 && (
            <Text
              style={{ fontSize: 11, color: '#9A9390', fontFamily: 'Inter_400Regular', marginTop: 2 }}
            >
              Van: {item.sources.map((s) => s.sourceName).join(', ')}
            </Text>
          )}
        </View>

        {!item.checked && displayQty > 0 && (
          <View style={{ alignItems: 'flex-end' }}>
            <QuantityControls
              quantity={displayQty}
              unit={item.unit || undefined}
              onQuantityChange={(qty) => onQuantityChange(item.id, qty)}
            />
            {item.price != null && (
              <Text
                style={{ fontSize: 11, color: '#9A9390', marginTop: 4, fontFamily: 'Inter_400Regular' }}
              >
                €{(item.price * (displayQty / 100)).toFixed(2)}
              </Text>
            )}
          </View>
        )}

        <Pressable
          onPress={() => onDelete(item.id)}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <MaterialCommunityIcons name="close-circle" size={20} color="#C2492A" />
        </Pressable>
      </View>
    </View>
  );
}
