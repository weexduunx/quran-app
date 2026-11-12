import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { tafsirBooks, languageLabel, useTafsirStore, TafsirBook } from '@/stores/tafsirStore';
import { useProgressStore } from '@/stores/progressStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ArabicFonts, Radius, Spacing, Type } from '@/constants/theme';
import { Button, Card, Chip, IconButton, SectionTitle } from '@/components/ui/kit';
import { surahTransliteration } from '@/utils/surahNames';

type Filter = 'all' | 'arabic' | 'english' | 'favorites';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'arabic', label: 'Arabe' },
  { id: 'english', label: 'Anglais' },
  { id: 'favorites', label: 'Favoris' },
];

export default function TafsirScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const lastRead = useProgressStore((s) => s.lastRead);
  const favorites = useTafsirStore((s) => s.favoriteBooks);
  const toggleFavorite = useTafsirStore((s) => s.toggleFavorite);
  const preferred = useTafsirStore((s) => s.preferredTextBook);
  const [filter, setFilter] = useState<Filter>('all');

  const audioBooks = tafsirBooks.filter((b) => b.kind === 'audio');
  const textBooks = useMemo(
    () =>
      tafsirBooks.filter((b) => {
        if (b.kind !== 'text') return false;
        if (filter === 'favorites') return favorites.includes(b.id);
        if (filter === 'all') return true;
        return b.language === filter;
      }),
    [filter, favorites]
  );

  const surah = lastRead?.surahNumber ?? 1;
  const verse = lastRead?.verseNumber ?? 1;

  const open = (book: TafsirBook) =>
    router.push({
      pathname: '/tafsir/[bookId]',
      params: { bookId: book.id, surah: String(surah), verse: String(verse) },
    });

  const preferredBook = tafsirBooks.find((b) => b.id === preferred) ?? textBooks[0];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.xl, paddingBottom: Spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pad}>
        <Text style={[Type.largeTitle, { color: colors.text }]}>Tafsir</Text>
        <Text style={[Type.body, { color: colors.textMuted }]}>Comprendre le sens de chaque verset</Text>
      </View>

      {/* Reprendre */}
      {lastRead && preferredBook && (
        <Card onPress={() => open(preferredBook)} style={{ marginHorizontal: Spacing.xl, marginTop: Spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="reader-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={[Type.caption, { color: colors.primary, fontWeight: '600' }]}>Là où vous en êtes</Text>
              <Text style={[Type.headline, { color: colors.text }]}>
                {surahTransliteration(lastRead.surahNumber)} · verset {lastRead.verseNumber}
              </Text>
              <Text style={[Type.caption, { color: colors.textMuted }]}>{preferredBook.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />
          </View>
        </Card>
      )}

      {/* Wolof */}
      <View style={[styles.pad, styles.mtXl]}>
        <SectionTitle>En wolof</SectionTitle>
      </View>
      {audioBooks.map((wolof) => (
        <View key={wolof.id} style={[styles.hero, { backgroundColor: colors.primaryStrong }]}>
          <View style={styles.heroBadge}>
            <Ionicons name="headset" size={14} color="#0B3D2E" />
            <Text style={styles.heroBadgeText}>Audio</Text>
          </View>
          <Text style={styles.heroArabic}>{wolof.titleArabic}</Text>
          <Text style={styles.heroTitle}>{wolof.title}</Text>
          <Text style={styles.heroDesc}>{wolof.description}</Text>
          <Button
            title="Écouter"
            icon="play"
            onPress={() => open(wolof)}
            style={{ marginTop: Spacing.lg, alignSelf: 'flex-start', backgroundColor: '#E9D49A' }}
            textColor="#0B3D2E"
          />
        </View>
      ))}

      {/* Écrits */}
      <View style={[styles.pad, styles.mtXl]}>
        <SectionTitle>Commentaires écrits</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => (
            <Chip key={f.id} label={f.label} active={filter === f.id} onPress={() => setFilter(f.id)} />
          ))}
        </ScrollView>
      </View>

      <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {textBooks.length === 0 ? (
          <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
            <Ionicons name="heart-outline" size={28} color={colors.textSubtle} />
            <Text style={[Type.callout, { color: colors.textMuted, marginTop: Spacing.sm, textAlign: 'center' }]}>
              Touchez le cœur d&apos;un tafsir pour le retrouver ici.
            </Text>
          </View>
        ) : (
          textBooks.map((b, i) => {
            const fav = favorites.includes(b.id);
            return (
              <View
                key={b.id}
                style={[
                  styles.row,
                  i < textBooks.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
              >
                <Card onPress={() => open(b)} style={styles.rowTap}>
                  <View style={[styles.langTile, { backgroundColor: colors.primarySoft }]}>
                    <Text style={[Type.caption, { color: colors.primary, fontWeight: '700' }]}>
                      {b.language === 'arabic' ? 'ع' : 'EN'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <Text style={[Type.headline, { color: colors.text }]}>{b.title}</Text>
                    <Text style={[Type.caption, { color: colors.textMuted }]} numberOfLines={2}>
                      {b.description}
                    </Text>
                    <View style={styles.meta}>
                      <Text style={[styles.tag, { color: colors.primary, backgroundColor: colors.primarySoft }]}>
                        {languageLabel[b.language]}
                      </Text>
                      {b.level && (
                        <Text style={[styles.tag, { color: colors.gold, backgroundColor: colors.goldSoft }]}>
                          {b.level.charAt(0).toUpperCase() + b.level.slice(1)}
                        </Text>
                      )}
                    </View>
                  </View>
                </Card>
                <IconButton
                  icon={fav ? 'heart' : 'heart-outline'}
                  color={fav ? colors.gold : colors.textSubtle}
                  label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  onPress={() => toggleFavorite(b.id)}
                />
              </View>
            );
          })
        )}
      </View>

      <Text style={[Type.caption, styles.pad, { color: colors.textSubtle, marginTop: Spacing.lg }]}>
        Aucun tafsir écrit en français n&apos;est disponible librement pour l&apos;instant : le verset est
        toujours affiché avec sa traduction française au-dessus du commentaire. Sources : Quran.com et
        Internet Archive.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: Spacing.xl },
  mtLg: { marginTop: Spacing.lg },
  mtXl: { marginTop: Spacing.xxl },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hero: { marginHorizontal: Spacing.xl, marginTop: Spacing.md, borderRadius: Radius.xl, padding: Spacing.xl },
  heroBadge: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E9D49A',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeText: { color: '#0B3D2E', fontSize: 12, fontWeight: '700' },
  heroArabic: { fontFamily: ArabicFonts.regular, fontSize: 24, lineHeight: 42, color: '#E9D49A', marginRight: 80 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 2 },
  heroDesc: { color: 'rgba(255,255,255,0.78)', fontSize: 15, lineHeight: 21, marginTop: 4 },
  chips: { gap: Spacing.sm, paddingTop: Spacing.md },
  list: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: Spacing.sm },
  rowTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  langTile: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  meta: { flexDirection: 'row', gap: 6, marginTop: 8 },
  tag: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, overflow: 'hidden' },
});
