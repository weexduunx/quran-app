import { useEffect } from 'react';
import { setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * Lecture qui continue app en arrière-plan et écran éteint.
 *
 * - Le mode audio est global à l'app : l'espace enfants le repasse à
 *   `shouldPlayInBackground: false`. On le réaffirme donc à chaque lancement
 *   de la lecture, pas seulement au montage.
 * - Les contrôles sur l'écran verrouillé démarrent le service de premier plan
 *   Android (sans lui, le système coupe le son quand l'écran s'éteint).
 *   Nécessite `enableBackgroundPlayback` dans le plugin expo-audio (app.json).
 */
export function useBackgroundAudio(
  player: AudioPlayer,
  opts: { active: boolean; playing: boolean; title?: string; artist?: string }
) {
  const { active, playing, title, artist } = opts;

  useEffect(() => {
    if (!playing) return;
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionModeAndroid: 'duckOthers',
    }).catch(() => {});
  }, [playing]);

  useEffect(() => {
    if (!active) return;
    try {
      player.setActiveForLockScreen(true, { title, artist }, { showSeekBackward: true, showSeekForward: true });
    } catch {}
    return () => {
      try {
        player.clearLockScreenControls();
      } catch {}
    };
    // Les métadonnées sont mises à jour par l'effet suivant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, active]);

  useEffect(() => {
    if (!active) return;
    try {
      player.updateLockScreenMetadata({ title, artist });
    } catch {}
  }, [player, active, title, artist]);
}
