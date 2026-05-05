import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/Designsystem';
import { saveRecipeImage } from '../../../utils/imageStorage';

interface RecipeImagePickerProps {
  imageUri?: string;
  onImageSelect: (uri: string) => void;
  onImageRemove: () => void;
  loading?: boolean;
}

export function RecipeImagePicker({
  imageUri,
  onImageSelect,
  onImageRemove,
  loading = false,
}: RecipeImagePickerProps) {
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      try {
        const saved = await saveRecipeImage(result.assets[0].uri);
        onImageSelect(saved);
      } catch (err) {
        console.error('[RecipeImagePicker]', err);
      }
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      try {
        const saved = await saveRecipeImage(result.assets[0].uri);
        onImageSelect(saved);
      } catch (err) {
        console.error('[RecipeImagePicker]', err);
      }
    }
  };

  if (imageUri) {
    return (
      <View style={styles.container}>
        <View style={styles.imageWrapper}>
          <Image source={{ uri: imageUri }} style={styles.image} />
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={onImageRemove}
            disabled={loading}
          >
            <Ionicons name="close-circle" size={28} color={colors.error} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.changeBtn}
          onPress={handlePickImage}
          disabled={loading}
        >
          <Ionicons name="images-outline" size={16} color={colors.white} />
          <Text style={styles.changeBtnText}>Afbeelding wijzigen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Afbeelding</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleTakePhoto}
          disabled={loading}
        >
          <Ionicons name="camera-outline" size={20} color={colors.white} />
          <Text style={styles.actionBtnText}>Foto maken</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handlePickImage}
          disabled={loading}
        >
          <Ionicons name="images-outline" size={20} color={colors.white} />
          <Text style={styles.actionBtnText}>Uit gallerij</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonRow: { gap: 8, flexDirection: 'row' },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 0,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.backgroundLight,
  },
  image: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
  },
  changeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
});
