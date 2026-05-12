import { Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { haptics } from '../../utils/feedback';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onPress: () => void;
  size?: number;
}

export function FavoriteButton({ isFavorite, onPress, size = 24 }: FavoriteButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    haptics.light();
    scale.value = withSequence(
      withTiming(1.2, { duration: 110 }),
      withTiming(1, { duration: 140 }),
    );
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Animated.View style={animatedStyle}>
        <MaterialCommunityIcons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={size}
          color={isFavorite ? '#C2492A' : '#191613'}
        />
      </Animated.View>
    </Pressable>
  );
}
