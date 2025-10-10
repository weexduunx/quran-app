import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Tafsir } from '../stores/quranStore';

interface TafsirCardProps {
  tafsir: Tafsir;
}

export const TafsirCard: React.FC<TafsirCardProps> = ({ tafsir }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const playPauseAudio = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        setIsLoading(true);

        // Pour la démo, nous utilisons un fichier audio de test
        // En production, vous utiliseriez tafsir.audio_url
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' }, // URL de test
          { shouldPlay: true }
        );

        setSound(newSound);
        setIsPlaying(true);
        setIsLoading(false);

        // Configure les mises à jour de position
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis || 0);
            setDuration(status.durationMillis || 0);
            setIsPlaying(status.isPlaying || false);
          }
        });
      }
    } catch (error) {
      console.error('Erreur audio:', error);
      setIsLoading(false);
      Alert.alert('Erreur', 'Impossible de lire le fichier audio');
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
    }
  };

  const formatTime = (millis: number): string => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="headset" size={24} color="#1B5E20" />
        <View style={styles.headerContent}>
          <Text style={styles.hafizName}>{tafsir.hafiz_name}</Text>
          <Text style={styles.language}>Tafsir en Wolof</Text>
        </View>
      </View>

      {tafsir.description && (
        <Text style={styles.description}>{tafsir.description}</Text>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={playPauseAudio}
          disabled={isLoading}
        >
          {isLoading ? (
            <Ionicons name="reload" size={32} color="#fff" />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color="#fff"
            />
          )}
        </TouchableOpacity>

        {sound && (
          <TouchableOpacity style={styles.stopButton} onPress={stopAudio}>
            <Ionicons name="stop" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {(position > 0 || duration > 0) && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${duration > 0 ? (position / duration) * 100 : 0}%` },
              ]}
            />
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      )}

      <View style={styles.metadata}>
        {tafsir.duration_seconds && (
          <View style={styles.metadataItem}>
            <Ionicons name="time" size={16} color="#666" />
            <Text style={styles.metadataText}>
              {Math.floor(tafsir.duration_seconds / 60)}min {tafsir.duration_seconds % 60}s
            </Text>
          </View>
        )}

        {tafsir.file_size_bytes && (
          <View style={styles.metadataItem}>
            <Ionicons name="download" size={16} color="#666" />
            <Text style={styles.metadataText}>
              {formatFileSize(tafsir.file_size_bytes)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerContent: {
    marginLeft: 12,
    flex: 1,
  },
  hafizName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 2,
  },
  language: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  description: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1B5E20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stopButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1B5E20',
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});