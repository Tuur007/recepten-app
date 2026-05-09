import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/Designsystem';

interface CookingTimeDisplayProps {
  preparationTime?: number;
  cookingTime?: number;
  size?: 'small' | 'medium';
  showIcon?: boolean;
}

export function CookingTimeDisplay({
  preparationTime = 0,
  cookingTime = 0,
  size = 'medium',
  showIcon = true,
}: CookingTimeDisplayProps) {
  const totalTime = preparationTime + cookingTime;
  if (totalTime === 0) return null;

  const formatTime = (m: number) =>
    m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`;

  const fontSize = size === 'small' ? 12 : 14;
  const iconSize = size === 'small' ? 16 : 18;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {showIcon && (
        <MaterialCommunityIcons name="clock-outline" size={iconSize} color={colors.secondary} />
      )}
      <Text style={{ fontSize, color: colors.secondary, fontFamily: 'Inter_500Medium' }}>
        {formatTime(totalTime)}
      </Text>
    </View>
  );
}
