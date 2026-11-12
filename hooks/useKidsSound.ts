import { useEffect, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Haptics from 'expo-haptics';

/**
 * Lecteur minimal pour l'espace enfants : un son à la fois, identifié par une clé.
 * `onEnd` est appelé quand le son va jusqu'au bout (pour gagner une étoile).
 */
export function useKidsSound(onEnd?: (key: string) => void) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [playing, setPlaying] = useState<string | null>(null);
  const current = useRef<string | null>(null);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!status.didJustFinish || !current.current) return;
    const key = current.current;
    current.current = null;
    setPlaying(null);
    endRef.current?.(key);
  }, [status.didJustFinish]);

  const play = (key: string, source?: number) => {
    if (!source) {
      // Pas encore enregistré : petit retour tactile plutôt qu'un bouton mort
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    if (current.current === key && status.playing) {
      player.pause();
      current.current = null;
      setPlaying(null);
      return;
    }
    current.current = key;
    setPlaying(key);
    player.replace(source);
    player.play();
  };

  const stop = () => {
    player.pause();
    current.current = null;
    setPlaying(null);
  };

  return { play, stop, playing };
}
