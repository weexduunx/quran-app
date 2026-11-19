/**
 * Lecteur « sourate entière », pour les récitateurs dont on ne dispose que d'un
 * fichier par sourate (ex. Mouhamed Hady Touré). Pas de mot à mot ni de suivi
 * verset par verset : quand on lance depuis un verset, on se place à une
 * position estimée (proportionnelle à la longueur du texte qui précède).
 *
 * À la fin d'une sourate, la suivante démarre (lecture continue), y compris
 * en arrière-plan : l'URL est connue sans réseau et l'enchaînement se fait
 * dans l'écouteur natif de fin de lecture.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

import { useBackgroundAudio } from '@/hooks/useBackgroundAudio';
import type { AudioPlayerProps } from '@/components/AudioPlayerSimple';
import { useReciterStore } from '@/stores/reciterStore';
import { recitationService } from '@/services/recitationService';
import { surahTransliteration } from '@/utils/surahNames';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, Type } from '@/constants/theme';
import { Tap } from '@/components/ui/kit';
import { MinimizeButton, PLAYER_COLORS, PlayerShell } from '@/components/PlayerShell';

const SPEEDS = [0.75, 1, 1.25, 1.5];

const fmt = (sec: number) => {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
};

/** Longueur « récitée » approximative : lettres arabes sans voyelles ni signes */
const letters = (t?: string) => (t ?? '').replace(/[ً-ٰٟۖ-ۭ\s]/g, '').length;

