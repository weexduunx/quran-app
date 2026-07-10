import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import wordByWordService, { EnhancedWord } from '../services/wordByWordService';
import { UthmaniText } from './UthmaniText';

const { width } = Dimensions.get('window');

interface WordByWordReaderProps {
  surahNumber: number;
  ayahNumber: number;
  globalVerseNumber: number;
  reciterCode: string;
  audioUrl?: string;
  audioDuration?: number;
  onWordChange?: (wordIndex: number, word: EnhancedWord) => void;
}

export const WordByWordReader: React.FC<WordByWordReaderProps> = ({
  surahNumber,
  ayahNumber,
  globalVerseNumber,
  reciterCode,
  audioUrl,
  audioDuration = 5000,
  onWordChange,
}) => {
  const [words, setWords] = useState<EnhancedWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadWords();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
    };
  }, [surahNumber, ayahNumber, globalVerseNumber, reciterCode]);

  useEffect(() => {
    if (audioUrl && words.length > 0) {
      loadAudio();
    }
  }, [audioUrl, words]);

  const loadWords = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get words from the package
      const rawWords = await wordByWordService.getWordsForVerse(surahNumber, ayahNumber);

      if (rawWords.length === 0) {
        throw new Error(`No words found for verse ${surahNumber}:${ayahNumber}`);
      }

      // Enhance with timing data
      const enhancedWords = await wordByWordService.enhanceWordsWithTiming(
        rawWords,
        globalVerseNumber,
        reciterCode,
        audioDuration
      );

      setWords(enhancedWords);
    } catch (err) {
      console.error('Error loading words:', err);
      setError(err instanceof Error ? err.message : 'Failed to load words');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAudio = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      if (!audioUrl) return;

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false, isLooping: false }
      );

      setSound(newSound);

      newSound.setOnPlaybackStatusUpdate((status) => {
        setPlaybackStatus(status);
        if (status.isLoaded && status.positionMillis !== undefined) {
          updateCurrentWord(status.positionMillis);
        }
      });
    } catch (err) {
      console.error('Error loading audio:', err);
      setError('Failed to load audio');
    }
  };

  const updateCurrentWord = (currentTime: number) => {
    if (words.length === 0) return;

    const newWordIndex = wordByWordService.getCurrentWordIndex(words, currentTime);

    if (newWordIndex !== currentWordIndex) {
      setCurrentWordIndex(newWordIndex);

      // Scroll to current word
      scrollToWord(newWordIndex);

      // Notify parent component
      if (onWordChange && words[newWordIndex]) {
        onWordChange(newWordIndex, words[newWordIndex]);
      }
    }
  };

  const scrollToWord = (wordIndex: number) => {
    if (scrollViewRef.current && wordIndex >= 0) {
      // Calculate approximate position
      const wordWidth = 80; // Approximate word width
      const wordsPerRow = Math.floor(width / wordWidth);
      const row = Math.floor(wordIndex / wordsPerRow);
      const y = row * 80; // Approximate row height

      scrollViewRef.current.scrollTo({ y, animated: true });
    }
  };

  const togglePlayback = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
        if (positionIntervalRef.current) {
          clearInterval(positionIntervalRef.current);
        }
      } else {
        await sound.playAsync();
        // Start position tracking
        positionIntervalRef.current = setInterval(async () => {
          const status = await sound.getStatusAsync();
          if (status.isLoaded && status.positionMillis !== undefined) {
            updateCurrentWord(status.positionMillis);
          }
        }, 100);
      }
      setIsPlaying(!isPlaying);
    } catch (err) {
      console.error('Error toggling playback:', err);
    }
  };

  const seekToWord = async (wordIndex: number) => {
    if (!sound || !words[wordIndex]?.timing) return;

    try {
      const startTime = words[wordIndex].timing!.start_time;
      await sound.setPositionAsync(startTime);
      setCurrentWordIndex(wordIndex);
      scrollToWord(wordIndex);
    } catch (err) {
      console.error('Error seeking to word:', err);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2E7D5E" />
        <Text style={styles.loadingText}>Loading verse words...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={48} color="#D32F2F" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadWords}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Control Bar */}
      <View style={styles.controlBar}>
        <TouchableOpacity
          style={[styles.playButton, !audioUrl && styles.disabledButton]}
          onPress={togglePlayback}
          disabled={!audioUrl}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color={audioUrl ? 'white' : '#ccc'}
          />
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.verseInfo}>
            Surah {surahNumber}, Ayah {ayahNumber}
          </Text>
          <Text style={styles.wordProgress}>
            Word {currentWordIndex + 1} of {words.length}
          </Text>
        </View>
      </View>

      {/* Words Display */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.wordsContainer}
        contentContainerStyle={styles.wordsContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wordsGrid}>
          {words.map((word, index) => (
            <TouchableOpacity
              key={`${word.id}_${index}`}
              style={[
                styles.wordContainer,
                index === currentWordIndex && styles.currentWordContainer,
                word.timing && styles.wordWithTiming,
              ]}
              onPress={() => seekToWord(index)}
              activeOpacity={0.7}
            >
              {index === currentWordIndex && (
                <LinearGradient
                  colors={['#4CAF50', '#2E7D5E']}
                  style={styles.wordHighlight}
                />
              )}

              <UthmaniText
                size="medium"
                style={[
                  styles.arabicText,
                  index === currentWordIndex && styles.currentArabicText
                ]}
              >
                {word.text}
              </UthmaniText>

              <Text style={[
                styles.transliterationText,
                index === currentWordIndex && styles.currentTransliterationText
              ]}>
                {word.transliteration.text}
              </Text>

              <Text style={[
                styles.translationText,
                index === currentWordIndex && styles.currentTranslationText
              ]}>
                {word.translation.text}
              </Text>

              {word.timing && (
                <View style={styles.timingIndicator}>
                  <Ionicons
                    name="time-outline"
                    size={12}
                    color={index === currentWordIndex ? 'white' : '#666'}
                  />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Progress Bar */}
      {playbackStatus?.isLoaded && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(playbackStatus.positionMillis / playbackStatus.durationMillis) * 100}%`
                }
              ]}
            />
          </View>
          <Text style={styles.progressTime}>
            {Math.floor(playbackStatus.positionMillis / 1000)}s / {Math.floor(playbackStatus.durationMillis / 1000)}s
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2E7D5E',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2E7D5E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  infoContainer: {
    flex: 1,
  },
  verseInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  wordProgress: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  wordsContainer: {
    flex: 1,
  },
  wordsContent: {
    padding: 16,
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  wordContainer: {
    width: width * 0.28,
    margin: 8,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 120,
  },
  currentWordContainer: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    elevation: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  wordWithTiming: {
    borderColor: '#2E7D5E',
  },
  wordHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    opacity: 0.9,
  },
  arabicText: {
    fontSize: 20,
    marginBottom: 8,
    // Les autres propriétés RTL sont gérées par le composant ArabicText
  },
  currentArabicText: {
    color: 'white',
    fontWeight: 'bold',
  },
  transliterationText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  currentTransliterationText: {
    color: 'white',
  },
  translationText: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  currentTranslationText: {
    color: 'white',
  },
  timingIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  progressContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressTime: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default WordByWordReader;