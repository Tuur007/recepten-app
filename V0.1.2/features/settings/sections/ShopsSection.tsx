import { useRef, useState } from 'react';
import { Text, View, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useShopsStore, useShopsActions } from '../../../store/shopsStore';
import { colors } from '../../../constants/Designsystem';
import { haptics } from '../../../utils/feedback';
import { RuleWithLabel } from '../../../components/ui/EditorialBits';
import { styles } from '../styles';
import { Row } from './Row';

export function ShopsSection({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const shops = useShopsStore((s) => s.shops);
  const { addShop, removeShop } = useShopsActions();
  const [newShopName, setNewShopName] = useState('');
  const [addingShop, setAddingShop] = useState(false);
  const newShopInputRef = useRef<TextInput>(null);

  const commitNewShop = () => {
    if (newShopName.trim()) { addShop(newShopName.trim()); haptics.light(); }
    setNewShopName('');
    setAddingShop(false);
  };

  return (
    <View style={styles.section}>
      <RuleWithLabel label="de winkels" bold />
      <View style={styles.sectionBody}>
        <Row
          label="supermarkten"
          value={String(shops.length)}
          expanded={open}
          onPress={onToggle}
          last
        />
        {open && (
          <View style={styles.subList}>
            {shops.map((shop) => (
              <View key={shop.id} style={styles.catRow}>
                <Text style={styles.catName}>{shop.name}</Text>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Verwijderen', `"${shop.name}" verwijderen?`, [
                      { text: 'Annuleren', style: 'cancel' },
                      { text: 'Verwijderen', style: 'destructive', onPress: () => { removeShop(shop.id); haptics.medium(); } },
                    ]);
                  }}
                  hitSlop={8}
                  style={styles.iconBtn}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.textFaint} />
                </TouchableOpacity>
              </View>
            ))}
            {addingShop ? (
              <View style={styles.catRow}>
                <TextInput
                  ref={newShopInputRef}
                  style={styles.catInput}
                  value={newShopName}
                  onChangeText={setNewShopName}
                  onSubmitEditing={commitNewShop}
                  placeholder="Naam winkel…"
                  placeholderTextColor={colors.textFaint}
                  returnKeyType="done"
                  autoFocus
                />
                <TouchableOpacity onPress={commitNewShop} hitSlop={8} style={styles.iconBtn}>
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setAddingShop(false); setNewShopName(''); }} hitSlop={8} style={styles.iconBtn}>
                  <Ionicons name="close" size={16} color={colors.textLight} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => { setAddingShop(true); setTimeout(() => newShopInputRef.current?.focus(), 120); }}
                style={styles.addBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
                <Text style={styles.addBtnLabel}>winkel toevoegen</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
