import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { TafsirBook, TafsirContent } from '@/stores/tafsirStore';
import { Verse } from '@/stores/quranStore';

interface TafsirAudioPlayerProps {
  visible: boolean;
  onClose: () => void;
  tafsirBook: TafsirBook;
  verse: Verse;
  content?: TafsirContent;
}

export const TafsirAudioPlayer: React.FC<TafsirAudioPlayerProps> = ({
  visible,
  onClose,
  tafsirBook,
  verse,
  content,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const positionUpdateRef = useRef<NodeJS.Timeout>();

  // Générer l'URL audio pour le tafsir
  const generateAudioUrl = () => {
    // URLs de test fonctionnelles - remplacez par vos vraies URLs
    const testUrls = [
      'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3',
      'https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg',
      'https://sample-videos.com/zip/10/mp3/mp3-sample-1.mp3'
    ];

    const baseUrls = {
      'hady-niasse': testUrls[0],
      'moustapha-gueye': testUrls[1],
      'ahmadou-bamba': testUrls[2],
    };

    const testUrl = baseUrls[tafsirBook.apiId as keyof typeof baseUrls];
    if (testUrl) {
      return testUrl;
    }

    // Fallback vers une URL de test générique
    return testUrls[0];
  };

  const audioUrl = content?.audioUrl || generateAudioUrl();

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (positionUpdateRef.current) {
        clearInterval(positionUpdateRef.current);
      }
    };
  }, [sound]);

  // Charger l'audio automatiquement quand le modal s'ouvre
  useEffect(() => {
    if (visible && audioUrl) {
      console.log('Modal ouvert, chargement automatique de l\'audio');
      loadAudio();
    }
  }, [visible, audioUrl]);

  const loadAudio = async () => {
    try {
      if (!audioUrl) {
        Alert.alert('Erreur', 'Aucun fichier audio disponible pour ce tafsir');
        return;
      }

      console.log('Chargement audio depuis:', audioUrl);
      setIsLoading(true);
      setIsBuffering(true);

      // Décharger l'audio précédent
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      // Configuration audio améliorée
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        playsInSilentModeIOS: true,
      });

      console.log('Création du son...');
      const { sound: newSound, status } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        {
          shouldPlay: false,
          isLooping: false,
          volume: 1.0,
        },
        (status) => {
          console.log('Status update:', status);
          if (status.isLoaded) {
            setPosition(status.positionMillis || 0);
            setDuration(status.durationMillis || 0);
            setIsBuffering(status.isBuffering || false);

            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
            }
          } else if (status.error) {
            console.error('Erreur de lecture audio:', status.error);
            setIsPlaying(false);
            setIsBuffering(false);
            setIsLoading(false);
            Alert.alert('Erreur Audio', `Impossible de lire le fichier audio: ${status.error}`);
          }
        }
      );

      console.log('Statut initial:', status);

      if (status.isLoaded) {
        setSound(newSound);
        setIsLoading(false);
        setIsBuffering(false);
        setDuration(status.durationMillis || 0);

        console.log('Démarrage de la lecture...');
        // Démarrer la lecture automatiquement
        await newSound.playAsync();
        setIsPlaying(true);
      } else {
        setIsLoading(false);
        setIsBuffering(false);
        Alert.alert('Erreur', 'Le fichier audio n\'a pas pu être chargé');
      }

    } catch (error) {
      console.error('Erreur lors du chargement de l\'audio:', error);
      setIsLoading(false);
      setIsBuffering(false);
      Alert.alert('Erreur', `Impossible de charger le fichier audio: ${error}`);
    }
  };

  const handlePlayPause = async () => {
    if (!sound) {
      await loadAudio();
      return;
    }

    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Erreur lors de la lecture/pause:', error);
    }
  };

  const handleSeek = async (value: number) => {
    if (sound && duration > 0) {
      try {
        const position = (value / 100) * duration;
        await sound.setPositionAsync(position);
        setPosition(position);
      } catch (error) {
        console.error('Erreur lors du seek:', error);
      }
    }
  };

  const handleClose = () => {
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    onClose();
  };

  const formatTime = (timeMs: number) => {
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tafsir Audio</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Informations du verset */}
          <View style={styles.verseInfo}>
            <Text style={styles.verseTitle}>
              {verse.surah?.name_simple} - Verset {verse.verse_number}
            </Text>
            <Text style={styles.verseArabic}>
              {verse.surah?.name_arabic}
            </Text>
            <Text style={styles.verseText}>
              {verse.text_uthmani}
            </Text>
          </View>

          {/* Informations du tafsir */}
          <View style={styles.tafsirInfo}>
            <View style={styles.bookHeader}>
              <Ionicons name="book" size={24} color="#D4AF37" />
              <Text style={styles.bookTitle}>{tafsirBook.title}</Text>
            </View>
            <Text style={styles.author}>{tafsirBook.author}</Text>
            <Text style={styles.authorArabic}>{tafsirBook.authorArabic}</Text>
            <Text style={styles.description}>{tafsirBook.description}</Text>
          </View>

          {/* Lecteur audio */}
          <View style={styles.audioPlayer}>
            <View style={styles.playerControls}>
              <TouchableOpacity
                style={[styles.playButton, isLoading && styles.playButtonDisabled]}
                onPress={handlePlayPause}
                disabled={isLoading || isBuffering}
              >
                {isLoading || isBuffering ? (
                  <Ionicons name="hourglass" size={32} color="#1B5E20" />
                ) : (
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={32}
                    color="#1B5E20"
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Barre de progression */}
            <View style={styles.progressContainer}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Slider
                style={styles.slider}
                value={progressPercent}
                onValueChange={handleSeek}
                minimumValue={0}
                maximumValue={100}
                minimumTrackTintColor="#D4AF37"
                maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
                thumbStyle={styles.sliderThumb}
                disabled={!sound || duration === 0}
              />
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            {/* Statut de lecture */}
            <View style={styles.statusContainer}>
              {isBuffering && (
                <Text style={styles.statusText}>Chargement en cours...</Text>
              )}
              {!audioUrl && (
                <Text style={styles.statusText}>Aucun audio disponible</Text>
              )}
              {audioUrl && !sound && !isLoading && (
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={loadAudio}
                >
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.testButtonText}>Essayer de charger l'audio</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Note explicative */}
          <View style={styles.note}>
            <Ionicons name="information-circle" size={20} color="#A5D6A7" />
            <Text style={styles.noteText}>
              Ce tafsir audio vous permet d'écouter les explications du Coran en wolof
              par {tafsirBook.author}. Idéal pour une meilleure compréhension.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  verseInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  verseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  verseArabic: {
    fontSize: 16,
    color: '#D4AF37',
    textAlign: 'center',
    marginBottom: 16,
  },
  verseText: {
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'NotoSansArabic-Regular',
    lineHeight: 40,
  },
  tafsirInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  bookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  author: {
    fontSize: 16,
    color: '#D4AF37',
    marginBottom: 4,
  },
  authorArabic: {
    fontSize: 16,
    color: '#A5D6A7',
    textAlign: 'right',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#E8F5E8',
    lineHeight: 20,
  },
  audioPlayer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  playerControls: {
    alignItems: 'center',
    marginBottom: 20,
  },
  playButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playButtonDisabled: {
    backgroundColor: '#888',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 12,
  },
  sliderThumb: {
    backgroundColor: '#D4AF37',
    width: 20,
    height: 20,
  },
  timeText: {
    fontSize: 14,
    color: '#FFFFFF',
    minWidth: 40,
    textAlign: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#A5D6A7',
    textAlign: 'center',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B5E20',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  testButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '600',
  },
  note: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 40,
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#E8F5E8',
    marginLeft: 12,
    lineHeight: 20,
  },
});