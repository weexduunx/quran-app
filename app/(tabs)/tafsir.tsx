import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface TafsirBook {
  id: number;
  title: string;
  titleArabic: string;
  author: string;
  authorArabic: string;
  description: string;
  language: 'arabic' | 'french' | 'both';
  category: 'classical' | 'modern' | 'contemporary';
  featured?: boolean;
}

const tafsirBooks: TafsirBook[] = [
  {
    id: 1,
    title: 'Tafsir Ibn Kathir',
    titleArabic: 'تفسير ابن كثير',
    author: 'Ibn Kathir',
    authorArabic: 'ابن كثير',
    description: 'L\'un des tafsirs les plus respectés, basé sur le Coran, la Sunnah et les paroles des Compagnons.',
    language: 'both',
    category: 'classical',
    featured: true,
  },
  {
    id: 2,
    title: 'Tafsir At-Tabari',
    titleArabic: 'تفسير الطبري',
    author: 'At-Tabari',
    authorArabic: 'الطبري',
    description: 'Le plus ancien tafsir complet existant, source de référence pour tous les commentaires ultérieurs.',
    language: 'arabic',
    category: 'classical',
    featured: true,
  },
  {
    id: 3,
    title: 'Tafsir Al-Qurtubi',
    titleArabic: 'تفسير القرطبي',
    author: 'Al-Qurtubi',
    authorArabic: 'القرطبي',
    description: 'Excellent pour comprendre les règles juridiques dérivées du Coran.',
    language: 'arabic',
    category: 'classical',
  },
  {
    id: 4,
    title: 'Fi Zilal Al-Quran',
    titleArabic: 'في ظلال القرآن',
    author: 'Sayyid Qutb',
    authorArabic: 'سيد قطب',
    description: 'Tafsir moderne qui met l\'accent sur l\'application pratique du Coran dans la vie contemporaine.',
    language: 'both',
    category: 'modern',
  },
  {
    id: 5,
    title: 'Tafsir As-Sa\'di',
    titleArabic: 'تفسير السعدي',
    author: 'Abdur-Rahman As-Sa\'di',
    authorArabic: 'عبد الرحمن السعدي',
    description: 'Tafsir concis et clair, idéal pour les débutants.',
    language: 'arabic',
    category: 'contemporary',
  },
];

const categories = [
  { id: 'all', name: 'Tous', icon: 'library' },
  { id: 'classical', name: 'Classiques', icon: 'book' },
  { id: 'modern', name: 'Modernes', icon: 'newspaper' },
  { id: 'contemporary', name: 'Contemporains', icon: 'time' },
];

