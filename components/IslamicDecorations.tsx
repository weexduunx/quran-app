import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Ellipse, Polygon, G } from 'react-native-svg';

// Rosette dorée pour marquer les versets
export const GoldenRosette: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <View style={[styles.rosetteContainer, { width: size, height: size }]}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G>
        {/* Étoile à 8 branches */}
        <Path
          d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z"
          fill="#D4AF37"
          stroke="#B8860B"
          strokeWidth="0.5"
        />
        {/* Étoile intérieure */}
        <Path
          d="M12 5 L13.5 10.5 L19 12 L13.5 13.5 L12 19 L10.5 13.5 L5 12 L10.5 10.5 Z"
          fill="#FFD700"
        />
        {/* Centre */}
        <Circle cx="12" cy="12" r="2" fill="#B8860B" />
      </G>
    </Svg>
  </View>
);

// Médaillon marginal enluminé
export const MarginalMedallion: React.FC<{ position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }> = ({ position }) => (
  <View style={[styles.medallionContainer, styles[position]]}>
    <Svg width="40" height="40" viewBox="0 0 40 40">
      <G>
        {/* Cercle extérieur doré */}
        <Circle cx="20" cy="20" r="18" fill="#D4AF37" stroke="#B8860B" strokeWidth="1" />
        {/* Cercle intérieur bleu */}
        <Circle cx="20" cy="20" r="14" fill="#1E3A8A" />
        {/* Motifs géométriques */}
        <Path
          d="M20 8 L24 16 L20 24 L16 16 Z"
          fill="#FFD700"
        />
        <Path
          d="M8 20 L16 24 L24 20 L16 16 Z"
          fill="#DC2626"
        />
        {/* Centre */}
        <Circle cx="20" cy="20" r="3" fill="#D4AF37" />
      </G>
    </Svg>
  </View>
);

// Cartouche doré pour titre de sourate
export const SurahTitleCartouche: React.FC<{ title: string; titleArabic: string }> = ({ title, titleArabic }) => (
  <View style={styles.cartoucheContainer}>
    <LinearGradient
      colors={['#1E3A8A', '#3B82F6', '#1E3A8A']}
      style={styles.cartoucheBackground}
    >
      {/* Arabesques rouges */}
      <View style={styles.arabesqueContainer}>
        <Svg width="100%" height="100%" viewBox="0 0 300 80">
          <G>
            {/* Arabesques décoratives */}
            <Path
              d="M10 40 Q30 20 50 40 Q70 60 90 40 Q110 20 130 40"
              stroke="#DC2626"
              strokeWidth="2"
              fill="none"
            />
            <Path
              d="M170 40 Q190 20 210 40 Q230 60 250 40 Q270 20 290 40"
              stroke="#DC2626"
              strokeWidth="2"
              fill="none"
            />
            {/* Motifs floraux */}
            <Circle cx="150" cy="25" r="3" fill="#DC2626" />
            <Circle cx="150" cy="55" r="3" fill="#DC2626" />
          </G>
        </Svg>
      </View>

      {/* Cartouche doré central */}
      <LinearGradient
        colors={['#D4AF37', '#FFD700', '#D4AF37']}
        style={styles.goldenCartouche}
      >
        <Text style={styles.titleArabic}>{titleArabic}</Text>
        <Text style={styles.titleFrench}>{title}</Text>
      </LinearGradient>
    </LinearGradient>
  </View>
);

// Bordure décorative avec lignes dorées
export const GoldenBorder: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.borderContainer}>
    {/* Bordure extérieure dorée */}
    <View style={styles.outerBorder} />

    {/* Lignes décoratives à l'or */}
    <View style={styles.decorativeLines}>
      <View style={styles.topLine} />
      <View style={styles.bottomLine} />
      <View style={styles.leftLine} />
      <View style={styles.rightLine} />
    </View>

    {/* Médaillons aux quatre coins */}
    <MarginalMedallion position="top-left" />
    <MarginalMedallion position="top-right" />
    <MarginalMedallion position="bottom-left" />
    <MarginalMedallion position="bottom-right" />

    {/* Contenu */}
    <View style={styles.contentArea}>
      {children}
    </View>
  </View>
);

