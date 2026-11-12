import React, { useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Surah } from '@/stores/quranStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { repairArabicText } from '@/utils/textUtils';
import { ArabicFonts, Radius, Spacing, Type } from '@/constants/theme';
import { IconButton, NumberBadge, Tap } from '@/components/ui/kit';

const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ'’\-\s]/g, '');

export function SurahPicker({
  visible,
  surahs,
  selected,
  onSelect,
  onClose,
  isDisabled,
  disabledLabel,
}: {
  visible: boolean;
  surahs: Surah[];
  selected?: number;
  onSelect: (surah: Surah) => void;
  onClose: () => void;
  isDisabled?: (surah: Surah) => boolean;
  disabledLabel?: string;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const data = useMemo(() => {
    const q = normalize(query);
    if (!q) return surahs;
    return surahs.filter(
      (s) =>
        String(s.number) === q ||
        normalize(s.name_transliteration).includes(q) ||
        normalize(s.name_french).includes(q)
    );
  }, [query, surahs]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Spacing.md }}>
        <View style={styles.header}>
          <Text style={[Type.title, { color: colors.text, flex: 1 }]}>Choisir une sourate</Text>
          <IconButton icon="close" label="Fermer" filled onPress={onClose} />
        </View>
        <View style={[styles.search, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name="search" size={18} color={colors.textSubtle} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Nom ou numéro…"
            placeholderTextColor={colors.textSubtle}
            style={[Type.body, { flex: 1, color: colors.text, marginLeft: Spacing.sm }]}
            autoCorrect={false}
          />
        </View>
        <FlatList
          data={data}
          keyExtractor={(s) => String(s.number)}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
          renderItem={({ item }) => {
            const disabled = isDisabled?.(item) ?? false;
            const active = item.number === selected;
            return (
              <Tap
                disabled={disabled}
                onPress={() => {
                  onSelect(item);
                  setQuery('');
                }}
                style={[
                  styles.row,
                  { borderBottomColor: colors.border, opacity: disabled ? 0.45 : 1 },
                  active && { backgroundColor: colors.primarySoft },
                ]}
              >
                <NumberBadge value={item.number} size={36} />
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={[Type.headline, { color: colors.text }]}>{item.name_transliteration}</Text>
                  <Text style={[Type.caption, { color: colors.textMuted }]} numberOfLines={1}>
                    {disabled && disabledLabel ? disabledLabel : `${item.name_french} · ${item.verses_count} versets`}
                  </Text>
                </View>
                <Text style={{ fontFamily: ArabicFonts.regular, fontSize: 22, color: colors.arabic }}>
                  {repairArabicText(item.name_arabic)}
                </Text>
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
  search: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    height: 46,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