export function SurahAudioPlayer({
  verses,
  surahNumber,
  request,
  onPositionChange,
  isVisible,
  onClose,
  onHeightChange,
}: AudioPlayerProps) {
  const { isDark } = useAppTheme();
  const reciter = useReciterStore((s) => s.getSelectedReciter());
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const c = PLAYER_COLORS;
  const bg = isDark ? '#0E3A2C' : '#0B3D2E';

  const [surah, setSurah] = useState<number | null>(null);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [loop, setLoop] = useState(false);
  const [continuous, setContinuous] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [seeking, setSeeking] = useState<number | null>(null);
  const [estimated, setEstimated] = useState<number | null>(null);
  const pendingSeek = useRef<number | null>(null);
  const surahRef = useRef<number | null>(null);
  const loadedUrl = useRef<string | null>(null);

  const live = useRef({ loop, continuous, isVisible, reciter, speedIndex, onPositionChange });
  live.current = { loop, continuous, isVisible, reciter, speedIndex, onPositionChange };

  const name = surah ? surahTransliteration(surah) : '';

  useBackgroundAudio(player, {
    active: isVisible,
    playing: status.playing,
    title: surah ? name : undefined,
    artist: reciter?.name,
  });

  // Part du texte qui précède chaque verset (0 → 1) — sourate affichée à l'écran
  const offsets = useMemo(() => {
    const lens = verses.map((v) => letters(v.text_arabic));
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    return lens.map((l) => {
      const start = acc / total;
      acc += l;
      return start;
    });
  }, [verses]);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionModeAndroid: 'duckOthers' }).catch(
      () => {}
    );
  }, []);

  useEffect(() => {
    if (!isVisible) player.pause();
  }, [isVisible, player]);

  /** Charge (si besoin) et lance une sourate, sans réseau préalable */
  const playSurah = (n: number) => {
    const { reciter: r, speedIndex: si, onPositionChange: notify } = live.current;
    const url = recitationService.surahAudioUrl(r, n);
    if (!url) return;
    surahRef.current = n;
    setSurah(n);
    if (loadedUrl.current !== url) {
      loadedUrl.current = url;
      player.replace({ uri: url });
    }
    player.setPlaybackRate(SPEEDS[si]);
    player.play();
    notify(n, 1);
  };

  // Fin de sourate : répétition, sourate suivante ou arrêt (écouteur natif, marche en arrière-plan)
  const onFinish = () => {
    const n = surahRef.current;
    const { loop: lp, continuous: cont, isVisible: visible } = live.current;
    if (!n || !visible) return;
    if (lp) {
      player.seekTo(0);
      player.play();
    } else if (cont && n < 114) {
      setEstimated(null);
      playSurah(n + 1);
    }
  };
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) onFinishRef.current();
    });
    return () => sub.remove();
  }, [player]);

  // Demande de l'écran : sourate et verset de départ
  useEffect(() => {
    if (!isVisible || !request) return;
    playSurah(request.surah);
    // Position estimée du verset, seulement pour la sourate affichée
    const index = request.surah === surahNumber ? request.ayah - 1 : 0;
    pendingSeek.current = index;
    if (index > 0 && status.duration && loadedUrl.current === recitationService.surahAudioUrl(reciter, request.surah)) {
      // Fichier déjà chargé : on se place tout de suite
      pendingSeek.current = null;
      player.seekTo(offsets[index] * status.duration);
      setEstimated(request.ayah);
    }
    onPositionChange(request.surah, request.ayah);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, request?.nonce, reciter.id]);

  // Dès que la durée est connue, se placer au verset demandé
  useEffect(() => {
    const index = pendingSeek.current;
    if (index === null || !status.duration) return;
    pendingSeek.current = null;
    if (index <= 0 || !offsets[index]) {
      setEstimated(null);
      return;
    }
    player.seekTo(offsets[index] * status.duration);
    setEstimated(index + 1);
  }, [status.duration, offsets, player]);

  useEffect(() => {
    player.setPlaybackRate(SPEEDS[speedIndex]);
  }, [speedIndex, player]);

  const skip = (d: number) => player.seekTo(Math.max(0, Math.min(status.duration || 0, status.currentTime + d)));
  const toggle = () => {
    if (status.playing) player.pause();
    else {
      if (status.duration && status.currentTime >= status.duration - 0.5) player.seekTo(0);
      player.play();
    }
  };
  const close = () => {
    player.pause();
    setMinimized(false);
    onClose();
  };

  const busy = (!status.isLoaded || status.isBuffering) && !status.playing;
  const progress = status.duration ? status.currentTime / status.duration : 0;

  return (
    <PlayerShell
      isVisible={isVisible}
      minimized={minimized}
      onMinimizedChange={setMinimized}
      bg={bg}
      onHeightChange={onHeightChange}
      mini={{
        title: surah ? `${name} · sourate ${surah}` : 'Préparation…',
        subtitle: reciter.name,
        playing: status.playing,
        busy,
        progress,
        onTogglePlay: toggle,
        onClose: close,
      }}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="mic-outline" size={20} color={c.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[Type.callout, { color: '#fff', fontWeight: '600' }]} numberOfLines={1}>
            {reciter.name}
          </Text>
          <Text style={[Type.caption, { color: c.muted }]} numberOfLines={1}>
            {surah ? `${name} · ` : ''}sourate entière
          </Text>
        </View>
        <MinimizeButton onPress={() => setMinimized(true)} />
        <Tap onPress={close} hitSlop={10} accessibilityLabel="Fermer le lecteur" style={styles.iconBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </Tap>
      </View>

      <Text style={styles.note}>
        {estimated
          ? `Départ à une position estimée du verset ${estimated} : ajustez avec ±10 s si besoin.`
          : 'Récitation par sourate entière : pas de mot à mot pour cette voix.'}
      </Text>

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
          minimumTrackTintColor={c.gold}
          maximumTrackTintColor={c.line}
          thumbTintColor={c.gold}
          disabled={!status.isLoaded}
        />
        <Text style={styles.time}>{fmt(status.duration)}</Text>
      </View>

      <View style={styles.controls}>
        <Tap haptic onPress={() => setSpeedIndex((i) => (i + 1) % SPEEDS.length)} style={styles.pill} accessibilityLabel="Vitesse">
          <Text style={[Type.caption, { color: '#fff', fontWeight: '700' }]}>{String(SPEEDS[speedIndex]).replace('.', ',')}×</Text>
        </Tap>
        <Tap haptic onPress={() => skip(-10)} style={styles.iconBtn} accessibilityLabel="Reculer de 10 secondes">
          <Ionicons name="play-back" size={22} color="#fff" />
          <Text style={styles.skipText}>10 s</Text>
        </Tap>
        <Tap haptic onPress={toggle} style={[styles.play, { backgroundColor: c.gold }]} accessibilityLabel={status.playing ? 'Pause' : 'Lecture'}>
          {busy ? (
            <ActivityIndicator color={c.onGold} />
          ) : (
            <Ionicons name={status.playing ? 'pause' : 'play'} size={28} color={c.onGold} style={!status.playing && { marginLeft: 3 }} />
          )}
        </Tap>
        <Tap haptic onPress={() => skip(10)} style={styles.iconBtn} accessibilityLabel="Avancer de 10 secondes">
          <Ionicons name="play-forward" size={22} color="#fff" />
          <Text style={styles.skipText}>10 s</Text>
        </Tap>
        <Tap
          haptic
          onPress={() => setLoop((l) => !l)}
          accessibilityLabel={loop ? 'Ne plus répéter la sourate' : 'Répéter la sourate'}
          style={[styles.pill, loop && { borderColor: c.gold, backgroundColor: c.soft }]}
        >
          <Ionicons name="repeat" size={16} color={loop ? c.gold : '#fff'} />
        </Tap>
      </View>

      {!loop && (
        <Tap
          onPress={() => setContinuous((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: continuous }}
          style={styles.continuousRow}
        >
          <Ionicons name={continuous ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={continuous ? c.gold : c.muted} />
          <Text style={[Type.caption, { color: c.muted, marginLeft: 6 }]}>Enchaîner les sourates</Text>
        </Tap>
      )}
    </PlayerShell>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: 'rgba(255,255,255,0.72)', fontSize: 10 },
  note: { color: 'rgba(255,255,255,0.72)', fontSize: 12, textAlign: 'center', marginTop: Spacing.md },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  time: { color: 'rgba(255,255,255,0.72)', fontSize: 12, minWidth: 40, textAlign: 'center', fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  pill: {
    minWidth: 48,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  continuousRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 36, marginTop: Spacing.sm },
});
