import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus } from 'react-native';
import { Verse } from '@/stores/quranStore';
import { Reciter } from '@/stores/reciterStore';
import { notificationService, AudioNotificationState } from '@/services/notificationService';

interface UseAudioNotificationsProps {
  currentVerse: Verse | null;
  currentReciter: Reciter | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onStop: () => void;
}

export const useAudioNotifications = ({
  currentVerse,
  currentReciter,
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onNext,
  onPrevious,
  onStop,
}: UseAudioNotificationsProps) => {
  const appStateRef = useRef(AppState.currentState);
  const notificationListenerRef = useRef<Notifications.Subscription>();
  const responseListenerRef = useRef<Notifications.Subscription>();
  const lastUpdateTimeRef = useRef(0);

  useEffect(() => {
    // Initialiser les notifications
    const initNotifications = async () => {
      const hasPermission = await notificationService.requestPermissions();
      if (hasPermission) {
        await notificationService.setupNotificationActions();
      }
    };

    initNotifications();

    // Écouter les changements d'état de l'application
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const wasActive = appStateRef.current === 'active';
      const isActive = nextAppState === 'active';

      appStateRef.current = nextAppState;

      // Si l'app passe en arrière-plan et qu'un audio est en cours
      if (wasActive && !isActive && currentVerse && currentReciter && isPlaying) {
        showNotification();
      }

      // Si l'app revient en premier plan, masquer la notification
      if (!wasActive && isActive) {
        hideNotification();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Configurer les listeners de notifications
    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const { actionIdentifier, notification } = response;

      // Vérifier que c'est bien notre notification audio
      if (notification.request.content.data?.type !== 'audio_player') return;

      switch (actionIdentifier) {
        case 'PLAY_PAUSE':
          onPlayPause();
          break;
        case 'NEXT_VERSE':
          onNext();
          break;
        case 'PREVIOUS_VERSE':
          onPrevious();
          break;
        case 'STOP':
          onStop();
          hideNotification();
          break;
        case Notifications.DEFAULT_ACTION_IDENTIFIER:
          // L'utilisateur a tapé sur la notification - ramener l'app au premier plan
          // L'app sera automatiquement ouverte
          break;
        default:
          break;
      }
    };

    const handleNotificationReceived = (notification: Notifications.Notification) => {
      // Gérer les notifications reçues quand l'app est en premier plan
      // Dans notre cas, on n'affiche pas les notifications en premier plan
      if (notification.request.content.data?.type === 'audio_player') {
        // Ne rien faire car l'utilisateur voit déjà le player
      }
    };

    responseListenerRef.current = notificationService.addNotificationResponseListener(
      handleNotificationResponse
    );

    notificationListenerRef.current = notificationService.addNotificationReceivedListener(
      handleNotificationReceived
    );

    return () => {
      subscription?.remove();
      responseListenerRef.current?.remove();
      notificationListenerRef.current?.remove();
      hideNotification();
    };
  }, []);

  // Mettre à jour la notification quand l'état change
  useEffect(() => {
    const now = Date.now();
    // Limiter les mises à jour pour éviter le spam
    if (now - lastUpdateTimeRef.current < 1000) return;
    lastUpdateTimeRef.current = now;

    if (appStateRef.current !== 'active' && currentVerse && currentReciter) {
      showNotification();
    }

    // Mettre à jour le progrès
    if (appStateRef.current !== 'active') {
      notificationService.updateNotificationProgress(currentTime, duration);
    }
  }, [currentVerse, currentReciter, isPlaying, currentTime, duration]);

  const showNotification = async () => {
    if (!currentVerse || !currentReciter) return;

    const state: AudioNotificationState = {
      currentVerse,
      currentReciter,
      isPlaying,
      currentTime,
      duration,
    };

    await notificationService.showAudioPlayerNotification(state);
  };

  const hideNotification = async () => {
    await notificationService.hideAudioPlayerNotification();
  };


  return {
    showNotification,
    hideNotification,
  };
};