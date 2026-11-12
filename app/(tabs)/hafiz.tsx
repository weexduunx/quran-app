import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { popularReciters, Reciter, useReciterStore } from '@/stores/reciterStore';
import { recitationService } from '@/services/recitationService';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ArabicFonts, Radius, Spacing, Type } from '@/constants/theme';
import { Chip, IconButton, Tap } from '@/components/ui/kit';

type Filter = 'all' | 'senegal' | 'learning' | 'sync' | 'favorites';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'senegal', label: 'Sénégal' },
  { id: 'learning', label: 'Pour apprendre' },
  { id: 'sync', label: 'Mot à mot' },
  { id: 'favorites', label: 'Favoris' },
];

const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ'’\-\s]/g, '');

// Extrait d'écoute : Al-Fatiha, verset 2
const SAMPLE = { surah: 1, ayah: 2, global: 2 };

export default function RecitersScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const selected = useReciterStore((s) => s.getSelectedReciter());
  const setSelected = useReciterStore((s) => s.setSelectedReciter);
  const favorites = useReciterStore((s) => s.favoriteReciters);
  const toggleFavorite = useReciterStore((s) => s.toggleFavorite);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [previewId, setPreviewId] = useState<number | null>(null);

  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // Coupe l'extrait en quittant l'onglet
  useFocusEffect(
    React.useCallback(
      () => () => {
        player.pause();
        setPreviewId(null);
      },
      [player]
    )
  );

  useEffect(() => {
    if (status.didJustFinish) setPreviewId(null);
  }, [status.didJustFinish]);

  const preview = async (r: Reciter) => {
    if (previewId === r.id) {
      player.pause();
      setPreviewId(null);
      return;
    }
    setPreviewId(r.id);
    try {
      // Récitateur par sourate entière : extrait = Al-Fatiha complète (≈ 45 s)
      const url =
        recitationService.surahAudioUrl(r, 1) ??
        (await recitationService.getVerseAudio(r, SAMPLE.surah, SAMPLE.ayah, SAMPLE.global)).url;
      player.replace({ uri: url });
      player.play();
    } catch {
      setPreviewId(null);
    }
  };

  const list = useMemo(() => {
    const q = normalize(query);
    return popularReciters.filter((r) => {
      if (q && !normalize(r.name).includes(q) && !r.nameArabic.includes(query) && !normalize(r.country).includes(q)) return false;
      if (filter === 'senegal') return r.country === 'Sénégal';
      if (filter === 'learning') return !!r.learning;
      if (filter === 'sync') return !!r.quranComId;
      if (filter === 'favorites') return favorites.includes(r.id);
      return true;
    });
  }, [query, filter, favorites]);

  const header = (
    <View>
      <View style={styles.pad}>
        <Text style={[Type.largeTitle, { color: colors.text }]}>Récitateurs</Text>
        <Text style={[Type.body, { color: colors.textMuted }]}>Choisissez la voix qui vous accompagne</Text>
      </View>

      {/* Voix actuelle */}
      <View style={[styles.current, { backgroundColor: colors.primaryStrong }]}>
        <View style={styles.avatarLg}>
          <Ionicons name="mic" size={24} color="#0B3D2E" />
        </View>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={styles.currentOverline}>VOIX ACTUELLE</Text>
          <Text style={styles.currentName} numberOfLines={2}>
            {selected.name}
          </Text>
          <Text style={styles.currentSub}>
            {selected.country}
            {selected.quranComId ? ' · mot à mot synchronisé' : selected.surahAudioBase ? ' · sourates entières' : ''}
          </Text>
        </View>
      </View>

      <View style={[styles.search, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name="search" size={18} color={colors.textSubtle} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Nom ou pays…"
          placeholderTextColor={colors.textSubtle}
          style={[Type.body, { flex: 1, color: colors.text, marginLeft: Spacing.sm }]}
          autoCorrect={false}
        />
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(f) => f.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md }}
        renderItem={({ item }) => <Chip label={item.label} active={filter === item.id} onPress={() => setFilter(item.id)} />}
      />
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.xl, paddingBottom: Spacing.xxxl }}
      data={list}
      keyExtractor={(r) => String(r.id)}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <Text style={[Type.callout, { color: colors.textMuted, textAlign: 'center', padding: Spacing.xxl }]}>
          {filter === 'favorites' ? 'Touchez le cœur d’un récitateur pour l’ajouter ici.' : 'Aucun récitateur trouvé.'}
        </Text>
      }
      renderItem={({ item }) => {
        const isSelected = item.id === selected.id;
        const fav = favorites.includes(item.id);
        const previewing = previewId === item.id;
        const loadingPreview = previewing && !status.playing;
        return (
          <Tap
            onPress={() => setSelected(item)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.row,
              {
                backgroundColor: isSelected ? colors.primarySoft : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
          >
            <Tap
              haptic
              onPress={() => preview(item)}
              accessibilityLabel={previewing ? 'Arrêter l’extrait' : `Écouter un extrait de ${item.name}`}
              style={[styles.previewBtn, { backgroundColor: previewing ? colors.gold : colors.surfaceAlt }]}
            >
              {loadingPreview ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Ionicons name={previewing ? 'stop' : 'play'} size={18} color={previewing ? '#fff' : colors.primary} />
              )}
            </Tap>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={[Type.headline, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={{ fontFamily: ArabicFonts.regular, fontSize: 17, color: colors.textMuted, textAlign: 'left' }} numberOfLines={1}>
                {item.nameArabic}
              </Text>
              <Text style={[Type.caption, { color: colors.textMuted }]} numberOfLines={2}>
                {item.description}
              </Text>
              <View style={styles.tags}>
                <Text style={[styles.tag, { color: colors.textMuted, backgroundColor: colors.surfaceAlt }]}>{item.country}</Text>
                {item.learning && <Text style={[styles.tag, { color: colors.gold, backgroundColor: colors.goldSoft }]}>Pour apprendre</Text>}
                {!!item.surahAudioBase && <Text style={[styles.tag, { color: colors.textMuted, backgroundColor: colors.surfaceAlt }]}>Sourate entière</Text>}
                {!!item.quranComId && <Text style={[styles.tag, { color: colors.primary, backgroundColor: colors.primarySoft }]}>Mot à mot</Text>}
              </View>
            </View>
            <View style={{ alignItems: 'center' }}>
              <IconButton
                icon={fav ? 'heart' : 'heart-outline'}
                color={fav ? colors.gold : colors.textSubtle}
                label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                onPress={() => toggleFavorite(item.id)}
              />
              <Ionicons
                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={isSelected ? colors.primary : colors.border}
                style={{ marginTop: Spacing.xs }}
              />
            </View>
          </Tap>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: Spacing.xl },
  current: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  avatarLg: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E9D49A', alignItems: 'center', justifyContent: 'center' },
  currentOverline: { color: '#E9D49A', fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  currentName: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 2 },
  currentSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  search: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    height: 46,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  previewBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, overflow: 'hidden' },
});
