import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { useAudioPlayer, AudioSource, setAudioModeAsync } from 'expo-audio';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Verse, Surah } from '@/stores/quranStore';
import { useReciterStore } from '@/stores/reciterStore';
import { useAudioNotifications } from '@/hooks/useAudioNotifications';
import { UthmaniText } from './UthmaniText';
import { quranApi } from '@/services/api';
import { simpleSyncService, SimpleTimingData } from '@/services/simpleSyncService';
import { adaptiveSyncService } from '@/services/adaptiveSyncService';
import { precisionSyncService, PrecisionWordTiming } from '@/services/precisionSyncService';
import { repairArabicText } from '@/utils/textUtils';
import { TajweedService } from '@/services/tajweedService';

interface AudioPlayerProps {
  verses: Verse[];
  currentVerseIndex: number;
  onVerseChange: (index: number) => void;
  onVerseHighlight: (verseId: number) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const AudioPlayerSimple: React.FC<AudioPlayerProps> = ({
  verses,
  currentVerseIndex,
  onVerseChange,
  onVerseHighlight,
  isVisible,
  onClose,
}) => {
  const { getSelectedReciter, resetStore } = useReciterStore();
  // Utilisation du hook expo-audio
  const player = useAudioPlayer();
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [surahInfo, setSurahInfo] = useState<Surah | null>(null);
  const [hasFinishedAudio, setHasFinishedAudio] = useState(false);

  // États pour highlight mot par mot avec TAJWEED
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [words, setWords] = useState<string[]>([]);
  const [timingData, setTimingData] = useState<SimpleTimingData | null>(null);
  const [tajweedWords, setTajweedWords] = useState<Array<{
    text: string;
    startTime: number;
    endTime: number;
    tajweedRules: string[];
    color?: string;
  }>>([]);
  const [adaptiveSyncData, setAdaptiveSyncData] = useState<any>(null);
  const [useAdaptiveSync, setUseAdaptiveSync] = useState(false);
  const [usePrecisionSync, setUsePrecisionSync] = useState(false);
  const [precisionWords, setPrecisionWords] = useState<PrecisionWordTiming[]>([]);

  const slideAnim = useRef(new Animated.Value(300)).current;
  const highlightAnim = useRef(new Animated.Value(0)).current;

  const currentVerse = verses[currentVerseIndex];
  const selectedReciter = getSelectedReciter();

  // Animation du player
  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      simpleSyncService.clearCache();
    };
  }, []);

  // Charger l'audio quand le verset change
  useEffect(() => {
    if (verses.length > 0 && currentVerseIndex >= 0) {
      setHasFinishedAudio(false); // Reset flag when changing verse
      loadAudio();
      loadSurahInfo();
      prepareWordHighlighting();
    }
  }, [currentVerseIndex, verses]);

  // Préparer le highlight mot par mot SIMPLIFIÉ
  const prepareWordHighlighting = () => {
    const currentVerse = verses[currentVerseIndex];
    if (!currentVerse) {
      setWords([]);
      setTimingData(null);
      setCurrentWordIndex(-1);
      return;
    }

    console.log('🔧 SIMPLE AUDIO: Preparing words for verse', currentVerse.verse_number);

    const arabicText = currentVerse.text_arabic;
    if (!arabicText) {
      console.log('❌ No Arabic text found');
      setWords([]);
      setTimingData(null);
      return;
    }

    // Réparer le texte arabe et extraction simple des mots
    const repairedText = repairArabicText(arabicText);
    const cleanText = repairedText.trim().replace(/\s{2,}/g, ' ');
    const wordArray = cleanText.split(' ').filter(word => word.trim().length > 0);

    console.log(`📝 TAJWEED AUDIO: Extracted ${wordArray.length} words`);
    setWords(wordArray);
    setCurrentWordIndex(-1);
    setTimingData(null);
    setTajweedWords([]);
    setHasFinishedAudio(false);

    // Reset des services
    simpleSyncService.resetForNewVerse();
    adaptiveSyncService.reset();
    precisionSyncService.reset();
  };

  // Charger les informations de sourate
  const loadSurahInfo = async () => {
    const currentVerse = verses[currentVerseIndex];
    if (!currentVerse) return;

    if (!currentVerse.surah || !currentVerse.surah.name_french) {
      try {
        const surahData = await quranApi.getSurahByNumber(currentVerse.surah_id);
        setSurahInfo(surahData);
      } catch (error) {
        console.error('Error loading surah info:', error);
        setSurahInfo(null);
      }
    } else {
      setSurahInfo(currentVerse.surah);
    }
  };

  const loadAudio = async () => {
    try {
      if (verses.length === 0 || currentVerseIndex < 0) return;

      const verse = verses[currentVerseIndex];
      setIsLoading(true);
      setIsBuffering(true);

      // Arrêter la lecture précédente si nécessaire
      if (player.playing) {
        player.pause();
      }

      // Configuration audio
      await setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        playsInSilentModeIOS: true,
      });

      const selectedReciter = getSelectedReciter();

      // URLs à essayer
      const urlsToTry = [
        `https://cdn.alquran.cloud/media/audio/ayah/${selectedReciter.audioApiId}/${verse.global_number}`,
        `https://cdn.alquran.cloud/media/audio/ayah/ar.alafasy/${verse.global_number}`,
      ];

      console.log(`🎵 Loading audio for verse ${verse.verse_number} (global ${verse.global_number})`);

      let audioLoaded = false;
      for (let i = 0; i < urlsToTry.length; i++) {
        const url = urlsToTry[i];
        try {
          console.log(`Trying URL ${i + 1}: ${url}`);

          // Charger l'audio avec expo-audio
          await player.replace({
            uri: url,
            headers: undefined
          } as AudioSource);

          // Attendre un court délai pour s'assurer que l'audio est chargé
          await new Promise(resolve => setTimeout(resolve, 200));

          // Configurer le player
          player.volume = 1.0;
          player.loop = false;
          // Définir la vitesse de lecture
          player.setPlaybackRate(playbackSpeed);

          console.log(`✅ Success with URL ${i + 1}`);
          audioLoaded = true;
          break;
        } catch (error) {
          console.log(`❌ Failed URL ${i + 1}: ${error}`);
          // Continuer avec l'URL suivante
          continue;
        }
      }

      if (audioLoaded) {
        setIsLoading(false);
        setIsBuffering(false);

        // Démarrer la lecture si autoplay
        if (autoPlay && !manuallyPaused) {
          console.log('🎵 Starting auto-play');
          player.play();
          setIsPlaying(true);
        }

        // Highlight du verset
        onVerseHighlight(verse.id);
      } else {
        setIsLoading(false);
        setIsBuffering(false);
        Alert.alert('Erreur Audio', 'Aucune source audio disponible pour ce verset');
      }
    } catch (error) {
      console.error('Erreur lors du chargement audio:', error);
      setIsLoading(false);
      setIsBuffering(false);
      Alert.alert('Erreur Audio', 'Impossible de charger le fichier audio');
    }
  };

  // Écouter les événements du player expo-audio avec PRECISION SYNC
  useEffect(() => {
    const interval = setInterval(() => {
      if (player.currentTime && player.duration) {
        const currentPos = player.currentTime * 1000; // Convertir en ms
        const currentDur = player.duration * 1000;

        setPosition(currentPos);
        setDuration(currentDur);
        setIsPlaying(player.playing);

        // HIGHLIGHTING BASIQUE - juste basé sur le temps
        if (currentDur > 0 && words.length > 0) {
          const timePerWord = currentDur / words.length;
          const expectedWordIndex = Math.min(
            Math.floor(currentPos / timePerWord),
            words.length - 1
          );

          if (expectedWordIndex !== currentWordIndex && expectedWordIndex >= 0) {
            setCurrentWordIndex(expectedWordIndex);
          }
        }

        // Gérer la fin de lecture (une seule fois par verset)
        if (currentPos >= currentDur - 100 && autoPlay && currentVerseIndex < verses.length - 1 && !hasFinishedAudio) {
          console.log('🔄 Audio finished, moving to next verse');
          setHasFinishedAudio(true);

          setTimeout(() => {
            onVerseChange(currentVerseIndex + 1);
          }, 500);
        }
      }
    }, 16); // 60 FPS pour fluidité maximale

    return () => {
      clearInterval(interval);
    };
  }, [player.playing, words.length, currentVerseIndex, verses.length, autoPlay]);

  // Générer les données de timing TAJWEED respectant les règles de récitation
  const generateTajweedTiming = (audioDuration: number) => {
    if (!currentVerse || words.length === 0 || timingData) {
      console.log('❌ SKIP TAJWEED TIMING GENERATION:', { hasVerse: !!currentVerse, wordsLength: words.length, hasTimingData: !!timingData });
      return;
    }

    console.log(`🕌 GENERATING TAJWEED TIMING for ${words.length} words, duration: ${audioDuration}ms`);

    const arabicText = repairArabicText(currentVerse.text_arabic);

    // Obtenir le style du récitateur (Hafiz vs Qari)
    const reciterStyle = TajweedService.getReciterStyle(selectedReciter.audioApiId);
    console.log(`🎭 Reciter Style: ${reciterStyle.name} (${reciterStyle.category}) - Tajweed Emphasis: ${reciterStyle.tajweedEmphasis}`);

    // Générer le timing avec respect du Tajweed
    const tajweedTimingWords = TajweedService.generateTajweedTiming(
      arabicText,
      audioDuration,
      selectedReciter.audioApiId
    );

    // Convertir au format SimpleTimingData pour compatibilité
    const simpleTimingData: SimpleTimingData = {
      verseId: currentVerse.global_number,
      words: tajweedTimingWords.map((word, index) => ({
        index,
        text: word.text,
        startTime: word.startTime,
        endTime: word.endTime,
        duration: word.endTime - word.startTime,
        weight: 1.0
      })),
      totalDuration: audioDuration,
      averageWordDuration: audioDuration / tajweedTimingWords.length
    };

    setTimingData(simpleTimingData);
    setTajweedWords(tajweedTimingWords);

    console.log(`✅ TAJWEED TIMING GENERATED - ${tajweedTimingWords.length} words with Tajweed rules`);
    tajweedTimingWords.forEach((word, i) => {
      if (word.tajweedRules.length > 0) {
        console.log(`🔸 Word ${i + 1}: "${word.text}" - Rules: [${word.tajweedRules.join(', ')}] - Duration: ${(word.endTime - word.startTime).toFixed(0)}ms`);
      }
    });
  };


  const playPause = () => {
    try {
      if (player.playing) {
        player.pause();
        setIsPlaying(false);
        setManuallyPaused(true);
      } else {
        player.play();
        setIsPlaying(true);
        setManuallyPaused(false);
      }
    } catch (error) {
      console.error('Erreur play/pause:', error);
    }
  };

  const playNextVerse = () => {
    if (currentVerseIndex < verses.length - 1) {
      setManuallyPaused(false);
      onVerseChange(currentVerseIndex + 1);
    }
  };

  const playPreviousVerse = () => {
    if (currentVerseIndex > 0) {
      setManuallyPaused(false);
      onVerseChange(currentVerseIndex - 1);
    }
  };

  const seekToPosition = (value: number) => {
    if (player && duration > 0) {
      try {
        const seekPosition = (value / 100) * duration;
        player.seekTo(seekPosition / 1000); // expo-audio attend des secondes
        setPosition(seekPosition);
      } catch (error) {
        console.error('Erreur seek:', error);
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
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#D4AF37" />
        </TouchableOpacity>
        <View style={styles.reciterInfo}>
          <Text style={styles.reciterName}>{selectedReciter.name}</Text>
          <Text style={styles.reciterNameArabic}>{selectedReciter.nameArabic}</Text>
          {TajweedService.isHafiz(selectedReciter.audioApiId) && (
            <Text style={styles.hafizBadge}>حافظ</Text>
          )}
        </View>
        <View style={styles.verseInfo}>
          <Text style={styles.verseNumber}>
            {surahInfo?.name_french || currentVerse?.surah?.name_french || `Sourate ${currentVerse?.surah_id || ''}`} - V.{currentVerse?.verse_number || 1}
          </Text>
  
        </View>
      </View>

      {/* Affichage du verset avec highlight SIMPLIFIÉ */}
      {currentVerse && words.length > 0 ? (
        <View style={styles.verseContainer}>
          {/* <View style={styles.verseHeader}>
            <Text style={styles.surahName}>
              {surahInfo?.name_french || currentVerse.surah?.name_french || `Sourate ${currentVerse.surah_id}`}
            </Text>
            <Text style={styles.verseNumberText}>Verset {currentVerse.verse_number}</Text>
          </View> */}

          <View style={styles.wordsContainer}>
            {words.map((word, index) => {
              const isCurrentWord = index === currentWordIndex;
              const hasPassedWord = index < currentWordIndex;
              const tajweedWord = tajweedWords[index];
              const tajweedColor = tajweedWord?.color || '#FFFFFF';
              const hasTajweedRules = tajweedWord?.tajweedRules?.length > 0;

              // Debug log for current word
              if (isCurrentWord) {
                console.log(`🔥 RENDERING current word ${index + 1}: "${word}" (currentWordIndex: ${currentWordIndex})`);
              }

              return (
                <TouchableOpacity
                  key={`word-${index}`}
                  activeOpacity={0.8}
                >
                  <Animated.View
                    style={[
                      styles.wordContainer,
                      hasTajweedRules && {
                        borderWidth: 2,
                        borderColor: tajweedColor,
                        backgroundColor: `${tajweedColor}15`, // Couleur avec transparence
                      },
                      isCurrentWord && {
                        backgroundColor: highlightAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [
                            hasTajweedRules ? `${tajweedColor}60` : 'rgba(212, 175, 55, 0.9)',
                            hasTajweedRules ? `${tajweedColor}FF` : 'rgba(255, 193, 7, 1)'
                          ],
                        }),
                        borderWidth: 3,
                        borderColor: highlightAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [
                            hasTajweedRules ? tajweedColor : '#D4AF37',
                            hasTajweedRules ? tajweedColor : '#FFC107'
                          ],
                        }),
                        transform: [{
                          scale: highlightAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.15],
                          }),
                        }],
                        elevation: 8,
                        shadowColor: isCurrentWord ? '#FFC107' : 'transparent',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.8,
                        shadowRadius: 4,
                      },
                      hasPassedWord && styles.passedWord,
                    ]}
                  >
                    <Text
                      style={[
                        styles.wordText,
                        isCurrentWord && styles.currentWordText,
                        hasPassedWord && styles.passedWordText,
                        hasTajweedRules && {
                          color: isCurrentWord ? '#1B5E20' : tajweedColor,
                          fontWeight: 'bold',
                        }
                      ]}
                    >
                      {word}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Barre de progression basique */}
          {currentWordIndex >= 0 && words.length > 0 && (
            <View style={styles.progressIndicator}>
              <View style={[
                styles.progressBar,
                { width: `${((currentWordIndex + 1) / words.length) * 100}%` }
              ]} />
            </View>
          )}
        </View>
      ) : currentVerse ? (
        <View style={styles.noWordsContainer}>
          <Text style={styles.noWordsText}>
            Préparation...
          </Text>
        </View>
      ) : null}

      {/* Contrôles audio */}
      <View style={styles.controls}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Slider
            style={styles.slider}
            value={progressPercent}
            onValueChange={seekToPosition}
            minimumValue={0}
            maximumValue={100}
            minimumTrackTintColor="#D4AF37"
            maximumTrackTintColor="rgba(212, 175, 55, 0.3)"
            disabled={!player || duration === 0}
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        {/* Contrôles de lecture */}
        <View style={styles.playbackControls}>
          <TouchableOpacity
            onPress={playPreviousVerse}
            style={[styles.controlButton, currentVerseIndex === 0 && styles.disabledButton]}
            disabled={currentVerseIndex === 0}
          >
            <Ionicons name="play-skip-back" size={24} color={currentVerseIndex === 0 ? "#666" : "#D4AF37"} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={playPause}
            style={[styles.playButton, isLoading && styles.loadingButton]}
            disabled={isLoading}
          >
            {isLoading || isBuffering ? (
              <Ionicons name="hourglass" size={32} color="#1B5E20" />
            ) : (
              <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#1B5E20" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={playNextVerse}
            style={[styles.controlButton, currentVerseIndex >= verses.length - 1 && styles.disabledButton]}
            disabled={currentVerseIndex >= verses.length - 1}
          >
            <Ionicons name="play-skip-forward" size={24} color={currentVerseIndex >= verses.length - 1 ? "#666" : "#D4AF37"} />
          </TouchableOpacity>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            onPress={() => setAutoPlay(!autoPlay)}
            style={[styles.optionButton, autoPlay && styles.activeOption]}
          >
            <Ionicons name="repeat" size={18} color={autoPlay ? "#FFFFFF" : "#D4AF37"} />
            <Text style={[styles.optionText, autoPlay && styles.activeOptionText]}>Auto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];
              const currentIndex = speeds.indexOf(playbackSpeed);
              const nextIndex = (currentIndex + 1) % speeds.length;
              const newSpeed = speeds[nextIndex];
              setPlaybackSpeed(newSpeed);
              // Changer la vitesse de lecture directement
              if (player) {
                player.setPlaybackRate(newSpeed);
              }
            }}
            style={styles.optionButton}
          >
            <Text style={styles.speedText}>{playbackSpeed}x</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              resetStore();
              simpleSyncService.clearCache();
              Alert.alert('Reset', 'Cache vidé et store réinitialisé.');
            }}
            style={[styles.optionButton, { backgroundColor: '#E91E63' }]}
          >
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={[styles.optionText, { color: '#FFFFFF' }]}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '75%',
    backgroundColor: '#1B5E20',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    padding: 8,
  },
  reciterInfo: {
    flex: 1,
    alignItems: 'center',
  },
  reciterName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  reciterNameArabic: {
    fontSize: 14,
    color: '#A5D6A7',
  },
  hafizBadge: {
    fontSize: 12,
    color: '#D4AF37',
    fontWeight: 'bold',
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
    textAlign: 'center',
  },
  verseInfo: {
    alignItems: 'flex-end',
  },
  verseNumber: {
    fontSize: 14,
    color: '#D4AF37',
    fontWeight: '600',
  },
  verseContainer: {
    backgroundColor: 'rgba(27, 94, 32, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    maxHeight: '60%',
  },
  verseHeader: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.3)',
  },
  surahName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D4AF37',
    textAlign: 'center',
  },
  verseNumberText: {
    fontSize: 14,
    color: '#A5D6A7',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  timingStatus: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 4,
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    writingDirection: 'rtl',
    direction: 'rtl',
  },
  wordContainer: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 2,
    marginVertical: 2,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  wordText: {
    fontSize: 20,
    textAlign: 'center',
    fontFamily: 'serif',
    color: '#FFFFFF',
  },
  currentWordText: {
    color: '#1B5E20',
    fontWeight: 'bold',
    fontSize: 24,
    textShadowColor: '#FFFFFF',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  passedWord: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  passedWordText: {
    color: '#4CAF50',
    opacity: 0.8,
  },
  progressIndicator: {
    height: 2,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    marginTop: 12,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 1,
  },
  noWordsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noWordsText: {
    fontSize: 14,
    color: '#A5D6A7',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  controls: {
    gap: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeText: {
    color: '#A5D6A7',
    fontSize: 12,
    minWidth: 40,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  controlButton: {
    padding: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
  },
  disabledButton: {
    backgroundColor: 'rgba(102, 102, 102, 0.2)',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingButton: {
    backgroundColor: '#888',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    gap: 4,
  },
  activeOption: {
    backgroundColor: '#D4AF37',
  },
  optionText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '600',
  },
  activeOptionText: {
    color: '#FFFFFF',
  },
  speedText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tajweedIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    fontSize: 12,
    color: '#D4AF37',
    fontWeight: 'bold',
  },
  syncStatus: {
    fontSize: 10,
    color: '#A5D6A7',
    textAlign: 'center',
    marginTop: 2,
  },
});