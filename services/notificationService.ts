import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Verse } from '@/stores/quranStore';
import { Reciter } from '@/stores/reciterStore';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface AudioNotificationState {
  currentVerse: Verse | null;
  currentReciter: Reciter | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

class NotificationService {
  private currentNotificationId: string | null = null;

  async requestPermissions() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('quran-audio', {
        name: 'Lecteur Coranique',
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1B5E20',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: false,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  async showAudioPlayerNotification(state: AudioNotificationState) {
    if (!state.currentVerse || !state.currentReciter) return;

    const notificationContent = {
      title: 'Lecteur Coranique',
      body: `${state.currentVerse.surah?.name_arabic || 'Sourate'} - Verset ${state.currentVerse.verse_number}`,
      subtitle: `Récité par ${state.currentReciter.name}`,
      data: {
        type: 'audio_player',
        verse: state.currentVerse,
        reciter: state.currentReciter,
        isPlaying: state.isPlaying,
        currentTime: state.currentTime,
        duration: state.duration,
      },
      categoryIdentifier: 'AUDIO_PLAYER',
      priority: Notifications.AndroidNotificationPriority.LOW,
      sticky: true,
      autoDismiss: false,
    };

    // Annuler la notification précédente s'il y en a une
    if (this.currentNotificationId) {
      await Notifications.dismissNotificationAsync(this.currentNotificationId);
    }

    // Programmer la nouvelle notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null, // Notification immédiate
    });

    this.currentNotificationId = notificationId;
    return notificationId;
  }

  async updateNotificationProgress(currentTime: number, duration: number) {
    if (!this.currentNotificationId) return;

    // Sur Android, on peut mettre à jour le progrès
    if (Platform.OS === 'android') {
      const progress = duration > 0 ? Math.floor((currentTime / duration) * 100) : 0;
      // Note: La mise à jour du progrès des notifications nécessite des actions natives
      // Cette fonctionnalité pourrait nécessiter un plugin natif personnalisé
    }
  }

  async hideAudioPlayerNotification() {
    if (this.currentNotificationId) {
      await Notifications.dismissNotificationAsync(this.currentNotificationId);
      this.currentNotificationId = null;
    }
  }

  async setupNotificationActions() {
    // Définir les catégories de notifications avec des actions
    await Notifications.setNotificationCategoryAsync('AUDIO_PLAYER', [
      {
        identifier: 'PLAY_PAUSE',
        buttonTitle: 'Lecture/Pause',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'NEXT_VERSE',
        buttonTitle: 'Suivant',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'PREVIOUS_VERSE',
        buttonTitle: 'Précédent',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'STOP',
        buttonTitle: 'Arrêter',
        options: { opensAppToForeground: false, isDestructive: true },
      },
    ]);
  }

  // Gérer les réponses aux actions des notifications
  addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  // Gérer les notifications reçues quand l'app est en premier plan
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(listener);
  }
}

export const notificationService = new NotificationService();