export default function TafsirScreen() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTafsirs = tafsirBooks.filter(book => {
    const matchesCategory = selectedCategory === 'all' || book.category === selectedCategory;
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getLanguageIcon = (language: string) => {
    switch (language) {
      case 'arabic': return 'language';
      case 'french': return 'chatbubble';
      case 'both': return 'globe';
      default: return 'language';
    }
  };

  const getLanguageText = (language: string) => {
    switch (language) {
      case 'arabic': return 'Arabe';
      case 'french': return 'Français';
      case 'both': return 'Bilingue';
      default: return 'Arabe';
    }
  };

  const renderTafsirCard = (book: TafsirBook) => (
    <TouchableOpacity key={book.id} style={styles.tafsirCard}>
      <LinearGradient
        colors={book.featured ? ['#1B5E20', '#2E7D32'] : ['#FFFFFF', '#F8F6F0']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={[
              styles.bookTitle,
              book.featured && styles.featuredText
            ]}>
              {book.title}
            </Text>
            <Text style={[
              styles.bookTitleArabic,
              book.featured && styles.featuredArabicText
            ]}>
              {book.titleArabic}
            </Text>
          </View>

          {book.featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color="#D4AF37" />
            </View>
          )}
        </View>

        <View style={styles.authorContainer}>
          <Ionicons
            name="person"
            size={14}
            color={book.featured ? '#A5D6A7' : '#666'}
          />
          <Text style={[
            styles.authorName,
            book.featured && styles.featuredAuthorText
          ]}>
            {book.author}
          </Text>
          <Text style={[
            styles.authorNameArabic,
            book.featured && styles.featuredAuthorText
          ]}>
            ({book.authorArabic})
          </Text>
        </View>

        <Text style={[
          styles.description,
          book.featured && styles.featuredDescriptionText
        ]}>
          {book.description}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.languageTag}>
            <Ionicons
              name={getLanguageIcon(book.language)}
              size={12}
              color={book.featured ? '#D4AF37' : '#1B5E20'}
            />
            <Text style={[
              styles.languageText,
              book.featured && styles.featuredLanguageText
            ]}>
              {getLanguageText(book.language)}
            </Text>
          </View>

          <TouchableOpacity style={[
            styles.readButton,
            book.featured && styles.featuredReadButton
          ]}>
            <Ionicons
              name="book-outline"
              size={16}
              color={book.featured ? '#1B5E20' : '#FFFFFF'}
            />
            <Text style={[
              styles.readButtonText,
              book.featured && styles.featuredReadButtonText
            ]}>
              Lire
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1B5E20', '#2E7D32', '#1B5E20']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Ionicons name="library" size={40} color="#D4AF37" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Tafsir du Coran</Text>
            <Text style={styles.headerSubtitle}>Commentaires et explications</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un tafsir ou auteur..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.activeCategoryButton
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Ionicons
                name={category.icon as any}
                size={16}
                color={selectedCategory === category.id ? '#FFFFFF' : '#1B5E20'}
              />
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === category.id && styles.activeCategoryButtonText
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Ionicons name="book" size={20} color="#D4AF37" />
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'all' ? 'Tous les Tafsirs' :
             categories.find(c => c.id === selectedCategory)?.name + ' Tafsirs'}
          </Text>
          <Text style={styles.resultCount}>({filteredTafsirs.length})</Text>
        </View>

        <View style={styles.tafsirsList}>
          {filteredTafsirs.map(renderTafsirCard)}
        </View>

        {filteredTafsirs.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Aucun tafsir trouvé</Text>
            <Text style={styles.emptySubtext}>
              Essayez de modifier vos critères de recherche
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  content: {
    flex: 1,
  },
  categoriesContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    paddingRight: 40,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E8DCC0',
  },
  activeCategoryButton: {
    backgroundColor: '#1B5E20',
    borderColor: '#1B5E20',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#1B5E20',
    marginLeft: 6,
    fontWeight: '600',
  },
  activeCategoryButtonText: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginLeft: 8,
    fontFamily: 'serif',
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  tafsirsList: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  tafsirCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  cardGradient: {
    padding: 16,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  featuredText: {
    color: '#FFFFFF',
  },
  bookTitleArabic: {
    fontSize: 18,
    color: '#666',
    fontFamily: 'NotoSansArabic-Bold',
    textAlign: 'right',
  },
  featuredArabicText: {
    color: '#E8F5E8',
  },
  featuredBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 12,
    padding: 6,
    marginLeft: 8,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorName: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    fontWeight: '600',
  },
  featuredAuthorText: {
    color: '#A5D6A7',
  },
  authorNameArabic: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'NotoSansArabic-Bold',
  },
  description: {
    fontSize: 13,
    color: '#888',
    lineHeight: 20,
    marginBottom: 16,
  },
  featuredDescriptionText: {
    color: '#C8E6C9',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 94, 32, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  languageText: {
    fontSize: 11,
    color: '#1B5E20',
    marginLeft: 4,
    fontWeight: '600',
  },
  featuredLanguageText: {
    color: '#D4AF37',
  },
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B5E20',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  featuredReadButton: {
    backgroundColor: '#D4AF37',
  },
  readButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  featuredReadButtonText: {
    color: '#1B5E20',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
});