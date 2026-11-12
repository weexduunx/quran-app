import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Surah } from '@/stores/quranStore';
import { repairArabicText } from '@/utils/textUtils';
import { revelationLabel } from '@/utils/quranMeta';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ArabicFonts, Spacing, Type } from '@/constants/theme';
import { NumberBadge, Tap } from '@/components/ui/kit';

interface SurahCardProps {
  surah: Surah;
  onPress: (surah: Surah) => void;
  isLastRead?: boolean;
}

/** Ligne de sourate : compacte, scannable, l'arabe à droite comme dans un sommaire. */
export const SurahCard = memo(function SurahCard({ surah, onPress, isLastRead }: SurahCardProps) {
  const { colors } = useAppTheme();
  return (
    <Tap
      onPress={() => onPress(surah)}
      accessibilityRole="button"
      accessibilityLabel={`Sourate ${surah.number}, ${surah.name_transliteration}, ${surah.name_french}`}
      style={[styles.row, { borderBottomColor: colors.border }]}
    >
      <NumberBadge value={surah.number} />
      <View style={styles.middle}>
        <View style={styles.titleRow}>
          <Text style={[Type.headline, { color: colors.text }]} numberOfLines={1}>
            {surah.name_transliteration}
          </Text>
          {isLastRead && (
            <View style={[styles.dot, { backgroundColor: colors.gold }]} accessibilityLabel="Dernière lecture" />
          )}
        </View>
        <Text style={[Type.caption, { color: colors.textMuted }]} numberOfLines={1}>
          <Text style={{ color: colors.text, fontWeight: '500' }}>{surah.name_french}</Text>
          {` · ${revelationLabel(surah.revelation_type)} · ${surah.verses_count} versets`}
        </Text>
      </View>
      <Text style={[styles.arabic, { color: colors.arabic }]}>{repairArabicText(surah.name_arabic)}</Text>
    </Tap>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  middle: { flex: 1, marginLeft: Spacing.md, marginRight: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  arabic: { fontFamily: ArabicFonts.regular, fontSize: 24, lineHeight: 40 },
});
