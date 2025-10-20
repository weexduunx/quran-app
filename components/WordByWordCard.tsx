/**
 * Composant pour affichage mot par mot avec traductions
 * Inspiré du design de quranwbw.com
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UthmaniText } from './UthmaniText';

interface WordData {
  arabic: string;
  transliteration: string;
  french: string;
  position: number;
}

interface WordByWordCardProps {
  words: WordData[];
  verseNumber: number;
  isHighlighted?: boolean;
  currentWordIndex?: number;
}

const IslamicOrnament = () => (
  <View style={styles.ornamentContainer}>
    <View style={styles.ornamentCircle}>
      <View style={styles.ornamentDot} />
    </View>
  </View>
);

export const WordByWordCard: React.FC<WordByWordCardProps> = ({
  words,
  verseNumber,
  isHighlighted = false,
  currentWordIndex = -1,
}) => {
  return (
    <View style={[styles.container, isHighlighted && styles.highlighted]}>
      <LinearGradient
        colors={['#FFFEF7', '#F8F6F0', '#FFFEF7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardContent}>
          {/* Header avec numéro de verset */}
          <View style={styles.header}>
            <IslamicOrnament />
            <LinearGradient
              colors={['#D4AF37', '#F4E4BC', '#D4AF37']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.verseNumberContainer}
            >
              <Text style={styles.verseNumber}>{verseNumber}</Text>
            </LinearGradient>
            <IslamicOrnament />
          </View>

          {/* Mots en arabe */}
          <View style={styles.arabicWordsContainer}>
            {words.map((word, index) => (
              <View
                key={index}
                style={[
                  styles.arabicWordContainer,
                  currentWordIndex === index && styles.currentWord
                ]}
              >
                <UthmaniText
                  size="large"
                  style={[
                    styles.arabicWord,
                    currentWordIndex === index && styles.currentArabicWord
                  ]}
                >
                  {word.arabic}
                </UthmaniText>
              </View>
            ))}
          </View>

          {/* Ligne décorative */}
          <View style={styles.decorativeLine}>
            <View style={styles.goldLine} />
            <View style={styles.centerOrnament}>
              <View style={styles.ornamentSquare} />
            </View>
            <View style={styles.goldLine} />
          </View>

          {/* Translittération */}
          <View style={styles.transliterationContainer}>
            {words.map((word, index) => (
              <View
                key={index}
                style={[
                  styles.transliterationWordContainer,
                  currentWordIndex === index && styles.currentWord
                ]}
              >
                <Text
                  style={[
                    styles.transliterationWord,
                    currentWordIndex === index && styles.currentTransliterationWord
                  ]}
                >
                  {word.transliteration}
                </Text>
              </View>
            ))}
          </View>

          {/* Traduction française */}
          <View style={styles.frenchContainer}>
            {words.map((word, index) => (
              <View
                key={index}
                style={[
                  styles.frenchWordContainer,
                  currentWordIndex === index && styles.currentWord
                ]}
              >
                <Text
                  style={[
                    styles.frenchWord,
                    currentWordIndex === index && styles.currentFrenchWord
                  ]}
                >
                  {word.french}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
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
  highlighted: {
    shadowColor: '#D4AF37',
    shadowOpacity: 0.3,
    elevation: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  verseNumberContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: '#D4AF37',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  verseNumber: {
    color: '#1B5E20',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'serif',
  },
  ornamentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ornamentCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#D4AF37',
    opacity: 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ornamentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFEF7',
  },

  // Conteneurs pour les mots
  arabicWordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  arabicWordContainer: {
    marginHorizontal: 4,
    marginVertical: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arabicWord: {
    textAlign: 'center',
    color: '#1B5E20',
  },
  currentWord: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  currentArabicWord: {
    color: '#8B4513',
    textShadowColor: 'rgba(212, 175, 55, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Ligne décorative
  decorativeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  goldLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D4AF37',
    opacity: 0.5,
  },
  centerOrnament: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  ornamentSquare: {
    width: 8,
    height: 8,
    backgroundColor: '#D4AF37',
    transform: [{ rotate: '45deg' }],
    opacity: 0.7,
  },

  // Translittération
  transliterationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  transliterationWordContainer: {
    marginHorizontal: 4,
    marginVertical: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transliterationWord: {
    fontSize: 14,
    color: '#8B7355',
    fontStyle: 'italic',
    textAlign: 'center',
    fontFamily: 'serif',
  },
  currentTransliterationWord: {
    color: '#8B4513',
    fontWeight: '600',
  },

  // Traduction française
  frenchContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  frenchWordContainer: {
    marginHorizontal: 3,
    marginVertical: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frenchWord: {
    fontSize: 13,
    color: '#2C2C2C',
    textAlign: 'center',
    fontFamily: 'serif',
  },
  currentFrenchWord: {
    color: '#1B5E20',
    fontWeight: '600',
  },
});