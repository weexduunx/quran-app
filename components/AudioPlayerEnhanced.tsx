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
import { quranApi } from '@/services/api';
import wordByWordService, { EnhancedWord } from '@/services/wordByWordService';
import { enhancedSyncService, EnhancedWordTiming } from '@/services/enhancedSyncService';
import { repairArabicText } from '@/utils/textUtils';
import { UthmaniText } from './UthmaniText';

interface AudioPlayerProps {
  verses: Verse[];
  currentVerseIndex: number;
  onVerseChange: (index: number) => void;
  onVerseHighlight: (verseId: number) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const AudioPlayerEnhanced: React.FC<AudioPlayerProps> = ({
  verses,
  currentVerseIndex,
  onVerseChange,
  onVerseHighlight,
  isVisible,
  onClose,
}) => {
  const { getSelectedReciter, resetStore } = useReciterStore();
  const player = useAudioPlayer();

  // Basic audio states
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

  // Enhanced word-by-word states
  const [enhancedWords, setEnhancedWords] = useState<EnhancedWord[]>([]);
  const [preciseTimingData, setPreciseTimingData] = useState<EnhancedWordTiming[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isLoadingWords, setIsLoadingWords] = useState(false);
  const [wordError, setWordError] = useState<string | null>(null);
  const [useEnhancedSync, setUseEnhancedSync] = useState(true);
  const [syncStats, setSyncStats] = useState<any>(null);

  const slideAnim = useRef(new Animated.Value(300)).current;
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

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

  // Animate current word highlight
  useEffect(() => {
    if (currentWordIndex >= 0) {
      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(highlightAnim, {
          toValue: 0.7,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();

      // Scroll to current word
      scrollToCurrentWord();
    }
  }, [currentWordIndex]);

  // Charger l'audio et les mots quand le verset change
  useEffect(() => {
    if (verses.length > 0 && currentVerseIndex >= 0) {
      setHasFinishedAudio(false);
      loadAudio();
      loadSurahInfo();
      loadEnhancedWords();
    }
  }, [currentVerseIndex, verses, useEnhancedSync]);

  const loadEnhancedWords = async () => {
    const currentVerse = verses[currentVerseIndex];
    if (!currentVerse || !useEnhancedSync) {
      setEnhancedWords([]);
      setCurrentWordIndex(-1);
      return;
    }

    setIsLoadingWords(true);
    setWordError(null);

    try {
      console.log(`🔤 Loading enhanced words for verse ${currentVerse.surah_id}:${currentVerse.verse_number}`);

      // Get words from the package
      const packageWords = await wordByWordService.getWordsForVerse(
        currentVerse.surah_id,
        currentVerse.verse_number
      );

      if (packageWords.length === 0) {
        throw new Error(`No words found for verse ${currentVerse.surah_id}:${currentVerse.verse_number}`);
      }

      console.log(`📝 Found ${packageWords.length} words from package`);

      // Enhance with timing data (we'll get duration when audio loads)
      const enhanced = await wordByWordService.enhanceWordsWithTiming(
        packageWords,
        currentVerse.global_number,
        selectedReciter.audioApiId,
        5000 // Default duration, will be updated when we have real audio duration
      );

      setEnhancedWords(enhanced);
      setCurrentWordIndex(-1);

      console.log(`✅ Enhanced words loaded: ${enhanced.length} words with timing data`);
    } catch (error) {
      console.error('❌ Error loading enhanced words:', error);
      setWordError(error instanceof Error ? error.message : 'Failed to load enhanced words');

      // Fallback to basic words
      fallbackToBasicWords();
    } finally {
      setIsLoadingWords(false);
    }
  };

  const fallbackToBasicWords = () => {
    const currentVerse = verses[currentVerseIndex];
    if (!currentVerse?.text_arabic) return;

    console.log('🔄 Falling back to basic word extraction');
    const repairedText = repairArabicText(currentVerse.text_arabic);
    const cleanText = repairedText.trim().replace(/\s{2,}/g, ' ');
    const wordArray = cleanText.split(' ').filter(word => word.trim().length > 0);

    // Convert to EnhancedWord format
    const basicWords: EnhancedWord[] = wordArray.map((text, index) => ({
      id: index + 1,
      position: index + 1,
      text,
      translation: { text: '', language_name: 'en' },
      transliteration: { text: '', language_name: 'en' },
      char_type_name: 'word',
      code_v1: '',
      page_number: 1,
      line_number: 1,
      parentAyahVerseKey: `${currentVerse.surah_id}:${currentVerse.verse_number}`,
      ayahIndex: 0,
      audio_url: null
    }));

    setEnhancedWords(basicWords);
  };

  const updateWordTimingWithAudioDuration = async (audioDuration: number) => {
    if (enhancedWords.length === 0 || !useEnhancedSync) return;

    try {
      console.log(`⏱️ ENHANCED SYNC: Updating word timing with real audio duration: ${audioDuration}ms`);

      const packageWords = enhancedWords.map(word => ({
        id: word.id,
        position: word.position,
        text: word.text,
        translation: word.translation,
        transliteration: word.transliteration,
        char_type_name: word.char_type_name,
        code_v1: word.code_v1,
        page_number: word.page_number,
        line_number: word.line_number,
        parentAyahVerseKey: word.parentAyahVerseKey,
        ayahIndex: word.ayahIndex,
        audio_url: word.audio_url
      }));

      // Utiliser le nouveau service de synchronisation précise
      const preciseTimings = await enhancedSyncService.getEnhancedTimingData(
        currentVerse.global_number,
        selectedReciter.audioApiId,
        packageWords,
        audioDuration
      );

      setPreciseTimingData(preciseTimings);

      // Mettre à jour les mots avec les timings précis
      const updatedWords = enhancedWords.map((word, index) => {
        const timingData = preciseTimings[index];
        if (timingData) {
          return {
            ...word,
            startTime: timingData.start_time,
            endTime: timingData.end_time,
            confidence: timingData.confidence
          };
        }
        return word;
      });

      setEnhancedWords(updatedWords);

      // Récupérer les statistiques de synchronisation
      const stats = await enhancedSyncService.getStats();
      setSyncStats(stats);

      console.log('✅ ENHANCED SYNC: Word timing updated with precise backend calculations');
    } catch (error) {
      console.error('❌ ENHANCED SYNC: Error updating word timing:', error);

      // Fallback vers l'ancienne méthode si l'API échoue
      try {
        const packageWords = enhancedWords.map(word => ({
          id: word.id,
          position: word.position,
          text: word.text,
          translation: word.translation,
          transliteration: word.transliteration,
          char_type_name: word.char_type_name,
          code_v1: word.code_v1,
          page_number: word.page_number,
          line_number: word.line_number,
          parentAyahVerseKey: word.parentAyahVerseKey,
          ayahIndex: word.ayahIndex,
          audio_url: word.audio_url
        }));

        const updatedWords = await wordByWordService.enhanceWordsWithTiming(
          packageWords,
          currentVerse.global_number,
          selectedReciter.audioApiId,
          audioDuration
        );

        setEnhancedWords(updatedWords);
        console.log('⚠️ FALLBACK: Using basic timing method');
      } catch (fallbackError) {
        console.error('❌ FALLBACK: Even basic timing failed:', fallbackError);
        setWordError('Synchronisation impossible');
      }
    }
  };

  // Force synchronization when user manually selects a word
  const forceSyncToWord = async (wordIndex: number) => {
    if (!useEnhancedSync || wordIndex < 0 || wordIndex >= enhancedWords.length) return;

    try {
      const currentPos = position;
      const packageWords = enhancedWords.map(word => ({
        id: word.id,
        position: word.position,
        text: word.text,
        translation: word.translation,
        transliteration: word.transliteration,
        char_type_name: word.char_type_name,
        code_v1: word.code_v1,
        page_number: word.page_number,
        line_number: word.line_number,
        parentAyahVerseKey: word.parentAyahVerseKey,
        ayahIndex: word.ayahIndex,
        audio_url: word.audio_url
      }));

      await enhancedSyncService.forceSyncToWord(
        currentVerse.global_number,
        selectedReciter.audioApiId,
        wordIndex,
        currentPos,
        packageWords,
        duration
      );

      setCurrentWordIndex(wordIndex);
      console.log(`🎯 FORCE SYNC: Manually synced to word ${wordIndex + 1} at ${currentPos.toFixed(0)}ms`);
    } catch (error) {
      console.error('❌ FORCE SYNC: Error forcing sync:', error);
    }
  };

  const scrollToCurrentWord = () => {
    if (scrollViewRef.current && currentWordIndex >= 0 && enhancedWords.length > 0) {
      // Calculate approximate position
      const wordsPerRow = 4; // Estimate
      const row = Math.floor(currentWordIndex / wordsPerRow);
      const wordHeight = 50; // Approximate word container height
      const scrollY = row * wordHeight;

      scrollViewRef.current.scrollTo({ y: scrollY, animated: true });
    }
  };

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

      if (player.playing) {
        player.pause();
      }

      await setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        playsInSilentModeIOS: true,
      });

      const selectedReciter = getSelectedReciter();

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

          await player.replace({
            uri: url,
            headers: undefined
          } as AudioSource);

          await new Promise(resolve => setTimeout(resolve, 200));

          player.volume = 1.0;
          player.loop = false;
          player.setPlaybackRate(playbackSpeed);

          console.log(`✅ Success with URL ${i + 1}`);
          audioLoaded = true;
          break;
        } catch (error) {
          console.log(`❌ Failed URL ${i + 1}: ${error}`);
          continue;
        }
      }

      if (audioLoaded) {
        setIsLoading(false);
        setIsBuffering(false);

        if (autoPlay && !manuallyPaused) {
          console.log('🎵 Starting auto-play');
          player.play();
          setIsPlaying(true);
        }

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

  // Enhanced word tracking with package data
  useEffect(() => {
    const interval = setInterval(() => {
      if (player.currentTime && player.duration) {
        const currentPos = player.currentTime * 1000; // Convert to ms
        const currentDur = player.duration * 1000;

        setPosition(currentPos);
        setDuration(currentDur);
        setIsPlaying(player.playing);

        // Update word timing if we have real duration and haven't updated yet
        if (enhancedWords.length > 0 && useEnhancedSync && enhancedWords[0].timing?.duration !== undefined) {
          const firstWordTiming = enhancedWords[0].timing;
          if (firstWordTiming && Math.abs(firstWordTiming.end_time * enhancedWords.length - currentDur) > 1000) {
            updateWordTimingWithAudioDuration(currentDur);
          }
        }

        // Enhanced word highlighting using precise backend timing (optimized)
        if (useEnhancedSync && (preciseTimingData.length > 0 || enhancedWords.length > 0)) {
          try {
            // Utiliser la synchronisation locale en priorité pour les performances
            if (preciseTimingData.length > 0) {
              const localResult = enhancedSyncService.getCurrentTimingData();
              if (localResult && localResult.length > 0) {
                // Recherche locale rapide
                let newWordIndex = -1;
                for (let i = 0; i < localResult.length; i++) {
                  const word = localResult[i];
                  if (currentPos >= word.start_time && currentPos < word.end_time) {
                    newWordIndex = i;
                    break;
                  }
                }

                if (newWordIndex !== currentWordIndex && newWordIndex >= 0) {
                  setCurrentWordIndex(newWordIndex);
                  const word = localResult[newWordIndex];
                  console.log(`🎯 ENHANCED LOCAL: Word ${newWordIndex + 1}/${localResult.length}: "${word.arabic_text}" [${(word.confidence * 100).toFixed(0)}% conf]`);
                }
              } else {
                // Fallback vers API seulement si nécessaire et pas trop fréquent
                if (Math.random() < 0.2) { // Seulement 20% du temps
                  const packageWords = enhancedWords.map(word => ({
                    id: word.id,
                    position: word.position,
                    text: word.text,
                    translation: word.translation,
                    transliteration: word.transliteration,
                    char_type_name: word.char_type_name,
                    code_v1: word.code_v1,
                    page_number: word.page_number,
                    line_number: word.line_number,
                    parentAyahVerseKey: word.parentAyahVerseKey,
                    ayahIndex: word.ayahIndex,
                    audio_url: word.audio_url
                  }));

                  enhancedSyncService.getCurrentWord(
                    currentVerse.global_number,
                    selectedReciter.audioApiId,
                    currentPos,
                    packageWords,
                    currentDur
                  ).then(result => {
                    if (result.currentWordIndex !== currentWordIndex && result.currentWordIndex >= 0) {
                      setCurrentWordIndex(result.currentWordIndex);
                    }
                  }).catch(() => {
                    // Fallback silencieux
                  });
                }
              }
            }
          } catch (error) {
            // Fallback silencieux vers synchronisation basique
          }
        }

        if (enhancedWords.length > 0 && (!useEnhancedSync || preciseTimingData.length === 0)) {
          // Fallback to basic word tracking using enhanced words timing
          const newWordIndex = wordByWordService.getCurrentWordIndex(enhancedWords, currentPos);

          if (newWordIndex !== currentWordIndex && newWordIndex >= 0) {
            setCurrentWordIndex(newWordIndex);
            console.log(`🎯 FALLBACK: Word ${newWordIndex + 1}/${enhancedWords.length} - "${enhancedWords[newWordIndex]?.text}"`);
          }
        }

        // Handle audio end
        if (currentPos >= currentDur - 100 && autoPlay && currentVerseIndex < verses.length - 1 && !hasFinishedAudio) {
          console.log('🔄 Audio finished, moving to next verse');
          setHasFinishedAudio(true);

          setTimeout(() => {
            onVerseChange(currentVerseIndex + 1);
          }, 500);
        }
      }
    }, 50); // Higher frequency for smoother word highlighting

    return () => {
      clearInterval(interval);
    };
  }, [player.playing, enhancedWords.length, currentVerseIndex, verses.length, autoPlay, useEnhancedSync]);

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
        player.seekTo(seekPosition / 1000);
        setPosition(seekPosition);
      } catch (error) {
        console.error('Erreur seek:', error);
      }
    }
  };

  const seekToWord = (wordIndex: number) => {
    if (!useEnhancedSync || !enhancedWords[wordIndex]?.timing) return;

    try {
      const wordTiming = enhancedWords[wordIndex].timing!;
      const seekPosition = wordTiming.start_time / 1000; // Convert to seconds
      player.seekTo(seekPosition);
      setPosition(wordTiming.start_time);
      setCurrentWordIndex(wordIndex);
    } catch (error) {
      console.error('Error seeking to word:', error);
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

      {/* Enhanced Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, useEnhancedSync && styles.activeToggle]}
          onPress={() => setUseEnhancedSync(!useEnhancedSync)}
        >
          <Ionicons
            name={useEnhancedSync ? "rocket" : "speedometer"}
            size={16}
            color={useEnhancedSync ? "#FFFFFF" : "#D4AF37"}
          />
          <Text style={[styles.toggleText, useEnhancedSync && styles.activeToggleText]}>
            {useEnhancedSync ? "Enhanced Sync" : "Basic Sync"}
          </Text>
        </TouchableOpacity>

        {useEnhancedSync && enhancedWords.length > 0 && (
          <Text style={styles.wordCount}>
            {enhancedWords.length} words • {enhancedWords.filter(w => w.timing).length} timed
          </Text>
        )}
      </View>

      {/* Word Display */}
      {isLoadingWords ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass" size={24} color="#D4AF37" />
          <Text style={styles.loadingText}>Loading enhanced words...</Text>
        </View>
      ) : wordError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#FF6B6B" />
          <Text style={styles.errorText}>{wordError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadEnhancedWords}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : enhancedWords.length > 0 ? (
        <ScrollView
          ref={scrollViewRef}
          style={styles.verseContainer}
          contentContainerStyle={styles.verseContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.wordsContainer}>
            {enhancedWords.map((word, index) => {
              const isCurrentWord = index === currentWordIndex;
              const hasPassedWord = index < currentWordIndex;
              const hasTiming = !!word.timing;
              const hasTranslation = word.translation?.text?.length > 0;

              return (
                <TouchableOpacity
                  key={`word-${word.id}-${index}`}
                  style={[
                    styles.wordContainer,
                    isCurrentWord && styles.currentWordContainer,
                    hasPassedWord && styles.passedWordContainer,
                    hasTiming && styles.timedWordContainer,
                  ]}
                  onPress={() => seekToWord(index)}
                  onLongPress={() => forceSyncToWord(index)}
                  activeOpacity={0.7}
                >
                  {isCurrentWord && (
                    <Animated.View
                      style={[
                        styles.highlightOverlay,
                        {
                          opacity: highlightAnim,
                        }
                      ]}
                    />
                  )}

                  <UthmaniText
                    size="small"
                    style={[
                      styles.wordText,
                      isCurrentWord && styles.currentWordText,
                      hasPassedWord && styles.passedWordText,
                    ]}
                  >
                    {word.text}
                  </UthmaniText>

                  {useEnhancedSync && hasTranslation && (
                    <Text style={[
                      styles.translationText,
                      isCurrentWord && styles.currentTranslationText,
                    ]}>
                      {word.translation.text}
                    </Text>
                  )}

                  {useEnhancedSync && word.transliteration?.text && (
                    <Text style={[
                      styles.transliterationText,
                      isCurrentWord && styles.currentTransliterationText,
                    ]}>
                      {word.transliteration.text}
                    </Text>
                  )}

                  {hasTiming && (
                    <View style={styles.timingIndicator}>
                      <Ionicons name="time" size={10} color="#4CAF50" />
                    </View>
                  )}

                  {word.char_type_name !== 'word' && (
                    <View style={styles.specialCharIndicator}>
                      <Text style={styles.specialCharText}>
                        {word.char_type_name.substring(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Progress indicator */}
          {currentWordIndex >= 0 && enhancedWords.length > 0 && (
            <View style={styles.progressIndicator}>
              <View style={[
                styles.progressBar,
                { width: `${((currentWordIndex + 1) / enhancedWords.length) * 100}%` }
              ]} />
            </View>
          )}
        </ScrollView>
      ) : currentVerse ? (
        <View style={styles.noWordsContainer}>
          <Text style={styles.noWordsText}>
            {useEnhancedSync ? "Enhanced words not available" : "Preparing words..."}
          </Text>
        </View>
      ) : null}

      {/* Audio Controls */}
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

        {/* Playback controls */}
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
              wordByWordService.clearCache();
              Alert.alert('Reset', 'Cache cleared and store reset.');
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
    maxHeight: '80%',
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
    marginBottom: 12,
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
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    gap: 6,
  },
  activeToggle: {
    backgroundColor: '#D4AF37',
  },
  toggleText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '600',
  },
  activeToggleText: {
    color: '#FFFFFF',
  },
  wordCount: {
    fontSize: 11,
    color: '#A5D6A7',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    color: '#A5D6A7',
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    color: '#1B5E20',
    fontSize: 12,
    fontWeight: '600',
  },
  verseContainer: {
    maxHeight: '45%',
    backgroundColor: 'rgba(27, 94, 32, 0.1)',
    borderRadius: 16,
    marginBottom: 16,
  },
  verseContent: {
    padding: 16,
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 8,
  },
  wordContainer: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 2,
    marginVertical: 2,
    minHeight: 40,
    minWidth: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  currentWordContainer: {
    backgroundColor: 'rgba(212, 175, 55, 0.9)',
    borderColor: '#D4AF37',
    borderWidth: 2,
    transform: [{ scale: 1.1 }],
    elevation: 8,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  passedWordContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  timedWordContainer: {
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  highlightOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFC107',
    borderRadius: 8,
  },
  wordText: {
    fontSize: 18,
    color: '#FFFFFF',
    // textAlign, fontFamily et autres propriétés RTL gérées par UthmaniText
  },
  currentWordText: {
    color: '#1B5E20',
    fontWeight: 'bold',
    fontSize: 20,
  },
  passedWordText: {
    color: '#4CAF50',
    opacity: 0.8,
  },
  translationText: {
    fontSize: 10,
    color: '#A5D6A7',
    textAlign: 'center',
    marginTop: 2,
  },
  currentTranslationText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  transliterationText: {
    fontSize: 9,
    color: '#81C784',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 1,
  },
  currentTransliterationText: {
    color: '#1B5E20',
  },
  timingIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  specialCharIndicator: {
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
  specialCharText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  progressIndicator: {
    height: 3,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    marginTop: 16,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 1.5,
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
});