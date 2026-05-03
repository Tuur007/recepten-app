import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../../../types/recipe';
import { recipeShareService } from '../../../services/sharing/recipeShareService';
import { useTheme } from '../../../components/ui/ThemeContext';

interface ShareRecipeButtonProps {
  recipe: Recipe;
}

export function ShareRecipeButton({ recipe }: ShareRecipeButtonProps) {
  const { colors } = useTheme();
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);

    try {
      await recipeShareService.shareRecipe(recipe);
    } catch (error) {
      Alert.alert('Fout', 'Kon recept niet delen. Probeer opnieuw.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: colors.primaryLight, borderColor: colors.border },
        sharing && styles.buttonDisabled,
      ]}
      onPress={handleShare}
      disabled={sharing}
      activeOpacity={0.7}
      hitSlop={4}
    >
      <Ionicons
        name={sharing ? 'hourglass-outline' : 'share-social-outline'}
        size={18}
        color={sharing ? colors.textSecondary : colors.primary}
      />
      <Text style={[styles.label, { color: sharing ? colors.textSecondary : colors.primary }]}>
        {sharing ? 'Bezig…' : 'Delen'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  buttonDisabled: { opacity: 0.6 },
  label: { fontSize: 14, fontWeight: '600' },
});
