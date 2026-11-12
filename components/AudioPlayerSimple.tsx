/**
 * Lecteur de récitation (feuille basse).
 *
 * - Audio verset par verset (Quran.com, repli islamic.network)
 * - Mot à mot synchronisé : le mot récité s'allume, toucher un mot le réécoute
 * - Répétition du verset (×1, ×3, ×5, ×10, ∞) pour mémoriser
 * - Vitesse 0,5× → 1,5×, lecture continue, lecture en arrière-plan
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Verse } from '@/stores/quranStore';
import { useReciterStore } from '@/stores/reciterStore';
import { recitationService, VerseAudio } from '@/services/recitationService';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ArabicFonts, Radius, Spacing, Type } from '@/constants/theme';
import { Tap } from '@/components/ui/kit';
import { SurahAudioPlayer } from '@/components/SurahAudioPlayer';

export interface AudioPlayerProps {
  verses: Verse[];
  surahNumber?: number;
  surahName?: string;
  currentVerseIndex: number;
  onVerseChange: (index: number) => void;
  onVerseHighlight: (verseId: number) => void;
  isVisible: boolean;
  onClose: () => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];
const REPEATS = [1, 3, 5, 10, 0]; // 0 = infini
const LOAD_TIMEOUT_MS = 9000;

const formatTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const VersePlayer: React.FC<AudioPlayerProps> = ({
  verses,
  surahNumber,
  surahName,
  currentVerseIndex,
  onVerseChange,
  onVerseHighlight,
  isVisible,
  onClose,
}) => {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const reciter = useReciterStore((s) => s.getSelectedReciter());

  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);

  const [audio, setAudio] = useState<VerseAudio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speedIndex, setSpeedIndex] = useState(2);
  const [repeatIndex, setRepeatIndex] = useState(0);
  const [continuous, setContinuous] = useState(true);
  /** Passage à répéter (indices dans `verses`), ou null */
  const [range, setRange] = useState<{ from: number; to: number } | null>(null);
  const [passIndex, setPassIndex] = useState(1);
  const passesDone = useRef(0);
  const [expanded, setExpanded] = useState(true);
  const [seeking, setSeeking] = useState<number | null>(null);

  const wantPlay = useRef(true);
  const repeatsDone = useRef(0);
  const loadToken = useRef(0);
  const usedFallback = useRef(false);
  const slide = useRef(new Animated.Value(500)).current;

  const verse = verses[currentVerseIndex];
  const surah = surahNumber ?? verse?.surah_id;
  const speed = SPEEDS[speedIndex];
  const repeatTarget = REPEATS[repeatIndex];

  // Palette du lecteur : toujours sur fond vert profond, dans les deux thèmes
  const c = useMemo(
    () => ({
      bg: isDark ? '#0E3A2C' : '#0B3D2E',
      soft: 'rgba(255,255,255,0.10)',
      line: 'rgba(255,255,255,0.22)',
      text: '#FFFFFF',
      muted: 'rgba(255,255,255,0.72)',
      gold: '#E9D49A',
      onGold: '#0B3D2E',
    }),
    [isDark]
  );

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionModeAndroid: 'duckOthers',
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    Animated.spring(slide, {
      toValue: isVisible ? 0 : 500,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
    if (isVisible) wantPlay.current = true;
    else player.pause();
  }, [isVisible, slide, player]);

  // Chargement du verset courant
  useEffect(() => {
    if (!isVisible || !verse || !surah) return;
    const token = ++loadToken.current;
    repeatsDone.current = 0;
    usedFallback.current = false;
    setLoading(true);
    setError(null);
    onVerseHighlight(verse.id);

    recitationService
      .getVerseAudio(reciter, surah, verse.verse_number, verse.global_number)
      .then((a) => {
        if (token !== loadToken.current) return;
        setAudio(a);
        player.replace({ uri: a.url });
        player.setPlaybackRate(speed);
        if (wantPlay.current) player.play();

        // Précharge le verset suivant pour un enchaînement sans blanc
        const next = verses[currentVerseIndex + 1];
        if (next) recitationService.getVerseAudio(reciter, surah, next.verse_number, next.global_number);
      })
      .catch(() => {
        if (token !== loadToken.current) return;
        setError('Audio indisponible. Vérifiez votre connexion.');
      })
      .finally(() => {
        if (token === loadToken.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speed appliquée séparément
  }, [isVisible, currentVerseIndex, verses, surah, reciter.id]);

  // Source principale muette trop longtemps → source de repli
  useEffect(() => {
    if (!isVisible || !verse || !audio || status.isLoaded) return;
    const t = setTimeout(() => {
      if (usedFallback.current) {
        setError('Audio indisponible. Vérifiez votre connexion.');
        return;
      }
      usedFallback.current = true;
      player.replace({ uri: recitationService.fallbackUrl(reciter, verse.global_number) });
      player.setPlaybackRate(speed);
      if (wantPlay.current) player.play();
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isVisible, verse, audio, status.isLoaded, player, reciter, speed]);

  useEffect(() => {
    if (status.isLoaded) setError(null);
  }, [status.isLoaded]);

  useEffect(() => {
    player.setPlaybackRate(speed);
  }, [speed, player]);

  // Fin du verset : répétition, verset suivant ou arrêt
  useEffect(() => {
    if (!status.didJustFinish || !isVisible) return;
    const infinite = repeatTarget === 0;
    if (infinite || repeatsDone.current + 1 < repeatTarget) {
      repeatsDone.current += 1;
      player.seekTo(0);
      player.play();
      return;
    }
    if (range) {
      if (currentVerseIndex < range.to) {
        onVerseChange(currentVerseIndex + 1);
        return;
      }
      const passTarget = REPEATS[passIndex];
      if (passTarget === 0 || passesDone.current + 1 < passTarget) {
        passesDone.current += 1;
        if (range.from === currentVerseIndex) {
          repeatsDone.current = 0;
          player.seekTo(0);
          player.play();
        } else {
          onVerseChange(range.from);
        }
        return;
      }
      passesDone.current = 0;
      wantPlay.current = false;
      player.seekTo(0);
      player.pause();
      return;
    }
    if (continuous && currentVerseIndex < verses.length - 1) {
      onVerseChange(currentVerseIndex + 1);
    } else {
      wantPlay.current = false;
      player.seekTo(0);
      player.pause();
    }
  }, [status.didJustFinish]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRange = () => {
    passesDone.current = 0;
    if (range) {
      setRange(null);
      return;
    }
    const from = Math.max(0, currentVerseIndex);
    setRange({ from, to: Math.min(verses.length - 1, from + 4) });
  };

  const togglePlay = useCallback(() => {
    if (status.playing) {
      wantPlay.current = false;
      player.pause();
    } else {
      wantPlay.current = true;
      if (status.duration > 0 && status.currentTime >= status.duration - 0.2) player.seekTo(0);
      player.play();
    }
  }, [player, status.playing, status.currentTime, status.duration]);

  const goTo = (index: number) => {
    if (index < 0 || index >= verses.length) return;
    wantPlay.current = true;
    onVerseChange(index);
  };

  const seekToWord = (position: number) => {
    const seg = audio?.segments.find((s) => s.position === position);
    if (!seg) return;
    player.seekTo(seg.startMs / 1000);
    if (!status.playing) {
      wantPlay.current = true;
      player.play();
    }
  };

  const close = () => {
    wantPlay.current = false;
    player.pause();
    onClose();
  };

  const currentMs = (seeking ?? status.currentTime) * 1000;
  const wordIndex = audio ? recitationService.wordIndexAt(audio, currentMs) : -1;
  const synced = !!audio?.segments.length;
  const busy = loading || (!status.isLoaded && !error) || status.isBuffering;
  const repeatLabel = repeatTarget === 0 ? '∞' : repeatTarget > 1 ? `×${repeatTarget}` : '';
  const passTarget = REPEATS[passIndex];
  const repeatProgress = range
    ? ` · passage ${passesDone.current + 1}${passTarget ? `/${passTarget}` : ''}`
    : repeatTarget !== 1 && status.isLoaded
      ? ` · ${repeatsDone.current + 1}${repeatTarget ? `/${repeatTarget}` : ''}`
      : '';

  if (!verse) return null;

  return (
    <Animated.View
      pointerEvents={isVisible ? 'auto' : 'none'}
      style={[
        styles.sheet,
        { backgroundColor: c.bg, paddingBottom: insets.bottom + Spacing.md, transform: [{ translateY: slide }] },
      ]}
    >
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Réduire le lecteur' : 'Agrandir le lecteur'}
        style={styles.handleZone}
      >
        <View style={[styles.handle, { backgroundColor: c.line }]} />
      </Pressable>

      {/* En-tête */}
      <View style={styles.headerRow}>
        <View style={[styles.avatar, { backgroundColor: c.soft }]}>
          <Ionicons name="mic-outline" size={20} color={c.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[Type.callout, { color: c.text, fontWeight: '600' }]} numberOfLines={1}>
            {reciter.name}
          </Text>
          <Text style={[Type.caption, { color: c.muted }]} numberOfLines={1}>
            {surahName ? `${surahName} · ` : ''}verset {verse.verse_number}/{verses.length}
            {repeatProgress}
          </Text>
        </View>
        <Tap onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer le lecteur" style={styles.iconBtn}>
          <Ionicons name="close" size={22} color={c.text} />
        </Tap>
      </View>

      {/* Mot à mot */}
      {expanded && !!audio?.words.length && (
        <View style={{ marginTop: Spacing.md }}>
          <ScrollView style={{ maxHeight: 150 }} contentContainerStyle={styles.words} showsVerticalScrollIndicator={false}>
            {audio.words.map((w, i) => {
              const active = i === wordIndex;
              const done = synced && wordIndex >= 0 && i < wordIndex;
              return (
                <Pressable
                  key={w.position}
                  onPress={() => seekToWord(w.position)}
                  disabled={!synced}
                  accessibilityLabel={w.transliteration ?? w.arabic}
                  style={[styles.word, { backgroundColor: active ? c.gold : synced ? c.soft : 'transparent' }]}
                >
                  <Text style={[styles.wordAr, { color: active ? c.onGold : done ? c.muted : c.text }]}>{w.arabic}</Text>
                  {!!w.transliteration && (
                    <Text style={[styles.wordTr, { color: active ? c.onGold : c.muted }]}>{w.transliteration}</Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
          {!synced && (
            <Text style={[Type.caption, { color: c.muted, textAlign: 'center', marginTop: 4 }]}>
              Synchronisation mot à mot indisponible pour cette voix
            </Text>
          )}
        </View>
      )}

      {error && (
        <Text style={[Type.caption, { color: c.gold, textAlign: 'center', marginTop: Spacing.sm }]}>{error}</Text>
      )}

      {/* Progression */}
      <View style={styles.progressRow}>
        <Text style={[styles.time, { color: c.muted }]}>{formatTime(seeking ?? status.currentTime)}</Text>
        <Slider
          style={{ flex: 1, height: 32 }}
          minimumValue={0}
          maximumValue={Math.max(status.duration, 0.1)}
          value={seeking ?? status.currentTime}
          onValueChange={setSeeking}
          onSlidingComplete={(v) => {
            player.seekTo(v);
            setSeeking(null);
          }}
          minimumTrackTintColor={c.gold}
          maximumTrackTintColor={c.line}
          thumbTintColor={c.gold}
          disabled={!status.isLoaded}
        />
        <Text style={[styles.time, { color: c.muted }]}>{formatTime(status.duration)}</Text>
      </View>

      {/* Commandes */}
      <View style={styles.controls}>
        <Tap
          haptic
          onPress={() => setSpeedIndex((i) => (i + 1) % SPEEDS.length)}
          accessibilityRole="button"
          accessibilityLabel={`Vitesse ${speed}`}
          style={[styles.pill, { borderColor: c.line }]}
        >
          <Text style={[Type.caption, { color: c.text, fontWeight: '700' }]}>{String(speed).replace('.', ',')}×</Text>
        </Tap>

        <Tap haptic onPress={() => goTo(currentVerseIndex - 1)} accessibilityLabel="Verset précédent" style={styles.iconBtn} disabled={currentVerseIndex === 0}>
          <Ionicons name="play-skip-back" size={24} color={currentVerseIndex === 0 ? c.line : c.text} />
        </Tap>

        <Tap haptic onPress={togglePlay} accessibilityLabel={status.playing ? 'Pause' : 'Lecture'} style={[styles.playBtn, { backgroundColor: c.gold }]}>
          {busy && !status.playing ? (
            <ActivityIndicator color={c.onGold} />
          ) : (
            <Ionicons name={status.playing ? 'pause' : 'play'} size={28} color={c.onGold} style={!status.playing && { marginLeft: 3 }} />
          )}
        </Tap>

        <Tap
          haptic
          onPress={() => goTo(currentVerseIndex + 1)}
          accessibilityLabel="Verset suivant"
          style={styles.iconBtn}
          disabled={currentVerseIndex >= verses.length - 1}
        >
          <Ionicons name="play-skip-forward" size={24} color={currentVerseIndex >= verses.length - 1 ? c.line : c.text} />
        </Tap>

        <Tap
          haptic
          onPress={() => {
            repeatsDone.current = 0;
            setRepeatIndex((i) => (i + 1) % REPEATS.length);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Répéter le verset ${repeatLabel || 'désactivé'}`}
          style={[styles.pill, { borderColor: repeatTarget !== 1 ? c.gold : c.line, backgroundColor: repeatTarget !== 1 ? c.soft : 'transparent' }]}
        >
          <Ionicons name="repeat" size={16} color={repeatTarget !== 1 ? c.gold : c.text} />
          {!!repeatLabel && <Text style={[Type.caption, { color: c.gold, fontWeight: '700', marginLeft: 2 }]}>{repeatLabel}</Text>}
        </Tap>
      </View>

      {expanded && (
        <View style={styles.optionsRow}>
          {!range && (
            <Tap
              onPress={() => setContinuous((v) => !v)}
              accessibilityRole="switch"
              accessibilityState={{ checked: continuous }}
              style={styles.continuousRow}
            >
              <Ionicons name={continuous ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={continuous ? c.gold : c.muted} />
              <Text style={[Type.caption, { color: c.muted, marginLeft: 6 }]}>Enchaîner les versets</Text>
            </Tap>
          )}
          <Tap
            onPress={toggleRange}
            accessibilityRole="switch"
            accessibilityState={{ checked: !!range }}
            style={styles.continuousRow}
          >
            <Ionicons name={range ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={range ? c.gold : c.muted} />
            <Text style={[Type.caption, { color: range ? c.text : c.muted, marginLeft: 6 }]}>Répéter un passage</Text>
          </Tap>
        </View>
      )}

      {expanded && range && (
        <View style={[styles.rangeBox, { backgroundColor: c.soft }]}>
          <RangeStepper
            label="Du verset"
            value={verses[range.from]?.verse_number}
            onMinus={() => setRange({ from: Math.max(0, range.from - 1), to: range.to })}
            onPlus={() => setRange({ from: Math.min(range.to, range.from + 1), to: range.to })}
            color={c}
          />
          <RangeStepper
            label="au verset"
            value={verses[range.to]?.verse_number}
            onMinus={() => setRange({ from: range.from, to: Math.max(range.from, range.to - 1) })}
            onPlus={() => setRange({ from: range.from, to: Math.min(verses.length - 1, range.to + 1) })}
            color={c}
          />
          <Tap
            haptic
            onPress={() => {
              passesDone.current = 0;
              setPassIndex((i) => (i + 1) % REPEATS.length);
            }}
            accessibilityLabel="Nombre de répétitions du passage"
            style={[styles.pill, { borderColor: c.gold }]}
          >
            <Text style={[Type.caption, { color: c.gold, fontWeight: '700' }]}>
              {REPEATS[passIndex] === 0 ? '∞' : `×${REPEATS[passIndex]}`}
            </Text>
          </Tap>
        </View>
      )}
    </Animated.View>
  );
};

function RangeStepper({
  label,
  value,
  onMinus,
  onPlus,
  color,
}: {
  label: string;
  value?: number;
  onMinus: () => void;
  onPlus: () => void;
  color: { text: string; muted: string; line: string };
}) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: color.muted, fontSize: 11 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Tap haptic onPress={onMinus} accessibilityLabel={`${label} : moins`} style={styles.rangeBtn}>
          <Ionicons name="remove" size={18} color={color.text} />
        </Tap>
        <Text style={{ color: color.text, fontSize: 17, fontWeight: '700', minWidth: 30, textAlign: 'center' }}>{value}</Text>
        <Tap haptic onPress={onPlus} accessibilityLabel={`${label} : plus`} style={styles.rangeBtn}>
          <Ionicons name="add" size={18} color={color.text} />
        </Tap>
      </View>
    </View>
  );
}

/**
 * Choisit le lecteur selon le récitateur : verset par verset (avec mot à mot)
 * ou sourate entière (récitateurs disponibles uniquement par sourate).
 */
export const AudioPlayerSimple: React.FC<AudioPlayerProps> = (props) => {
  const reciter = useReciterStore((s) => s.getSelectedReciter());
  return reciter.surahAudioBase ? <SurahAudioPlayer {...props} /> : <VersePlayer {...props} />;
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 16,
  },
  handleZone: { alignItems: 'center', paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  handle: { width: 40, height: 4, borderRadius: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  words: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-start' },
  word: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md, alignItems: 'center' },
  wordAr: { fontFamily: ArabicFonts.regular, fontSize: 24, lineHeight: 40 },
  wordTr: { fontSize: 11, marginTop: -2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  time: { fontSize: 12, width: 38, textAlign: 'center', fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  pill: {
    minWidth: 48,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  continuousRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 36 },
  optionsRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl, marginTop: Spacing.sm },
  rangeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  rangeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
