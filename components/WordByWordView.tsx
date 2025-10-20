/**
 * Vue mot par mot pour les versets
 * Utilise le composant WordByWordCard
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { WordByWordCard } from './WordByWordCard';
import { Verse } from '../stores/quranStore';
import { repairArabicText } from '../utils/textUtils';
import { Ionicons } from '@expo/vector-icons';

interface WordByWordViewProps {
  verses: Verse[];
  currentVerseIndex: number;
  currentWordIndex?: number;
  onClose: () => void;
}

// Données d'exemple pour la démonstration
// Dans une vraie app, ces données viendraient d'une API
const generateWordByWordData = (verse: Verse) => {
  const arabicText = repairArabicText(verse.text_uthmani || verse.text_arabic);
  const words = arabicText.split(' ').filter(word => word.trim().length > 0);

  // Génération d'exemple - dans une vraie app, ces données viendraient d'une API
  return words.map((word, index) => ({
    arabic: word,
    transliteration: `word-${index + 1}`, // Placeholder
    french: `(${index + 1})`, // Placeholder
    position: index,
  }));
};

export const WordByWordView: React.FC<WordByWordViewProps> = ({
  verses,
  currentVerseIndex,
  currentWordIndex = -1,
  onClose,
}) => {
  const [selectedVerseIndex, setSelectedVerseIndex] = useState(currentVerseIndex);
  const currentVerse = verses[selectedVerseIndex];

  if (!currentVerse) {
    return null;
  }

  const wordData = generateWordByWordData(currentVerse);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#D4AF37" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Analyse Mot par Mot</Text>
          <Text style={styles.subtitle}>
            {currentVerse.surah?.name_french || `Sourate ${currentVerse.surah_id}`} - Verset {currentVerse.verse_number}
          </Text>
        </View>

        <View style={styles.placeholder} />
      </View>

      {/* Navigation entre versets */}
      <View style={styles.navigation}>
        <TouchableOpacity
          onPress={() => setSelectedVerseIndex(Math.max(0, selectedVerseIndex - 1))}
          disabled={selectedVerseIndex === 0}
          style={[styles.navButton, selectedVerseIndex === 0 && styles.navButtonDisabled]}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={selectedVerseIndex === 0 ? "#ccc" : "#D4AF37"}
          />
          <Text style={[styles.navText, selectedVerseIndex === 0 && styles.navTextDisabled]}>
            Précédent
          </Text>
        </TouchableOpacity>

        <Text style={styles.verseCounter}>
          {selectedVerseIndex + 1} / {verses.length}
        </Text>

        <TouchableOpacity
          onPress={() => setSelectedVerseIndex(Math.min(verses.length - 1, selectedVerseIndex + 1))}
          disabled={selectedVerseIndex === verses.length - 1}
          style={[styles.navButton, selectedVerseIndex === verses.length - 1 && styles.navButtonDisabled]}
        >
          <Text style={[styles.navText, selectedVerseIndex === verses.length - 1 && styles.navTextDisabled]}>
            Suivant
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={selectedVerseIndex === verses.length - 1 ? "#ccc" : "#D4AF37"}
          />
        </TouchableOpacity>
      </View>

      {/* Contenu scrollable */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <WordByWordCard
          words={wordData}
          verseNumber={currentVerse.verse_number}
          isHighlighted={selectedVerseIndex === currentVerseIndex}
          currentWordIndex={selectedVerseIndex === currentVerseIndex ? currentWordIndex : -1}
        />

        {/* Note explicative */}
        <View style={styles.noteContainer}>
          <View style={styles.noteHeader}>
            <Ionicons name="information-circle" size={16} color="#8B7355" />
            <Text style={styles.noteTitle}>Note</Text>
          </View>
          <Text style={styles.noteText}>
            Cette vue affiche chaque mot avec sa translittération et sa traduction.
            Touchez longuement un mot pendant la lecture audio pour forcer la synchronisation.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFEF7',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCC0',
    shadowColor: '#D4AF37',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E20',
    fontFamily: 'serif',
  },
  subtitle: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 2,
    fontFamily: 'serif',
  },
  placeholder: {
    width: 40,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFEF7',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCC0',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(200, 200, 200, 0.1)',
  },
  navText: {
    fontSize: 14,
    color: '#D4AF37',
    fontWeight: '500',
    marginHorizontal: 4,
  },
  navTextDisabled: {
    color: '#ccc',
  },
  verseCounter: {
    fontSize: 16,
    color: '#1B5E20',
    fontWeight: '600',
    fontFamily: 'serif',
  },
  content: {
    flex: 1,
    paddingVertical: 8,
  },
  noteContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFEF7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DCC0',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B7355',
    marginLeft: 6,
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontFamily: 'serif',
  },
});