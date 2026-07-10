import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { prayerTimesService, PrayerTime } from '@/services/prayerTimesService';

const { width } = Dimensions.get('window');

interface IslamicFeature {
  id: string;
  title: string;
  icon: string;
  color: string;
  route?: string;
  action?: () => void;
}

export const IslamicHomeScreen: React.FC = () => {
  const [userName] = useState('Mahmudoul Dipu'); // Nom de l'utilisateur
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPrayer, setCurrentPrayer] = useState<PrayerTime | null>(null);
  const [nextPrayer, setNextPrayer] = useState<PrayerTime | null>(null);
  const [timeUntilNext, setTimeUntilNext] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const islamicFeatures: IslamicFeature[] = [
    {
      id: 'prayers',
      title: 'PRIÈRES',
      icon: 'time-outline',
      color: '#E8F5E8',
    },
    {
      id: 'qibla',
      title: 'QIBLA',
      icon: 'navigate-outline',
      color: '#E8F5E8',
    },
    {
      id: 'quran',
      title: 'CORAN',
      icon: 'book-outline',
      color: '#1B5E20',
      route: '/explore',
    },
    {
      id: 'calendar',
      title: 'CALENDRIER',
      icon: 'calendar-outline',
      color: '#E8F5E8',
    },
    {
      id: 'duas',
      title: 'DUAS',
      icon: 'heart-outline',
      color: '#1B5E20',
    },
    {
      id: 'popular',
      title: 'POPULAIRES',
      icon: 'star-outline',
      color: '#1B5E20',
    },
    {
      id: 'halal',
      title: 'HALAL',
      icon: 'checkmark-circle-outline',
      color: '#1B5E20',
    },
    {
      id: 'maps',
      title: 'CARTES',
      icon: 'map-outline',
      color: '#E8F5E8',
    },
    {
      id: 'premium',
      title: 'PREMIUM',
      icon: 'diamond-outline',
      color: '#1B5E20',
    },
  ];

  useEffect(() => {
    // Fonction pour mettre à jour les heures de prière
    const updatePrayerTimes = () => {
      const dailyTimes = prayerTimesService.calculatePrayerTimes();
      setCurrentPrayer(dailyTimes.currentPrayer);
      setNextPrayer(dailyTimes.nextPrayer);
      setTimeUntilNext(prayerTimesService.getTimeUntilNextPrayer());
    };

    // Mise à jour initiale
    updatePrayerTimes();

    // Timer pour mettre à jour les prières et l'heure
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      updatePrayerTimes();
    }, 1000);

    return () => clearInterval(timer);
  }, []);


  const handleFeaturePress = (feature: IslamicFeature) => {
    if (feature.route) {
      router.push(feature.route as any);
    } else if (feature.action) {
      feature.action();
    } else {
      console.log(`Feature ${feature.title} pressed - not implemented yet`);
    }
  };

  // Fonction pour formater la date française
  const formatFrenchDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Fonction pour calculer approximativement la date islamique
  const getIslamicDate = (date: Date) => {
    // Calcul approximatif de la date hégiréenne (simplifié)
    const islamicMonths = [
      'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
      'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban',
      'Ramadan', 'Shawwal', 'Dhul Qidah', 'Dhul Hijjah'
    ];

    // Estimation approximative (pour une vraie app, utiliser une bibliothèque)
    const islamicYear = 1446; // Approximation pour 2024-2025
    const islamicMonth = islamicMonths[5]; // Jumada al-Thani
    const islamicDay = Math.floor((date.getDate() + 15) % 30) + 1;

    return `${islamicDay} ${islamicMonth} ${islamicYear} AH`;
  };

  // Fonction pour formater l'heure actuelle
  const formatCurrentTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />

      {/* Header avec date islamique */}
      <View style={styles.dateHeader}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar" size={16} color="white" />
          <Text style={styles.dateText}>{formatFrenchDate(currentTime)}</Text>
          <Text style={styles.islamicDate}>{getIslamicDate(currentTime)}</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="share" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Image de mosquée avec overlay prière */}
      <View style={styles.mosqueSection}>
        <ImageBackground
          source={require('@/assets/images/dakar-mosque.jpg')}
          style={styles.mosqueBackground}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.6)']}
            style={styles.mosqueOverlay}
          >
            <View style={styles.prayerTimeContainer}>
              <View style={styles.soundIcon}>
                <Ionicons name="volume-medium" size={24} color="white" />
              </View>
              <Text style={styles.currentPrayerName}>
                {currentPrayer?.name || 'En cours...'}
              </Text>
              <Text style={styles.currentTime}>{formatCurrentTime(currentTime)}</Text>
              <Text style={styles.countdown}>
                {timeUntilNext.hours > 0 || timeUntilNext.minutes > 0
                  ? `(-${timeUntilNext.hours}:${timeUntilNext.minutes.toString().padStart(2, '0')}:${timeUntilNext.seconds.toString().padStart(2, '0')})`
                  : ''}
              </Text>
              <Text style={styles.location}>Dakar</Text>
              <View style={styles.dots}>
                <View style={[styles.dot, styles.activeDot]} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>

      {/* Grille d'icônes */}
      <View style={styles.iconGrid}>
        {islamicFeatures.map((feature) => (
          <TouchableOpacity
            key={feature.id}
            style={styles.iconItem}
            onPress={() => handleFeaturePress(feature)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: feature.color }]}>
              <Ionicons
                name={feature.icon as any}
                size={24}
                color={feature.color === '#1B5E20' ? '#FFFFFF' : '#D4AF37'}
              />
            </View>
            <Text style={styles.iconLabel}>{feature.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  dateHeader: {
    backgroundColor: '#1B5E20',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  islamicDate: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginLeft: 8,
  },
  mosqueSection: {
    height: 300,
  },
  mosqueBackground: {
    flex: 1,
  },
  mosqueOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prayerTimeContainer: {
    alignItems: 'center',
  },
  soundIcon: {
    marginBottom: 16,
  },
  currentPrayerName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  currentTime: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  countdown: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginTop: 4,
  },
  location: {
    color: 'white',
    fontSize: 18,
    marginTop: 8,
    fontWeight: '500',
  },
  dots: {
    flexDirection: 'row',
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: 'white',
  },
  iconGrid: {
    backgroundColor: 'white',
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  iconItem: {
    width: (width - 80) / 3,
    alignItems: 'center',
    marginBottom: 30,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
});