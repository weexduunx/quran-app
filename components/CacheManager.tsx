import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CacheService } from '../services/cacheService';
import { quranApi } from '../services/api';

interface CacheInfo {
  itemCount: number;
  sizeInBytes: number;
  sizeInMB: string;
}

export const CacheManager: React.FC = () => {
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    loadCacheInfo();
    checkConnectivity();
  }, []);

  const loadCacheInfo = async () => {
    try {
      const info = await quranApi.getCacheInfo();
      setCacheInfo(info);
    } catch (error) {
      console.error('Erreur lors du chargement des infos cache:', error);
    }
  };

  const checkConnectivity = async () => {
    try {
      const online = await quranApi.isOnline();
      setIsOnline(online);
    } catch (error) {
      console.error('Erreur lors de la vérification de la connectivité:', error);
    }
  };

  const clearCache = () => {
    Alert.alert(
      'Vider le cache',
      'Êtes-vous sûr de vouloir vider tout le cache ? Cela supprimera toutes les données hors ligne.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await quranApi.clearCache();
              await loadCacheInfo();
              Alert.alert('Succès', 'Cache vidé avec succès');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de vider le cache');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const preloadEssentialData = async () => {
    setIsLoading(true);
    try {
      // Précharger les sourates
      await quranApi.getSurahs();

      // Précharger les 10 premières sourates avec leurs versets
      for (let i = 1; i <= 10; i++) {
        await quranApi.getSurahByNumber(i);
      }

      await loadCacheInfo();
      Alert.alert('Succès', 'Données essentielles préchargées pour utilisation hors ligne');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de précharger les données');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="download" size={24} color="#1B5E20" />
        <Text style={styles.title}>Gestion du cache</Text>
      </View>

      <View style={styles.statusContainer}>
        <View style={styles.statusItem}>
          <Ionicons
            name={isOnline ? 'wifi' : 'wifi-off'}
            size={20}
            color={isOnline ? '#4CAF50' : '#f39c12'}
          />
          <Text style={[styles.statusText, { color: isOnline ? '#4CAF50' : '#f39c12' }]}>
            {isOnline ? 'En ligne' : 'Hors ligne'}
          </Text>
        </View>
      </View>

      {cacheInfo && (
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Éléments en cache:</Text>
            <Text style={styles.infoValue}>{cacheInfo.itemCount}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Taille du cache:</Text>
            <Text style={styles.infoValue}>{cacheInfo.sizeInMB} MB</Text>
          </View>
        </View>
      )}

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={preloadEssentialData}
          disabled={isLoading || !isOnline}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Précharger données</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={clearCache}
          disabled={isLoading}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Vider le cache</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={loadCacheInfo}
          disabled={isLoading}
        >
          <Ionicons name="refresh-outline" size={20} color="#1B5E20" />
          <Text style={[styles.buttonText, { color: '#1B5E20' }]}>Actualiser</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.helpContainer}>
        <Text style={styles.helpText}>
          💡 Préchargez les données essentielles pour utiliser l'application sans connexion internet.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E20',
    marginLeft: 12,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  infoContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#1B5E20',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1B5E20',
  },
  dangerButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  helpContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#2e7d32',
    lineHeight: 16,
  },
});