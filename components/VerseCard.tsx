import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Verse } from '../stores/quranStore';
import { LinearGradient } from 'expo-linear-gradient';
import { UthmaniText } from './UthmaniText';

interface VerseCardProps {
  verse: Verse;
  showSurahInfo?: boolean;
  onPress?: (verse: Verse) => void;
  isHighlighted?: boolean;
  highlightAnimation?: Animated.Value;
}

const IslamicOrnament = () => (
  <View style={styles.ornamentContainer}>
    <View style={styles.ornamentDots}>
      <View style={styles.dot} />
      <View style={styles.dot} />
      <View style={styles.dot} />
    </View>
    <View style={styles.ornamentLine} />
    <View style={styles.ornamentDots}>
      <View style={styles.dot} />
      <View style={styles.dot} />
      <View style={styles.dot} />
    </View>
  </View>
);

export const VerseCard: React.FC<VerseCardProps> = ({
  verse,
  showSurahInfo = false,
  onPress,
  isHighlighted = false,
  highlightAnimation,
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress(verse);
    }
  };

  const animatedStyle = highlightAnimation ? {
    backgroundColor: highlightAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255, 255, 255, 1)', 'rgba(212, 175, 55, 0.2)'],
    }),
    borderColor: highlightAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(232, 220, 192, 1)', 'rgba(212, 175, 55, 0.8)'],
    }),
  } : {};

  return (
    <Animated.View
      style={[
        styles.container,
        isHighlighted && styles.highlighted,
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={['#FFFEF7', '#F8F6F0', '#FFFEF7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <TouchableOpacity
          style={styles.cardContent}
          onPress={handlePress}
          activeOpacity={onPress ? 0.8 : 1}
          disabled={!onPress}
        >
          <IslamicOrnament />

          <View style={styles.header}>
            <LinearGradient
              colors={['#D4AF37', '#F4E4BC', '#D4AF37']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.verseNumberContainer}
            >
              <Text style={styles.verseNumber}>{verse.verse_number}</Text>
            </LinearGradient>

            {showSurahInfo && verse.surah && (
              <View style={styles.surahInfo}>
                <Text style={styles.surahName}>
                  {verse.surah.name_french} ({verse.surah.number})
                </Text>
              </View>
            )}
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.arabicContainer}>
              <UthmaniText
                size="large"
                style={styles.arabicText}
              >
                {verse.text_uthmani || verse.text_arabic}
              </UthmaniText>
              <View style={styles.arabicOrnament}>
                <View style={styles.diamond} />
                <View style={styles.smallDiamond} />
              </View>
            </View>

            <View style={styles.decorativeLine}>
              <View style={styles.goldLine} />
              <View style={styles.centerOrnament}>
                <View style={styles.ornamentDiamond} />
              </View>
              <View style={styles.goldLine} />
            </View>

            <Text style={styles.frenchText}>{verse.text_french}</Text>

            {verse.text_transliteration && (
              <>
                <View style={styles.lightSeparator} />
                <Text style={styles.transliterationText}>
                  {verse.text_transliteration}
                </Text>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.globalNumber}>Verset {verse.global_number}</Text>
            {verse.juz && (
              <Text style={styles.juzInfo}>Juz {verse.juz}</Text>
            )}
          </View>

          <IslamicOrnament />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
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
  highlighted: {
    borderColor: '#D4AF37',
    borderWidth: 2,
    shadowColor: '#D4AF37',
    shadowOpacity: 0.3,
  },
  cardContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  verseNumberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  verseNumber: {
    color: '#1B5E20',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'serif',
  },
  surahInfo: {
    flex: 1,
    marginLeft: 12,
  },
  surahName: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  contentContainer: {
    marginBottom: 12,
  },
  arabicContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  arabicText: {
    flex: 1,
    paddingRight: 12,
    paddingLeft: 8,
  },
  arabicOrnament: {
    marginLeft: 8,
    marginTop: 8,
  },
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
  lightSeparator: {
    height: 1,
    backgroundColor: '#E8DCC0',
    marginVertical: 8,
    marginHorizontal: 20,
  },
  ornamentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  ornamentDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    backgroundColor: '#D4AF37',
    borderRadius: 2,
    marginHorizontal: 2,
    opacity: 0.7,
  },
  ornamentLine: {
    width: 40,
    height: 1,
    backgroundColor: '#D4AF37',
    marginHorizontal: 12,
    opacity: 0.6,
  },
  diamond: {
    width: 12,
    height: 12,
    backgroundColor: '#D4AF37',
    transform: [{ rotate: '45deg' }],
    opacity: 0.4,
  },
  smallDiamond: {
    width: 6,
    height: 6,
    backgroundColor: '#C9A961',
    transform: [{ rotate: '45deg' }],
    position: 'absolute',
    alignSelf: 'center',
    opacity: 0.6,
  },
  centerOrnament: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  ornamentDiamond: {
    width: 8,
    height: 8,
    backgroundColor: '#D4AF37',
    transform: [{ rotate: '45deg' }],
    opacity: 0.7,
  },
  frenchText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#2C2C2C',
    textAlign: 'justify',
    fontFamily: 'serif',
    paddingHorizontal: 8,
  },
  transliterationText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    fontFamily: 'serif',
    paddingHorizontal: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  globalNumber: {
    fontSize: 12,
    color: '#888',
  },
  juzInfo: {
    fontSize: 12,
    color: '#888',
  },
});