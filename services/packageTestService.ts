import wordByWordService from './wordByWordService';

export class PackageTestService {
  /**
   * Test basic package functionality
   */
  static async testPackageBasics(): Promise<void> {
    console.log('🧪 Starting package tests...');

    try {
      // Test 1: Get first page
      console.log('📄 Test 1: Getting page 1...');
      const page1 = await wordByWordService.getWordsByPage(1);
      console.log(`✅ Page 1: ${page1.ayahs?.length || 0} ayahs found`);

      // Test 2: Get Al-Fatiha verses
      console.log('📖 Test 2: Getting Al-Fatiha verses...');

      for (let verse = 1; verse <= 7; verse++) {
        const words = await wordByWordService.getWordsForVerse(1, verse);
        console.log(`✅ Al-Fatiha ${verse}: ${words.length} words found`);

        if (words.length > 0) {
          console.log(`   First word: "${words[0].text}" - Translation: "${words[0].translation?.text || 'N/A'}"`);
        }
      }

      // Test 3: Get some Al-Baqarah verses
      console.log('📖 Test 3: Getting Al-Baqarah verses...');

      const baqarahVerses = [1, 2, 3, 4, 5];
      for (const verse of baqarahVerses) {
        const words = await wordByWordService.getWordsForVerse(2, verse);
        console.log(`✅ Al-Baqarah ${verse}: ${words.length} words found`);

        if (words.length > 0) {
          console.log(`   First word: "${words[0].text}" - Translation: "${words[0].translation?.text || 'N/A'}"`);
        }
      }

      // Test 4: Test cache
      console.log('💾 Test 4: Testing cache...');
      const cacheStats = wordByWordService.getCacheStats();
      console.log(`✅ Cache: ${cacheStats.size} entries, keys: ${cacheStats.keys.slice(0, 5).join(', ')}${cacheStats.keys.length > 5 ? '...' : ''}`);

      console.log('🎉 All package tests completed successfully!');

    } catch (error) {
      console.error('❌ Package test failed:', error);
      throw error;
    }
  }

  /**
   * Test specific verse availability
   */
  static async testVerseAvailability(surahNumber: number, verseNumber: number): Promise<boolean> {
    try {
      console.log(`🔍 Testing availability of verse ${surahNumber}:${verseNumber}...`);

      const words = await wordByWordService.getWordsForVerse(surahNumber, verseNumber);

      if (words.length > 0) {
        console.log(`✅ Verse ${surahNumber}:${verseNumber} found with ${words.length} words`);
        console.log(`   Sample word: "${words[0].text}" - "${words[0].translation?.text || 'N/A'}"`);
        return true;
      } else {
        console.log(`❌ Verse ${surahNumber}:${verseNumber} not found in package`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error testing verse ${surahNumber}:${verseNumber}:`, error);
      return false;
    }
  }

  /**
   * Test multiple verses in batch
   */
  static async testMultipleVerses(verses: Array<{surah: number, verse: number}>): Promise<void> {
    console.log(`🧪 Testing ${verses.length} verses...`);

    let found = 0;
    let notFound = 0;

    for (const {surah, verse} of verses) {
      const available = await this.testVerseAvailability(surah, verse);
      if (available) {
        found++;
      } else {
        notFound++;
      }
    }

    console.log(`📊 Results: ${found} found, ${notFound} not found`);
    console.log(`📈 Success rate: ${((found / verses.length) * 100).toFixed(1)}%`);
  }

  /**
   * Get package statistics
   */
  static async getPackageStats(): Promise<void> {
    console.log('📊 Getting package statistics...');

    try {
      // Test a few pages to get stats
      let totalAyahs = 0;
      let totalWords = 0;
      const testPages = [1, 2, 3, 100, 200, 300, 400, 500, 600];

      for (const pageNum of testPages) {
        try {
          const page = await wordByWordService.getWordsByPage(pageNum);
          if (page.ayahs) {
            totalAyahs += page.ayahs.length;
            for (const ayah of page.ayahs) {
              if (ayah?.words) {
                totalWords += ayah.words.filter(w => w !== null).length;
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error loading page ${pageNum}:`, error);
        }
      }

      console.log(`📈 Sample statistics from ${testPages.length} pages:`);
      console.log(`   Total ayahs sampled: ${totalAyahs}`);
      console.log(`   Total words sampled: ${totalWords}`);
      console.log(`   Average words per ayah: ${totalAyahs > 0 ? (totalWords / totalAyahs).toFixed(1) : 'N/A'}`);

      // Cache stats
      const cacheStats = wordByWordService.getCacheStats();
      console.log(`💾 Cache statistics:`);
      console.log(`   Cached entries: ${cacheStats.size}`);
      console.log(`   Memory usage: ~${(cacheStats.size * 0.5).toFixed(1)}KB (estimated)`);

    } catch (error) {
      console.error('❌ Error getting package stats:', error);
    }
  }
}

export default PackageTestService;