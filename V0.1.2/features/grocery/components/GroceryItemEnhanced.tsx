import { View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { GroceryItem } from '../../../types/grocery';
import { useShopsStore } from '../../../store/shopsStore';
import { haptics } from '../../../utils/feedback';

interface Props {
  item: GroceryItem;
  onToggleCheck: (id: string) => void;
  onEdit: (item: GroceryItem) => void;
  onDelete: (id: string) => void;
}

export function GroceryItemEnhanced({ item, onToggleCheck, onEdit, onDelete }: Props) {
  const shops = useShopsStore((s) => s.shops);
  const shopName = item.storeId ? shops.find((s) => s.id === item.storeId)?.name : undefined;

  const textColor = item.checked ? '#B0A9A0' : '#191613';
  const bg = item.checked ? '#F0E8DF' : '#F6F1E7';
  const displayQty = item.totalQuantity;

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(180)}
      layout={LinearTransition.duration(220)}
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

        <Pressable
          onPress={() => {
            haptics.selection();
            onEdit(item);
          }}
          style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
        >
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: textColor,
                  fontFamily: 'Inter_600SemiBold',
                  textDecorationLine: item.checked ? 'line-through' : 'none',
                  flexShrink: 1,
                }}
              >
                {displayQty > 0 ? `${displayQty}${item.unit ? ` ${item.unit}` : ''} ` : ''}{item.name}
              </Text>
              {shopName && !item.checked && (
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    borderWidth: 0.5,
                    borderColor: '#C2492A',
                  }}
                >
                  <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 8, letterSpacing: 0.5, color: '#C2492A', textTransform: 'uppercase' }}>
                    {shopName}
                  </Text>
                </View>
              )}
            </View>
            {item.sources.length > 0 && (
              <Text style={{ fontSize: 11, color: '#9A9390', fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                {item.sources.map((s) => s.sourceName).join(', ')}
                {item.price != null ? `  ·  €${(item.price * (displayQty > 0 ? displayQty : 1)).toFixed(2)}` : ''}
              </Text>
            )}
          </View>
        </Pressable>

        <Pressable
          onPress={() => {
            haptics.heavy();
            onDelete(item.id);
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <MaterialCommunityIcons name="close-circle" size={20} color="#C2492A" />
        </Pressable>
      </View>
    </Animated.View>
  );
}
