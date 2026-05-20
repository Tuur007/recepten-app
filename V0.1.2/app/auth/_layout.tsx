import { Stack } from 'expo-router';
import { useThemeColors } from '../../theme';

export default function AuthLayout() {
  const themeColors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background },
      }}
    />
  );
}
