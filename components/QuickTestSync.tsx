import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { wordSyncService } from '@/services/wordSyncService';

/**
 * Test rapide et simple de la synchronisation
 */
export const QuickTestSync: React.FC = () => {
  const [lastTest, setLastTest] = useState<string>('Aucun test effectué');
  const [isLoading, setIsLoading] = useState(false);

  const runQuickTest = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Starting quick sync test...');

      // Test avec Bismillah
      const timingData = await wordSyncService.getVerseTimingData(
        1,
        'ar.alafasy',
        'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        5000
      );

      const result = `✅ Success: ${timingData.words.length} mots, précision: ${Math.round(timingData.accuracy * 100)}%`;
      setLastTest(result);
      console.log('✅ Quick test completed:', result);

      // Afficher quelques détails
      const firstWord = timingData.words[0];
      const lastWord = timingData.words[timingData.words.length - 1];

      Alert.alert(
        'Test Réussi !',
        `Source: ${timingData.source}\n` +
        `Précision: ${Math.round(timingData.accuracy * 100)}%\n` +
        `Mots: ${timingData.words.length}\n` +
        `Premier mot: "${firstWord?.arabicText}" (${firstWord?.duration}ms)\n` +
        `Dernier mot: "${lastWord?.arabicText}" (${lastWord?.duration}ms)`
      );

    } catch (error) {
      const errorMsg = `❌ Erreur: ${error}`;
      setLastTest(errorMsg);
      console.error('❌ Quick test failed:', error);
      Alert.alert('Erreur', errorMsg);
    }
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Rapide Synchronisation</Text>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.disabledButton]}
        onPress={runQuickTest}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Test en cours...' : 'Lancer Test'}
        </Text>
      </TouchableOpacity>

      <View style={styles.resultContainer}>
        <Text style={styles.resultLabel}>Dernier résultat:</Text>
        <Text style={styles.resultText}>{lastTest}</Text>
      </View>

      <Text style={styles.info}>
        Ce test vérifie que le service de synchronisation fonctionne correctement avec l'estimation intelligente.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F8F6F0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#1B5E20',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#FFFEF7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8DCC0',
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
  info: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 16,
  },
});