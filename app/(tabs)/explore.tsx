import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { SurahCard } from '@/components/SurahCard';
import { useQuranStore, Surah } from '@/stores/quranStore';
import { useProgressStore } from '@/stores/progressStore';
import { quranApi } from '@/services/api';
import { EmergencyCleanup } from '@/utils/emergencyCleanup';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, Type } from '@/constants/theme';
import { Button, Chip } from '@/components/ui/kit';

type Filter = 'all' | 'meccan' | 'medinan';

/** Minuscules + suppression des accents et des tirets : « Al-Baqara » ≈ « albaqara » */
const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ'’\-\s]/g, '');

export default function QuranScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { surahs, setSurahs, setCurrentSurah, isLoading, setLoading } = useQuranStore();
  const lastReadId = useProgressStore((s) => s.lastRead?.surahId);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadSurahs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSurahs(await quranApi.getSurahs());
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('JSON Parse error') || msg.includes('SyntaxError')) {
        // Cache corrompu : on nettoie automatiquement plutôt que d'interroger l'utilisateur
        await EmergencyCleanup.forceCleanAll().catch(() => {});
      }
      setError('Impossible de charger les sourates. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setSurahs]);

  useEffect(() => {
    if (surahs.length === 0) {
      EmergencyCleanup.diagnoseAndFix(false)
        .catch(() => {})
        .finally(loadSurahs);
    }
  }, [loadSurahs, surahs.length]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return surahs.filter((s) => {
      const t = (s.revelation_type || '').toLowerCase();
      if (filter === 'meccan' && !(t.startsWith('mec') || t.startsWith('mak'))) return false;
      if (filter === 'medinan' && !t.startsWith('med')) return false;
      if (!q) return true;
      return (
        String(s.number) === query.trim() ||
        s.name_arabic.includes(query.trim()) ||
        normalize(s.name_french).includes(q) ||
        normalize(s.name_transliteration).includes(q)
      );
    });
  }, [surahs, query, filter]);

  const handlePress = useCallback(
    (surah: Surah) => {
      setCurrentSurah(surah);
      router.push(`/surah/${surah.id}`);
    },
    [setCurrentSurah]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSurahs();
    setRefreshing(false);
  };

  const header = (
    <View style={{ paddingTop: insets.top + Spacing.md }}>
      <View style={styles.titleBlock}>
        <Text style={[Type.largeTitle, { color: colors.text }]}>Le Coran</Text>
        <Text style={[Type.callout, { color: colors.textMuted }]}>
          114 sourates · arabe, français et phonétique
        </Text>
      </View>

      <View style={[styles.search, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name="search" size={18} color={colors.textSubtle} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Nom, numéro ou traduction…"
          placeholderTextColor={colors.textSubtle}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Rechercher une sourate"
        />
        {query.length > 0 && (
          <Ionicons name="close-circle" size={18} color={colors.textSubtle} onPress={() => setQuery('')} />
        )}
      </View>

      <View style={styles.chips}>
        <Chip label="Toutes" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Mecquoises" active={filter === 'meccan'} onPress={() => setFilter('meccan')} />
        <Chip label="Médinoises" active={filter === 'medinan'} onPress={() => setFilter('medinan')} />
      </View>
    </View>
  );

  if (isLoading && surahs.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[Type.callout, { color: colors.textMuted, marginTop: Spacing.lg }]}>
          Chargement des sourates…
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      data={filtered}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <SurahCard surah={item} onPress={handlePress} isLastRead={item.id === lastReadId} />
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons
            name={error ? 'cloud-offline-outline' : 'search-outline'}
            size={40}
            color={colors.textSubtle}
          />
          <Text style={[Type.callout, { color: colors.textMuted, textAlign: 'center', marginVertical: Spacing.lg }]}>
            {error ?? `Aucune sourate ne correspond à « ${query} »`}
          </Text>
          {error && <Button title="Réessayer" icon="refresh" variant="secondary" onPress={loadSurahs} />}
        </View>
      }
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={16}
      contentContainerStyle={{ paddingBottom: Spacing.xxxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  titleBlock: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    paddingHorizontal: Spacing.md,
    height: 46,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  chips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  empty: { alignItems: 'center', padding: Spacing.xxxl },
});
