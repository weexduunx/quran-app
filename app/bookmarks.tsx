import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useProgressStore } from '@/stores/progressStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ArabicFonts, Spacing, Type } from '@/constants/theme';
import { Button, Card, IconButton } from '@/components/ui/kit';
import { repairArabicText } from '@/utils/textUtils';
import { surahTransliteration } from '@/utils/surahNames';

export default function BookmarksScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bookmarks = useProgressStore((s) => s.bookmarks);
  const removeBookmark = useProgressStore((s) => s.removeBookmark);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="chevron-back" label="Retour" onPress={() => router.back()} />
        <Text style={[Type.headline, { color: colors.text, flex: 1, textAlign: 'center' }]}>Mes favoris</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={bookmarks}
        keyExtractor={(b) => b.key}
        contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.md, paddingBottom: insets.bottom + Spacing.xxxl }}
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/surah/${item.surahId}?verse=${item.verseNumber}`)}>
            <View style={styles.row}>
              <Text style={[Type.caption, { color: colors.gold, flex: 1 }]}>
                {surahTransliteration(item.surahId)} · {item.surahId}:{item.verseNumber}
              </Text>
              <IconButton
                icon="trash-outline"
                size={18}
                color={colors.textSubtle}
                label="Supprimer le favori"
                onPress={() => removeBookmark(item.key)}
              />
            </View>
            <Text style={[styles.arabic, { color: colors.arabic }]} numberOfLines={3}>
              {repairArabicText(item.textArabic)}
            </Text>
            <Text style={[Type.callout, { color: colors.textMuted }]} numberOfLines={3}>
              {item.textFrench}
            </Text>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={44} color={colors.textSubtle} />
            <Text style={[Type.headline, { color: colors.text, marginTop: Spacing.lg }]}>Aucun favori</Text>
            <Text style={[Type.callout, { color: colors.textMuted, textAlign: 'center', marginVertical: Spacing.sm }]}>
              Touchez l&apos;icône signet sous un verset pour le retrouver ici.
            </Text>
            <Button title="Parcourir le Coran" variant="secondary" onPress={() => router.push('/explore')} />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: -Spacing.sm },
  arabic: {
    fontFamily: ArabicFonts.regular,
    fontSize: 24,
    lineHeight: 44,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: Spacing.sm,
  },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl },
});
