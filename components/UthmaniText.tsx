import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

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

  return (
    <Text
      style={[
        styles.uthmaniBase,
        getSizeStyle(),
        { color },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  uthmaniBase: {
    fontFamily: 'NotoSansArabic-Bold', // Fallback à NotoSansArabic en attendant les polices Uthmani
    textAlign: 'right',
    fontWeight: '600',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(212, 175, 55, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
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