import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useReciterStore, Reciter } from '@/stores/reciterStore';

export default function HafizScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const {
    reciters,
    selectedReciter,
    setSelectedReciter,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
  } = useReciterStore();

  const filteredReciters = reciters.filter(reciter => {
    const matchesSearch = reciter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         reciter.nameArabic.includes(searchQuery) ||
                         reciter.country.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' ||
                           (selectedCategory === 'featured' && reciter.featured) ||
                           (selectedCategory === 'favorites' && isFavorite(reciter.id));

    return matchesSearch && matchesCategory;
  });

  const handleReciterSelect = (reciter: Reciter) => {
    setSelectedReciter(reciter);
    Alert.alert(
      'Récitateur sélectionné',
      `${reciter.name} est maintenant votre récitateur par défaut.`,
      [{ text: 'OK' }]
    );
  };

  const handleToggleFavorite = (reciter: Reciter) => {
    if (isFavorite(reciter.id)) {
      removeFromFavorites(reciter.id);
    } else {
      addToFavorites(reciter.id);
    }
  };

  const categories = [
    { id: 'all', name: 'Tous', icon: 'library' },
    { id: 'featured', name: 'Populaires', icon: 'star' },
    { id: 'favorites', name: 'Favoris', icon: 'heart' },
  ];

  const renderReciterCard = (reciter: Reciter) => {
    const isSelected = selectedReciter?.id === reciter.id;
    const isReciterFavorite = isFavorite(reciter.id);

    // Vérification des données du récitateur
    if (!reciter || !reciter.name || !reciter.id) {
      return null;
    }

    // Styles pour la carte
    const getTextStyle = (baseStyle: any, selectedStyle: any, featuredStyle: any, normalStyle: any) => {
      if (isSelected) return [baseStyle, selectedStyle];
      if (reciter.featured) return [baseStyle, featuredStyle];
      return [baseStyle, normalStyle];
    };

    const gradientColors: [string, string] = isSelected
      ? ['#4CAF50', '#66BB6A']
      : reciter.featured
        ? ['#1B5E20', '#2E7D32']
        : ['#F5F5F5', '#FFFFFF'];

    const iconColor = isSelected
      ? '#E8F5E8'
      : reciter.featured
        ? '#A5D6A7'
        : '#666';

    return (
      <TouchableOpacity
        key={`reciter-${reciter.id}-${isSelected ? 'selected' : 'unselected'}`}
        style={[styles.reciterCard, isSelected && styles.selectedCard]}
        onPress={() => handleReciterSelect(reciter)}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.cardGradient}
        >
          <View style={styles.cardContent}>
            <View style={styles.reciterInfo}>
              <View style={styles.reciterHeader}>
                <Text style={getTextStyle(
                  styles.reciterName,
                  styles.selectedNameText,
                  styles.featuredText,
                  styles.normalText
                )}>
                  {reciter.name}
                </Text>
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                    <Text style={styles.selectedText}>Sélectionné</Text>
                  </View>
                )}
              </View>
              <Text style={getTextStyle(
                styles.reciterNameArabic,
                styles.selectedArabicText,
                styles.featuredArabicText,
                styles.normalArabicText
              )}>
                {reciter.nameArabic}
              </Text>
              <View style={styles.locationContainer}>
                <Ionicons
                  name="location"
                  size={14}
                  color={iconColor}
                />
                <Text style={getTextStyle(
                  styles.country,
                  styles.selectedCountryText,
                  styles.featuredCountryText,
                  styles.normalCountryText
                )}>
                  {reciter.country}
                </Text>
                {reciter.style && (
                  <>
                    <Text style={getTextStyle(
                      styles.country,
                      styles.selectedCountryText,
                      styles.featuredCountryText,
                      styles.normalCountryText
                    )}> • </Text>
                    <Text style={getTextStyle(
                      styles.country,
                      styles.selectedCountryText,
                      styles.featuredCountryText,
                      styles.normalCountryText
                    )}>
                      {reciter.style}
                    </Text>
                  </>
                )}
              </View>
              <Text style={getTextStyle(
                styles.description,
                styles.selectedDescriptionText,
                styles.featuredDescriptionText,
                styles.normalDescriptionText
              )}>
                {reciter.description}
              </Text>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[
                  styles.playButton,
                  reciter.featured && styles.featuredPlayButton
                ]}
                onPress={() => handleReciterSelect(reciter)}
              >
                <Ionicons
                  name={isSelected ? "checkmark" : "play"}
                  size={20}
                  color={reciter.featured ? '#1B5E20' : '#FFFFFF'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={() => handleToggleFavorite(reciter)}
              >
                <Ionicons
                  name={isReciterFavorite ? "heart" : "heart-outline"}
                  size={18}
                  color={isReciterFavorite ? "#E91E63" : (reciter.featured ? '#D4AF37' : '#666')}
                />
              </TouchableOpacity>
            </View>
          </View>

          {reciter.featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color="#D4AF37" />
              <Text style={styles.featuredBadgeText}>Populaire</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1B5E20', '#2E7D32', '#1B5E20']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Ionicons name="person-circle" size={40} color="#D4AF37" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Récitateurs du Coran</Text>
            <Text style={styles.headerSubtitle}>Les plus grandes voix de l'Islam</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un récitateur..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedReciter && (
          <View style={styles.currentReciterSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Récitateur Actuel</Text>
            </View>
            <View style={styles.currentReciterCard}>
              <Text style={styles.currentReciterName}>{selectedReciter.name}</Text>
              <Text style={styles.currentReciterArabic}>{selectedReciter.nameArabic}</Text>
              <Text style={styles.currentReciterCountry}>{selectedReciter.country}</Text>
            </View>
          </View>
        )}

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
          <Ionicons name="person-circle" size={20} color="#D4AF37" />
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'all' ? 'Tous les Récitateurs' :
             selectedCategory === 'featured' ? 'Récitateurs Populaires' :
             selectedCategory === 'favorites' ? 'Mes Favoris' : 'Récitateurs'}
          </Text>
          <Text style={styles.resultCount}>({filteredReciters.length})</Text>
        </View>

        <View style={styles.recitersList}>
          {filteredReciters.map(renderReciterCard)}
        </View>

        {filteredReciters.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="person-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Aucun récitateur trouvé</Text>
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
    paddingVertical: 12,
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
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginLeft: 8,
    fontFamily: 'serif',
  },
  recitersList: {
    marginBottom: 24,
  },
  reciterCard: {
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
    position: 'relative',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  reciterInfo: {
    flex: 1,
  },
  reciterName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    flex: 1,
    flexWrap: 'wrap',
  },
  featuredText: {
    color: '#FFFFFF',
  },
  reciterNameArabic: {
    fontSize: 18,
    color: '#666',
    fontFamily: 'NotoSansArabic-Bold',
    textAlign: 'right',
    marginBottom: 8,
  },
  featuredArabicText: {
    color: '#E8F5E8',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  country: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  featuredCountryText: {
    color: '#A5D6A7',
  },
  description: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  featuredDescriptionText: {
    color: '#C8E6C9',
  },
  cardActions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 12,
  },
  playButton: {
    backgroundColor: '#1B5E20',
    borderRadius: 24,
    padding: 12,
    marginBottom: 8,
  },
  featuredPlayButton: {
    backgroundColor: '#D4AF37',
  },
  favoriteButton: {
    padding: 8,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredBadgeText: {
    fontSize: 10,
    color: '#D4AF37',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  categoriesSection: {
    marginBottom: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8DCC0',
    shadowColor: '#D4AF37',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryText: {
    fontSize: 12,
    color: '#1B5E20',
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Nouveaux styles
  selectedCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  reciterHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    minHeight: 24,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    flexShrink: 0,
  },
  selectedText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 2,
    fontWeight: 'bold',
  },
  currentReciterSection: {
    marginBottom: 24,
  },
  currentReciterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  currentReciterName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
    textAlign: 'center',
  },
  currentReciterArabic: {
    fontSize: 18,
    color: '#4CAF50',
    fontFamily: 'NotoSansArabic-Bold',
    textAlign: 'center',
    marginTop: 4,
  },
  currentReciterCountry: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  categoriesContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  categoriesContent: {
    paddingHorizontal: 4,
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
  resultCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
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
  // Styles pour les récitateurs sélectionnés
  selectedNameText: {
    color: '#FFFFFF',
  },
  selectedArabicText: {
    color: '#E8F5E8',
  },
  selectedCountryText: {
    color: '#E8F5E8',
  },
  selectedDescriptionText: {
    color: '#F1F8E9',
  },
  // Styles pour les récitateurs normaux (non-featured, non-selected)
  normalText: {
    color: '#333',
  },
  normalArabicText: {
    color: '#666',
  },
  normalCountryText: {
    color: '#666',
  },
  normalDescriptionText: {
    color: '#888',
  },
});