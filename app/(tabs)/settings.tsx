import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'toggle' | 'option' | 'action';
  icon: string;
  value?: boolean | string;
  options?: string[];
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState<{[key: string]: boolean | string}>({
    notifications: true,
    autoPlay: true,
    darkMode: false,
    downloadOverWifi: true,
    arabicFont: 'Uthmani',
    translationLanguage: 'Français',
    reciter: 'Mishary Al-Afasy',
    playbackSpeed: '1.0x',
  });

  const updateSetting = (key: string, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const settingsData: SettingItem[] = [
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Recevoir des rappels de lecture quotidienne',
      type: 'toggle',
      icon: 'notifications',
      value: settings.notifications,
    },
    {
      id: 'autoPlay',
      title: 'Lecture automatique',
      subtitle: 'Passer automatiquement au verset suivant',
      type: 'toggle',
      icon: 'play-circle',
      value: settings.autoPlay,
    },
    {
      id: 'darkMode',
      title: 'Mode sombre',
      subtitle: 'Utiliser un thème sombre pour l\'interface',
      type: 'toggle',
      icon: 'moon',
      value: settings.darkMode,
    },
    {
      id: 'downloadOverWifi',
      title: 'Téléchargement Wi-Fi uniquement',
      subtitle: 'Ne télécharger l\'audio qu\'en Wi-Fi',
      type: 'toggle',
      icon: 'wifi',
      value: settings.downloadOverWifi,
    },
    {
      id: 'arabicFont',
      title: 'Police arabe',
      subtitle: 'Choisir le style de calligraphie',
      type: 'option',
      icon: 'text',
      value: settings.arabicFont,
      options: ['Uthmani', 'Kufi', 'Naskh', 'Thuluth'],
    },
    {
      id: 'translationLanguage',
      title: 'Langue de traduction',
      subtitle: 'Langue principale pour les traductions',
      type: 'option',
      icon: 'language',
      value: settings.translationLanguage,
      options: ['Français', 'English', 'العربية', 'Español'],
    },
    {
      id: 'reciter',
      title: 'Récitateur par défaut',
      subtitle: 'Voix principale pour l\'audio',
      type: 'option',
      icon: 'person',
      value: settings.reciter,
      options: ['Mishary Al-Afasy', 'Abdul Rahman Al-Sudais', 'Saad Al-Ghamidi', 'Ahmed Al-Ajmi'],
    },
    {
      id: 'playbackSpeed',
      title: 'Vitesse de lecture',
      subtitle: 'Vitesse par défaut de récitation',
      type: 'option',
      icon: 'speedometer',
      value: settings.playbackSpeed,
      options: ['0.5x', '0.75x', '1.0x', '1.25x', '1.5x'],
    },
  ];

  const actionItems = [
    {
      id: 'clearCache',
      title: 'Vider le cache',
      subtitle: 'Libérer de l\'espace de stockage',
      icon: 'trash',
      action: () => {
        Alert.alert(
          'Vider le cache',
          'Êtes-vous sûr de vouloir vider le cache ? Cela supprimera tous les fichiers audio téléchargés.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Vider', style: 'destructive', onPress: () => {
              Alert.alert('Cache vidé', 'Le cache a été vidé avec succès.');
            }}
          ]
        );
      }
    },
    {
      id: 'exportBookmarks',
      title: 'Exporter les favoris',
      subtitle: 'Sauvegarder vos versets favoris',
      icon: 'share',
      action: () => {
        Alert.alert('Export', 'Fonctionnalité en cours de développement.');
      }
    },
    {
      id: 'resetSettings',
      title: 'Réinitialiser les paramètres',
      subtitle: 'Remettre tous les paramètres par défaut',
      icon: 'refresh',
      action: () => {
        Alert.alert(
          'Réinitialiser',
          'Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Réinitialiser', style: 'destructive', onPress: () => {
              setSettings({
                notifications: true,
                autoPlay: true,
                darkMode: false,
                downloadOverWifi: true,
                arabicFont: 'Uthmani',
                translationLanguage: 'Français',
                reciter: 'Mishary Al-Afasy',
                playbackSpeed: '1.0x',
              });
              Alert.alert('Réinitialisation', 'Les paramètres ont été réinitialisés.');
            }}
          ]
        );
      }
    },
  ];

  const renderSettingItem = (item: SettingItem) => (
    <View key={item.id} style={styles.settingItem}>
      <View style={styles.settingIcon}>
        <Ionicons name={item.icon as any} size={20} color="#1B5E20" />
      </View>

      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{item.title}</Text>
        {item.subtitle && (
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        )}
      </View>

      <View style={styles.settingControl}>
        {item.type === 'toggle' && (
          <Switch
            value={item.value as boolean}
            onValueChange={(value) => updateSetting(item.id, value)}
            trackColor={{ false: '#E0E0E0', true: '#A5D6A7' }}
            thumbColor={item.value ? '#1B5E20' : '#f4f3f4'}
            ios_backgroundColor="#E0E0E0"
          />
        )}

        {item.type === 'option' && (
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              Alert.alert(
                item.title,
                'Choisissez une option:',
                item.options?.map(option => ({
                  text: option,
                  onPress: () => updateSetting(item.id, option),
                  style: option === item.value ? 'default' : 'cancel'
                }))
              );
            }}
          >
            <Text style={styles.optionText}>{item.value}</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderActionItem = (item: any) => (
    <TouchableOpacity
      key={item.id}
      style={styles.actionItem}
      onPress={item.action}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={item.icon} size={20} color="#D32F2F" />
      </View>

      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: '#D32F2F' }]}>{item.title}</Text>
        <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#666" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1B5E20', '#2E7D32', '#1B5E20']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Ionicons name="settings" size={40} color="#D4AF37" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Paramètres</Text>
            <Text style={styles.headerSubtitle}>Personnalisez votre expérience</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={20} color="#D4AF37" />
            <Text style={styles.sectionTitle}>Préférences générales</Text>
          </View>

          <View style={styles.settingsGroup}>
            {settingsData.map(renderSettingItem)}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="construct" size={20} color="#D4AF37" />
            <Text style={styles.sectionTitle}>Actions</Text>
          </View>

          <View style={styles.settingsGroup}>
            {actionItems.map(renderActionItem)}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={20} color="#D4AF37" />
            <Text style={styles.sectionTitle}>À propos</Text>
          </View>

          <View style={styles.aboutContainer}>
            <View style={styles.appInfo}>
              <Text style={styles.appName}>Quran Al Karim</Text>
              <Text style={styles.appVersion}>Version 1.0.0</Text>
              <Text style={styles.appDescription}>
                Application mobile pour la lecture et l'écoute du Saint Coran avec traductions et commentaires.
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Text style={styles.appVersion}>Created with <Ionicons name="heart" size={14} color="#D32F2F" style={{ marginHorizontal: 4 }} /> by Idrissa Ndiouck - For The Love of the Holy Quran</Text>
              </View>
            </View>

            <View style={styles.linksContainer}>
              <TouchableOpacity style={styles.linkItem}>
                <Ionicons name="star" size={16} color="#1B5E20" />
                <Text style={styles.linkText}>Évaluer l'application</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkItem}>
                <Ionicons name="help-circle" size={16} color="#1B5E20" />
                <Text style={styles.linkText}>Aide et support</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkItem}>
                <Ionicons name="document-text" size={16} color="#1B5E20" />
                <Text style={styles.linkText}>Conditions d'utilisation</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkItem}>
                <Ionicons name="shield-checkmark" size={16} color="#1B5E20" />
                <Text style={styles.linkText}>Politique de confidentialité</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F0',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'serif',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#A5D6A7',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginLeft: 8,
    fontFamily: 'serif',
  },
  settingsGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F6F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  settingControl: {
    marginLeft: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  optionText: {
    fontSize: 14,
    color: '#1B5E20',
    fontWeight: '600',
    marginRight: 6,
  },
  aboutContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
    fontFamily: 'serif',
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  appDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
  },
  linksContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 14,
    color: '#1B5E20',
    marginLeft: 12,
    fontWeight: '500',
  },
});