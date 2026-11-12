import React from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CITIES } from '@/utils/cities';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Spacing, Type } from '@/constants/theme';
import { IconButton, Tap } from '@/components/ui/kit';

export function CityPicker({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string;
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Spacing.md }}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[Type.title, { color: colors.text }]}>Votre ville</Text>
            <Text style={[Type.caption, { color: colors.textMuted }]}>Pour calculer les heures de prière</Text>
          </View>
          <IconButton icon="close" label="Fermer" filled onPress={onClose} />
        </View>
        <FlatList
          data={CITIES}
          keyExtractor={(c) => c.name}
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
          renderItem={({ item }) => {
            const active = item.name === selected;
            return (
              <Tap
                onPress={() => onSelect(item.name)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.row, { borderBottomColor: colors.border }, active && { backgroundColor: colors.primarySoft }]}
              >
                <Ionicons name="location-outline" size={20} color={active ? colors.primary : colors.textSubtle} />
                <Text style={[Type.body, { flex: 1, marginLeft: Spacing.md, color: colors.text, fontWeight: active ? '600' : '400' }]}>
                  {item.name}
                </Text>
                {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </Tap>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
