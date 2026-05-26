import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, spacing, typography } from '../../../../constants/Designsystem';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSharePdf: () => void;
  onShareText: () => void;
}

export function ShareMenuModal({ visible, onClose, onSharePdf, onShareText }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={[typography.folioBold, { marginBottom: spacing.sm }]}>deel</Text>
          <TouchableOpacity style={styles.row} onPress={onSharePdf} activeOpacity={0.7}>
            <Ionicons name="document-text-outline" size={18} color={colors.textDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>als PDF</Text>
              <Text style={styles.desc}>printvriendelijk, met ingrediënten en stappen.</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={onShareText} activeOpacity={0.7}>
            <Ionicons name="chatbox-ellipses-outline" size={18} color={colors.textDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>als tekst</Text>
              <Text style={styles.desc}>kopieer-klaar voor berichten of notities.</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
  },
  title: { fontFamily: fonts.display, fontSize: 16, color: colors.textDark },
  desc: {
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
});
