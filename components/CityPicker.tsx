import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Modal, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { placeLabel, samePlace, searchBuiltInPlaces, SENEGAL_CITIES, WORLD_CITIES, type Place } from '@/utils/cities';
import { placeService } from '@/services/placeService';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, Type } from '@/constants/theme';
import { IconButton, Tap } from '@/components/ui/kit';

type Section = { title: string; data: Place[] };

/**
 * Choix du lieu des heures de prière : position GPS, recherche mondiale
 * (en ligne) ou liste intégrée (hors ligne).
 */
export function CityPicker({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: Place;
  onSelect: (place: Place) => void;
  onClose: () => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [online, setOnline] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [gps, setGps] = useState<'idle' | 'loading' | 'denied' | 'unavailable'>('idle');

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setGps('idle');
    }
  }, [visible]);

  // Recherche en ligne, 400 ms après la dernière frappe
  useEffect(() => {
    const q = query.trim();
    setSearchError(false);
    if (q.length < 2) {
      setOnline([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const t = setTimeout(() => {
      placeService
        .search(q, ctrl.signal)
        .then(setOnline)
        .catch((e) => {
          if (e?.name !== 'AbortError') setSearchError(true);
        })
        .finally(() => !ctrl.signal.aborted && setSearching(false));
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const sections = useMemo<Section[]>(() => {
    if (query.trim().length < 2) {
      return [
        { title: 'Sénégal', data: SENEGAL_CITIES },
        { title: 'Dans le monde', data: WORLD_CITIES },
      ];
    }
    const local = searchBuiltInPlaces(query);
    // On n'affiche pas deux fois la même ville
    const remote = online.filter((o) => !local.some((l) => samePlace(l, o) || (l.name === o.name && l.countryCode === o.countryCode)));
    return [
      ...(local.length ? [{ title: 'Villes proposées', data: local }] : []),
      ...(remote.length ? [{ title: 'Résultats de la recherche', data: remote }] : []),
    ];
  }, [query, online]);

  const locate = async () => {
    setGps('loading');
    const res = await placeService.current();
    if (typeof res === 'string') {
      setGps(res);
      return;
    }
    setGps('idle');
    onSelect(res);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Spacing.md }}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[Type.title, { color: colors.text }]}>Votre lieu</Text>
            <Text style={[Type.caption, { color: colors.textMuted }]}>Pour calculer les heures de prière, partout dans le monde</Text>
          </View>
          <IconButton icon="close" label="Fermer" filled onPress={onClose} />
        </View>

        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSubtle} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Ville : Madrid, Paris, Touba…"
            placeholderTextColor={colors.textSubtle}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Rechercher une ville"
            style={[Type.body, { flex: 1, color: colors.text, paddingVertical: 10 }]}
          />
          {searching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            !!query && <IconButton icon="close-circle" label="Effacer" size={18} color={colors.textSubtle} onPress={() => setQuery('')} />
          )}
        </View>

        <Tap
          haptic
          onPress={locate}
          disabled={gps === 'loading'}
          accessibilityRole="button"
          style={[styles.gps, { backgroundColor: colors.primarySoft }]}
        >
          {gps === 'loading' ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="navigate" size={20} color={colors.primary} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[Type.headline, { color: colors.primary }]}>Utiliser ma position exacte</Text>
            <Text style={[Type.caption, { color: colors.textMuted }]}>
              {gps === 'denied'
                ? 'Accès à la position refusé : autorisez-le dans les réglages du téléphone.'
                : gps === 'unavailable'
                  ? 'Position introuvable. Activez la localisation ou cherchez votre ville.'
                  : 'Coordonnées GPS et fuseau horaire du téléphone'}
            </Text>
          </View>
          {gps === 'denied' && (
            <IconButton icon="settings-outline" label="Ouvrir les réglages" size={18} onPress={() => Linking.openSettings()} />
          )}
        </Tap>

        <SectionList
          sections={sections}
          keyExtractor={(p) => `${p.name}:${p.latitude}:${p.longitude}`}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{section.title.toUpperCase()}</Text>
          )}
          ListEmptyComponent={
            !searching ? (
              <Text style={[Type.callout, { color: colors.textMuted, textAlign: 'center', padding: Spacing.xl }]}>
                {searchError
                  ? 'Recherche impossible sans connexion. Choisissez une ville de la liste ou utilisez votre position.'
                  : 'Aucune ville trouvée.'}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const active = samePlace(item, selected);
            return (
              <Tap
                onPress={() => onSelect(item)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={placeLabel(item)}
                style={[styles.row, { borderBottomColor: colors.border }, active && { backgroundColor: colors.primarySoft }]}
              >
                <Ionicons name="location-outline" size={20} color={active ? colors.primary : colors.textSubtle} />
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={[Type.body, { color: colors.text, fontWeight: active ? '600' : '400' }]}>{item.name}</Text>
                  {!!item.country && <Text style={[Type.caption, { color: colors.textMuted }]}>{item.country}</Text>}
                </View>
                {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </Tap>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  gps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
