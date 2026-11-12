import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Share,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { VerseCard } from '@/components/VerseCard';
import { AudioPlayerSimple as AudioPlayer } from '@/components/AudioPlayerSimple';
import { useQuranStore, Surah, Verse } from '@/stores/quranStore';
import { useProgressStore, bookmarkKey } from '@/stores/progressStore';
import { useTafsirStore } from '@/stores/tafsirStore';
import {
  useSettingsStore,
  useArabicFontSize,
  useTranslationFontSize,
  ARABIC_SIZES,
} from '@/stores/settingsStore';
import { quranApi } from '@/services/api';
import { repairArabicText } from '@/utils/textUtils';
import { revelationLabel } from '@/utils/quranMeta';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ArabicFonts, Radius, Spacing, Type } from '@/constants/theme';
import { Button, Chip, IconButton } from '@/components/ui/kit';
import { DownloadButton } from '@/components/DownloadButton';

type SurahWithVerses = Surah & { verses: Verse[]; revelation_place?: string };

export default function SurahScreen() {
  const { id, verse: verseParam } = useLocalSearchParams<{ id: string; verse?: string }>();
  const surahId = Number(id);
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const setCurrentSurah = useQuranStore((s) => s.setCurrentSurah);
  const setVerses = useQuranStore((s) => s.setVerses);

  const bookmarks = useProgressStore((s) => s.bookmarks);
  const toggleBookmark = useProgressStore((s) => s.toggleBookmark);
  const setLastRead = useProgressStore((s) => s.setLastRead);

  const showTransliteration = useSettingsStore((s) => s.showTransliteration);
  const showTranslation = useSettingsStore((s) => s.showTranslation);
  const toggleTransliteration = useSettingsStore((s) => s.toggleTransliteration);
  const toggleTranslation = useSettingsStore((s) => s.toggleTranslation);
  const arabicSizeIndex = useSettingsStore((s) => s.arabicSizeIndex);
  const setArabicSizeIndex = useSettingsStore((s) => s.setArabicSizeIndex);
  const arabicSize = useArabicFontSize();
  const translationSize = useTranslationFontSize();

  const [surah, setSurah] = useState<SurahWithVerses | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showDisplay, setShowDisplay] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeVerseId, setActiveVerseId] = useState<number | null>(null);

  const listRef = useRef<FlatList<Verse>>(null);
  const surahRef = useRef<SurahWithVerses | null>(null);

  const verses = useMemo(() => surah?.verses ?? [], [surah]);
  const bookmarked = useMemo(() => new Set(bookmarks.map((b) => b.key)), [bookmarks]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let data = (await quranApi.getSurah(surahId)) as SurahWithVerses;
      if (!data?.verses?.length) {
        // Certains endpoints ne renvoient pas les versets avec la sourate
        data = { ...data, verses: await quranApi.getVersesBySurah(surahId) };
      }
      surahRef.current = data;
      setSurah(data);
      setCurrentSurah(data);
      setVerses(data.verses);
    } catch {
      setError('Impossible de charger la sourate. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [surahId, setCurrentSurah, setVerses]);

  useEffect(() => {
    if (surahId) load();
  }, [surahId, load]);

  // Reprise de lecture : défilement vers le verset demandé
  useEffect(() => {
    const target = Number(verseParam);
    if (!surah || !target || target <= 1) return;
    const index = Math.min(target - 1, surah.verses.length - 1);
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0 });
    }, 250);
    return () => clearTimeout(t);
  }, [surah, verseParam]);

  // Mémorise le premier verset visible comme « dernière lecture »
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const s = surahRef.current;
    const first = viewableItems.find((v) => v.isViewable)?.item as Verse | undefined;
    if (!s || !first) return;
    setLastRead({
      surahId: s.id,
      surahNumber: s.number,
      surahName: s.name_transliteration,
      surahNameArabic: repairArabicText(s.name_arabic),
      verseNumber: first.verse_number,
      versesCount: s.verses_count,
    });
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60, minimumViewTime: 800 }).current;

  const playFrom = useCallback(
    (verse: Verse) => {
      const index = verses.findIndex((v) => v.id === verse.id);
      if (index === -1) return;
      setCurrentIndex(index);
      setActiveVerseId(verse.id);
      setShowPlayer(true);
    },
    [verses]
  );

  const handleVerseChange = (index: number) => {
    setCurrentIndex(index);
    const v = verses[index];
    if (v) {
      setActiveVerseId(v.id);
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 });
    }
  };

  const handleBookmark = useCallback(
    (v: Verse) => {
      const s = surahRef.current;
      if (!s) return;
      toggleBookmark({
        surahId: s.id,
        surahName: s.name_transliteration,
        verseNumber: v.verse_number,
        textArabic: v.text_arabic,
        textFrench: v.text_french,
      });
    },
    [toggleBookmark]
  );

  const handleShare = useCallback((v: Verse) => {
    const s = surahRef.current;
    Share.share({
      message: `${v.text_arabic}\n\n« ${v.text_french} »\n— ${s?.name_transliteration ?? 'Coran'} ${s?.number ?? v.surah_id}:${v.verse_number}`,
    });
  }, []);

  const openTafsir = useCallback(
    (v: Verse) =>
      router.push({
        pathname: '/tafsir/[bookId]',
        params: {
          bookId: useTafsirStore.getState().preferredTextBook,
          surah: String(surahRef.current?.number ?? surahId),
          verse: String(v.verse_number),
        },
      }),
    [surahId]
  );

  const renderVerse = useCallback(
    ({ item }: { item: Verse }) => (
      <VerseCard
        verse={item}
        arabicSize={arabicSize}
        translationSize={translationSize}
        showTransliteration={showTransliteration}
        showTranslation={showTranslation}
        isActive={showPlayer && item.id === activeVerseId}
        isBookmarked={bookmarked.has(bookmarkKey(surahId, item.verse_number))}
        onPlay={playFrom}
        onBookmark={handleBookmark}
        onShare={handleShare}
        onTafsir={openTafsir}
      />
    ),
    [
      arabicSize,
      translationSize,
      showTransliteration,
      showTranslation,
      showPlayer,
      activeVerseId,
      bookmarked,
      surahId,
      playFrom,
      handleBookmark,
      handleShare,
      openTafsir,
    ]
  );

  const header = surah ? (
    <View style={[styles.intro, { backgroundColor: colors.primaryStrong }]}>
      <Text style={styles.introArabic}>{repairArabicText(surah.name_arabic)}</Text>
      <Text style={styles.introTitle}>{surah.name_transliteration}</Text>
      <Text style={styles.introSub}>
        {surah.name_french} · {revelationLabel(surah.revelation_type)} · {surah.verses_count} versets
      </Text>
      <Button
        title="Écouter la sourate"
        icon="play"
        onPress={() => verses[0] && playFrom(verses[0])}
        style={{ marginTop: Spacing.lg, backgroundColor: '#E9D49A' }}
        textColor="#0B3D2E"
      />
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Barre supérieure */}
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 4, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <IconButton icon="chevron-back" label="Retour" onPress={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[Type.headline, { color: colors.text }]} numberOfLines={1}>
            {surah?.name_transliteration ?? 'Sourate'}
          </Text>
          {surah && (
            <Text style={[Type.caption, { color: colors.textMuted }]} numberOfLines={1}>
              {surah.number} · {surah.name_french}
            </Text>
          )}
        </View>
        <DownloadButton surah={surahId} surahName={surah?.name_transliteration} />
        <IconButton
          icon="text"
          label="Options d'affichage"
          filled={showDisplay}
          onPress={() => setShowDisplay((v) => !v)}
        />
      </View>

      {/* Panneau d'affichage rapide */}
      {showDisplay && (
        <View style={[styles.displayPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.displayRow}>
            <Chip
              label="Phonétique"
              icon="chatbox-ellipses-outline"
              active={showTransliteration}
              onPress={toggleTransliteration}
            />
            <Chip label="Traduction" icon="language-outline" active={showTranslation} onPress={toggleTranslation} />
          </View>
          <View style={[styles.displayRow, { marginTop: Spacing.md }]}>
            <Text style={[Type.caption, { color: colors.textMuted, flex: 1 }]}>Taille de l&apos;arabe</Text>
            <IconButton
              icon="remove"
              label="Réduire"
              filled
              onPress={() => setArabicSizeIndex(arabicSizeIndex - 1)}
            />
            <Text style={[Type.headline, { color: colors.text, width: 44, textAlign: 'center' }]}>
              {ARABIC_SIZES[arabicSizeIndex]}
            </Text>
            <IconButton
              icon="add"
              label="Agrandir"
              filled
              onPress={() => setArabicSizeIndex(arabicSizeIndex + 1)}
            />
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[Type.callout, { color: colors.textMuted, marginTop: Spacing.lg }]}>
            Chargement de la sourate…
          </Text>
        </View>
      ) : error || !surah ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textSubtle} />
          <Text style={[Type.callout, { color: colors.textMuted, textAlign: 'center', marginVertical: Spacing.lg }]}>
            {error ?? 'Sourate introuvable'}
          </Text>
          <Button title="Réessayer" icon="refresh" variant="secondary" onPress={load} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={verses}
          renderItem={renderVerse}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={header}
          extraData={activeVerseId}
          initialNumToRender={8}
          windowSize={11}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          contentContainerStyle={{ paddingBottom: showPlayer ? 420 : insets.bottom + Spacing.xxxl }}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
            setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 300);
          }}
        />
      )}

      {verses.length > 0 && (
        <AudioPlayer
          verses={verses}
          surahNumber={surah?.number ?? surahId}
          surahName={surah?.name_transliteration}
          currentVerseIndex={currentIndex}
          onVerseChange={handleVerseChange}
          onVerseHighlight={setActiveVerseId}
          isVisible={showPlayer}
          onClose={() => {
            setShowPlayer(false);
            setActiveVerseId(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  displayPanel: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  displayRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  intro: {
    margin: Spacing.lg,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  introArabic: { fontFamily: ArabicFonts.regular, fontSize: 44, lineHeight: 76, color: '#F3EEDF' },
  introTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  introSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4, textAlign: 'center' },
});
