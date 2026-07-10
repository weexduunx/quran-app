import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  ScrollView,
} from 'react-native';
import { useAudioPlayer, AudioSource, setAudioModeAsync } from 'expo-audio';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Verse, Surah } from '@/stores/quranStore';
import { useReciterStore } from '@/stores/reciterStore';
import { useAudioNotifications } from '@/hooks/useAudioNotifications';
import { UthmaniText } from './UthmaniText';
import { quranApi } from '@/services/api';
import { enhancedSyncService, EnhancedWordTiming } from '@/services/enhancedSyncService';
import { repairArabicText } from '@/utils/textUtils';

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

  // États pour highlight mot par mot avec Enhanced Laravel API
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [enhancedWordTimings, setEnhancedWordTimings] = useState<EnhancedWordTiming[]>([]);
  const [currentTimingVerseId, setCurrentTimingVerseId] = useState<number | null>(null);
  const [isLoadingWords, setIsLoadingWords] = useState(false);
  const [wordError, setWordError] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(300)).current;
  const highlightAnim = useRef(new Animated.Value(0)).current;

  // Ref miroir de currentWordIndex : la boucle de polling (setInterval) capture
  // une fermeture qui ne voit jamais les mises à jour de state entre deux
  // recréations de l'effet (dépendances [player.playing, currentVerseIndex, ...]
  // qui n'incluent pas currentWordIndex) — sans ce ref, la comparaison
  // "newWordIndex > currentWordIndex" reste figée à sa valeur initiale (-1)
  // pendant toute la durée du verset, ce qui décale le surlignage par rapport à l'audio.
  const currentWordIndexRef = useRef(-1);
  // Même problème pour enhancedWordTimings/currentTimingVerseId : sans ces refs,
  // la boucle de polling ne "voit" jamais les timings chargés après le début de
  // la lecture (d'où le surlignage qui ne démarre qu'après une pause/reprise,
  // qui recrée l'effet et capture alors l'état à jour).
  const enhancedWordTimingsRef = useRef<EnhancedWordTiming[]>([]);
  const currentTimingVerseIdRef = useRef<number | null>(null);
  // Empêche de redéclencher le chargement des timings plusieurs fois pour le même verset
  const timingsFetchTriggeredRef = useRef<number | null>(null);
  // Scroll automatique vers le mot en cours dans la liste des mots du verset
  const wordsScrollViewRef = useRef<ScrollView>(null);
  const wordLayoutsRef = useRef<{ [index: number]: { y: number; height: number } }>({});

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
      enhancedSyncService.reset();
    };
  }, []);

  // Scroll automatique vers le mot en cours de lecture dans la liste des mots
  useEffect(() => {
    if (currentWordIndex < 0) return;

    const layout = wordLayoutsRef.current[currentWordIndex];
    if (!layout) return;

    // Centrer approximativement le mot dans la zone visible du ScrollView
    const targetY = Math.max(0, layout.y - (styles.wordsScrollView.maxHeight / 2) + layout.height / 2);
    wordsScrollViewRef.current?.scrollTo({ y: targetY, animated: true });
  }, [currentWordIndex]);

  // Charger l'audio quand le verset change
  useEffect(() => {
    if (verses.length > 0 && currentVerseIndex >= 0) {
      setHasFinishedAudio(false); // Reset flag when changing verse
      loadAudio();
      loadSurahInfo();
      prepareWordSynchronization();
    }
  }, [currentVerseIndex, verses]);

  // Préparer la synchronisation mot par mot avec Enhanced Laravel API
  const prepareWordSynchronization = async () => {
    const currentVerse = verses[currentVerseIndex];
    if (!currentVerse) {
      setEnhancedWordTimings([]);
      enhancedWordTimingsRef.current = [];
      setCurrentWordIndex(-1);
      currentWordIndexRef.current = -1;
      setCurrentTimingVerseId(null);
      currentTimingVerseIdRef.current = null;
      setWordError(null);
      return;
    }

    console.log('🔧 LARAVEL ENHANCED: Preparing word sync for verse', currentVerse.verse_number);

    // Reset pour nouveau verset
    setCurrentWordIndex(-1);
    currentWordIndexRef.current = -1;
    timingsFetchTriggeredRef.current = null;
    wordLayoutsRef.current = {};
    setEnhancedWordTimings([]);
    enhancedWordTimingsRef.current = [];
    setCurrentTimingVerseId(null);
    currentTimingVerseIdRef.current = null;
    setWordError(null);
    setHasFinishedAudio(false);

    // Remonter la liste des mots en haut pour le nouveau verset
    wordsScrollViewRef.current?.scrollTo({ y: 0, animated: false });

    // Reset du service Enhanced
    enhancedSyncService.reset();
  };

  // Charger les données de timing Enhanced depuis l'API Laravel
  const loadEnhancedWordTimings = async (verse: Verse, audioDuration: number) => {
    try {
      setIsLoadingWords(true);
      setWordError(null);

      console.log(`🌐 LARAVEL ENHANCED: Loading word timings for verse ${verse.global_number}`);

      const selectedReciter = getSelectedReciter();

      // Extraire les mots depuis le texte arabe du verset (fallback si pas de données package)
      const arabicText = repairArabicText(verse.text_arabic);
      const wordArray = arabicText.trim().split(' ').filter(word => word.trim().length > 0);

      const packageWords = wordArray.map((word, index) => ({
        id: index + 1, // ID temporaire basé sur la position
        text: word,
        position: index + 1,
        char_type_name: 'word', // Type par défaut
        translation: {
          text: '' // Traduction vide pour l'instant
        },
        transliteration: {
          text: '' // Translittération vide pour l'instant
        }
      }));

      // Utiliser l'Enhanced Service pour récupérer les timings précis
      const timings = await enhancedSyncService.getEnhancedTimingData(
        verse.global_number,
        selectedReciter.audioApiId,
        packageWords,
        Math.round(audioDuration) // Convert float to integer for Laravel validation
      );

      if (timings && timings.length > 0) {
        setEnhancedWordTimings(timings);
        enhancedWordTimingsRef.current = timings;
        setCurrentTimingVerseId(verse.global_number);
        currentTimingVerseIdRef.current = verse.global_number;
        console.log(`✅ LARAVEL ENHANCED: Loaded ${timings.length} word timings`);
      } else {
        setWordError('Aucune donnée de timing trouvée');
        console.warn('❌ LARAVEL ENHANCED: No timing data received');
      }

    } catch (error) {
      console.error('❌ LARAVEL ENHANCED: Error loading word timings:', error);
      setWordError(`Erreur: ${error.message}`);
    } finally {
      setIsLoadingWords(false);
    }
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

        // Le chargement des timings est déclenché par la boucle de polling
        // dès que player.duration est disponible (voir useEffect plus bas) :
        // pas besoin d'attendre ici, ça évite un délai fixe qui désynchronise
        // le surlignage par rapport à l'audio déjà en train de jouer.
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

        // Déclencher le chargement des timings dès que la durée réelle de l'audio
        // est connue, plutôt que d'attendre un délai fixe : évite que le verset
        // ait déjà bien avancé avant que le surlignage ne démarre.
        if (
          currentDur > 0 &&
          currentVerse &&
          timingsFetchTriggeredRef.current !== currentVerse.global_number
        ) {
          timingsFetchTriggeredRef.current = currentVerse.global_number;
          loadEnhancedWordTimings(currentVerse, currentDur);
        }

        // HIGHLIGHTING avec Enhanced Laravel API
        // On utilise les refs (toujours à jour) et non les states directement :
        // cet effet n'est pas recréé quand enhancedWordTimings/currentTimingVerseId
        // changent (pas dans le tableau de dépendances), donc les states capturés
        // dans cette fermeture resteraient figés à leur valeur du début de lecture.
        if (
          currentDur > 0 &&
          enhancedWordTimingsRef.current.length > 0 &&
          currentTimingVerseIdRef.current === currentVerse.global_number
        ) {

          // Utiliser le service Enhanced Laravel pour trouver le mot actuel
          const selectedReciter = getSelectedReciter();

          // Utiliser une fonction async non-bloquante
          enhancedSyncService.getCurrentWord(
            currentVerse.global_number,
            selectedReciter.audioApiId,
            currentPos,
            [], // packageWords - sera géré côté backend
            Math.round(currentDur) // Convert float to integer for Laravel validation
          ).then(result => {
            // PROGRESSION MONOTONE: Avancer seulement, jamais reculer (comme QuranWBW.com)
            // On compare contre currentWordIndexRef (toujours à jour) et non contre
            // currentWordIndex (figé dans la fermeture de cet effet)
            const newWordIndex = result.currentWordIndex;

            if (newWordIndex >= 0 && newWordIndex !== currentWordIndexRef.current) {
              // Logging occasionnel pour éviter le spam
              if (Math.random() < 0.1) {
                console.log(`🎯 LARAVEL ENHANCED: → Word ${newWordIndex + 1}/${result.totalWords} at ${currentPos.toFixed(0)}ms`);
                if (result.currentWord) {
                  console.log(`   Word: "${result.currentWord.arabic_text}" [${(result.currentWord.confidence * 100).toFixed(0)}% conf]`);
                }
              }
              currentWordIndexRef.current = newWordIndex;
              setCurrentWordIndex(newWordIndex);
            }
          }).catch(error => {
            // Fallback simple si l'API échoue
            console.warn('Enhanced API failed, using simple timing:', error);
          });
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
    }, 100); // 10 FPS comme timing optimal pour apprentissage

    return () => {
      clearInterval(interval);
    };
  }, [player.playing, currentVerseIndex, verses.length, autoPlay]); // Supprimé quranComWords.length pour éviter la régénération



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
        </View>
        <View style={styles.verseInfo}>
          <Text style={styles.verseNumber}>
            {surahInfo?.name_french || currentVerse?.surah?.name_french || `Sourate ${currentVerse?.surah_id || ''}`} - V.{currentVerse?.verse_number || 1}
          </Text>
  
        </View>
      </View>

      {/* Affichage du verset avec highlight ENHANCED LARAVEL */}
      {currentVerse && enhancedWordTimings.length > 0 ? (
        <View style={styles.verseContainer}>
          <ScrollView
            ref={wordsScrollViewRef}
            style={styles.wordsScrollView}
            contentContainerStyle={styles.wordsContainer}
            showsVerticalScrollIndicator={true}
          >
            {enhancedWordTimings.map((wordTiming, index) => {
              const word = wordTiming.arabic_text;
              const isCurrentWord = index === currentWordIndex;
              const hasPassedWord = index < currentWordIndex;

              const hasTranslation = wordTiming?.translation?.length > 0;
              const hasTransliteration = wordTiming?.transliteration?.length > 0;
              const hasTiming = true; // Toujours vrai pour Enhanced

              // Debug log for current word
              if (isCurrentWord) {
                console.log(`🔥 RENDERING current word ${index + 1}: "${word}" (currentWordIndex: ${currentWordIndex})`);
              }

              return (
                <TouchableOpacity
                  key={`word-${index}`}
                  activeOpacity={0.8}
                  onLayout={(e) => {
                    const { y, height } = e.nativeEvent.layout;
                    wordLayoutsRef.current[index] = { y, height };
                  }}
                >
                  <Animated.View
                    style={[
                      styles.wordContainer,
                      isCurrentWord && {
                        backgroundColor: highlightAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['rgba(212, 175, 55, 0.9)', 'rgba(255, 193, 7, 1)'],
                        }),
                        borderWidth: 3,
                        borderColor: highlightAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['#D4AF37', '#FFC107'],
                        }),
                        transform: [{
                          scale: highlightAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.15],
                          }),
                        }],
                        elevation: 8,
                        shadowColor: '#FFC107',
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
                      ]}
                    >
                      {word}
                    </Text>

                    {/* Affichage de la translittération si disponible */}
                    {hasTransliteration && (
                      <Text style={[
                        styles.transliterationText,
                        isCurrentWord && styles.currentTransliterationText
                      ]}>
                        {wordTiming.transliteration}
                      </Text>
                    )}
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Barre de progression basique */}
          {currentWordIndex >= 0 && enhancedWordTimings.length > 0 && (
            <View style={styles.progressIndicator}>
              <View style={[
                styles.progressBar,
                { width: `${((currentWordIndex + 1) / enhancedWordTimings.length) * 100}%` }
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
              enhancedSyncService.clearCache();
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
    overflow: 'hidden',
  },
  wordsScrollView: {
    maxHeight: 220,
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
  // Styles pour le mode amélioré avec package @kmaslesa
  enhancedModeIndicator: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  enhancedModeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 6,
  },
  enhancedInfoText: {
    fontSize: 10,
    color: '#81C784',
    marginTop: 2,
    textAlign: 'center',
  },
  transliterationText: {
    fontSize: 9,
    color: '#A5D6A7',
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },
  currentTransliterationText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  enhancedTranslationText: {
    fontSize: 8,
    color: '#81C784',
    textAlign: 'center',
    marginTop: 1,
    maxWidth: 60,
  },
  currentEnhancedTranslationText: {
    color: '#1B5E20',
    fontWeight: '600',
  },
  timingIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  specialTypeIndicator: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialTypeText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});