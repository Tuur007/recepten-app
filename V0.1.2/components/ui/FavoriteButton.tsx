import { Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onPress: () => void;
  size?: number;
}

export function FavoriteButton({ isFavorite, onPress, size = 24 }: FavoriteButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <MaterialCommunityIcons
        name={isFavorite ? 'heart' : 'heart-outline'}
        size={size}
        color={isFavorite ? '#C2492A' : '#191613'}
      />
    </Pressable>
  );
}
