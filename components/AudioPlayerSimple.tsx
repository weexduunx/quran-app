/**
 * Lecteur de récitation (feuille basse, repliable en mini-barre).
 *
 * - Audio verset par verset (Quran.com, repli islamic.network)
 * - Mot à mot synchronisé : le mot récité s'allume, toucher un mot le réécoute
 * - Répétition du verset (×1, ×3, ×5, ×10, ∞) ou d'un passage, pour mémoriser
 * - Vitesse 0,5× → 1,5×
 * - Lecture continue verset après verset puis sourate après sourate, y compris
 *   app en arrière-plan et écran éteint
 *
 * Arrière-plan (Android) : React Native y gèle les minuteries, donc `fetch` et
 * les effets différés n'aboutissent qu'au retour dans l'app. L'enchaînement se
 * fait donc dans l'écouteur natif de fin de lecture, avec une URL disponible
 * immédiatement (sourate préchargée au premier plan, audio + mot à mot).
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

import { useBackgroundAudio } from '@/hooks/useBackgroundAudio';
import { Verse } from '@/stores/quranStore';
import { useReciterStore } from '@/stores/reciterStore';
import { recitationService, VerseAudio } from '@/services/recitationService';
import { surahTransliteration } from '@/utils/surahNames';
import { globalVerseNumber } from '@/utils/quranMeta';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ArabicFonts, Radius, Spacing, Type } from '@/constants/theme';
import { Tap } from '@/components/ui/kit';
import { SurahAudioPlayer } from '@/components/SurahAudioPlayer';
import { MinimizeButton, PLAYER_COLORS, PlayerShell } from '@/components/PlayerShell';

/** Demande de lecture venant de l'écran (nonce : chaque toucher relance) */
export interface PlayRequest {
  surah: number;
  ayah: number;
  nonce: number;
}

export interface AudioPlayerProps {
  /** Versets de la sourate affichée à l'écran */
  verses: Verse[];
  /** Sourate affichée à l'écran */
  surahNumber: number;
  request: PlayRequest | null;
  /** Verset en cours (il peut appartenir à la sourate suivante) */
  onPositionChange: (surah: number, ayah: number) => void;
  isVisible: boolean;
  onClose: () => void;
  onHeightChange?: (h: number) => void;
}

type Pos = { surah: number; ayah: number };

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];
const REPEATS = [1, 3, 5, 10, 0]; // 0 = infini
const LOAD_TIMEOUT_MS = 9000;
/** Attente max du préchargement de la sourate avant de lancer le premier verset */
const PREPARE_TIMEOUT_MS = 6000;

const formatTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const VersePlayer: React.FC<AudioPlayerProps> = ({ request, onPositionChange, isVisible, onClose, onHeightChange }) => {
  const { isDark } = useAppTheme();
  const reciter = useReciterStore((s) => s.getSelectedReciter());
  const c = PLAYER_COLORS;
  const bg = isDark ? '#0E3A2C' : '#0B3D2E';

  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);

  const [pos, setPos] = useState<Pos | null>(null);
  const [audio, setAudio] = useState<VerseAudio | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speedIndex, setSpeedIndex] = useState(2);
  const [repeatIndex, setRepeatIndex] = useState(0);
  const [continuous, setContinuous] = useState(true);
  /** Passage à répéter (numéros de versets dans la sourate en cours), ou null */
  const [range, setRange] = useState<{ from: number; to: number } | null>(null);
  const [passIndex, setPassIndex] = useState(1);
  const [minimized, setMinimized] = useState(false);
  const [seeking, setSeeking] = useState<number | null>(null);

  const posRef = useRef<Pos | null>(null);
  const wantPlay = useRef(true);
  const repeatsDone = useRef(0);
  const passesDone = useRef(0);
  const loadToken = useRef(0);
  const usedFallback = useRef(false);
  const lastNonce = useRef<number | null>(null);

  const speed = SPEEDS[speedIndex];
  const repeatTarget = REPEATS[repeatIndex];
  const count = pos ? recitationService.verseCount(pos.surah) : 0;

  // Valeurs lues par l'écouteur natif (toujours les dernières)
  const live = useRef({ speed, repeatTarget, continuous, range, passIndex, isVisible, reciter, onPositionChange });
  live.current = { speed, repeatTarget, continuous, range, passIndex, isVisible, reciter, onPositionChange };

  useBackgroundAudio(player, {
    active: isVisible,
    playing: status.playing,
    title: pos ? `${surahTransliteration(pos.surah)} · verset ${pos.ayah}` : undefined,
    artist: reciter?.name,
  });

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
    if (!isVisible) player.pause();
  }, [isVisible, player]);

  /** Lance un verset tout de suite, sans attendre le réseau */
  const startVerse = (surah: number, ayah: number) => {
    const { reciter: r, speed: sp, onPositionChange: notify } = live.current;
    const token = ++loadToken.current;
    const next = { surah, ayah };
    posRef.current = next;
    setPos(next);
    repeatsDone.current = 0;
    usedFallback.current = false;
    setError(null);

    const a = recitationService.verseAudioNow(r, surah, ayah);
    setAudio(a);
    player.replace({ uri: a.url });
    player.setPlaybackRate(sp);
    if (wantPlay.current) player.play();
    notify(surah, ayah);

    // Mot à mot pas encore là (sourate non préchargée) : chargement du verset seul
    if (!a.words.length || !a.segments.length) {
      recitationService
        .getVerseAudio(r, surah, ayah, globalVerseNumber(surah, ayah))
        .then((full) => {
          if (token !== loadToken.current) return;
          // Les horodatages ne valent que pour le fichier réellement joué
          setAudio({
            ...a,
            words: a.words.length ? a.words : full.words,
            segments: a.segments.length ? a.segments : full.url === a.url ? full.segments : [],
          });
        })
        .catch(() => {});
    }

    // Au premier plan : sourate en cours et suivante prêtes pour l'enchaînement
    recitationService.prefetchChapter(r, surah);
    if (surah < 114) recitationService.prefetchChapter(r, surah + 1);
  };

  const stop = () => {
    wantPlay.current = false;
    player.seekTo(0);
    player.pause();
  };

  /** Fin du verset : répétition, verset suivant, sourate suivante ou arrêt */
  const onFinish = () => {
    const p = posRef.current;
    const { repeatTarget: rt, range: rg, passIndex: pi, continuous: cont, isVisible: visible } = live.current;
    if (!p || !visible) return;

    if (rt === 0 || repeatsDone.current + 1 < rt) {
      repeatsDone.current += 1;
      player.seekTo(0);
      player.play();
      return;
    }
    if (rg) {
      if (p.ayah < rg.to) return startVerse(p.surah, p.ayah + 1);
      const passTarget = REPEATS[pi];
      if (passTarget === 0 || passesDone.current + 1 < passTarget) {
        passesDone.current += 1;
        return startVerse(p.surah, rg.from);
      }
      passesDone.current = 0;
      return stop();
    }
    if (cont) {
      if (p.ayah < recitationService.verseCount(p.surah)) return startVerse(p.surah, p.ayah + 1);
      if (p.surah < 114) return startVerse(p.surah + 1, 1);
    }
    stop();
  };
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Écouteur natif : appelé même app en arrière-plan, sans passer par un rendu
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) onFinishRef.current();
    });
    return () => sub.remove();
  }, [player]);

  // Demande de l'écran (toucher un verset, « Écouter la sourate ») ou changement de voix
  useEffect(() => {
    if (!isVisible || !request) return;
    const sameRequest = lastNonce.current === request.nonce;
    lastNonce.current = request.nonce;
    // Même demande mais autre récitateur : on reprend là où l'on était
    const target = sameRequest && posRef.current ? posRef.current : request;
    wantPlay.current = true;
    passesDone.current = 0;
    const token = ++loadToken.current;
    let started = false;
    const go = () => {
      if (started || token !== loadToken.current) return;
      started = true;
      setPreparing(false);
      startVerse(target.surah, target.ayah);
    };
    // Au premier plan : on attend la sourate préchargée pour que le mot à mot
    // soit synchronisé dès le premier verset (sans dépasser quelques secondes)
    setPreparing(true);
    player.pause();
    recitationService.prefetchChapter(reciter, target.surah).then(go);
    const t = setTimeout(go, PREPARE_TIMEOUT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, request?.nonce, reciter.id]);

  // Source principale muette trop longtemps → source de repli (sans mot à mot synchronisé)
  useEffect(() => {
    if (!isVisible || !pos || !audio || status.isLoaded || preparing) return;
    const t = setTimeout(() => {
      if (usedFallback.current) {
        setError('Audio indisponible. Vérifiez votre connexion.');
        return;
      }
      usedFallback.current = true;
      const url = recitationService.fallbackUrl(reciter, globalVerseNumber(pos.surah, pos.ayah));
      setAudio((a) => (a ? { ...a, url, segments: [] } : a));
      player.replace({ uri: url });
      player.setPlaybackRate(speed);
      if (wantPlay.current) player.play();
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isVisible, pos, audio, status.isLoaded, preparing, player, reciter, speed]);

  useEffect(() => {
    if (status.isLoaded) setError(null);
  }, [status.isLoaded]);

  useEffect(() => {
    player.setPlaybackRate(speed);
  }, [speed, player]);

  const toggleRange = () => {
    passesDone.current = 0;
    if (range || !pos) {
      setRange(null);
      return;
    }
    setRange({ from: pos.ayah, to: Math.min(count, pos.ayah + 4) });
  };

  const togglePlay = () => {
    if (status.playing) {
      wantPlay.current = false;
      player.pause();
    } else {
      wantPlay.current = true;
      if (status.duration > 0 && status.currentTime >= status.duration - 0.2) player.seekTo(0);
      player.play();
    }
  };

  const goTo = (delta: 1 | -1) => {
    const p = posRef.current;
    if (!p) return;
    wantPlay.current = true;
    let { surah, ayah } = p;
    ayah += delta;
    if (ayah < 1) {
      if (surah === 1) return;
      surah -= 1;
      ayah = recitationService.verseCount(surah);
    } else if (ayah > recitationService.verseCount(surah)) {
      if (surah === 114) return;
      surah += 1;
      ayah = 1;
    }
    startVerse(surah, ayah);
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
    loadToken.current += 1;
    player.pause();
    setMinimized(false);
    onClose();
  };

  const currentMs = (seeking ?? status.currentTime) * 1000;
  const wordIndex = audio ? recitationService.wordIndexAt(audio, currentMs) : -1;
  const synced = !!audio?.segments.length;
  const busy = preparing || (!status.isLoaded && !error) || status.isBuffering;
  const repeatLabel = repeatTarget === 0 ? '∞' : repeatTarget > 1 ? `×${repeatTarget}` : '';
  const passTarget = REPEATS[passIndex];
  const repeatProgress = range
    ? ` · passage ${passesDone.current + 1}${passTarget ? `/${passTarget}` : ''}`
    : repeatTarget !== 1 && status.isLoaded
      ? ` · ${repeatsDone.current + 1}${repeatTarget ? `/${repeatTarget}` : ''}`
      : '';
  const surahLabel = pos ? surahTransliteration(pos.surah) : '';
  const atStart = !pos || (pos.surah === 1 && pos.ayah === 1);
  const atEnd = !pos || (pos.surah === 114 && pos.ayah === count);
  const surahProgress =
    pos && count ? (pos.ayah - 1 + (status.duration ? Math.min(1, status.currentTime / status.duration) : 0)) / count : 0;

  return (
    <PlayerShell
      isVisible={isVisible}
      minimized={minimized}
      onMinimizedChange={setMinimized}
      bg={bg}
      onHeightChange={onHeightChange}
      mini={{
        title: pos ? `${surahLabel} · verset ${pos.ayah}/${count}` : 'Préparation…',
        subtitle: reciter.name,
        playing: status.playing,
        busy,
        progress: surahProgress,
        onTogglePlay: togglePlay,
        onClose: close,
      }}
    >
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
            {pos ? `${surahLabel} · verset ${pos.ayah}/${count}` : 'Préparation de la sourate…'}
            {repeatProgress}
          </Text>
        </View>
        <MinimizeButton onPress={() => setMinimized(true)} />
        <Tap onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer le lecteur" style={styles.iconBtn}>
          <Ionicons name="close" size={22} color={c.text} />
        </Tap>
      </View>

      {/* Mot à mot */}
      {!!audio?.words.length && (
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

      {error && <Text style={[Type.caption, { color: c.gold, textAlign: 'center', marginTop: Spacing.sm }]}>{error}</Text>}

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

        <Tap haptic onPress={() => goTo(-1)} accessibilityLabel="Verset précédent" style={styles.iconBtn} disabled={atStart}>
          <Ionicons name="play-skip-back" size={24} color={atStart ? c.line : c.text} />
        </Tap>

        <Tap haptic onPress={togglePlay} accessibilityLabel={status.playing ? 'Pause' : 'Lecture'} style={[styles.playBtn, { backgroundColor: c.gold }]}>
          {busy && !status.playing ? (
            <ActivityIndicator color={c.onGold} />
          ) : (
            <Ionicons name={status.playing ? 'pause' : 'play'} size={28} color={c.onGold} style={!status.playing && { marginLeft: 3 }} />
          )}
        </Tap>

        <Tap haptic onPress={() => goTo(1)} accessibilityLabel="Verset suivant" style={styles.iconBtn} disabled={atEnd}>
          <Ionicons name="play-skip-forward" size={24} color={atEnd ? c.line : c.text} />
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

      <View style={styles.optionsRow}>
        {!range && (
          <Tap
            onPress={() => setContinuous((v) => !v)}
            accessibilityRole="switch"
            accessibilityState={{ checked: continuous }}
            style={styles.continuousRow}
          >
            <Ionicons name={continuous ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={continuous ? c.gold : c.muted} />
            <Text style={[Type.caption, { color: c.muted, marginLeft: 6 }]}>Lecture continue</Text>
          </Tap>
        )}
        <Tap onPress={toggleRange} accessibilityRole="switch" accessibilityState={{ checked: !!range }} style={styles.continuousRow}>
          <Ionicons name={range ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={range ? c.gold : c.muted} />
          <Text style={[Type.caption, { color: range ? c.text : c.muted, marginLeft: 6 }]}>Répéter un passage</Text>
        </Tap>
      </View>

      {range && (
        <View style={[styles.rangeBox, { backgroundColor: c.soft }]}>
          <RangeStepper
            label="Du verset"
            value={range.from}
            onMinus={() => setRange({ from: Math.max(1, range.from - 1), to: range.to })}
            onPlus={() => setRange({ from: Math.min(range.to, range.from + 1), to: range.to })}
          />
          <RangeStepper
            label="au verset"
            value={range.to}
            onMinus={() => setRange({ from: range.from, to: Math.max(range.from, range.to - 1) })}
            onPlus={() => setRange({ from: range.from, to: Math.min(count, range.to + 1) })}
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
    </PlayerShell>
  );
};

function RangeStepper({ label, value, onMinus, onPlus }: { label: string; value?: number; onMinus: () => void; onPlus: () => void }) {
  const c = PLAYER_COLORS;
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: c.muted, fontSize: 11 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Tap haptic onPress={onMinus} accessibilityLabel={`${label} : moins`} style={styles.rangeBtn}>
          <Ionicons name="remove" size={18} color={c.text} />
        </Tap>
        <Text style={{ color: c.text, fontSize: 17, fontWeight: '700', minWidth: 30, textAlign: 'center' }}>{value}</Text>
        <Tap haptic onPress={onPlus} accessibilityLabel={`${label} : plus`} style={styles.rangeBtn}>
          <Ionicons name="add" size={18} color={c.text} />
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
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
