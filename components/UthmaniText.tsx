import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { repairArabicText } from '../utils/textUtils';
// import { useFonts, Amiri_400Regular } from '@expo-google-fonts/amiri';

interface UthmaniTextProps {
  children: string;
  style?: TextStyle;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  color?: string;
}

export const UthmaniText: React.FC<UthmaniTextProps> = ({
  children,
  style,
  size = 'medium',
  color = '#1B5E20',
}) => {
  // Utiliser une police système optimisée pour l'arabe
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.smallText;
      case 'medium':
        return styles.mediumText;
      case 'large':
        return styles.largeText;
      case 'xlarge':
        return styles.xlargeText;
      default:
        return styles.mediumText;
    }
  };

  // Utiliser une police système arabique optimisée
  const fontFamily = 'serif'; // Fallback vers serif qui supporte bien l'arabe

  return (
    <Text
      style={[
        styles.uthmaniBase,
        getSizeStyle(),
        { color, fontFamily },
        style,
      ]}
    >
      {repairArabicText(children)}
    </Text>
  );
};

const styles = StyleSheet.create({
  uthmaniBase: {
    fontFamily: 'Uthmanic', // Police Uthmanic principale
    textAlign: 'right',
    fontWeight: '400', // Normal pour les polices arabes
    letterSpacing: 0.8,
    textShadowColor: 'rgba(212, 175, 55, 0.3)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 2,
  },
  smallText: {
    fontSize: 18,
    lineHeight: 32,
  },
  mediumText: {
    fontSize: 22,
    lineHeight: 38,
  },
  largeText: {
    fontSize: 28,
    lineHeight: 48,
  },
  xlargeText: {
    fontSize: 36,
    lineHeight: 58,
  },
});

// Composant pour les numéros de versets en style Uthmani
export const UthmaniVerseNumber: React.FC<{ number: number }> = ({ number }) => (
  <Text style={styles.verseNumber}>
    {convertToArabicNumerals(number)}
  </Text>
);

// Fonction pour convertir les chiffres en numéraux arabes
const convertToArabicNumerals = (num: number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)]).join('');
};

const verseNumberStyles = StyleSheet.create({
  verseNumber: {
    fontFamily: 'NotoSansArabic-Bold',
    fontSize: 16,
    color: '#D4AF37',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
});