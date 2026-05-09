import { Text, View } from 'react-native';
import { colors } from '../../constants/Designsystem';

interface DifficultyBadgeProps {
  difficulty?: 'easy' | 'medium' | 'hard';
  size?: 'small' | 'medium';
}

const config = {
  easy: { label: 'Makkelijk', color: '#5A6B3A' },
  medium: { label: 'Gemiddeld', color: '#D49A3A' },
  hard: { label: 'Lastig', color: '#C2492A' },
};

export function DifficultyBadge({ difficulty = 'medium', size = 'small' }: DifficultyBadgeProps) {
  if (!difficulty || !config[difficulty]) return null;

  const c = config[difficulty];
  const padding = size === 'small' ? 4 : 6;
  const fontSize = size === 'small' ? 12 : 13;

  return (
    <View
      style={{
        backgroundColor: c.color,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: padding,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          fontSize,
          fontWeight: '600',
          color: colors.background,
          fontFamily: 'Inter_600SemiBold',
        }}
      >
        {c.label}
      </Text>
    </View>
  );
}
