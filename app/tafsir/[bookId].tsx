import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import Slider from '@react-native-community/slider';

import { getTafsirBook, tafsirBooks, TafsirBook, useTafsirStore } from '@/stores/tafsirStore';
import { tafsirApi, TafsirText } from '@/services/tafsirApi';
import { useSurahs, useSurahVerses } from '@/hooks/useSurahs';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useArabicFontSize, useTranslationFontSize } from '@/stores/settingsStore';
import { VERSE_COUNTS } from '@/utils/quranMeta';
import { repairArabicText } from '@/utils/textUtils';
import { ArabicFonts, Radius, Spacing, Type } from '@/constants/theme';
import { Button, Card, Chip, IconButton, Tap } from '@/components/ui/kit';
import { SurahPicker } from '@/components/SurahPicker';

const clampSurah = (n: number) => Math.min(114, Math.max(1, Math.round(n) || 1));
const clampVerse = (s: number, v: number) => Math.min(VERSE_COUNTS[s - 1], Math.max(1, Math.round(v) || 1));

export default function TafsirReaderScreen() {
  const params = useLocalSearchParams<{ bookId: string; surah?: string; verse?: string }>();
  const book = getTafsirBook(params.bookId) ?? tafsirBooks[1];
  const surah = clampSurah(Number(params.surah ?? 1));
  const verse = clampVerse(surah, Number(params.verse ?? 1));

  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { surahs } = useSurahs();
  const [picker, setPicker] = useState(false);
  const surahInfo = surahs.find((s) => s.number === surah);

  const go = useCallback((s: number, v = 1) => router.setParams({ surah: String(s), verse: String(v) }), []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4, borderBottomColor: colors.border }]}>
        <IconButton icon="chevron-back" label="Retour" onPress={() => router.back()} />
        <Tap onPress={() => setPicker(true)} style={{ flex: 1, alignItems: 'center' }} accessibilityRole="button" accessibilityLabel="Changer de sourate">
          <Text style={[Type.headline, { color: colors.text }]} numberOfLines={1}>
            {book.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[Type.caption, { color: colors.primary, fontWeight: '600' }]} numberOfLines={1}>
              {surahInfo?.name_transliteration ?? `Sourate ${surah}`}
              {book.kind === 'text' ? ` · verset ${verse}` : ''}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.primary} style={{ marginLeft: 2 }} />
          </View>
        </Tap>
        <View style={{ width: 40 }} />
      </View>

      {book.kind === 'text' ? (
        <TextTafsir book={book} surah={surah} verse={verse} onGo={go} />
      ) : (
        <AudioTafsir book={book} surah={surah} surahName={surahInfo?.name_transliteration} surahFrench={surahInfo?.name_french} onPickSurah={() => setPicker(true)} />
      )}

      <SurahPicker
        visible={picker}
        surahs={surahs}
        selected={surah}
        onClose={() => setPicker(false)}
        onSelect={(s) => {
          setPicker(false);
          go(s.number, 1);
        }}
        isDisabled={book.kind === 'audio' ? (s) => !tafsirApi.hasAudio(book.id, s.number) : undefined}
        disabledLabel="Pas d'enregistrement disponible"
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tafsir écrit
// ---------------------------------------------------------------------------
function TextTafsir({
  book,
  surah,
  verse,
  onGo,
}: {
  book: TafsirBook;
  surah: number;
  verse: number;
  onGo: (s: number, v: number) => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const arabicSize = useArabicFontSize();
  const textSize = useTranslationFontSize();
  const setPreferred = useTafsirStore((s) => s.setPreferredTextBook);
  const { verses } = useSurahVerses(surah);
  const current = verses.find((v) => v.verse_number === verse);

  const [data, setData] = useState<TafsirText | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setPreferred(book.id);
  }, [book.id, setPreferred]);

  useEffect(() => {
    let alive = true;
    setState('loading');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    tafsirApi
      .getText(book, surah, verse)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setState('ready');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [book, surah, verse, attempt]);

  const prev = verse > 1 ? [surah, verse - 1] : surah > 1 ? [surah - 1, VERSE_COUNTS[surah - 2]] : null;
  const next = verse < VERSE_COUNTS[surah - 1] ? [surah, verse + 1] : surah < 114 ? [surah + 1, 1] : null;

  const rtl = book.language === 'arabic';
  const bodyStyle = rtl
    ? { fontFamily: ArabicFonts.regular, fontSize: textSize + 5, lineHeight: (textSize + 5) * 1.9, textAlign: 'right' as const, writingDirection: 'rtl' as const }
    : { fontSize: textSize, lineHeight: textSize * 1.6 };

  const keys = data?.verseKeys ?? [];
  const range =
    keys.length > 1 ? `Commentaire des versets ${keys[0].split(':')[1]} à ${keys[keys.length - 1].split(':')[1]}` : null;

  return (
    <>
      {/* Changer de livre sans perdre le verset */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
        contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md }}
      >
        {tafsirBooks
          .filter((b) => b.kind === 'text')
          .map((b) => (
            <Chip key={b.id} label={b.title} active={b.id === book.id} onPress={() => router.setParams({ bookId: b.id })} />
          ))}
      </ScrollView>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 120 }}>
        {/* Le verset commenté */}
        <Card tone="soft">
          {current ? (
            <>
              <Text
                style={{
                  fontFamily: ArabicFonts.regular,
                  fontSize: arabicSize - 2,
                  lineHeight: (arabicSize - 2) * 1.9,
                  color: colors.arabic,
                  textAlign: 'right',
                  writingDirection: 'rtl',
                }}
              >
                {repairArabicText(current.text_uthmani || current.text_arabic)}
              </Text>
              <Text style={[Type.body, { color: colors.text, marginTop: Spacing.sm, fontStyle: 'italic' }]}>
                « {current.text_french} »
              </Text>
            </>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
          <Text style={[Type.caption, { color: colors.primary, marginTop: Spacing.sm, fontWeight: '700' }]}>
            Coran {surah}:{verse}
          </Text>
        </Card>

        <View style={{ marginTop: Spacing.xl }}>
          {state === 'loading' && (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[Type.caption, { color: colors.textMuted, marginTop: Spacing.sm }]}>Chargement du commentaire…</Text>
            </View>
          )}
          {state === 'error' && (
            <View style={styles.center}>
              <Ionicons name="cloud-offline-outline" size={36} color={colors.textSubtle} />
              <Text style={[Type.callout, { color: colors.textMuted, textAlign: 'center', marginVertical: Spacing.md }]}>
                Impossible de charger le tafsir. Vérifiez votre connexion.
              </Text>
              <Button title="Réessayer" icon="refresh" variant="secondary" onPress={() => setAttempt((a) => a + 1)} />
            </View>
          )}
          {state === 'ready' && data && (
            <>
              {range && <Text style={[Type.overline, { color: colors.gold, marginBottom: Spacing.md }]}>{range.toUpperCase()}</Text>}
              {data.blocks.length === 0 ? (
                <View style={styles.center}>
                  <Text style={[Type.callout, { color: colors.textMuted, textAlign: 'center', marginBottom: Spacing.md }]}>
                    Ce verset est expliqué avec le passage qui le précède.
                  </Text>
                  {prev && <Button title="Voir le verset précédent" variant="secondary" onPress={() => onGo(prev[0], prev[1])} />}
                </View>
              ) : (
                data.blocks.map((b, i) =>
                  b.type === 'heading' ? (
                    <Text key={i} style={[Type.headline, { color: colors.primary, marginTop: i ? Spacing.lg : 0, marginBottom: Spacing.sm, textAlign: rtl ? 'right' : 'left' }]}>
                      {b.text}
                    </Text>
                  ) : (
                    <Text key={i} selectable style={[bodyStyle, { color: colors.text, marginBottom: Spacing.md }]}>
                      {b.text}
                    </Text>
                  )
                )
              )}
              <Text style={[Type.caption, { color: colors.textSubtle, marginTop: Spacing.lg }]}>
                {book.title} — {book.author}. Source : Quran.com
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* Navigation entre versets */}
      <View style={[styles.navBar, { paddingBottom: insets.bottom + Spacing.sm, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Tap disabled={!prev} onPress={() => prev && onGo(prev[0], prev[1])} style={[styles.navBtn, { opacity: prev ? 1 : 0.35 }]} accessibilityLabel="Verset précédent">
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={[Type.callout, { color: colors.primary }]}>Précédent</Text>
        </Tap>
        <Tap
          onPress={() => router.push({ pathname: '/surah/[id]', params: { id: String(surah), verse: String(verse) } })}
          accessibilityLabel="Lire dans le Coran"
          style={styles.navCenter}
        >
          <Text style={[Type.caption, { color: colors.textMuted }]}>
            {verse} / {VERSE_COUNTS[surah - 1]}
          </Text>
        </Tap>
        <Tap disabled={!next} onPress={() => next && onGo(next[0], next[1])} style={[styles.navBtn, { opacity: next ? 1 : 0.35 }]} accessibilityLabel="Verset suivant">
          <Text style={[Type.callout, { color: colors.primary }]}>Suivant</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Tap>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tafsir audio (wolof)
// ---------------------------------------------------------------------------
const SPEEDS = [0.75, 1, 1.25, 1.5];
const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
};

function AudioTafsir({
  book,
  surah,
  surahName,
  surahFrench,
  onPickSurah,
}: {
  book: TafsirBook;
  surah: number;
  surahName?: string;
  surahFrench?: string;
  onPickSurah: () => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tracks = tafsirApi.getAudioTracks(book.id, surah);
  const [trackIndex, setTrackIndex] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [seeking, setSeeking] = useState<number | null>(null);
  const [started, setStarted] = useState(false);

  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const track = tracks[Math.min(trackIndex, tracks.length - 1)];

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionModeAndroid: 'duckOthers' }).catch(() => {});
  }, []);

  useEffect(() => {
    setTrackIndex(0);
  }, [surah, book.id]);

  useEffect(() => {
    if (!track) return;
    player.replace({ uri: track.url });
    player.setPlaybackRate(SPEEDS[speedIndex]);
    if (started) player.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.url]);

  useEffect(() => {
    player.setPlaybackRate(SPEEDS[speedIndex]);
  }, [speedIndex, player]);

  // Partie suivante d'Al-Baqara à la fin d'une piste
  useEffect(() => {
    if (status.didJustFinish && trackIndex < tracks.length - 1) setTrackIndex((i) => i + 1);
  }, [status.didJustFinish]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    if (status.playing) player.pause();
    else {
      setStarted(true);
      player.play();
    }
  };
  const skip = (delta: number) => player.seekTo(Math.max(0, Math.min(status.duration || 0, status.currentTime + delta)));

  const busy = started && (!status.isLoaded || status.isBuffering) && !status.playing;

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: insets.bottom + Spacing.xxxl }}>
      <View style={[styles.audioCard, { backgroundColor: colors.primaryStrong }]}>
        <Text style={styles.audioOverline}>{`TAFSIR EN WOLOF · ${book.author}`.toUpperCase()}</Text>
        <Text style={styles.audioTitle}>{surahName ?? `Sourate ${surah}`}</Text>
        {!!surahFrench && <Text style={[styles.audioSub, { color: '#E9D49A', fontWeight: '600' }]}>{surahFrench}</Text>}
        <Text style={styles.audioSub}>{track ? track.title : "Pas d'enregistrement pour cette sourate"}</Text>

        {tracks.length > 1 && (
          <View style={styles.trackRow}>
            {tracks.map((t, i) => (
              <Tap
                key={t.url}
                onPress={() => {
                  setStarted(true);
                  setTrackIndex(i);
                }}
                style={[styles.trackChip, { backgroundColor: i === trackIndex ? '#E9D49A' : 'rgba(255,255,255,0.12)' }]}
              >
                <Text style={{ color: i === trackIndex ? '#0B3D2E' : '#fff', fontWeight: '700', fontSize: 13 }}>Partie {i + 1}</Text>
              </Tap>
            ))}
          </View>
        )}

        {track && (
          <>
            <View style={styles.progressRow}>
              <Text style={styles.time}>{fmt(seeking ?? status.currentTime)}</Text>
              <Slider
                style={{ flex: 1, height: 32 }}
                minimumValue={0}
                maximumValue={Math.max(status.duration, 1)}
                value={seeking ?? status.currentTime}
                onValueChange={setSeeking}
                onSlidingComplete={(v) => {
                  player.seekTo(v);
                  setSeeking(null);
                }}
                minimumTrackTintColor="#E9D49A"
                maximumTrackTintColor="rgba(255,255,255,0.25)"
                thumbTintColor="#E9D49A"
                disabled={!status.isLoaded}
              />
              <Text style={styles.time}>{fmt(status.duration)}</Text>
            </View>

            <View style={styles.controls}>
              <Tap haptic onPress={() => setSpeedIndex((i) => (i + 1) % SPEEDS.length)} style={styles.speed} accessibilityLabel="Vitesse de lecture">
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{String(SPEEDS[speedIndex]).replace('.', ',')}×</Text>
              </Tap>
              <Tap haptic onPress={() => skip(-15)} style={styles.skip} accessibilityLabel="Reculer de 15 secondes">
                <Ionicons name="play-back" size={22} color="#fff" />
                <Text style={styles.skipText}>15 s</Text>
              </Tap>
              <Tap haptic onPress={toggle} style={styles.play} accessibilityLabel={status.playing ? 'Pause' : 'Lecture'}>
                {busy ? (
                  <ActivityIndicator color="#0B3D2E" />
                ) : (
                  <Ionicons name={status.playing ? 'pause' : 'play'} size={30} color="#0B3D2E" style={!status.playing && { marginLeft: 3 }} />
                )}
              </Tap>
              <Tap haptic onPress={() => skip(30)} style={styles.skip} accessibilityLabel="Avancer de 30 secondes">
                <Ionicons name="play-forward" size={22} color="#fff" />
                <Text style={styles.skipText}>30 s</Text>
              </Tap>
              <View style={{ width: 48 }} />
            </View>
            {busy && <Text style={[styles.audioSub, { textAlign: 'center', marginTop: Spacing.sm }]}>Chargement de l&apos;enregistrement…</Text>}
          </>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg }}>
        <Button title="Autre sourate" icon="list" variant="secondary" onPress={onPickSurah} style={{ flex: 1 }} />
        <Button
          title="Lire la sourate"
          icon="book-outline"
          variant="secondary"
          onPress={() => router.push({ pathname: '/surah/[id]', params: { id: String(surah) } })}
          style={{ flex: 1 }}
        />
      </View>

      <Text style={[Type.caption, { color: colors.textSubtle, marginTop: Spacing.xl }]}>
        Les enregistrements sont lus en continu, même écran verrouillé. {book.sourceNote}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  center: { alignItems: 'center', paddingVertical: Spacing.xxl },
  navBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: Spacing.sm, height: 44 },
  navCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 44 },
  audioCard: { borderRadius: Radius.xl, padding: Spacing.xl },
  audioOverline: { color: '#E9D49A', fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  audioTitle: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: Spacing.sm },
  audioSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 2 },
  trackRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
  trackChip: { paddingHorizontal: 14, height: 34, borderRadius: Radius.pill, justifyContent: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  time: { color: 'rgba(255,255,255,0.75)', fontSize: 12, minWidth: 40, textAlign: 'center', fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
  speed: {
    width: 48,
    height: 34,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: { alignItems: 'center', width: 56 },
  skipText: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  play: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#E9D49A', alignItems: 'center', justifyContent: 'center' },
});
