import React, { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useOfflineStore, DownloadEntry } from '@/stores/offlineStore';
import { popularReciters, useReciterStore } from '@/stores/reciterStore';
import { offlineService } from '@/services/offlineService';
import { downloadSurahs, formatBytes } from '@/hooks/useOffline';
import { useAppTheme } from '@/hooks/useAppTheme';
import { surahFrenchTitle, surahTransliteration } from '@/utils/surahNames';
import { Radius, Spacing, Type } from '@/constants/theme';
import { Button, Card, IconButton, NumberBadge, Tap } from '@/components/ui/kit';

// Juz' 'Amma : les sourates courtes, les plus récitées dans la prière
const JUZ_AMMA = Array.from({ length: 37 }, (_, i) => 78 + i);
const ESSENTIALS = [1, 18, 36, 55, 56, 67];

export default function DownloadsScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const reciter = useReciterStore((s) => s.getSelectedReciter());
  const downloads = useOfflineStore((s) => s.downloads);
  const [, refresh] = useState(0);

  const list = useMemo(
    () => Object.values(downloads).sort((a, b) => a.reciterId - b.reciterId || a.surah - b.surah),
    [downloads]
  );
  const total = list.reduce((sum, d) => sum + (d.status === 'done' ? d.bytes : 0), 0);
  const active = list.filter((d) => d.status === 'downloading').length;

  const removeAll = () =>
    Alert.alert('Tout supprimer', 'Supprimer tous les téléchargements de ce téléphone ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          offlineService.removeAll();
          refresh((n) => n + 1);
        },
      },
    ]);

  const pack = (title: string, sub: string, surahs: number[]) => (
    <Card onPress={() => downloadSurahs(reciter, surahs)} style={{ flex: 1 }}>
      <Ionicons name="cloud-download-outline" size={22} color={colors.primary} />
      <Text style={[Type.headline, { color: colors.text, marginTop: Spacing.sm }]}>{title}</Text>
      <Text style={[Type.caption, { color: colors.textMuted }]}>{sub}</Text>
    </Card>
  );

  const header = (
    <View style={{ paddingHorizontal: Spacing.xl }}>
      <View style={[styles.summary, { backgroundColor: colors.primaryStrong }]}>
        <Text style={styles.summaryOverline}>SUR CE TÉLÉPHONE</Text>
        <Text style={styles.summaryValue}>{formatBytes(total)}</Text>
        <Text style={styles.summarySub}>
          {list.filter((d) => d.status === 'done').length} sourate(s) disponibles hors ligne
          {active ? ` · ${active} en cours` : ''}
        </Text>
      </View>

      <Text style={[Type.overline, { color: colors.textSubtle, marginTop: Spacing.xxl, marginBottom: Spacing.md }]}>
        TÉLÉCHARGER AVEC {reciter.name.toUpperCase()}
      </Text>
      <View style={{ flexDirection: 'row', gap: Spacing.md }}>
        {pack('Sourates courtes', "Juz' 'Amma · 78 à 114", JUZ_AMMA)}
        {pack('Essentielles', 'Al-Fatiha, Al-Kahf, Ya-Sin, Al-Mulk…', ESSENTIALS)}
      </View>
      <Text style={[Type.caption, { color: colors.textSubtle, marginTop: Spacing.sm }]}>
        Une sourate se télécharge aussi depuis son écran de lecture (icône nuage). Le texte arabe et français
        reste lisible hors ligne après une première lecture.
      </Text>

      {list.length > 0 && (
        <View style={styles.listHeader}>
          <Text style={[Type.overline, { color: colors.textSubtle }]}>MES TÉLÉCHARGEMENTS</Text>
          <Tap onPress={removeAll} hitSlop={8}>
            <Text style={[Type.caption, { color: colors.danger, fontWeight: '600' }]}>Tout supprimer</Text>
          </Tap>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4, borderBottomColor: colors.border }]}>
        <IconButton icon="chevron-back" label="Retour" onPress={() => router.back()} />
        <Text style={[Type.headline, { color: colors.text, flex: 1, textAlign: 'center' }]}>Téléchargements</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={list}
        keyExtractor={(d) => `${d.reciterId}:${d.surah}`}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingTop: Spacing.xl, paddingBottom: insets.bottom + Spacing.xxxl }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: Spacing.xxl }}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.textSubtle} />
            <Text style={[Type.callout, { color: colors.textMuted, textAlign: 'center', marginTop: Spacing.md }]}>
              Rien de téléchargé pour l’instant. Écoutez sans connexion en téléchargeant vos sourates.
            </Text>
          </View>
        }
        renderItem={({ item }) => <Row item={item} />}
      />
      {list.length === 0 && (
        <View style={{ paddingHorizontal: Spacing.xl, paddingBottom: insets.bottom + Spacing.lg }}>
          <Button title="Parcourir le Coran" variant="secondary" onPress={() => router.push('/explore')} />
        </View>
      )}
    </View>
  );
}

function Row({ item }: { item: DownloadEntry }) {
  const { colors } = useAppTheme();
  const reciter = popularReciters.find((r) => r.id === item.reciterId);
  const status =
    item.status === 'done'
      ? formatBytes(item.bytes)
      : item.status === 'downloading'
        ? `Téléchargement… ${Math.round(item.progress * 100)} %`
        : item.status === 'error'
          ? 'Interrompu · reprenez depuis la sourate'
          : 'En attente';

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Tap
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
        onPress={() => router.push({ pathname: '/surah/[id]', params: { id: String(item.surah) } })}
      >
        <NumberBadge value={item.surah} size={36} />
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[Type.headline, { color: colors.text }]}>
            {surahTransliteration(item.surah)} <Text style={[Type.caption, { color: colors.textMuted }]}>{surahFrenchTitle(item.surah)}</Text>
          </Text>
          <Text style={[Type.caption, { color: item.status === 'error' ? colors.danger : colors.textMuted }]} numberOfLines={1}>
            {reciter?.name ?? 'Récitateur'} · {status}
          </Text>
          {item.status === 'downloading' && (
            <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
              <View style={[styles.fill, { width: `${Math.round(item.progress * 100)}%`, backgroundColor: colors.primary }]} />
            </View>
          )}
        </View>
      </Tap>
      <IconButton
        icon={item.status === 'downloading' ? 'close' : 'trash-outline'}
        color={colors.textSubtle}
        label={item.status === 'downloading' ? 'Arrêter' : 'Supprimer'}
        onPress={() => offlineService.remove(item.reciterId, item.surah)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summary: { borderRadius: Radius.xl, padding: Spacing.xl },
  summaryOverline: { color: '#E9D49A', fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  summaryValue: { color: '#fff', fontSize: 34, fontWeight: '700', marginTop: 4 },
  summarySub: { color: 'rgba(255,255,255,0.78)', fontSize: 14, marginTop: 2 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  track: { height: 4, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  fill: { height: 4 },
});
