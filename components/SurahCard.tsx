import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Surah } from '../stores/quranStore';
import { repairArabicText } from '../utils/textUtils';
import { UthmaniText } from './UthmaniText';

interface SurahCardProps {
  surah: Surah;
  onPress: (surah: Surah) => void;
}

const IslamicOrnament = () => (
  <View style={styles.ornamentContainer}>
    <View style={styles.ornamentShape}>
      <View style={styles.innerOrnament} />
    </View>
  </View>
);

export const SurahCard: React.FC<SurahCardProps> = ({ surah, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(surah)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#F8F6F0', '#FFFEF7', '#F8F6F0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardContent}>
          {/* Header avec numéro */}
          <View style={styles.header}>
            <View style={styles.numberWrapper}>
              <LinearGradient
                colors={['#D4AF37', '#F4E4BC', '#D4AF37']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.numberContainer}
              >
                <Text style={styles.number}>{surah.number}</Text>
              </LinearGradient>
            </View>

            <View style={styles.typeContainer}>
              <Text style={styles.revelationType}>{surah.revelation_type}</Text>
              <Text style={styles.versesCount}>{surah.verses_count} Ayat</Text>
            </View>
          </View>

          {/* Nom arabe */}
          <View style={styles.arabicSection}>
            <UthmaniText
              size="xlarge"
              style={styles.arabicName}
            >
              {repairArabicText(surah.name_arabic)}
            </UthmaniText>
            <IslamicOrnament />
          </View>

          {/* Ligne décorative */}
          <View style={styles.decorativeLine}>
            <View style={styles.goldLine} />
            <View style={styles.centerDot} />
            <View style={styles.goldLine} />
          </View>

          {/* Noms français et translitération */}
          <View style={styles.nameSection}>
            <Text style={styles.frenchName}>{surah.name_french}</Text>
            <Text style={styles.transliteration}>{surah.name_transliteration}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#D4AF37',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  cardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8DCC0',
  },
  cardContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  numberWrapper: {
    alignItems: 'center',
  },
  numberContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  number: {
    color: '#1B5E20',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'serif',
  },
  typeContainer: {
    alignItems: 'flex-end',
  },
  revelationType: {
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  versesCount: {
    fontSize: 11,
    color: '#A0916D',
    marginTop: 2,
  },
  arabicSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  arabicName: {
    textAlign: 'center',
    color: '#1B5E20',
    marginBottom: 8,
    textShadowColor: 'rgba(212, 175, 55, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  ornamentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ornamentShape: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D4AF37',
    opacity: 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerOrnament: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFEF7',
  },
  decorativeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  goldLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D4AF37',
    opacity: 0.5,
  },
  centerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4AF37',
    marginHorizontal: 12,
    opacity: 0.7,
  },
  nameSection: {
    alignItems: 'center',
  },
  frenchName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 4,
    fontFamily: 'serif',
  },
  transliteration: {
    fontSize: 14,
    color: '#8B7355',
    fontStyle: 'italic',
    fontFamily: 'serif',
  },
});