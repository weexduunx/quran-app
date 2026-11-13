import { useEffect, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

/** Texte lu par la voix du téléphone tant que l'enregistrement validé n'est pas dans l'app */
export interface KidsSpeech {
  text: string;
  /** Code langue BCP-47 : 'ar' (arabe) ou 'fr-FR' */
  language: string;
  rate?: number;
}

// Langues disponibles sur l'appareil, calculées une seule fois
let voicesPromise: Promise<Set<string> | null> | null = null;
function availableLanguages() {
  if (!voicesPromise) {
    voicesPromise = Speech.getAvailableVoicesAsync()
      .then((voices) => (voices.length ? new Set(voices.map((v) => v.language.toLowerCase().slice(0, 2))) : null))
      .catch(() => null);
  }
  return voicesPromise;
}

/** Vrai si l'appareil sait lire cette langue (null = inconnu, on tente quand même) */
export function useSpeechSupport(language: string) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    availableLanguages().then((set) => alive && setOk(set ? set.has(language.slice(0, 2).toLowerCase()) : null));
    return () => {
      alive = false;
    };
  }, [language]);
  return ok;
}

/**
 * Lecteur minimal pour l'espace enfants : un son à la fois, identifié par une clé.
 * Priorité à l'enregistrement validé ; à défaut, voix de synthèse du téléphone.
 * `onEnd` est appelé quand le son va jusqu'au bout (pour gagner une étoile).
 */
export function useKidsSound(onEnd?: (key: string) => void) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [playing, setPlaying] = useState<string | null>(null);
  const current = useRef<string | null>(null);
  const speaking = useRef(false);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});
    availableLanguages();
    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    if (!status.didJustFinish || !current.current || speaking.current) return;
    const key = current.current;
    current.current = null;
    setPlaying(null);
    endRef.current?.(key);
  }, [status.didJustFinish]);

  const stop = () => {
    player.pause();
    if (speaking.current) Speech.stop();
    speaking.current = false;
    current.current = null;
    setPlaying(null);
  };

  const unavailable = () => {
    // Ni enregistrement ni voix : petit retour tactile plutôt qu'un bouton mort
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  };

  const play = async (key: string, source?: number, speech?: KidsSpeech) => {
    // Second appui sur le son en cours : pause
    if (current.current === key && (status.playing || speaking.current)) {
      stop();
      return;
    }
    stop();

    if (source) {
      current.current = key;
      setPlaying(key);
      player.replace(source);
      player.play();
      return;
    }

    if (!speech) return unavailable();
    const langs = await availableLanguages();
    if (langs && !langs.has(speech.language.slice(0, 2).toLowerCase())) return unavailable();

    current.current = key;
    speaking.current = true;
    setPlaying(key);
    const finish = (completed: boolean) => {
      if (current.current !== key) return;
      speaking.current = false;
      current.current = null;
      setPlaying(null);
      if (completed) endRef.current?.(key);
    };
    Speech.speak(speech.text, {
      language: speech.language,
      rate: speech.rate ?? 0.75,
      pitch: 1.05,
      onDone: () => finish(true),
      onStopped: () => finish(false),
      onError: () => {
        finish(false);
        unavailable();
      },
    });
  };

  return { play, stop, playing };
}
