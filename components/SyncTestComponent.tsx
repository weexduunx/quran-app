import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { wordSyncService, VerseTimingData } from '@/services/wordSyncService';

/**
 * Composant de test pour vérifier le service de synchronisation
 * À utiliser en mode développement pour tester les différentes sources de données
 */
export const SyncTestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ cacheSize: 0, reciterCount: 0 });

  useEffect(() => {
    updateStats();
  }, []);

  const updateStats = () => {
    const newStats = wordSyncService.getStats();
    setStats(newStats);
  };

  const addTestResult = (result: string) => {
    setTestResults(prev => [`${new Date().toLocaleTimeString()}: ${result}`, ...prev.slice(0, 9)]);
  };

  const testBasicFunctionality = async () => {
    setIsLoading(true);
    addTestResult('🧪 Testing basic functionality...');

    try {
      // Test avec un verset connu (Al-Fatiha, verset 1)
      const timingData = await wordSyncService.getVerseTimingData(
        1, // Global number pour "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"
        'ar.alafasy',
        'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        5000 // 5 secondes estimées
      );

      addTestResult(`✅ Basic test successful: ${timingData.words.length} words, source: ${timingData.source}`);
      addTestResult(`📊 Accuracy: ${Math.round(timingData.accuracy * 100)}%, Duration: ${timingData.totalDuration}ms`);

      // Test du timing des mots
      timingData.words.forEach((word, index) => {
        if (index < 3) { // Afficher les 3 premiers mots
          addTestResult(`📝 Word ${index + 1}: "${word.arabicText}" (${word.startTime}-${word.endTime}ms, confidence: ${Math.round(word.confidence * 100)}%)`);
        }
      });

    } catch (error) {
      addTestResult(`❌ Basic test failed: ${error}`);
    }

    updateStats();
    setIsLoading(false);
  };

  const testQuranAlignData = async () => {
    setIsLoading(true);
    addTestResult('🧪 Testing Quran-Align data retrieval...');

    try {
      // Test avec différents récitateurs
      const testCases = [
        { reciter: 'ar.alafasy', verse: 1 },
        { reciter: 'ar.sudais', verse: 2 },
        { reciter: 'ar.husary', verse: 3 }
      ];

      for (const testCase of testCases) {
        try {
          const timingData = await wordSyncService.getVerseTimingData(
            testCase.verse,
            testCase.reciter,
            'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
            5000
          );

          addTestResult(`✅ ${testCase.reciter}: ${timingData.source} data (${timingData.words.length} words)`);

          if (timingData.source === 'quran-align') {
            addTestResult(`🎯 Precise timing available for ${testCase.reciter}!`);
          }

        } catch (error) {
          addTestResult(`⚠️ ${testCase.reciter}: Fallback to estimation (${error})`);
        }
      }

    } catch (error) {
      addTestResult(`❌ Quran-Align test failed: ${error}`);
    }

    updateStats();
    setIsLoading(false);
  };

  const testTajweedDetection = async () => {
    setIsLoading(true);
    addTestResult('🧪 Testing Tajweed detection...');

    try {
      // Tester avec un verset contenant différents signes tajweed
      const timingData = await wordSyncService.getVerseTimingData(
        255, // Ayat al-Kursi - contient beaucoup de tajweed
        'ar.alafasy',
        'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ',
        15000
      );

      const tajweedTypes = {
        normal: 0,
        prolongation: 0,
        pause: 0,
        emphasis: 0
      };

      timingData.words.forEach(word => {
        if (word.tajweedInfo) {
          tajweedTypes[word.tajweedInfo.type]++;
        }
      });

      addTestResult(`📊 Tajweed analysis: Normal: ${tajweedTypes.normal}, Prolongations: ${tajweedTypes.prolongation}, Pauses: ${tajweedTypes.pause}, Emphasis: ${tajweedTypes.emphasis}`);

      // Afficher quelques exemples
      timingData.words.slice(0, 5).forEach((word, index) => {
        const tajweedInfo = word.tajweedInfo ? `[${word.tajweedInfo.type}:${word.tajweedInfo.weight}x]` : '[normal]';
        addTestResult(`📝 "${word.arabicText}" ${tajweedInfo} (${word.duration}ms)`);
      });

    } catch (error) {
      addTestResult(`❌ Tajweed test failed: ${error}`);
    }

    updateStats();
    setIsLoading(false);
  };

  const testWordTiming = () => {
    addTestResult('🧪 Testing word timing functionality...');

    try {
      // Créer des données de test
      const mockTimingData: VerseTimingData = {
        verseId: 1,
        globalNumber: 1,
        reciterCode: 'ar.alafasy',
        totalDuration: 5000,
        words: [
          { wordIndex: 0, arabicText: 'بِسْمِ', startTime: 0, endTime: 1000, duration: 1000, confidence: 1.0 },
          { wordIndex: 1, arabicText: 'اللَّهِ', startTime: 1000, endTime: 2000, duration: 1000, confidence: 1.0 },
          { wordIndex: 2, arabicText: 'الرَّحْمَٰنِ', startTime: 2000, endTime: 3500, duration: 1500, confidence: 1.0 },
          { wordIndex: 3, arabicText: 'الرَّحِيمِ', startTime: 3500, endTime: 5000, duration: 1500, confidence: 1.0 }
        ],
        source: 'manual',
        accuracy: 1.0,
        lastUpdated: new Date().toISOString()
      };

      // Test de recherche de mot actuel
      const testTimes = [500, 1500, 2750, 4000, 5500];

      testTimes.forEach(time => {
        const currentWordIndex = wordSyncService.findCurrentWord(mockTimingData, time);
        const currentWord = mockTimingData.words[currentWordIndex]?.arabicText || 'none';
        addTestResult(`⏱️ At ${time}ms: word "${currentWord}" (index: ${currentWordIndex})`);
      });

      addTestResult('✅ Word timing test completed successfully');

    } catch (error) {
      addTestResult(`❌ Word timing test failed: ${error}`);
    }
  };

  const clearCache = () => {
    wordSyncService.clearCache();
    updateStats();
    addTestResult('🗑️ Cache cleared');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Word Sync Service Test</Text>
        <Text style={styles.stats}>
          Cache: {stats.cacheSize} entries | Reciters: {stats.reciterCount}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isLoading && styles.disabledButton]}
          onPress={testBasicFunctionality}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Basic</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.disabledButton]}
          onPress={testQuranAlignData}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Quran-Align</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.disabledButton]}
          onPress={testTajweedDetection}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Tajweed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={testWordTiming}
        >
          <Text style={styles.buttonText}>Test Timing</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={clearCache}
        >
          <Text style={styles.buttonText}>Clear Cache</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
        {testResults.length === 0 ? (
          <Text style={styles.noResultsText}>No test results yet. Run a test!</Text>
        ) : (
          testResults.map((result, index) => (
            <Text key={index} style={styles.resultText}>
              {result}
            </Text>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F0',
    padding: 16,
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 8,
  },
  stats: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#FFFEF7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DCC0',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 16,
    gap: 8,
  },
  button: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#666',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#FFFEF7',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8DCC0',
  },
  noResultsText: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  resultText: {
    fontSize: 11,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});