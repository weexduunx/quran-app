import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SurahCard } from '@/components/SurahCard';
import { useQuranStore, Surah } from '@/stores/quranStore';
import { quranApi } from '@/services/api';
import { EmergencyCleanup } from '@/utils/emergencyCleanup';

export default function QuranScreen() {
  const {
    surahs,
    setSurahs,
    setCurrentSurah,
    isLoading,
    setLoading,
    error,
    setError,
  } = useQuranStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSurahs, setFilteredSurahs] = useState<Surah[]>([]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Vérifier et nettoyer le cache corrompu au démarrage
        console.log('🔍 Vérification du cache au démarrage...');
        await EmergencyCleanup.diagnoseAndFix(false); // Silencieux au démarrage
      } catch (error) {
        console.log('Diagnostic du cache échoué:', error);
      }
      loadSurahs();
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = surahs.filter((surah) =>
        surah.name_arabic.includes(searchQuery) ||
        surah.name_french.toLowerCase().includes(searchQuery.toLowerCase()) ||
        surah.name_transliteration.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSurahs(filtered);
    } else {
      setFilteredSurahs(surahs);
    }
  }, [searchQuery, surahs]);

  const loadSurahs = async () => {
    try {
      setLoading(true);
      setError(null);
      const surahsData = await quranApi.getSurahs();
      setSurahs(surahsData);
    } catch (err) {
      console.error('Error loading surahs:', err);
      setError('Erreur lors du chargement des sourates');

      // Détecter si c'est une erreur JSON
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const isJsonError = errorMessage.includes('JSON Parse error') || errorMessage.includes('SyntaxError');

      if (isJsonError) {
        Alert.alert(
          'Données corrompues',
          'Des données corrompues ont été détectées. Voulez-vous vider le cache et réessayer ?',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Vider le cache',
              onPress: async () => {
                try {
                  console.log('Tentative de nettoyage forcé...');
                  const success = await EmergencyCleanup.forceCleanAll();
                  if (success) {
                    console.log('Cache forcé vidé - Rechargement des sourates');
                    setTimeout(() => loadSurahs(), 1000); // Délai pour s'assurer du nettoyage
                  } else {
                    Alert.alert('Erreur', 'Impossible de nettoyer le cache');
                  }
                } catch (cacheError) {
                  console.error('Erreur lors du nettoyage du cache:', cacheError);
                  Alert.alert('Erreur', 'Impossible de nettoyer le cache');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Erreur',
          'Impossible de charger les sourates. Vérifiez votre connexion.',
          [{ text: 'Réessayer', onPress: loadSurahs }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSurahPress = (surah: Surah) => {
    setCurrentSurah(surah);
    router.push(`/surah/${surah.id}`);
  };

  const renderSurah = ({ item }: { item: Surah }) => (
    <SurahCard surah={item} onPress={handleSurahPress} />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>القرآن الكريم</Text>
      <Text style={styles.subtitle}>Le Saint Coran</Text>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une sourate..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>
    </View>
  );

  if (isLoading && surahs.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B5E20" />
        <Text style={styles.loadingText}>Chargement des sourates...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredSurahs}
        renderItem={renderSurah}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  header: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#A5D6A7',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  searchInput: {
    fontSize: 16,
    paddingVertical: 12,
    color: '#333',
  },
  listContent: {
    paddingBottom: 20,
  },
});