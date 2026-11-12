import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { reminderService } from '@/services/reminderService';
import { useSettingsStore, useSettingsHydrated } from '@/stores/settingsStore';
import { useProgressStore } from '@/stores/progressStore';

/**
 * Garde les rappels à jour (réglages, ville, dernière lecture, retour au premier
 * plan) et ouvre le bon écran quand on touche une notification.
 */
export function useReminderSync() {
  const hydrated = useSettingsHydrated();
  const city = useSettingsStore((s) => s.city);
  const prayer = useSettingsStore((s) => s.prayerReminders);
  const reading = useSettingsStore((s) => s.readingReminder);
  const lastRead = useProgressStore((s) => s.lastRead);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Le rappel de lecture n'a besoin que de la sourate et du verset
  const lastKey = lastRead ? `${lastRead.surahId}:${lastRead.verseNumber}` : '';

  useEffect(() => {
    if (!hydrated) return;
    const run = () => {
      if (timer.current) clearTimeout(timer.current);
      // Regroupe les changements rapprochés (défilement de lecture, réglages)
      timer.current = setTimeout(() => {
        reminderService
          .sync({ city, prayer, reading, lastRead: useProgressStore.getState().lastRead })
          .catch((e) => console.warn('[rappels]', e));
      }, 1500);
    };
    run();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && run());
    return () => {
      sub.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [hydrated, city, prayer, reading, lastKey]);

  // Toucher une notification ouvre l'écran prévu
  useEffect(() => {
    reminderService.configure();
    const open = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string' && url !== '/') router.push(url as never);
    };
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
