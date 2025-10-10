import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Reciter {
  id: number;
  name: string;
  nameArabic: string;
  country: string;
  description: string;
  featured?: boolean;
}

const popularReciters: Reciter[] = [
  {
    id: 1,
    name: 'Mishary Rashid Al-Afasy',
    nameArabic: 'مشاري بن راشد العفاسي',
    country: 'Koweït',
    description: 'L\'une des voix les plus célèbres du monde islamique',
    featured: true,
  },
  {
    id: 2,
    name: 'Abdul Rahman Al-Sudais',
    nameArabic: 'عبد الرحمن السديس',
    country: 'Arabie Saoudite',
    description: 'Imam de la Grande Mosquée de La Mecque',
    featured: true,
  },
  {
    id: 3,
    name: 'Saad Al-Ghamidi',
    nameArabic: 'سعد الغامدي',
    country: 'Arabie Saoudite',
    description: 'Réputé pour sa voix mélodieuse et émouvante',
  },
  {
    id: 4,
    name: 'Ahmed Ali Al-Ajmi',
    nameArabic: 'أحمد علي العجمي',
    country: 'Arabie Saoudite',
    description: 'Connu pour ses récitations expressives',
  },
  {
    id: 5,
    name: 'Maher Al-Muaiqly',
    nameArabic: 'ماهر المعيقلي',
    country: 'Arabie Saoudite',
    description: 'Imam de la Mosquée du Prophète à Médine',
  },
  {
    id: 6,
    name: 'Nasser Al-Qatami',
    nameArabic: 'ناصر القطامي',
    country: 'Arabie Saoudite',
    description: 'Voix puissante et récitation précise',
  },
];

export default function HafizScreen() {
  const renderReciterCard = (reciter: Reciter) => (
    <TouchableOpacity key={reciter.id} style={styles.reciterCard}>
      <LinearGradient
        colors={reciter.featured ? ['#1B5E20', '#2E7D32'] : ['#F5F5F5', '#FFFFFF']}
        style={styles.cardGradient}
      >
        <View style={styles.cardContent}>
          <View style={styles.reciterInfo}>
            <Text style={[
              styles.reciterName,
              reciter.featured && styles.featuredText
            ]}>
              {reciter.name}
            </Text>
            <Text style={[
              styles.reciterNameArabic,
              reciter.featured && styles.featuredArabicText
            ]}>
              {reciter.nameArabic}
            </Text>
            <View style={styles.locationContainer}>
              <Ionicons
                name="location"
                size={14}
                color={reciter.featured ? '#A5D6A7' : '#666'}
              />
              <Text style={[
                styles.country,
                reciter.featured && styles.featuredCountryText
              ]}>
                {reciter.country}
              </Text>
            </View>
            <Text style={[
              styles.description,
              reciter.featured && styles.featuredDescriptionText
            ]}>
              {reciter.description}
            </Text>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity style={[
              styles.playButton,
              reciter.featured && styles.featuredPlayButton
            ]}>
              <Ionicons
                name="play"
                size={20}
                color={reciter.featured ? '#1B5E20' : '#FFFFFF'}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.favoriteButton}>
              <Ionicons
                name="heart-outline"
                size={18}
                color={reciter.featured ? '#D4AF37' : '#666'}
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
          <Text style={styles.searchPlaceholder}>Rechercher un récitateur...</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Ionicons name="star" size={20} color="#D4AF37" />
          <Text style={styles.sectionTitle}>Récitateurs Populaires</Text>
        </View>

        <View style={styles.recitersList}>
          {popularReciters.map(renderReciterCard)}
        </View>

        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Parcourir par catégorie</Text>

          <View style={styles.categoriesGrid}>
            <TouchableOpacity style={styles.categoryCard}>
              <Ionicons name="library" size={24} color="#1B5E20" />
              <Text style={styles.categoryText}>Lecture complète</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.categoryCard}>
              <Ionicons name="musical-notes" size={24} color="#1B5E20" />
              <Text style={styles.categoryText}>Tajweed</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.categoryCard}>
              <Ionicons name="time" size={24} color="#1B5E20" />
              <Text style={styles.categoryText}>Récentes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.categoryCard}>
              <Ionicons name="heart" size={24} color="#1B5E20" />
              <Text style={styles.categoryText}>Favoris</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  searchPlaceholder: {
    marginLeft: 12,
    color: '#666',
    fontSize: 16,
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
});