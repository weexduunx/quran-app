import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

/**
 * Fonction d'urgence pour nettoyer toutes les données corrompues
 * À utiliser en cas d'erreur JSON persistante
 */
export class EmergencyCleanup {
  /**
   * Nettoie complètement tout le cache et les données corrompues
   */
  static async forceCleanAll(): Promise<boolean> {
    try {
      console.log('🚨 DÉMARRAGE DU NETTOYAGE D\'URGENCE');

      // 1. Vider tout AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      console.log(`Found ${keys.length} keys in AsyncStorage`);

      // Supprimer toutes les clés de cache Quran
      const quranKeys = keys.filter(key =>
        key.startsWith('quran_cache_') ||
        key.startsWith('simple_sync_') ||
        key.startsWith('word_sync_')
      );

      if (quranKeys.length > 0) {
        console.log(`Suppression de ${quranKeys.length} clés de cache corrompues`);
        await AsyncStorage.multiRemove(quranKeys);
      }

      // 2. En cas d'échec, vider complètement AsyncStorage
      if (quranKeys.length === 0) {
        console.log('Nettoyage complet d\'AsyncStorage...');
        await AsyncStorage.clear();
      }

      console.log('✅ NETTOYAGE D\'URGENCE TERMINÉ');
      return true;
    } catch (error) {
      console.error('❌ ERREUR LORS DU NETTOYAGE D\'URGENCE:', error);
      return false;
    }
  }

  /**
   * Diagnostique et répare les données corrompues
   */
  static async diagnoseAndFix(showAlert: boolean = true): Promise<void> {
    try {
      console.log('🔍 DIAGNOSTIC DES DONNÉES...');

      const keys = await AsyncStorage.getAllKeys();
      const corruptedKeys: string[] = [];

      // Tester chaque clé de cache
      for (const key of keys) {
        if (key.startsWith('quran_cache_')) {
          try {
            const value = await AsyncStorage.getItem(key);
            if (value) {
              JSON.parse(value); // Test de parsing
            }
          } catch (error) {
            console.log(`Clé corrompue détectée: ${key}`);
            corruptedKeys.push(key);
          }
        }
      }

      if (corruptedKeys.length > 0) {
        console.log(`Suppression de ${corruptedKeys.length} clés corrompues`);
        await AsyncStorage.multiRemove(corruptedKeys);

        if (showAlert) {
          Alert.alert(
            'Réparation terminée',
            `${corruptedKeys.length} éléments corrompus ont été supprimés.`
          );
        }
      } else {
        if (showAlert) {
          Alert.alert('Diagnostic', 'Aucune donnée corrompue détectée.');
        }
      }

    } catch (error) {
      console.error('Erreur lors du diagnostic:', error);
      Alert.alert('Erreur', 'Impossible de diagnostiquer les données.');
    }
  }

  /**
   * Nettoie une clé spécifique qui pose problème
   */
  static async cleanSpecificKey(keyPattern: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const targetKeys = keys.filter(key => key.includes(keyPattern));

      if (targetKeys.length > 0) {
        await AsyncStorage.multiRemove(targetKeys);
        console.log(`Supprimé ${targetKeys.length} clés correspondant à: ${keyPattern}`);
      }
    } catch (error) {
      console.error(`Erreur lors du nettoyage de ${keyPattern}:`, error);
    }
  }
}