// Panneau de texte avec style muhaqqaq
export const MuhaqqaqTextPanel: React.FC<{
  arabicText: string;
  frenchText: string;
  verseNumber: number;
  isHighlighted?: boolean;
}> = ({ arabicText, frenchText, verseNumber, isHighlighted }) => (
  <View style={[styles.textPanel, isHighlighted && styles.highlightedPanel]}>
    {/* Rosette de verset */}
    <View style={styles.verseNumberContainer}>
      <GoldenRosette />
      <Text style={styles.verseNumber}>{verseNumber}</Text>
    </View>

    {/* Texte arabe en style muhaqqaq */}
    <Text style={styles.muhaqqaqText}>{arabicText}</Text>

    {/* Ligne de séparation dorée */}
    <View style={styles.separatorLine} />

    {/* Traduction française */}
    <Text style={styles.translationText}>{frenchText}</Text>

    {/* Ornements de fin */}
    <View style={styles.endOrnaments}>
      <View style={styles.ornamentDot} />
      <View style={styles.ornamentLine} />
      <View style={styles.ornamentDot} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  // Rosette styles
  rosetteContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Médaillon styles
  medallionContainer: {
    position: 'absolute',
    zIndex: 5,
  },
  'top-left': {
    top: -20,
    left: -20,
  },
  'top-right': {
    top: -20,
    right: -20,
  },
  'bottom-left': {
    bottom: -20,
    left: -20,
  },
  'bottom-right': {
    bottom: -20,
    right: -20,
  },

  // Cartouche styles
  cartoucheContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  cartoucheBackground: {
    borderRadius: 20,
    padding: 4,
    minWidth: 280,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  arabesqueContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  goldenCartouche: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  titleArabic: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'NotoSansArabic-Bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  titleFrench: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 2,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Bordure styles
  borderContainer: {
    position: 'relative',
    margin: 16,
    padding: 24,
  },
  outerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: '#D4AF37',
    borderRadius: 12,
  },
  decorativeLines: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 40,
    right: 40,
    height: 2,
    backgroundColor: '#D4AF37',
  },
  bottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 40,
    right: 40,
    height: 2,
    backgroundColor: '#D4AF37',
  },
  leftLine: {
    position: 'absolute',
    left: 0,
    top: 40,
    bottom: 40,
    width: 2,
    backgroundColor: '#D4AF37',
  },
  rightLine: {
    position: 'absolute',
    right: 0,
    top: 40,
    bottom: 40,
    width: 2,
    backgroundColor: '#D4AF37',
  },
  contentArea: {
    zIndex: 1,
  },

  // Panneau de texte styles
  textPanel: {
    backgroundColor: '#FFFEF7',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E8DCC0',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  highlightedPanel: {
    backgroundColor: '#FFF9E6',
    borderColor: '#D4AF37',
    borderWidth: 2,
    shadowOpacity: 0.3,
  },
  verseNumberContainer: {
    position: 'absolute',
    top: -12,
    right: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  verseNumber: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },

  // Texte muhaqqaq
  muhaqqaqText: {
    fontSize: 22,
    lineHeight: 36,
    textAlign: 'right',
    color: '#1B5E20',
    fontWeight: '700',
    fontFamily: 'NotoSansArabic-Bold',
    marginBottom: 12,
    paddingRight: 8,
    letterSpacing: 1,
  },

  separatorLine: {
    height: 1,
    backgroundColor: '#D4AF37',
    marginVertical: 8,
    opacity: 0.6,
  },

  translationText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    textAlign: 'left',
    fontStyle: 'italic',
    paddingLeft: 8,
  },

  // Ornements de fin
  endOrnaments: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  ornamentDot: {
    width: 4,
    height: 4,
    backgroundColor: '#D4AF37',
    borderRadius: 2,
    marginHorizontal: 4,
  },
  ornamentLine: {
    width: 20,
    height: 1,
    backgroundColor: '#D4AF37',
    opacity: 0.6,
  },
});