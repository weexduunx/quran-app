import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Verse } from '@/stores/quranStore';
import { UthmaniText } from './UthmaniText';

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
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string>('');
  const [nextAudioUrl, setNextAudioUrl] = useState<string>('');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [useNextPlayer, setUseNextPlayer] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);

  const mainPlayer = useAudioPlayer(currentAudioUrl);
  const nextPlayer = useAudioPlayer(nextAudioUrl);

  // Utiliser soit le player principal soit le player suivant
  const activePlayer = useNextPlayer ? nextPlayer : mainPlayer;
  const status = useAudioPlayerStatus(activePlayer);

  // Refs pour stocker les instances de player actuelles
  const mainPlayerRef = useRef(mainPlayer);
  const nextPlayerRef = useRef(nextPlayer);

  // Mettre à jour les refs quand les players changent
  useEffect(() => {
    mainPlayerRef.current = mainPlayer;
  }, [mainPlayer]);

  useEffect(() => {
    nextPlayerRef.current = nextPlayer;
  }, [nextPlayer]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      try {
        // Arrêter et nettoyer les players
        if (mainPlayerRef.current && typeof mainPlayerRef.current.pause === 'function' && !mainPlayerRef.current._released) {
          mainPlayerRef.current.pause();
        }
        if (nextPlayerRef.current && typeof nextPlayerRef.current.pause === 'function' && !nextPlayerRef.current._released) {
          nextPlayerRef.current.pause();
        }
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    };
  }, []);

  // Refs pour contrôler les transitions
  const hasFinishedRef = useRef(false);
  const lastProcessedVerseRef = useRef(-1);
  const isTransitioningRef = useRef(false);

  const slideAnim = useRef(new Animated.Value(300)).current;
  const highlightAnim = useRef(new Animated.Value(0)).current;

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

  // Surveiller les changements de statut audio avec protection contre les déclenchements multiples
  useEffect(() => {
    // Protection : ne traiter didJustFinish qu'une fois par verset
    if (status.didJustFinish &&
        autoPlay &&
        !isTransitioningRef.current &&
        !hasFinishedRef.current &&
        lastProcessedVerseRef.current !== currentVerseIndex) {

      console.log(`Audio finished for verse ${currentVerseIndex + 1} (index ${currentVerseIndex})`);

      // Marquer qu'on a traité ce verset
      hasFinishedRef.current = true;
      isTransitioningRef.current = true;
      lastProcessedVerseRef.current = currentVerseIndex;

      // Vérifier qu'il y a bien un verset suivant
      if (currentVerseIndex < verses.length - 1) {
        const nextIndex = currentVerseIndex + 1;
        console.log(`Switching from verse ${currentVerseIndex + 1} to verse ${nextIndex + 1}`);

        // Switch instantané vers le player pré-chargé
        console.log(`Switching to ${useNextPlayer ? 'main' : 'next'} player`);

        // Arrêter l'ancien player avant de switcher
        const currentActivePlayer = useNextPlayer ? nextPlayerRef.current : mainPlayerRef.current;
        if (currentActivePlayer && typeof currentActivePlayer.pause === 'function' && !currentActivePlayer._released) {
          try {
            currentActivePlayer.pause();
          } catch (error) {
            console.warn('Could not pause current player:', error);
          }
        }

        setUseNextPlayer(!useNextPlayer);

        // Démarrer la lecture immédiatement sur le nouveau player (seulement si pas manuellement en pause)
        setTimeout(() => {
          if (!manuallyPaused) { // Respecter la pause manuelle
            const targetPlayer = useNextPlayer ? mainPlayerRef.current : nextPlayerRef.current;

            // Validation robuste du player
            if (targetPlayer &&
                typeof targetPlayer === 'object' &&
                typeof targetPlayer.play === 'function' &&
                !targetPlayer._released) { // Vérifier que le player n'est pas libéré
              try {
                targetPlayer.play();
                setLocalIsPlaying(true);
                console.log(`Successfully started playback on ${useNextPlayer ? 'main' : 'next'} player`);
              } catch (error) {
                console.error('Error playing target player:', error);
                setLocalIsPlaying(false);
              }
            } else {
              console.warn('Target player is not available or has been released');
              setLocalIsPlaying(false);
            }
          } else {
            console.log('Skipping auto-play because manually paused');
            setLocalIsPlaying(false);
          }
        }, 50);

        // Changer l'index du verset
        setTimeout(() => {
          onVerseChange(nextIndex);
          // Reset des flags après transition
          setTimeout(() => {
            isTransitioningRef.current = false;
            hasFinishedRef.current = false;
          }, 300);
        }, 20);

      } else {
        console.log('Reached end of surah');
        setLocalIsPlaying(false);
        hasFinishedRef.current = false;
        isTransitioningRef.current = false;
      }
    }

    // Reset le flag quand l'audio recommence
    if (status.playing && hasFinishedRef.current) {
      hasFinishedRef.current = false;
    }

  }, [status.didJustFinish, status.playing, autoPlay, currentVerseIndex, verses.length]);

  // Auto-play du nouveau verset quand l'index change
  useEffect(() => {
    if ((currentAudioUrl || nextAudioUrl) &&
        autoPlay &&
        !status.playing &&
        status.isLoaded &&
        !isTransitioningRef.current &&
        !manuallyPaused) { // Vérifier si pas manuellement en pause
      // Démarrage immédiat dès que l'audio est chargé
      console.log(`Auto-playing verse ${currentVerseIndex + 1} on ${useNextPlayer ? 'next' : 'main'} player...`);

      setTimeout(() => {
        const currentPlayer = useNextPlayer ? nextPlayerRef.current : mainPlayerRef.current;

        if (currentPlayer &&
            typeof currentPlayer === 'object' &&
            typeof currentPlayer.play === 'function' &&
            !currentPlayer._released &&
            !status.playing &&
            !isTransitioningRef.current &&
            !manuallyPaused) { // Double vérification
          try {
            setLocalIsPlaying(true);
            currentPlayer.play();
            console.log(`Auto-play started on ${useNextPlayer ? 'next' : 'main'} player`);
          } catch (error) {
            console.error('Error in auto-play:', error);
            setLocalIsPlaying(false);
          }
        }
      }, 100);
    }
  }, [currentAudioUrl, nextAudioUrl, autoPlay, status.isLoaded, status.playing, currentVerseIndex, useNextPlayer, manuallyPaused]);

  // Synchroniser l'état local avec le status audio
  useEffect(() => {
    setLocalIsPlaying(status.playing || false);
    console.log('Audio status update:', {
      playing: status.playing,
      didJustFinish: status.didJustFinish,
      isLoaded: status.isLoaded,
      currentTime: status.currentTime,
      duration: status.duration,
      currentVerseIndex: currentVerseIndex,
      hasFinished: hasFinishedRef.current,
      isTransitioning: isTransitioningRef.current,
      lastProcessed: lastProcessedVerseRef.current
    });
  }, [status, currentVerseIndex]);

  // Charger l'audio du verset initial et reset des flags
  useEffect(() => {
    if (verses.length > 0 && currentVerseIndex >= 0) {
      // Reset des flags de transition pour le nouveau verset
      console.log(`Loading new verse at index ${currentVerseIndex}`);
      hasFinishedRef.current = false;
      isTransitioningRef.current = false;
      // Ne pas réinitialiser manuallyPaused ici pour permettre la pause entre versets

      loadAudio(currentVerseIndex);
    }
  }, [currentVerseIndex, verses]);

  const formatTime = (timeInSeconds: number) => {
    if (!timeInSeconds || timeInSeconds === 0) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const generateAudioUrl = (verseId: number) => {
    // URL pour l'audio des versets - utilise l'API de récitation
    return `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${verseId}.mp3`;
  };

  const loadAudio = (verseIndex: number) => {
    try {
      const verse = verses[verseIndex];
      const audioUrl = generateAudioUrl(verse.global_number);

      console.log(`Loading verse ${verse.verse_number} audio: ${audioUrl}`);

      // Changer l'URL du player actuel
      if (useNextPlayer) {
        setNextAudioUrl(audioUrl);
      } else {
        setCurrentAudioUrl(audioUrl);
      }

      // Préparer le verset suivant pour une transition fluide
      if (verseIndex < verses.length - 1) {
        const nextVerse = verses[verseIndex + 1];
        const nextUrl = generateAudioUrl(nextVerse.global_number);
        console.log(`Pre-loading next verse ${nextVerse.verse_number}: ${nextUrl}`);

        if (useNextPlayer) {
          setCurrentAudioUrl(nextUrl);
        } else {
          setNextAudioUrl(nextUrl);
        }
      }

      onVerseHighlight(verse.id);

      // Animation de surlignage avec délai plus long
      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.delay(2000), // Délai de maintien du surlignage
        Animated.timing(highlightAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: false,
        }),
      ]).start();

    } catch (error) {
      console.error('Erreur lors du chargement de l\'audio:', error);
    }
  };

  const playPause = () => {
    try {
      const currentPlayer = useNextPlayer ? nextPlayerRef.current : mainPlayerRef.current;

      console.log('Current status:', { playing: status.playing, localIsPlaying, isLoaded: status.isLoaded, useNextPlayer, manuallyPaused });

      if (!currentPlayer || typeof currentPlayer !== 'object' || currentPlayer._released) {
        console.warn('Player is not available or has been released');
        setLocalIsPlaying(false);
        return;
      }

      if (localIsPlaying) {
        console.log('Pausing audio manually...');
        if (typeof currentPlayer.pause === 'function') {
          setLocalIsPlaying(false);
          setManuallyPaused(true); // Marquer comme manuellement en pause
          currentPlayer.pause();
        }
      } else {
        console.log('Playing audio manually...');
        if (typeof currentPlayer.play === 'function') {
          setLocalIsPlaying(true);
          setManuallyPaused(false); // Retirer le flag de pause manuelle
          currentPlayer.play();
        }
      }
    } catch (error) {
      console.error('Erreur lecture/pause:', error);
      setLocalIsPlaying(false);
    }
  };

  const playNextVerse = () => {
    if (currentVerseIndex < verses.length - 1) {
      const nextIndex = currentVerseIndex + 1;
      console.log(`Manual verse change from ${currentVerseIndex + 1} to ${nextIndex + 1}`);
      setManuallyPaused(false); // Réinitialiser la pause manuelle lors du changement de verset
      onVerseChange(nextIndex);
    }
  };

  const playPreviousVerse = () => {
    if (currentVerseIndex > 0) {
      const prevIndex = currentVerseIndex - 1;
      setManuallyPaused(false); // Réinitialiser la pause manuelle lors du changement de verset
      onVerseChange(prevIndex);
    }
  };

  const onSliderValueChange = (value: number) => {
    try {
      const currentPlayer = useNextPlayer ? nextPlayerRef.current : mainPlayerRef.current;

      if (currentPlayer &&
          typeof currentPlayer === 'object' &&
          typeof currentPlayer.seekTo === 'function' &&
          !currentPlayer._released &&
          status.duration) {
        const newPosition = value * status.duration;
        currentPlayer.seekTo(newPosition);
      }
    } catch (error) {
      console.error('Error seeking audio:', error);
    }
  };

  const changePlaybackSpeed = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);

    // Note: La vitesse de lecture peut être gérée différemment selon l'API expo-audio
    // Cette fonctionnalité pourrait nécessiter une implémentation différente
  };

  if (!isVisible) return null;

  const currentVerse = verses[currentVerseIndex];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.ornamentTop} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="chevron-down" size={24} color="#D4AF37" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.playerTitle}>Lecteur Coranique</Text>
          <Text style={styles.surahInfo}>
            {currentVerse?.surah?.name_arabic} - Verset {currentVerse?.verse_number}
          </Text>
        </View>
      </View>

      <View style={styles.verseDisplay}>
        <Animated.View
          style={[
            styles.verseContainer,
            {
              backgroundColor: highlightAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(212, 175, 55, 0.1)', 'rgba(212, 175, 55, 0.3)'],
              }),
            },
          ]}
        >
          <UthmaniText
            size="large"
            style={styles.arabicTextUthmani}
          >
            {currentVerse?.text_arabic || ''}
          </UthmaniText>
          <Text style={styles.frenchText}>{currentVerse?.text_french}</Text>
        </Animated.View>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.timeText}>{formatTime(status.currentTime || 0)}</Text>
        <Slider
          style={styles.progressBar}
          minimumValue={0}
          maximumValue={1}
          value={status.duration ? (status.currentTime || 0) / status.duration : 0}
          onSlidingComplete={onSliderValueChange}
          minimumTrackTintColor="#D4AF37"
          maximumTrackTintColor="#E8DCC0"
          thumbStyle={styles.sliderThumb}
        />
        <Text style={styles.timeText}>{formatTime(status.duration || 0)}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={changePlaybackSpeed}
          style={styles.speedButton}
        >
          <Text style={styles.speedText}>{playbackSpeed}x</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={playPreviousVerse}
          disabled={currentVerseIndex === 0}
          style={[styles.controlButton, currentVerseIndex === 0 && styles.disabledButton]}
        >
          <Ionicons
            name="play-skip-back"
            size={24}
            color={currentVerseIndex === 0 ? "#999" : "#D4AF37"}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={playPause} style={styles.playButton}>
          {!status.isLoaded ? (
            <Ionicons name="hourglass" size={32} color="#1B5E20" />
          ) : (
            <Ionicons
              name={localIsPlaying ? "pause" : "play"}
              size={32}
              color="#1B5E20"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={playNextVerse}
          disabled={currentVerseIndex === verses.length - 1}
          style={[styles.controlButton, currentVerseIndex === verses.length - 1 && styles.disabledButton]}
        >
          <Ionicons
            name="play-skip-forward"
            size={24}
            color={currentVerseIndex === verses.length - 1 ? "#999" : "#D4AF37"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setAutoPlay(!autoPlay)}
          style={styles.autoPlayButton}
        >
          <Ionicons
            name={autoPlay ? "repeat" : "repeat-outline"}
            size={24}
            color={autoPlay ? "#D4AF37" : "#999"}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.ornamentBottom}>
        <View style={{ width: 6, height: 6, backgroundColor: '#D4AF37', borderRadius: 3, marginHorizontal: 4 }} />
        <View style={{ width: 30, height: 1, backgroundColor: '#D4AF37', opacity: 0.6 }} />
        <View style={{ width: 6, height: 6, backgroundColor: '#D4AF37', borderRadius: 3, marginHorizontal: 4 }} />
        <View style={{ width: 30, height: 1, backgroundColor: '#D4AF37', opacity: 0.6 }} />
        <View style={{ width: 6, height: 6, backgroundColor: '#D4AF37', borderRadius: 3, marginHorizontal: 4 }} />
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    borderTopWidth: 3,
    borderTopColor: '#D4AF37',
  },
  ornamentTop: {
    height: 4,
    backgroundColor: '#D4AF37',
    width: 40,
    alignSelf: 'center',
    borderRadius: 2,
    marginBottom: 16,
  },
  ornamentBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  playerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
    fontFamily: 'NotoSansArabic-Bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(212, 175, 55, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  surahInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  verseDisplay: {
    backgroundColor: '#F8F6F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8DCC0',
  },
  verseContainer: {
    borderRadius: 8,
    padding: 12,
  },
  arabicTextUthmani: {
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  frenchText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    textAlign: 'left',
    fontStyle: 'italic',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    width: 40,
    textAlign: 'center',
  },
  progressBar: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  sliderThumb: {
    backgroundColor: '#D4AF37',
    width: 16,
    height: 16,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  controlButton: {
    padding: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  playButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 32,
    padding: 16,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  speedButton: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  speedText: {
    fontSize: 12,
    color: '#D4AF37',
    fontWeight: 'bold',
  },
  autoPlayButton: {
    padding: 12,
  },
});