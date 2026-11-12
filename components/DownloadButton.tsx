import React from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { formatBytes, useSurahDownload } from '@/hooks/useOffline';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Tap } from '@/components/ui/kit';

/** Bouton « disponible hors ligne » d'une sourate, pour le récitateur choisi. */
export function DownloadButton({ surah, surahName }: { surah: number; surahName?: string }) {
  const { colors } = useAppTheme();
  const { reciter, entry, start, cancel, remove } = useSurahDownload(surah);
  const status = entry?.status;

  const onPress = () => {
    if (status === 'downloading') {
      Alert.alert('Téléchargement en cours', 'Arrêter le téléchargement ?', [
        { text: 'Continuer', style: 'cancel' },
        { text: 'Arrêter', style: 'destructive', onPress: cancel },
      ]);
    } else if (status === 'done') {
      Alert.alert(
        'Disponible hors ligne',
        `${surahName ?? `Sourate ${surah}`} · ${reciter.name} (${formatBytes(entry!.bytes)}). Supprimer du téléphone ?`,
        [
          { text: 'Garder', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: remove },
        ]
      );
    } else {
      start();
    }
  };

  const label =
    status === 'done'
      ? 'Disponible hors ligne'
      : status === 'downloading'
        ? `Téléchargement ${Math.round((entry?.progress ?? 0) * 100)} %`
        : status === 'error'
          ? 'Échec du téléchargement, réessayer'
          : 'Télécharger pour écouter hors ligne';

  return (
    <Tap haptic onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={styles.btn}>
      {status === 'downloading' ? (
        <Text style={[styles.pct, { color: colors.primary }]}>{Math.round((entry?.progress ?? 0) * 100)}%</Text>
      ) : (
        <Ionicons
          name={status === 'done' ? 'cloud-done' : status === 'error' ? 'cloud-offline-outline' : 'cloud-download-outline'}
          size={22}
          color={status === 'done' ? colors.gold : status === 'error' ? colors.danger : colors.text}
        />
      )}
    </Tap>
  );
}

const styles = StyleSheet.create({
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pct: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
