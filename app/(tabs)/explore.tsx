import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { VerseCard } from '@/components/VerseCard';
import { SurahCard } from '@/components/SurahCard';
import { useQuranStore, Verse, Surah } from '@/stores/quranStore';
import { quranApi } from '@/services/api';

type SearchResultType = 'surahs' | 'verses';

export default function SearchScreen() {
  const { setCurrentSurah, isLoading, setLoading, setError } = useQuranStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    surahs: Surah[];
    verses: Verse[];
  }>({
    surahs: [],
    verses: [],
  });
  const [activeTab, setActiveTab] = useState<SearchResultType>('surahs');
  const [isSearching, setIsSearching] = useState(false);

  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ surahs: [], verses: [] });
      return;
    }

    try {
      setIsSearching(true);
      setError(null);

      const [surahResults, verseResults] = await Promise.all([
        quranApi.searchSurahs(query),
        quranApi.searchVerses(query),
      ]);

      setSearchResults({
        surahs: surahResults,
        verses: verseResults.data || [],
      });
    } catch (err) {
      console.error('Search error:', err);
      setError('Erreur lors de la recherche');
      Alert.alert('Erreur', 'Erreur lors de la recherche. Réessayez.');
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearch = useCallback(debounce(performSearch, 500), []);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleSurahPress = (surah: Surah) => {
    setCurrentSurah(surah);
    router.push(`/surah/${surah.id}`);
  };

  const handleVersePress = (verse: Verse) => {
    if (verse.surah) {
      setCurrentSurah(verse.surah);
      router.push(`/surah/${verse.surah.id}`);
    }
  };

  const renderSurah = ({ item }: { item: Surah }) => (
    <SurahCard surah={item} onPress={handleSurahPress} />
  );

  const renderVerse = ({ item }: { item: Verse }) => (
    <VerseCard verse={item} showSurahInfo onPress={handleVersePress} />
  );

  const renderEmptyState = () => {
    if (!searchQuery.trim()) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>
            Recherchez des sourates ou des versets
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Tapez un mot-clé en arabe ou en français
          </Text>
        </View>
      );
    }

    if (
      !isSearching &&
      searchResults.surahs.length === 0 &&
      searchResults.verses.length === 0
    ) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>Aucun résultat trouvé</Text>
          <Text style={styles.emptyStateSubtext}>
            Essayez avec d'autres mots-clés
          </Text>
        </View>
      );
    }

    return null;
  };

  const surahCount = searchResults.surahs.length;
  const verseCount = searchResults.verses.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recherche</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher dans le Coran..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {(surahCount > 0 || verseCount > 0) && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'surahs' && styles.activeTab,
              ]}
              onPress={() => setActiveTab('surahs')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'surahs' && styles.activeTabText,
                ]}
              >
                Sourates ({surahCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'verses' && styles.activeTab,
              ]}
              onPress={() => setActiveTab('verses')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'verses' && styles.activeTabText,
                ]}
              >
                Versets ({verseCount})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B5E20" />
          <Text style={styles.loadingText}>Recherche en cours...</Text>
        </View>
      ) : (
        <FlatList
          data={
            activeTab === 'surahs' ? searchResults.surahs : searchResults.verses
          }
          renderItem={activeTab === 'surahs' ? renderSurah : renderVerse}
          keyExtractor={(item) => `${activeTab}_${item.id}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    color: '#A5D6A7',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#1B5E20',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
