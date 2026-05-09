import { View, Pressable, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  quantity: number;
  unit?: string;
  onQuantityChange: (quantity: number) => void;
  minQuantity?: number;
  maxQuantity?: number;
}

export function QuantityControls({
  quantity,
  unit,
  onQuantityChange,
  minQuantity = 0.5,
  maxQuantity = 999,
}: Props) {
  const handleDec = () => {
    const next = Math.max(minQuantity, quantity - 0.5);
    if (next >= minQuantity) onQuantityChange(next);
  };

  const handleInc = () => {
    const next = Math.min(maxQuantity, quantity + 0.5);
    if (next <= maxQuantity) onQuantityChange(next);
  };

  const display = Math.round(quantity * 100) / 100;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#E8DDD0',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <Pressable onPress={handleDec} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
        <MaterialCommunityIcons name="minus-circle-outline" size={20} color="#191613" />
      </Pressable>

      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          minWidth: 45,
          textAlign: 'center',
          fontFamily: 'Inter_600SemiBold',
        }}
      >
        {display}
        {unit ? ` ${unit}` : ''}
      </Text>

      <Pressable onPress={handleInc} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
        <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#191613" />
      </Pressable>
    </View>
  );
}
