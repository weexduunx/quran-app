/**
 * Avis des bêta-testeurs → POST {BACKEND_URL}/feedback (backend Laravel).
 * Sans réseau, l'avis est gardé sur le téléphone et renvoyé au retour de la connexion.
 * Aucune donnée personnelle n'est jointe : un identifiant d'installation aléatoire,
 * la version de l'app, le modèle du téléphone et le lieu choisi pour les prières.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';

import { API_CONFIG, getDefaultHeaders } from '@/config/api';

export type FeedbackCategory = 'general' | 'bug' | 'idea' | 'content';
export type FeedbackFeature = 'lecture' | 'ecoute' | 'tafsir' | 'prieres' | 'enfants' | 'hors_ligne';

export interface FeedbackInput {
  rating?: number;
  category: FeedbackCategory;
  liked: FeedbackFeature[];
  message?: string;
  contact?: string;
  screen?: string;
  place?: string;
}

const QUEUE_KEY = 'feedback-queue';
const CLIENT_KEY = 'feedback-client-id';
const SENT_KEY = 'feedback-sent-count';

const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

async function clientId() {
  let id = await AsyncStorage.getItem(CLIENT_KEY);
  if (!id) {
    id = uuid();
    await AsyncStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

function deviceInfo() {
  const c = (Platform as unknown as { constants?: Record<string, unknown> }).constants ?? {};
  const model = [c.Brand, c.Model].filter(Boolean).join(' ') || (Platform.OS === 'ios' ? 'iPhone' : '');
  return {
    platform: Platform.OS,
    os_version: String(Platform.Version ?? ''),
    device: model.slice(0, 80),
    // Valeurs de l'APK installé (le versionCode est géré par EAS, absent de app.json)
    app_version: Application.nativeApplicationVersion ?? '',
    build: Application.nativeBuildVersion ?? '',
    locale: (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().locale;
      } catch {
        return '';
      }
    })(),
  };
}

type Payload = Record<string, unknown>;

async function readQueue(): Promise<Payload[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? '[]');
  } catch {
    return [];
  }
}

async function post(payload: Payload) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), API_CONFIG.REQUEST_TIMEOUT);
  try {
    const res = await fetch(`${API_CONFIG.BACKEND_URL}/feedback`, {
      method: 'POST',
      headers: getDefaultHeaders(),
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    // 422 : avis refusé par le serveur, inutile de le renvoyer en boucle
    if (res.status === 422) return 'rejected' as const;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return 'sent' as const;
  } finally {
    clearTimeout(t);
  }
}

let flushing: Promise<void> | null = null;

export const feedbackService = {
  /** Envoie l'avis ; renvoie 'queued' s'il partira plus tard (pas de réseau). */
  async send(input: FeedbackInput): Promise<'sent' | 'queued'> {
    const payload: Payload = {
      ...input,
      message: input.message?.trim() || undefined,
      contact: input.contact?.trim() || undefined,
      rating: input.rating || undefined,
      client_id: await clientId(),
      sent_at: new Date().toISOString(),
      ...deviceInfo(),
    };
    try {
      await post(payload);
      await AsyncStorage.setItem(SENT_KEY, String((await this.sentCount()) + 1));
      this.flush();
      return 'sent';
    } catch {
      const queue = await readQueue();
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, payload].slice(-20)));
      await AsyncStorage.setItem(SENT_KEY, String((await this.sentCount()) + 1));
      return 'queued';
    }
  },

  /** Renvoie les avis restés sur le téléphone (au démarrage, au retour au premier plan). */
  flush(): Promise<void> {
    if (flushing) return flushing;
    flushing = (async () => {
      const queue = await readQueue();
      if (!queue.length) return;
      const left: Payload[] = [];
      for (const p of queue) {
        try {
          await post(p);
        } catch {
          left.push(p);
        }
      }
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(left));
    })()
      .catch(() => {})
      .finally(() => {
        flushing = null;
      });
    return flushing;
  },

  async sentCount(): Promise<number> {
    return Number((await AsyncStorage.getItem(SENT_KEY)) ?? 0) || 0;
  },
};
