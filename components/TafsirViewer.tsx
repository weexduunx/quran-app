import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTafsirStore, TafsirBook, TafsirContent } from '@/stores/tafsirStore';
import { tafsirApi } from '@/services/tafsirApi';
import { UthmaniText } from './UthmaniText';
import { TafsirAudioPlayer } from './TafsirAudioPlayer';
import { Verse } from '@/stores/quranStore';

interface TafsirViewerProps {
  surahId: number;
  verseId: number;
  verse?: Verse;
  selectedBook?: TafsirBook | null;
  onClose: () => void;
}

export const TafsirViewer: React.FC<TafsirViewerProps> = ({
  surahId,
  verseId,
  verse,
  selectedBook,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [tafsirContent, setTafsirContent] = useState<TafsirContent | null>(null);
  const [selectedBookState, setSelectedBookState] = useState<TafsirBook | null>(selectedBook || null);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

  const {
    books,
    getTafsirContent,
    setTafsirContent: storeTafsirContent,
    isFavorite,
    addToFavorites,
    removeFromFavorites,
  } = useTafsirStore();

  const availableBooks = books.filter(book => book.available);

  useEffect(() => {
    if (selectedBookState) {
      loadTafsirContent(selectedBookState.id);
    }
  }, [selectedBookState, surahId, verseId]);

  const loadTafsirContent = async (bookId: number) => {
    try {
      setIsLoading(true);

      // Vérifier d'abord dans le store local
      const cachedContent = getTafsirContent(bookId, surahId, verseId);
      if (cachedContent) {
        setTafsirContent(cachedContent);
        setIsLoading(false);
        return;
      }

      // Charger depuis l'API
      const content = await tafsirApi.getTafsirContent(bookId, surahId, verseId);
      if (content) {
        // Sauvegarder dans le store
        const key = `${bookId}-${surahId}-${verseId}`;
        storeTafsirContent(key, content);
        setTafsirContent(content);
      } else {
        Alert.alert(
          'Contenu non disponible',
          'Le tafsir pour ce verset n\'est pas encore disponible.'
        );
      }
    } catch (error) {
      console.error('Erreur lors du chargement du tafsir:', error);
      Alert.alert('Erreur', 'Impossible de charger le tafsir.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookSelect = (book: TafsirBook) => {
    setSelectedBookState(book);
    setTafsirContent(null);
  };

  const toggleFavorite = (bookId: number) => {
    if (isFavorite(bookId)) {
      removeFromFavorites(bookId);
    } else {
      addToFavorites(bookId);
    }
  };

  const getLanguageIcon = (language: string) => {
    switch (language) {
      case 'arabic': return 'language';
      case 'french': return 'chatbubble';
      case 'wolof': return 'earth';
      case 'both': return 'globe';
      default: return 'language';
    }
  };

  const getLanguageText = (language: string) => {
    switch (language) {
      case 'arabic': return 'Arabe';
      case 'french': return 'Français';
      case 'wolof': return 'Wolof';
      case 'both': return 'Bilingue';
      default: return 'Arabe';
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1B5E20', '#2E7D32', '#1B5E20']}
        style={styles.header}
      >
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Tafsir</Text>
          <Text style={styles.headerSubtitle}>
            Sourate {surahId} - Verset {verseId}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sélection du livre de tafsir */}
        <View style={styles.bookSelectionSection}>
          <Text style={styles.sectionTitle}>Choisir un livre de Tafsir</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.booksContainer}
            contentContainerStyle={styles.booksContent}
          >
            {availableBooks.map((book) => (
              <TouchableOpacity
                key={book.id}
                style={[
                  styles.bookCard,
                  selectedBookState?.id === book.id && styles.selectedBookCard
                ]}
                onPress={() => handleBookSelect(book)}
              >
                <View style={styles.bookHeader}>
                  <Text style={[
                    styles.bookTitle,
                    selectedBookState?.id === book.id && styles.selectedBookTitle
                  ]}>
                    {book.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => toggleFavorite(book.id)}
                    style={styles.favoriteButton}
                  >
                    <Ionicons
                      name={isFavorite(book.id) ? "heart" : "heart-outline"}
                      size={16}
                      color={isFavorite(book.id) ? "#E91E63" : "#666"}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={[
                  styles.bookAuthor,
                  selectedBookState?.id === book.id && styles.selectedBookAuthor
                ]}>
                  {book.author}
                </Text>

                <View style={styles.bookFooter}>
                  <View style={styles.languageTag}>
                    <Ionicons
                      name={getLanguageIcon(book.language)}
                      size={12}
                      color="#1B5E20"
                    />
                    <Text style={styles.languageText}>
                      {getLanguageText(book.language)}
                    </Text>
                  </View>

                  {book.featured && (
                    <View style={styles.featuredBadge}>
                      <Ionicons name="star" size={10} color="#D4AF37" />
                      <Text style={styles.featuredText}>Populaire</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Contenu du tafsir */}
        {selectedBookState && (
          <View style={styles.tafsirContentSection}>
            <View style={styles.contentHeader}>
              <Ionicons name="book-outline" size={20} color="#D4AF37" />
              <Text style={styles.contentTitle}>
                {selectedBookState.title}
              </Text>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1B5E20" />
                <Text style={styles.loadingText}>Chargement du tafsir...</Text>
              </View>
            ) : tafsirContent ? (
              <View style={styles.contentContainer}>
                {tafsirContent.contentArabic && (
                  <View style={styles.arabicContentContainer}>
                    <UthmaniText size="medium" style={styles.arabicContent}>
                      {tafsirContent.contentArabic}
                    </UthmaniText>
                  </View>
                )}

                <View style={styles.mainContentContainer}>
                  <Text style={styles.mainContent}>
                    {tafsirContent.content}
                  </Text>
                </View>

                {/* Bouton audio pour les tafsirs wolof */}
                {selectedBookState?.language === 'wolof' && (
                  <TouchableOpacity
                    style={styles.audioButton}
                    onPress={() => setShowAudioPlayer(true)}
                  >
                    <Ionicons name="play-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.audioButtonText}>
                      Écouter le Tafsir en Audio
                    </Text>
                    <Ionicons name="headset" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                )}

                {tafsirContent.reference && (
                  <View style={styles.referenceContainer}>
                    <Ionicons name="library" size={14} color="#666" />
                    <Text style={styles.referenceText}>
                      {tafsirContent.reference}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noContentContainer}>
                <Ionicons name="document-text-outline" size={48} color="#ccc" />
                <Text style={styles.noContentText}>
                  Sélectionnez un livre de tafsir pour voir le contenu
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Lecteur audio Tafsir */}
      {selectedBookState && verse && (
        <TafsirAudioPlayer
          visible={showAudioPlayer}
          onClose={() => setShowAudioPlayer(false)}
          tafsirBook={selectedBookState}
          verse={verse}
          content={tafsirContent || undefined}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F0',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'serif',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#A5D6A7',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bookSelectionSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 16,
    fontFamily: 'serif',
  },
  booksContainer: {
    marginBottom: 8,
  },
  booksContent: {
    paddingRight: 20,
  },
  bookCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 160,
    borderWidth: 1,
    borderColor: '#E8DCC0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedBookCard: {
    borderColor: '#1B5E20',
    borderWidth: 2,
    backgroundColor: '#F1F8E9',
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  selectedBookTitle: {
    color: '#1B5E20',
  },
  favoriteButton: {
    padding: 4,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  selectedBookAuthor: {
    color: '#1B5E20',
  },
  bookFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 94, 32, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  languageText: {
    fontSize: 10,
    color: '#1B5E20',
    marginLeft: 4,
    fontWeight: '600',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  featuredText: {
    fontSize: 9,
    color: '#D4AF37',
    marginLeft: 2,
    fontWeight: 'bold',
  },
  tafsirContentSection: {
    marginBottom: 24,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginLeft: 8,
    fontFamily: 'serif',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  contentContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8DCC0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  arabicContentContainer: {
    backgroundColor: '#F8F6F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  arabicContent: {
    textAlign: 'right',
    color: '#333',
  },
  mainContentContainer: {
    marginBottom: 16,
  },
  mainContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    textAlign: 'left',
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8DCC0',
  },
  referenceText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 6,
  },
  noContentContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noContentText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B5E20',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    justifyContent: 'center',
  },
  audioButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
});