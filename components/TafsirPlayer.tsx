import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { tafsirService, TafsirAudio, TafsirHafiz } from '@/services/tafsirService';

interface TafsirPlayerProps {
  surahId: number;
  verseNumber?: number;
  surahName: string;
  isVisible: boolean;
  onClose: () => void;
}

export const TafsirPlayer: React.FC<TafsirPlayerProps> = ({
  surahId,
  verseNumber,
  surahName,
  isVisible,
  onClose,
}) => {
  const [availableTafsirs, setAvailableTafsirs] = useState<TafsirAudio[]>([]);
  const [selectedTafsir, setSelectedTafsir] = useState<TafsirAudio | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hafizList, setHafizList] = useState<TafsirHafiz[]>([]);

  // Charger les données quand le composant est visible
  useEffect(() => {
    if (isVisible) {
      loadTafsirData();
    }
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [isVisible, surahId, verseNumber]);

  const loadTafsirData = () => {
    console.log(`🎧 TAFSIR: Loading for surah ${surahId}${verseNumber ? `, verse ${verseNumber}` : ''}`);

    // Charger les hafiz
    const hafiz = tafsirService.getHafizList();
    setHafizList(hafiz);

    // Charger les tafsirs disponibles
    let tafsirs: TafsirAudio[];
    if (verseNumber) {
      tafsirs = tafsirService.getTafsirsByVerse(surahId, verseNumber);
    } else {
      tafsirs = tafsirService.getTafsirsBySurah(surahId);
    }

    setAvailableTafsirs(tafsirs);

    if (tafsirs.length > 0) {
      setSelectedTafsir(tafsirs[0]); // Sélectionner le premier par défaut
      console.log(`✅ TAFSIR: Found ${tafsirs.length} tafsirs`);
    } else {
      console.log('⚠️ TAFSIR: No tafsirs found for this surah/verse');
    }
  };

  const playTafsir = async (tafsir: TafsirAudio) => {
    try {
      setIsLoading(true);

      // Arrêter le son actuel si il y en a un
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      // Configuration audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        playsInSilentModeIOS: true,
      });

      const streamUrl = tafsirService.getTafsirStreamUrl(tafsir.id);
      if (!streamUrl) {
        throw new Error('URL de tafsir non disponible');
      }

      console.log(`🎧 TAFSIR: Loading audio from ${streamUrl}`);

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        {
          shouldPlay: true,
          isLooping: false,
          volume: 1.0,
          progressUpdateIntervalMillis: 1000,
        },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setSelectedTafsir(tafsir);
      setIsPlaying(true);
      setIsLoading(false);

      console.log(`✅ TAFSIR: Playing "${tafsir.title}" by ${tafsir.hafizName}`);

    } catch (error) {
      console.error('❌ Error playing tafsir:', error);
      setIsLoading(false);
      Alert.alert(
        'Erreur de lecture',
        'Impossible de lire ce tafsir. Veuillez réessayer plus tard.'
      );
    }
  };

  const pauseResumeTafsir = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error pause/resume:', error);
    }
  };

  const stopTafsir = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        setPosition(0);
        setDuration(0);
      } catch (error) {
        console.error('Error stopping tafsir:', error);
      }
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying || false);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const formatTime = (timeMs: number) => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1B5E20', '#2E7D32', '#1B5E20']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#D4AF37" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>🎧 Tafsir en Wolof</Text>
            <Text style={styles.headerSubtitle}>
              {surahName}{verseNumber ? ` - Verset ${verseNumber}` : ''}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {availableTafsirs.length > 0 ? (
          <>
            {/* Lecture en cours */}
            {selectedTafsir && (
              <View style={styles.currentPlayerContainer}>
                <View style={styles.currentTafsirInfo}>
                  <Text style={styles.currentTitle}>{selectedTafsir.title}</Text>
                  <Text style={styles.currentHafiz}>
                    Par {selectedTafsir.hafizName}
                  </Text>
                  <Text style={styles.currentHafizArabic}>
                    {selectedTafsir.hafizNameArabic}
                  </Text>
                  {selectedTafsir.description && (
                    <Text style={styles.currentDescription}>
                      {selectedTafsir.description}
                    </Text>
                  )}
                </View>

                {/* Contrôles de lecture */}
                <View style={styles.playerControls}>
                  <View style={styles.progressContainer}>
                    <Text style={styles.timeText}>{formatTime(position)}</Text>
                    <View style={styles.progressTrack}>
                      <View
                        style={[styles.progressFill, { width: `${progressPercent}%` }]}
                      />
                    </View>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                  </View>

                  <View style={styles.controlButtons}>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={stopTafsir}
                      disabled={!sound}
                    >
                      <Ionicons name="stop" size={24} color={sound ? '#D4AF37' : '#666'} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.playButton}
                      onPress={pauseResumeTafsir}
                      disabled={!sound || isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#1B5E20" />
                      ) : (
                        <Ionicons
                          name={isPlaying ? 'pause' : 'play'}
                          size={32}
                          color={sound ? '#1B5E20' : '#666'}
                        />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.controlButton}>
                      <Ionicons name="repeat" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Liste des tafsirs disponibles */}
            <View style={styles.tafsirsList}>
              <Text style={styles.sectionTitle}>Tafsirs disponibles</Text>

              {availableTafsirs.map((tafsir) => (
                <TouchableOpacity
                  key={tafsir.id}
                  style={[
                    styles.tafsirItem,
                    selectedTafsir?.id === tafsir.id && styles.selectedTafsirItem
                  ]}
                  onPress={() => playTafsir(tafsir)}
                >
                  <View style={styles.tafsirIcon}>
                    <Ionicons
                      name="headset"
                      size={20}
                      color={selectedTafsir?.id === tafsir.id ? '#FFFFFF' : '#1B5E20'}
                    />
                  </View>

                  <View style={styles.tafsirContent}>
                    <Text style={[
                      styles.tafsirTitle,
                      selectedTafsir?.id === tafsir.id && styles.selectedTafsirText
                    ]}>
                      {tafsir.title}
                    </Text>
                    <Text style={[
                      styles.tafsirHafiz,
                      selectedTafsir?.id === tafsir.id && styles.selectedTafsirText
                    ]}>
                      {tafsir.hafizName}
                    </Text>
                    <Text style={[
                      styles.tafsirDuration,
                      selectedTafsir?.id === tafsir.id && styles.selectedTafsirText
                    ]}>
                      Durée: {tafsirService.formatDuration(tafsir.duration)}
                    </Text>
                  </View>

                  <Ionicons
                    name={selectedTafsir?.id === tafsir.id && isPlaying ? 'volume-high' : 'play-circle'}
                    size={24}
                    color={selectedTafsir?.id === tafsir.id ? '#FFFFFF' : '#D4AF37'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Information sur les hafiz */}
            {hafizList.length > 0 && (
              <View style={styles.hafizSection}>
                <Text style={styles.sectionTitle}>Hafiz sénégalais</Text>
                <Text style={styles.sectionSubtitle}>
                  Découvrez les érudits qui partagent leurs connaissances en wolof
                </Text>

                {hafizList.filter(h => h.featured).map((hafiz) => (
                  <View key={hafiz.id} style={styles.hafizItem}>
                    <View style={styles.hafizInfo}>
                      <Text style={styles.hafizName}>{hafiz.name}</Text>
                      <Text style={styles.hafizNameArabic}>{hafiz.nameArabic}</Text>
                      <Text style={styles.hafizSpecialization}>{hafiz.specialization}</Text>
                      {hafiz.biography && (
                        <Text style={styles.hafizBiography}>{hafiz.biography}</Text>
                      )}
                    </View>
                    <View style={styles.hafizStats}>
                      <Text style={styles.hafizAudioCount}>
                        {hafiz.audioCount} tafsirs
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="headset" size={48} color="#D4AF37" />
            <Text style={styles.emptyTitle}>Aucun tafsir disponible</Text>
            <Text style={styles.emptyMessage}>
              Nous n&apos;avons pas encore de tafsir en wolof pour cette sourate.
              Nous travaillons à enrichir notre collection.
            </Text>

            <View style={styles.comingSoonContainer}>
              <Text style={styles.comingSoonTitle}>Bientôt disponible:</Text>
              <Text style={styles.comingSoonText}>• Tafsirs des grandes sourates</Text>
              <Text style={styles.comingSoonText}>• Commentaires des versets populaires</Text>
              <Text style={styles.comingSoonText}>• Explications en français</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8F6F0',
    zIndex: 1000,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'serif',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#A5D6A7',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  currentPlayerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  currentTafsirInfo: {
    marginBottom: 20,
  },
  currentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    fontFamily: 'serif',
  },
  currentHafiz: {
    fontSize: 16,
    color: '#D4AF37',
    fontWeight: '600',
    marginTop: 8,
  },
  currentHafizArabic: {
    fontSize: 14,
    color: '#888',
    textAlign: 'right',
    marginTop: 4,
  },
  currentDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 12,
  },
  playerControls: {
    gap: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    minWidth: 40,
    textAlign: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 2,
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  controlButton: {
    padding: 12,
    borderRadius: 24,
    backgroundColor: '#F8F6F0',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  tafsirsList: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 4,
    fontFamily: 'serif',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  tafsirItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedTafsirItem: {
    backgroundColor: '#1B5E20',
  },
  tafsirIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F6F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tafsirContent: {
    flex: 1,
  },
  tafsirTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tafsirHafiz: {
    fontSize: 14,
    color: '#D4AF37',
    marginTop: 4,
  },
  tafsirDuration: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  selectedTafsirText: {
    color: '#FFFFFF',
  },
  hafizSection: {
    marginBottom: 24,
  },
  hafizItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  hafizInfo: {
    flex: 1,
  },
  hafizName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  hafizNameArabic: {
    fontSize: 14,
    color: '#888',
    textAlign: 'right',
    marginTop: 4,
  },
  hafizSpecialization: {
    fontSize: 14,
    color: '#D4AF37',
    marginTop: 8,
    fontWeight: '600',
  },
  hafizBiography: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginTop: 8,
  },
  hafizStats: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  hafizAudioCount: {
    fontSize: 12,
    color: '#1B5E20',
    fontWeight: 'bold',
    backgroundColor: '#F8F6F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  comingSoonContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 12,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});