import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VerseCard } from '@/components/VerseCard';
import { AudioPlayer } from '@/components/AudioPlayer';
import { useQuranStore, Verse } from '@/stores/quranStore';
import { quranApi } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { UthmaniText } from '@/components/UthmaniText';

export default function SurahScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    currentSurah,
    verses,
    setVerses,
    setCurrentSurah,
    isLoading,
    setLoading,
    setError,
  } = useQuranStore();

  const [surahData, setSurahData] = useState<any>(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [highlightedVerseId, setHighlightedVerseId] = useState<number | null>(null);
  const highlightAnimation = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id) {
      loadSurahData(parseInt(id));
    }
  }, [id]);

  const loadSurahData = async (surahId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await quranApi.getSurah(surahId);
      setSurahData(data);
      setCurrentSurah(data);
      setVerses(data.verses || []);
    } catch (err) {
      console.error('Error loading surah:', err);
      setError('Erreur lors du chargement de la sourate');
      Alert.alert(
        'Erreur',
        'Impossible de charger la sourate. Vérifiez votre connexion.',
        [
          { text: 'Retour', onPress: () => router.back() },
          { text: 'Réessayer', onPress: () => loadSurahData(surahId) },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVersePress = (verse: Verse) => {
    const verseIndex = verses.findIndex(v => v.id === verse.id);
    if (verseIndex !== -1) {
      setCurrentVerseIndex(verseIndex);
      setShowAudioPlayer(true);
    }
  };

  const handleVerseChange = (index: number) => {
    console.log(`Parent: handleVerseChange called with index ${index}, current is ${currentVerseIndex}`);
    setCurrentVerseIndex(index);
    // Faire défiler vers le verset actuel
    if (flatListRef.current && verses[index]) {
      flatListRef.current.scrollToIndex({
        index: index,
        animated: true,
        viewPosition: 0.5,
      });
    }
  };

  const handleVerseHighlight = (verseId: number) => {
    setHighlightedVerseId(verseId);

    // Animation de surlignage avec délai plus long
    Animated.sequence([
      Animated.timing(highlightAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.delay(2500), // Délai de maintien du surlignage plus long
      Animated.timing(highlightAnimation, {
        toValue: 0,
        duration: 600,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const renderVerse = ({ item }: { item: Verse }) => (
    <VerseCard
      verse={item}
      onPress={handleVersePress}
      isHighlighted={highlightedVerseId === item.id}
      highlightAnimation={highlightedVerseId === item.id ? highlightAnimation : undefined}
    />
  );

  const renderHeader = () => {
    if (!surahData) return null;

    return (
      <LinearGradient
        colors={['#1B5E20', '#2E7D32', '#1B5E20']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.audioButton}
          onPress={() => setShowAudioPlayer(true)}
        >
          <Ionicons name="play-circle" size={28} color="#D4AF37" />
        </TouchableOpacity>

        <View style={styles.surahInfo}>
          <UthmaniText
            size="xlarge"
            color="#fff"
            style={styles.surahNameArabicUthmani}
          >
            {surahData.name_arabic}
          </UthmaniText>
          <Text style={styles.surahNameFrench}>{surahData.name_french}</Text>
          <Text style={styles.surahTransliteration}>
            {surahData.name_transliteration}
          </Text>

          <View style={styles.surahMetaInfo}>
            <Text style={styles.metaText}>
              {surahData.verses_count} versets • {surahData.revelation_type}
            </Text>
            {surahData.revelation_place && (
              <Text style={styles.metaText}>
                Révélée à {surahData.revelation_place}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.ornamentContainer}>
          <View style={styles.ornament} />
          <View style={styles.ornament} />
          <View style={styles.ornament} />
        </View>
      </LinearGradient>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B5E20" />
        <Text style={styles.loadingText}>Chargement de la sourate...</Text>
      </SafeAreaView>
    );
  }

  if (!surahData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Sourate non trouvée</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={verses}
        renderItem={renderVerse}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToIndex({ index: info.index, animated: true });
            }
          });
        }}
      />

      <AudioPlayer
        verses={verses}
        currentVerseIndex={currentVerseIndex}
        onVerseChange={handleVerseChange}
        onVerseHighlight={handleVerseHighlight}
        isVisible={showAudioPlayer}
        onClose={() => setShowAudioPlayer(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#1B5E20',
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 16,
    position: 'relative',
    minHeight: 180,
  },
  backButton: {
    position: 'absolute',
    top: 24,
    left: 20,
    zIndex: 2,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  audioButton: {
    position: 'absolute',
    top: 24,
    right: 20,
    zIndex: 2,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  ornamentContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ornament: {
    width: 8,
    height: 8,
    backgroundColor: '#D4AF37',
    borderRadius: 4,
    marginHorizontal: 4,
    opacity: 0.8,
  },
  surahInfo: {
    alignItems: 'center',
    paddingTop: 8,
  },
  surahNameArabicUthmani: {
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(212, 175, 55, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  surahNameFrench: {
    fontSize: 20,
    color: '#A5D6A7',
    textAlign: 'center',
    marginBottom: 4,
  },
  surahTransliteration: {
    fontSize: 16,
    color: '#C8E6C9',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  surahMetaInfo: {
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#E8F5E8',
    marginBottom: 2,
  },
  listContent: {
    paddingBottom: 20,
  },
});