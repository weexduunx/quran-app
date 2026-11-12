import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Verse } from '@/stores/quranStore';
import { repairArabicText } from '@/utils/textUtils';
import { toArabicDigits } from '@/utils/quranMeta';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ArabicFonts, Radius, Spacing, Type } from '@/constants/theme';
import { NumberBadge, Tap } from '@/components/ui/kit';

interface VerseCardProps {
  verse: Verse;
  arabicSize: number;
  translationSize: number;
  showTransliteration: boolean;
  showTranslation: boolean;
  isActive?: boolean;
  isBookmarked?: boolean;
  onPlay?: (verse: Verse) => void;
  onBookmark?: (verse: Verse) => void;
  onShare?: (verse: Verse) => void;
  onTafsir?: (verse: Verse) => void;
  showSurahInfo?: boolean;
}

export const VerseCard = memo(function VerseCard({
  verse,
  arabicSize,
  translationSize,
  showTransliteration,
  showTranslation,
  isActive = false,
  isBookmarked = false,
  onPlay,
  onBookmark,
  onShare,
  onTafsir,
  showSurahInfo = false,
}: VerseCardProps) {
  const { colors } = useAppTheme();
  const arabic = repairArabicText(verse.text_uthmani || verse.text_arabic);

  return (
    <View
      style={[
        styles.container,
        { borderBottomColor: colors.border },
        isActive && { backgroundColor: colors.goldSoft },
      ]}
    >
      {/* Barre d'actions */}
      <View style={styles.actions}>
        <NumberBadge value={verse.verse_number} size={34} />
        {showSurahInfo && verse.surah && (
          <Text style={[Type.caption, { color: colors.textMuted, marginLeft: Spacing.sm }]}>
            {verse.surah.name_transliteration} {verse.surah_id}:{verse.verse_number}
          </Text>
        )}
        <View style={{ flex: 1 }} />
        {onPlay && (
          <ActionIcon
            icon={isActive ? 'volume-high' : 'play-circle-outline'}
            color={isActive ? colors.gold : colors.textMuted}
            label={`Écouter le verset ${verse.verse_number}`}
            onPress={() => onPlay(verse)}
          />
        )}
        {onBookmark && (
          <ActionIcon
            icon={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            color={isBookmarked ? colors.gold : colors.textMuted}
            label={isBookmarked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            onPress={() => onBookmark(verse)}
          />
        )}
        {onTafsir && (
          <ActionIcon
            icon="reader-outline"
            color={colors.textMuted}
            label={`Tafsir du verset ${verse.verse_number}`}
            onPress={() => onTafsir(verse)}
          />
        )}
        {onShare && (
          <ActionIcon
            icon="share-outline"
            color={colors.textMuted}
            label="Partager le verset"
            onPress={() => onShare(verse)}
          />
        )}
      </View>

      {/* Texte arabe */}
      <Text
        style={[
          styles.arabic,
          { color: colors.arabic, fontSize: arabicSize, lineHeight: arabicSize * 1.9 },
        ]}
        accessibilityLanguage="ar"
      >
        {arabic}
        <Text style={{ color: colors.gold, fontSize: arabicSize * 0.8 }}>
          {'  ۝'}
          {toArabicDigits(verse.verse_number)}
        </Text>
      </Text>

      {/* Phonétique : la clé pour les non-arabophones */}
      {showTransliteration && !!verse.text_transliteration && (
        <Text
          style={[
            styles.translit,
            { color: colors.primary, fontSize: translationSize - 1, lineHeight: (translationSize - 1) * 1.55 },
          ]}
        >
          {verse.text_transliteration}
        </Text>
      )}

      {showTranslation && !!verse.text_french && (
        <Text
          style={[
            styles.french,
            { color: colors.text, fontSize: translationSize, lineHeight: translationSize * 1.6 },
          ]}
        >
          {verse.text_french}
        </Text>
      )}
    </View>
  );
});

function ActionIcon({
  icon,
  color,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Tap
      haptic
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.actionBtn}
    >
      <Ionicons name={icon} size={22} color={color} />
    </Tap>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actions: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  actionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  arabic: {
    fontFamily: ArabicFonts.regular,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginVertical: Spacing.sm,
  },
  translit: { fontStyle: 'italic', marginTop: Spacing.sm },
  french: { marginTop: Spacing.sm },
});
