import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Verse, Surah } from '@/stores/quranStore';
import { useReciterStore } from '@/stores/reciterStore';
import { useAudioNotifications } from '@/hooks/useAudioNotifications';
import { UthmaniText } from './UthmaniText';
import { quranApi } from '@/services/api';
import { quranSyncService, VerseWithTiming, WordTimingData } from '@/services/quranSyncService';

interface AudioPlayerProps {
  verses: Verse[];
  currentVerseIndex: number;
  onVerseChange: (index: number) => void;
  onVerseHighlight: (verseId: number) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  verses,
  currentVerseIndex,
  onVerseChange,
  onVerseHighlight,
  isVisible,
  onClose,
}) => {
  const { getSelectedReciter, resetStore } = useReciterStore();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [nextSound, setNextSound] = useState<Audio.Sound | null>(null); // Préchargement
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [seamlessMode, setSeamlessMode] = useState(true); // Mode lecture continue
  const [surahInfo, setSurahInfo] = useState<Surah | null>(null); // Informations de sourate

  // États pour highlight mot par mot avec service de synchronisation Quran Foundation
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [words, setWords] = useState<string[]>([]);
  const [verseTimingData, setVerseTimingData] = useState<VerseWithTiming | null>(null);
  const [timingDataLoading, setTimingDataLoading] = useState(false);

  // Refs pour contrôler les transitions
  const hasFinishedRef = useRef(false);
  const lastProcessedVerseRef = useRef(-1);
  const isTransitioningRef = useRef(false);

  const slideAnim = useRef(new Animated.Value(300)).current;
  const highlightAnim = useRef(new Animated.Value(0)).current;

  // Configuration des notifications audio
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
      if (sound) {
        sound.unloadAsync();
      }
      if (nextSound) {
        nextSound.unloadAsync();
      }
    };
  }, [sound, nextSound]);

  // Charger l'audio quand le verset change
  useEffect(() => {
    if (verses.length > 0 && currentVerseIndex >= 0) {
      console.log(`Loading verse ${currentVerseIndex + 1}`);
      loadAudio();
      loadSurahInfo();
      prepareWordHighlighting();
    }
  }, [currentVerseIndex, verses]);

  // Préparer le highlight mot par mot avec service Quran Foundation
  const prepareWordHighlighting = async () => {
    const currentVerse = verses[currentVerseIndex];
    if (!currentVerse) return;

    console.log('🎯 AUDIO PLAYER: Preparing word highlighting with Quran Foundation API for verse', currentVerse.verse_number);
    setTimingDataLoading(true);

    try {
      const selectedReciter = getSelectedReciter();
      const verseKey = `${currentVerse.surah_id}:${currentVerse.verse_number}`;

      // Récupérer les données depuis Quran Foundation API avec timing
      const timingData = await quranSyncService.getVerseWithTiming(
        verseKey,
        parseInt(selectedReciter.audioApiId) || 7 // Fallback vers Mishary Alafasy
      );

      console.log(`✅ AUDIO PLAYER: Loaded ${timingData.source} data with ${timingData.words.length} words from Quran Foundation`);

      // Mettre à jour les états
      setVerseTimingData(timingData);
      setWords(timingData.words.map(w => w.arabicText));
      setCurrentWordIndex(-1);

    } catch (error) {
      console.error('❌ Error loading timing data from Quran Foundation:', error);

      // Fallback vers l'ancienne méthode basique
      const arabicText = currentVerse.text_uthmani || currentVerse.text_arabic;
      if (arabicText) {
        const cleanText = arabicText.trim().replace(/\s{2,}/g, ' ');
        const wordArray = cleanText.split(' ').filter(word => word.trim().length > 0);

        setWords(wordArray);
        setVerseTimingData(null);
        console.log('⚠️ AUDIO PLAYER: Fallback to basic word extraction');
      }
    } finally {
      setTimingDataLoading(false);
    }
  };

  // Charger les informations de sourate si elles manquent
  const loadSurahInfo = async () => {
    const currentVerse = verses[currentVerseIndex];
    if (!currentVerse) return;

    // Si le verset n'a pas d'info de sourate complète, la récupérer
    if (!currentVerse.surah || !currentVerse.surah.name_french) {
      try {
        console.log('🔍 Fetching surah info for surah_id:', currentVerse.surah_id);
        const surahData = await quranApi.getSurahByNumber(currentVerse.surah_id);
        setSurahInfo(surahData);
        console.log('✅ SURAH INFO: Loaded', surahData.name_french, '(' + surahData.name_arabic + ')');
      } catch (error) {
        console.error('❌ Error loading surah info:', error);
        setSurahInfo(null);
      }
    } else {
      setSurahInfo(currentVerse.surah);
    }
  };


  const tryLoadAudioFromUrls = async (verse: Verse, urlList: string[]): Promise<Audio.Sound | null> => {
    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i];
      console.log(`Trying URL ${i + 1}/${urlList.length}: ${url}`);

      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: url },
          {
            shouldPlay: false,
            isLooping: false,
            volume: 1.0,
            rate: playbackSpeed,
            progressUpdateIntervalMillis: 100, // Mise à jour toutes les 100ms pour synchronisation précise
          },
          onPlaybackStatusUpdate
        );

        // Test si le son se charge correctement
        const status = await newSound.getStatusAsync();
        if (status.isLoaded) {
          console.log(`✅ Success with URL ${i + 1}: ${url}`);
          return newSound;
        } else {
          console.log(`❌ Failed to load URL ${i + 1}`);
          await newSound.unloadAsync();
        }
      } catch (error) {
        console.log(`❌ Error with URL ${i + 1}: ${error}`);
      }
    }
    return null;
  };

  // Fonction pour précharger le verset suivant
  const preloadNextVerse = async () => {
    if (!seamlessMode || currentVerseIndex >= verses.length - 1 || nextSound) return;

    const nextVerse = verses[currentVerseIndex + 1];
    const selectedReciter = getSelectedReciter();

    const urlsToTry = [
      `https://cdn.alquran.cloud/media/audio/ayah/${selectedReciter.audioApiId}/${nextVerse.global_number}`,
      `https://cdn.alquran.cloud/media/audio/ayah/ar.alafasy/${nextVerse.global_number}`,
    ];

    try {
      console.log(`Preloading next verse ${nextVerse.verse_number} (global ${nextVerse.global_number})`);

      for (const url of urlsToTry) {
        try {
          const { sound: preloadedSound } = await Audio.Sound.createAsync(
            { uri: url },
            {
              shouldPlay: false,
              isLooping: false,
              volume: 1.0,
              progressUpdateIntervalMillis: 100 // Même fréquence pour la cohérence
            }
          );

          const status = await preloadedSound.getStatusAsync();
          if (status.isLoaded) {
            console.log(`✅ Next verse preloaded: ${nextVerse.verse_number}`);
            setNextSound(preloadedSound);
            return;
          } else {
            await preloadedSound.unloadAsync();
          }
        } catch (error) {
          console.log(`Failed to preload from ${url}:`, error);
        }
      }
    } catch (error) {
      console.error('Error preloading next verse:', error);
    }
  };

  const loadAudio = async () => {
    try {
      if (verses.length === 0 || currentVerseIndex < 0) return;

      const verse = verses[currentVerseIndex];

      setIsLoading(true);
      setIsBuffering(true);

      // Décharger l'ancien son
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

      // Utiliser l'API originale qui fonctionnait avec quran:sync
      const selectedReciter = getSelectedReciter();

      // Format API Al-Quran.cloud qui était utilisé avant
      const urlsToTry = [
        // Format principal: surah/verse avec l'édition du récitateur
        `https://cdn.alquran.cloud/media/audio/ayah/${selectedReciter.audioApiId}/${verse.global_number}`,

        // Format alternatif si le principal échoue
        `https://cdn.alquran.cloud/media/audio/ayah/ar.alafasy/${verse.global_number}`,

        // Autre format de l'API
        `https://api.alquran.cloud/v1/ayah/${verse.global_number}/ar.alafasy/audio`,
      ];

      console.log(`Trying to load audio for verse ${verse.verse_number} (global ${verse.global_number})`);

      const newSound = await tryLoadAudioFromUrls(verse, urlsToTry);

      if (newSound) {
        setSound(newSound);
        setIsLoading(false);
        setIsBuffering(false);

        // Démarrer la lecture si autoplay est activé et pas manuellement en pause
        if (autoPlay && !manuallyPaused) {
          console.log('Starting auto-play...');
          await newSound.playAsync();
          setIsPlaying(true);
        }
      } else {
        setIsLoading(false);
        setIsBuffering(false);
        Alert.alert('Erreur Audio', 'Aucune source audio disponible pour ce verset');
        return;
      }

      // Highlight du verset
      onVerseHighlight(verse.id);

      // Animation de surlignage
      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.delay(2000),
        Animated.timing(highlightAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: false,
        }),
      ]).start();

    } catch (error) {
      console.error('Erreur lors du chargement audio:', error);
      setIsLoading(false);
      setIsBuffering(false);
      Alert.alert('Erreur Audio', 'Impossible de charger le fichier audio');
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      const currentPos = status.positionMillis || 0;
      const currentDur = status.durationMillis || 0;

      setPosition(currentPos);
      setDuration(currentDur);
      setIsBuffering(status.isBuffering || false);
      setIsPlaying(status.isPlaying || false);

      // Mettre à jour le highlight mot par mot avec service avancé
      if (status.isPlaying && verseTimingData && verseTimingData.words.length > 0) {
        updateAdvancedWordHighlight(currentPos);
      } else if (status.isPlaying && words.length > 0 && !verseTimingData) {
        // Fallback vers l'ancienne méthode si pas de données de timing
        updateBasicWordHighlight(currentPos, currentDur);
      }

      // Précharger le verset suivant
      const progressPercent = currentDur > 0 ? (currentPos / currentDur) * 100 : 0;

      if (seamlessMode &&
          progressPercent > 80 &&
          !nextSound &&
          currentVerseIndex < verses.length - 1) {
        preloadNextVerse();
      }

      // Gérer la fin de lecture avec transition fluide
      if (status.didJustFinish &&
          autoPlay &&
          !isTransitioningRef.current &&
          !hasFinishedRef.current) {

        console.log(`Audio finished for verse ${currentVerseIndex + 1}`);
        hasFinishedRef.current = true;
        isTransitioningRef.current = true;

        if (currentVerseIndex < verses.length - 1) {
          // Transition fluide vers le verset suivant
          handleSeamlessTransition();
        } else {
          console.log('Reached end of surah');
          setIsPlaying(false);
          hasFinishedRef.current = false;
          isTransitioningRef.current = false;
        }
      }
    } else if (status.error) {
      console.error('Erreur de lecture:', status.error);
      setIsPlaying(false);
      setIsBuffering(false);
      Alert.alert('Erreur', 'Erreur lors de la lecture audio');
    }
  };

  // Mettre à jour le highlight avec le service Quran Foundation
  const updateAdvancedWordHighlight = (currentTime: number) => {
    if (!verseTimingData) return;

    const activeWordIndex = quranSyncService.findCurrentWord(verseTimingData, currentTime);

    if (activeWordIndex !== -1 && activeWordIndex !== currentWordIndex) {
      const currentWord = verseTimingData.words[activeWordIndex];
      const sourceText = verseTimingData.source === 'api' ? 'API' : 'Local';

      console.log(`🎯 AUDIO PLAYER: [${sourceText}] Highlighting word ${activeWordIndex + 1}: "${currentWord?.arabicText}" at ${currentTime}ms (confidence: ${Math.round((currentWord?.confidence || 0) * 100)}%)`);

      setCurrentWordIndex(activeWordIndex);

      // Animation de highlight
      const animationDuration = 200;

      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: false,
        }),
        Animated.timing(highlightAnim, {
          toValue: currentWord?.tajweedInfo?.type === 'emphasis' ? 0.6 : 0.4,
          duration: animationDuration * 0.7,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  // Fallback : Mettre à jour le highlight avec l'ancienne méthode
  const updateBasicWordHighlight = (currentTime: number, totalDuration: number) => {
    if (words.length === 0 || totalDuration === 0) return;

    const timePerWord = totalDuration / words.length;
    const activeWordIndex = Math.floor(currentTime / timePerWord);
    const clampedIndex = Math.min(activeWordIndex, words.length - 1);

    if (clampedIndex !== currentWordIndex && clampedIndex >= 0) {
      console.log(`🎯 AUDIO PLAYER: [basic] Highlighting word ${clampedIndex + 1}: "${words[clampedIndex]}" at ${currentTime}ms`);
      setCurrentWordIndex(clampedIndex);

      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(highlightAnim, {
          toValue: 0.3,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  // Reset du highlight quand l'audio s'arrête
  useEffect(() => {
    if (!isPlaying) {
      setCurrentWordIndex(-1);
    }
  }, [isPlaying]);

  // Fonction pour la transition fluide entre versets
  const handleSeamlessTransition = async () => {
    try {
      if (nextSound && seamlessMode) {
        console.log('🎵 Starting seamless transition to next verse...');

        // Vérifier que le son suivant est prêt avant d'essayer de le jouer
        const nextSoundStatus = await nextSound.getStatusAsync();

        if (!nextSoundStatus.isLoaded || nextSoundStatus.error) {
          console.log('❌ Next sound is not loaded properly, falling back to normal transition');
          throw new Error('Next sound not ready');
        }

        console.log('✅ SEAMLESS: Next sound is loaded, starting seamless playback...');

        // Transition simple et fiable
        await nextSound.playAsync();

        // Remplacer le son actuel
        if (sound) {
          await sound.unloadAsync();
        }
        setSound(nextSound);
        setNextSound(null);

        // Mettre à jour l'index sans interruption
        onVerseChange(currentVerseIndex + 1);

        // Reset des flags
        setTimeout(() => {
          hasFinishedRef.current = false;
          isTransitioningRef.current = false;
        }, 100);
      } else {
        // Fallback vers la méthode normale si pas de préchargement
        setTimeout(() => {
          onVerseChange(currentVerseIndex + 1);
          setTimeout(() => {
            hasFinishedRef.current = false;
            isTransitioningRef.current = false;
          }, 500);
        }, 100);
      }
    } catch (error) {
      console.error('Error in seamless transition:', error);

      // Nettoyer le nextSound défaillant
      if (nextSound) {
        try {
          await nextSound.unloadAsync();
        } catch (cleanupError) {
          console.error('Error cleaning up failed nextSound:', cleanupError);
        }
        setNextSound(null);
      }

      // Fallback vers la méthode normale
      console.log('Using fallback normal transition...');
      setTimeout(() => {
        onVerseChange(currentVerseIndex + 1);
        setTimeout(() => {
          hasFinishedRef.current = false;
          isTransitioningRef.current = false;
        }, 500);
      }, 100);
    }
  };

  const playPause = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        console.log('Pausing audio...');
        await sound.pauseAsync();
        setIsPlaying(false);
        setManuallyPaused(true);
      } else {
        console.log('Playing audio...');
        await sound.playAsync();
        setIsPlaying(true);
        setManuallyPaused(false);
      }
    } catch (error) {
      console.error('Erreur play/pause:', error);
    }
  };

  const playNextVerse = () => {
    if (currentVerseIndex < verses.length - 1) {
      console.log(`Manual next: ${currentVerseIndex + 1} -> ${currentVerseIndex + 2}`);
      setManuallyPaused(false);
      onVerseChange(currentVerseIndex + 1);
    }
  };

  const playPreviousVerse = () => {
    if (currentVerseIndex > 0) {
      console.log(`Manual previous: ${currentVerseIndex + 1} -> ${currentVerseIndex}`);
      setManuallyPaused(false);
      onVerseChange(currentVerseIndex - 1);
    }
  };

  const seekToPosition = async (value: number) => {
    if (sound && duration > 0) {
      try {
        const seekPosition = (value / 100) * duration;
        await sound.setPositionAsync(seekPosition);
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

  // Configuration des notifications audio
  const { showNotification, hideNotification } = useAudioNotifications({
    currentVerse,
    currentReciter: selectedReciter,
    isPlaying: isPlaying,
    currentTime: position,
    duration: duration,
    onPlayPause: playPause,
    onNext: playNextVerse,
    onPrevious: playPreviousVerse,
    onStop: () => {
      if (sound) {
        sound.pauseAsync();
      }
      setIsPlaying(false);
      onClose();
    },
  });

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
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
          {surahInfo?.name_arabic && (
            <Text style={styles.surahNameArabic}>
              {surahInfo.name_arabic}
            </Text>
          )}
        </View>
      </View>

      {/* Affichage du verset avec highlight mot par mot avancé */}
      {currentVerse && words.length > 0 ? (
        <View style={styles.verseContainer}>
          <View style={styles.verseHeader}>
            <Text style={styles.surahName}>
              {surahInfo?.name_french || currentVerse.surah?.name_french || `Sourate ${currentVerse.surah_id}`}
            </Text>
            <View style={styles.verseMetaContainer}>
              <Text style={styles.verseNumberText}>Verset {currentVerse.verse_number}</Text>
              {verseTimingData && (
                <View style={styles.timingIndicator}>
                  <Text style={[
                    styles.timingSourceText,
                    verseTimingData.source === 'quran-align' && styles.preciseTimingText
                  ]}>
                    {verseTimingData.source === 'quran-align' ? '🎯 Précis' : '⚡ Estimé'}
                    ({Math.round(verseTimingData.accuracy * 100)}%)
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.wordsContainer}>
            {words.map((word, index) => {
              const isCurrentWord = index === currentWordIndex;
              const hasPassedWord = index < currentWordIndex;
              const isUpcomingWord = !hasPassedWord && !isCurrentWord;
              const wordTiming = verseTimingData?.words[index];
              const tajweedType = wordTiming?.tajweedInfo?.type;

              return (
                <Animated.View
                  key={`word-${index}`}
                  style={[
                    styles.wordContainer,
                    isCurrentWord && {
                      backgroundColor: highlightAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          tajweedType === 'emphasis' ? 'rgba(255, 152, 0, 0.8)' : 'rgba(212, 175, 55, 0.8)',
                          tajweedType === 'emphasis' ? 'rgba(255, 152, 0, 1)' : 'rgba(212, 175, 55, 1)'
                        ],
                      }),
                      transform: [{
                        scale: highlightAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, tajweedType === 'emphasis' ? 1.15 : 1.1],
                        }),
                      }],
                    },
                    hasPassedWord && styles.passedWord,
                    isUpcomingWord && styles.upcomingWord,
                    tajweedType === 'prolongation' && styles.prolongationWord,
                    tajweedType === 'pause' && styles.pauseWord,
                  ]}
                >
                  <Text
                    style={[
                      styles.wordText,
                      isCurrentWord && styles.currentWordText,
                      hasPassedWord && styles.passedWordText,
                      isUpcomingWord && styles.upcomingWordText,
                      tajweedType === 'emphasis' && styles.emphasisWordText,
                    ]}
                  >
                    {word}
                  </Text>
                  {/* Indicateur de confiance pour le mode debug */}
                  {__DEV__ && wordTiming && isCurrentWord && (
                    <Text style={styles.confidenceText}>
                      {Math.round((wordTiming.confidence || 0) * 100)}%
                    </Text>
                  )}
                </Animated.View>
              );
            })}
          </View>

          {/* Indicateur de progression du verset */}
          {verseTimingData && currentWordIndex >= 0 && (
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
            {timingDataLoading ? 'Chargement des données de synchronisation...' : 'Préparation du highlight...'}
          </Text>
          {timingDataLoading && (
            <ActivityIndicator size="small" color="#D4AF37" style={{ marginTop: 8 }} />
          )}
        </View>
      ) : (
        <View style={styles.noVerseContainer}>
          <Text style={styles.noVerseText}>Aucun verset disponible</Text>
        </View>
      )}

      {/* Contrôles audio */}
      <View style={styles.controls}>
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
            thumbStyle={styles.sliderThumb}
            disabled={!sound || duration === 0}
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

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

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            onPress={() => setAutoPlay(!autoPlay)}
            style={[styles.optionButton, autoPlay && styles.activeOption]}
          >
            <Ionicons name="repeat" size={18} color={autoPlay ? "#FFFFFF" : "#D4AF37"} />
            <Text style={[styles.optionText, autoPlay && styles.activeOptionText]}>Auto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSeamlessMode(!seamlessMode)}
            style={[styles.optionButton, seamlessMode && styles.activeOption]}
          >
            <Ionicons name="musical-notes" size={18} color={seamlessMode ? "#FFFFFF" : "#D4AF37"} />
            <Text style={[styles.optionText, seamlessMode && styles.activeOptionText]}>Continu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];
              const currentIndex = speeds.indexOf(playbackSpeed);
              const nextIndex = (currentIndex + 1) % speeds.length;
              const newSpeed = speeds[nextIndex];
              setPlaybackSpeed(newSpeed);
              if (sound) {
                sound.setRateAsync(newSpeed, true);
              }
            }}
            style={styles.optionButton}
          >
            <Text style={styles.speedText}>{playbackSpeed}x</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              console.log('Resetting reciter store...');
              resetStore();
              Alert.alert('Store Reset', 'Reciter store has been reset. Try playing again.');
            }}
            style={[styles.optionButton, { backgroundColor: '#E91E63' }]}
          >
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={[styles.optionText, { color: '#FFFFFF' }]}>Reset</Text>
          </TouchableOpacity>
        </View>

        {isBuffering && (
          <View style={styles.bufferingContainer}>
            <Text style={styles.bufferingText}>Chargement en cours...</Text>
          </View>
        )}
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
    maxHeight: '75%', // Limiter la hauteur du modal
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
  verseInfo: {
    alignItems: 'flex-end',
  },
  verseNumber: {
    fontSize: 14,
    color: '#D4AF37',
    fontWeight: '600',
  },
  surahNameArabic: {
    fontSize: 12,
    color: '#A5D6A7',
    textAlign: 'right',
    marginTop: 2,
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
  sliderThumb: {
    backgroundColor: '#D4AF37',
    width: 20,
    height: 20,
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
  bufferingContainer: {
    alignItems: 'center',
  },
  bufferingText: {
    color: '#A5D6A7',
    fontSize: 14,
  },
  noVerseContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
  },
  noVerseText: {
    color: '#A5D6A7',
    fontSize: 16,
    textAlign: 'center',
  },
  // Styles pour le highlight mot par mot intégré
  verseContainer: {
    backgroundColor: 'rgba(27, 94, 32, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    maxHeight: '60%', // Limiter la hauteur
  },
  verseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.3)',
  },
  surahName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D4AF37',
    flex: 1,
  },
  verseNumberText: {
    fontSize: 14,
    color: '#A5D6A7',
    fontWeight: '600',
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
    fontSize: 22,
  },
  passedWord: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  passedWordText: {
    color: '#4CAF50',
    opacity: 0.8,
  },
  upcomingWord: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  upcomingWordText: {
    color: '#FFFFFF',
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
  // Nouveaux styles pour synchronisation avancée
  verseMetaContainer: {
    alignItems: 'flex-end',
  },
  timingIndicator: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
  },
  timingSourceText: {
    fontSize: 10,
    color: '#D4AF37',
    fontWeight: '600',
  },
  preciseTimingText: {
    color: '#4CAF50',
  },
  prolongationWord: {
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.5)',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  pauseWord: {
    borderWidth: 2,
    borderColor: 'rgba(255, 152, 0, 0.5)',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
  },
  emphasisWordText: {
    fontWeight: 'bold',
    fontSize: 22,
  },
  confidenceText: {
    position: 'absolute',
    top: -8,
    right: -8,
    fontSize: 8,
    color: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
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
});