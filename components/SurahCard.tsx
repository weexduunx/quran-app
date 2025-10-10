import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Surah } from '../stores/quranStore';

interface SurahCardProps {
  surah: Surah;
  onPress: (surah: Surah) => void;
}

export const SurahCard: React.FC<SurahCardProps> = ({ surah, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(surah)}
      activeOpacity={0.7}
    >
      <View style={styles.numberContainer}>
        <Text style={styles.number}>{surah.number}</Text>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.arabicName}>{surah.name_arabic}</Text>
        <Text style={styles.frenchName}>{surah.name_french}</Text>
        <Text style={styles.transliteration}>{surah.name_transliteration}</Text>

        <View style={styles.infoContainer}>
          <Text style={styles.info}>
            {surah.verses_count} versets • {surah.revelation_type}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  numberContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1B5E20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  number: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  arabicName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    textAlign: 'right',
    marginBottom: 4,
  },
  frenchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 2,
  },
  transliteration: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  info: {
    fontSize: 12,
    color: '#888',
  },
});