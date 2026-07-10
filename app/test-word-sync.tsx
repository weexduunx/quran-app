import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WordByWordReader from '../components/WordByWordReader';
import wordByWordService from '../services/wordByWordService';
import PackageTestService from '../services/packageTestService';

export default function TestWordSyncScreen() {
  const [testCases] = useState([
    {
      id: 1,
      name: 'Al-Fatiha - Ayah 1',
      surahNumber: 1,
      ayahNumber: 1,
      globalVerseNumber: 1,
      description: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'
    },
    {
      id: 2,
      name: 'Al-Fatiha - Ayah 2',
      surahNumber: 1,
      ayahNumber: 2,
      globalVerseNumber: 2,
      description: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ'
    },
    {
      id: 3,
      name: 'Al-Baqarah - Ayah 1',
      surahNumber: 2,
      ayahNumber: 1,
      globalVerseNumber: 8,
      description: 'الٓمٓ'
    },
    {
      id: 4,
      name: 'Al-Baqarah - Ayah 255 (Ayat al-Kursi)',
      surahNumber: 2,
      ayahNumber: 255,
      globalVerseNumber: 262,
      description: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ...'
    }
  ]);

  const [selectedTest, setSelectedTest] = useState(testCases[0]);
  const [reciterCode] = useState('mishary'); // Default reciter
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTestingPackage, setIsTestingPackage] = useState(false);

  const testPackageData = async () => {
    setIsTestingPackage(true);
    const results = [];

    try {
      console.log('🧪 Testing @kmaslesa package integration...');

      // Test 1: Get all Quran words (small sample)
      try {
        console.log('📖 Testing getAllQuranWords...');
        const allWords = await wordByWordService.getAllQuranWords();
        results.push({
          test: 'getAllQuranWords',
          success: true,
          data: {
            totalAyahs: allWords.ayahs?.length || 0,
            firstAyah: allWords.ayahs?.[0]?.metaData
          }
        });
        console.log('✅ getAllQuranWords successful');
      } catch (error) {
        results.push({
          test: 'getAllQuranWords',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log('❌ getAllQuranWords failed:', error);
      }

      // Test 2: Get words by page
      try {
        console.log('📄 Testing getWordsByPage...');
        const pageWords = await wordByWordService.getWordsByPage(1);
        results.push({
          test: 'getWordsByPage(1)',
          success: true,
          data: {
            page: pageWords.page,
            ayahsCount: pageWords.ayahs?.length || 0,
            firstWordOfFirstAyah: pageWords.ayahs?.[0]?.words?.[0]
          }
        });
        console.log('✅ getWordsByPage successful');
      } catch (error) {
        results.push({
          test: 'getWordsByPage(1)',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log('❌ getWordsByPage failed:', error);
      }

      // Test 3: Get words for specific verse
      try {
        console.log('🎯 Testing getWordsForVerse...');
        const verseWords = await wordByWordService.getWordsForVerse(1, 1);
        results.push({
          test: 'getWordsForVerse(1,1)',
          success: true,
          data: {
            wordCount: verseWords.length,
            words: verseWords.map(w => ({
              text: w.text,
              translation: w.translation.text,
              transliteration: w.transliteration.text
            }))
          }
        });
        console.log('✅ getWordsForVerse successful');
      } catch (error) {
        results.push({
          test: 'getWordsForVerse(1,1)',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log('❌ getWordsForVerse failed:', error);
      }

      // Test 4: Test timing enhancement
      try {
        console.log('⏱️ Testing enhanceWordsWithTiming...');
        const verseWords = await wordByWordService.getWordsForVerse(1, 1);
        if (verseWords.length > 0) {
          const enhancedWords = await wordByWordService.enhanceWordsWithTiming(
            verseWords,
            1, // global verse number
            reciterCode,
            5000 // 5 seconds audio duration
          );

          results.push({
            test: 'enhanceWordsWithTiming',
            success: true,
            data: {
              originalCount: verseWords.length,
              enhancedCount: enhancedWords.length,
              hasTimingData: enhancedWords.some(w => w.timing !== undefined),
              hasTajweedInfo: enhancedWords.some(w => w.tajweed_info !== undefined)
            }
          });
          console.log('✅ enhanceWordsWithTiming successful');
        } else {
          throw new Error('No words found for timing test');
        }
      } catch (error) {
        results.push({
          test: 'enhanceWordsWithTiming',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log('❌ enhanceWordsWithTiming failed:', error);
      }

      setTestResults(results);

      // Show summary
      const successCount = results.filter(r => r.success).length;
      const totalTests = results.length;

      Alert.alert(
        'Package Test Results',
        `${successCount}/${totalTests} tests passed\n\nCheck console for details.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('❌ Package testing failed:', error);
      Alert.alert('Error', 'Package testing failed. Check console for details.');
    } finally {
      setIsTestingPackage(false);
    }
  };

  const runComprehensiveTests = async () => {
    Alert.alert(
      'Comprehensive Tests',
      'This will run extensive tests on the package. Check console for detailed output.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run Tests',
          onPress: async () => {
            try {
              console.log('🚀 Starting comprehensive package tests...');

              // Basic package functionality
              await PackageTestService.testPackageBasics();

              // Test common verses
              const commonVerses = [
                { surah: 1, verse: 1 }, // Al-Fatiha
                { surah: 1, verse: 2 },
                { surah: 1, verse: 7 },
                { surah: 2, verse: 1 }, // Al-Baqarah
                { surah: 2, verse: 2 },
                { surah: 2, verse: 255 }, // Ayat al-Kursi
                { surah: 3, verse: 1 }, // Al-Imran
                { surah: 112, verse: 1 }, // Al-Ikhlas
              ];

              await PackageTestService.testMultipleVerses(commonVerses);

              // Get package statistics
              await PackageTestService.getPackageStats();

              Alert.alert('Tests Complete', 'Comprehensive tests completed. Check console for results.');
            } catch (error) {
              console.error('❌ Comprehensive tests failed:', error);
              Alert.alert('Tests Failed', 'Some tests failed. Check console for details.');
            }
          }
        }
      ]
    );
  };

  const clearCache = () => {
    wordByWordService.clearCache();
    Alert.alert('Cache Cleared', 'Word-by-word cache has been cleared.');
  };

  const getCacheStats = () => {
    const stats = wordByWordService.getCacheStats();
    Alert.alert(
      'Cache Statistics',
      `Cache size: ${stats.size} entries\nKeys: ${stats.keys.join(', ') || 'None'}`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Word-by-Word Sync Test</Text>
          <Text style={styles.subtitle}>
            Testing enhanced synchronization with @kmaslesa package
          </Text>
        </View>

        {/* Package Testing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Package Integration Test</Text>

          <TouchableOpacity
            style={[styles.testButton, isTestingPackage && styles.disabledButton]}
            onPress={testPackageData}
            disabled={isTestingPackage}
          >
            {isTestingPackage ? (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.buttonText}>  Testing...</Text>
              </>
            ) : (
              <>
                <Ionicons name="flask" size={20} color="white" />
                <Text style={styles.buttonText}>  Run Package Tests</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: '#FF9800' }]}
            onPress={runComprehensiveTests}
          >
            <Ionicons name="speedometer" size={20} color="white" />
            <Text style={styles.buttonText}>  Comprehensive Tests</Text>
          </TouchableOpacity>

          {/* Test Results */}
          {testResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Test Results:</Text>
              {testResults.map((result, index) => (
                <View key={index} style={styles.resultItem}>
                  <View style={styles.resultHeader}>
                    <Ionicons
                      name={result.success ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={result.success ? '#4CAF50' : '#F44336'}
                    />
                    <Text style={styles.resultTest}>{result.test}</Text>
                  </View>
                  {result.error && (
                    <Text style={styles.resultError}>{result.error}</Text>
                  )}
                  {result.data && (
                    <Text style={styles.resultData}>
                      {JSON.stringify(result.data, null, 2)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Test Case Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Word-by-Word Reader Test</Text>

          <View style={styles.testCaseContainer}>
            <Text style={styles.label}>Select Test Case:</Text>
            {testCases.map((testCase) => (
              <TouchableOpacity
                key={testCase.id}
                style={[
                  styles.testCaseButton,
                  selectedTest.id === testCase.id && styles.selectedTestCase
                ]}
                onPress={() => setSelectedTest(testCase)}
              >
                <Text style={[
                  styles.testCaseText,
                  selectedTest.id === testCase.id && styles.selectedTestCaseText
                ]}>
                  {testCase.name}
                </Text>
                <Text style={styles.testCaseDescription}>
                  {testCase.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Word-by-Word Reader Component */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedTest.name} - Reader Test
          </Text>

          <WordByWordReader
            surahNumber={selectedTest.surahNumber}
            ayahNumber={selectedTest.ayahNumber}
            globalVerseNumber={selectedTest.globalVerseNumber}
            reciterCode={reciterCode}
            audioDuration={5000} // 5 seconds for testing
            onWordChange={(wordIndex, word) => {
              console.log(`Word changed: ${wordIndex} - ${word.text}`);
            }}
          />
        </View>

        {/* Cache Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cache Management</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionButton} onPress={getCacheStats}>
              <Ionicons name="stats-chart" size={20} color="white" />
              <Text style={styles.buttonText}>  Stats</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={clearCache}>
              <Ionicons name="trash" size={20} color="white" />
              <Text style={styles.buttonText}>  Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#2E7D5E',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F5E8',
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D5E',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    marginTop: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  resultItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTest: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  resultError: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  resultData: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  testCaseContainer: {
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  testCaseButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedTestCase: {
    borderColor: '#2E7D5E',
    backgroundColor: '#E8F5E8',
  },
  testCaseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  selectedTestCaseText: {
    color: '#2E7D5E',
  },
  testCaseDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: 'Amiri_400Regular',
    writingDirection: 'rtl',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#666',
    padding: 12,
    borderRadius: 8,
  },
});