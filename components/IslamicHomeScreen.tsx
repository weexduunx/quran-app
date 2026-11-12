import React, { useEffect, useMemo, useState } from 'react';
import { ImageBackground, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { prayerTimesService, DailyPrayerTimes } from '@/services/prayerTimesService';
import { quranApi } from '@/services/api';
import { Verse } from '@/stores/quranStore';
import { useProgressStore, computeStreak } from '@/stores/progressStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { toHijri, formatHijri } from '@/utils/hijri';
import { verseOfTheDay } from '@/utils/quranMeta';
import { ArabicFonts, Radius, Spacing, Type } from '@/constants/theme';
import { Card, SectionTitle, Tap, Button } from '@/components/ui/kit';
import { surahFrenchTitle, surahTransliteration } from '@/utils/surahNames';
import { findCity } from '@/utils/cities';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const greeting = (h: number) =>
  h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';

function formatCountdown(ms: number) {
  if (ms <= 0) return 'maintenant';
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `dans ${h} h ${String(m).padStart(2, '0')}` : `dans ${m} min`;
}

export const IslamicHomeScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const hijriOffset = useSettingsStore((s) => s.hijriOffset);
  const city = useSettingsStore((s) => s.city);
  const lastRead = useProgressStore((s) => s.lastRead);
  const bookmarksCount = useProgressStore((s) => s.bookmarks.length);
  const readingDays = useProgressStore((s) => s.readingDays);

  const [now, setNow] = useState(new Date());
  const location = useMemo(() => findCity(city), [city]);
  const [prayers, setPrayers] = useState<DailyPrayerTimes>(() =>
    prayerTimesService.calculatePrayerTimes(new Date(), location)
  );
  const [dailyVerse, setDailyVerse] = useState<Verse | null>(null);

  // 15 s suffisent pour un compte à rebours à la minute — inutile de re-rendre chaque seconde.
  useEffect(() => {
    setPrayers(prayerTimesService.calculatePrayerTimes(new Date(), location));
    const timer = setInterval(() => {
      setNow(new Date());
      setPrayers(prayerTimesService.calculatePrayerTimes(new Date(), location));
    }, 15000);
    return () => clearInterval(timer);
  }, [location]);

  useEffect(() => {
    const { global } = verseOfTheDay();
    quranApi
      .getVerseByGlobalNumber(global)
      .then(setDailyVerse)
      .catch(() => setDailyVerse(null));
  }, []);

  const hijri = useMemo(() => formatHijri(toHijri(now, hijriOffset)), [now, hijriOffset]);
  const gregorian = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const streak = computeStreak(readingDays);

  const prayerList = [prayers.fajr, prayers.dhuhr, prayers.asr, prayers.maghrib, prayers.isha];
  const next = prayers.nextPrayer;
  const msToNext = next ? next.timeDate.getTime() - now.getTime() : 0;

  const shareVerse = () => {
    if (!dailyVerse) return;
    Share.share({
      message: `${dailyVerse.text_arabic}\n\n« ${dailyVerse.text_french} »\n— Coran ${dailyVerse.surah_id}:${dailyVerse.verse_number}`,
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: Spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={[Type.caption, { color: colors.textMuted, textTransform: 'capitalize' }]}>
          {gregorian} · {hijri}
        </Text>
        <Text style={[Type.largeTitle, { color: colors.text, marginTop: 4 }]}>
          {greeting(now.getHours())}
        </Text>
        <Text style={[Type.body, { color: colors.textMuted }]}>Assalamou alaykoum 🤲</Text>
      </View>

      {/* Prochaine prière */}
      <View style={styles.section}>
        <ImageBackground
          source={require('@/assets/images/dakar-mosque.jpg')}
          style={styles.hero}
          imageStyle={{ borderRadius: Radius.xl }}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(6,30,22,0.15)', 'rgba(6,30,22,0.88)']}
            style={[StyleSheet.absoluteFill, { borderRadius: Radius.xl }]}
          />
          <View style={styles.heroTop}>
            <View style={styles.heroPill}>
              <Ionicons name="location" size={12} color="#fff" />
              <Text style={styles.heroPillText}>{city}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.heroLabel}>Prochaine prière</Text>
            <View style={styles.heroRow}>
              <Text style={styles.heroName}>{next?.name ?? '—'}</Text>
              <Text style={styles.heroTime}>{next?.time ?? ''}</Text>
            </View>
            <Text style={styles.heroCountdown}>{formatCountdown(msToNext)}</Text>
          </View>
          <View style={styles.prayerStrip}>
            {prayerList.map((p) => {
              const active = next?.name === p.name;
              return (
                <View key={p.name} style={[styles.prayerCell, active && styles.prayerCellActive]}>
                  <Text style={[styles.prayerCellName, active && { color: '#0B3D2E' }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={[styles.prayerCellTime, active && { color: '#0B3D2E' }]}>{p.time}</Text>
                </View>
              );
            })}
          </View>
        </ImageBackground>
      </View>

      {/* Reprendre la lecture */}
      <View style={styles.section}>
        <SectionTitle>Ma lecture</SectionTitle>
        {lastRead ? (
          <Card
            onPress={() => router.push(`/surah/${lastRead.surahId}?verse=${lastRead.verseNumber}`)}
          >
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={[Type.caption, { color: colors.primary }]}>Reprendre</Text>
                <Text style={[Type.title, { color: colors.text, marginTop: 2 }]}>{surahTransliteration(lastRead.surahNumber)}</Text>
                <Text style={[Type.caption, { color: colors.textMuted, marginTop: 2 }]}>
                  {surahFrenchTitle(lastRead.surahNumber)} · verset {lastRead.verseNumber} sur {lastRead.versesCount}
                </Text>
              </View>
              <Text style={[styles.arabicName, { color: colors.arabic }]}>{lastRead.surahNameArabic}</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${Math.min(100, (lastRead.verseNumber / Math.max(1, lastRead.versesCount)) * 100)}%`,
                  },
                ]}
              />
            </View>
          </Card>
        ) : (
          <Card tone="soft">
            <Text style={[Type.headline, { color: colors.text }]}>Commencez votre voyage</Text>
            <Text style={[Type.callout, { color: colors.textMuted, marginTop: 4, marginBottom: Spacing.md }]}>
              Lisez, écoutez et comprenez le Coran — en arabe, en français et en phonétique.
            </Text>
            <Button title="Ouvrir Al-Fatiha" icon="book-outline" onPress={() => router.push('/surah/1')} />
          </Card>
        )}

        <View style={[styles.statsRow]}>
          <Stat icon="flame" value={streak} label={streak > 1 ? 'jours de suite' : 'jour de suite'} />
          <Stat
            icon="bookmark"
            value={bookmarksCount}
            label="favoris"
            onPress={() => router.push('/bookmarks')}
          />
        </View>
      </View>

      {/* Verset du jour */}
      {dailyVerse && (
        <View style={styles.section}>
          <SectionTitle action="Partager" onAction={shareVerse}>
            Verset du jour
          </SectionTitle>
          <Card onPress={() => router.push(`/surah/${dailyVerse.surah_id}?verse=${dailyVerse.verse_number}`)}>
            <Text style={[styles.dailyArabic, { color: colors.arabic }]}>{dailyVerse.text_arabic}</Text>
            <Text style={[Type.body, { color: colors.text, marginTop: Spacing.md }]}>
              « {dailyVerse.text_french} »
            </Text>
            <Text style={[Type.caption, { color: colors.gold, marginTop: Spacing.sm }]}>
              {dailyVerse.surah?.name_transliteration ?? 'Sourate'} {dailyVerse.surah_id}:{dailyVerse.verse_number}
            </Text>
          </Card>
        </View>
      )}

      {/* Accès rapides */}
      <View style={styles.section}>
        <Tap
          haptic
          onPress={() => router.push('/kids')}
          accessibilityRole="button"
          accessibilityLabel="Espace enfants : mes petites sourates, dès 4 ans"
          style={styles.kids}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.kidsOverline}>DÈS 4 ANS</Text>
            <Text style={styles.kidsTitle}>Espace enfants</Text>
            <Text style={styles.kidsSub}>Mes petites sourates : écoute et répète, avec des étoiles à gagner.</Text>
          </View>
          <View style={styles.kidsPlay}>
            <Ionicons name="happy-outline" size={30} color="#5A3F06" />
          </View>
        </Tap>
      </View>

      <View style={styles.section}>
        <SectionTitle>Explorer</SectionTitle>
        <View style={styles.quickGrid}>
          <Quick icon="book-outline" title="Le Coran" subtitle="114 sourates" onPress={() => router.push('/explore')} />
          <Quick
            icon="chatbubbles-outline"
            title="Tafsir"
            subtitle="Explication en wolof"
            onPress={() => router.push('/tafsir')}
          />
          <Quick icon="mic-outline" title="Récitateurs" subtitle="Choisir une voix" onPress={() => router.push('/hafiz')} />
          <Quick icon="bookmark-outline" title="Favoris" subtitle="Vos versets" onPress={() => router.push('/bookmarks')} />
        </View>
      </View>
    </ScrollView>
  );
};

function Stat({ icon, value, label, onPress }: { icon: IconName; value: number; label: string; onPress?: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Card onPress={onPress} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md }}>
      <View style={[styles.statIcon, { backgroundColor: colors.goldSoft }]}>
        <Ionicons name={icon} size={18} color={colors.gold} />
      </View>
      <View style={{ marginLeft: Spacing.md }}>
        <Text style={[Type.headline, { color: colors.text }]}>{value}</Text>
        <Text style={[Type.caption, { color: colors.textMuted }]}>{label}</Text>
      </View>
    </Card>
  );
}

function Quick({ icon, title, subtitle, onPress }: { icon: IconName; title: string; subtitle: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Tap
      haptic
      onPress={onPress}
      style={[styles.quick, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.quickIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={[Type.headline, { color: colors.text, marginTop: Spacing.md }]}>{title}</Text>
      <Text style={[Type.caption, { color: colors.textMuted }]}>{subtitle}</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  kids: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: '#F8E1A6',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  kidsOverline: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: '#7A5A10' },
  kidsTitle: { fontSize: 22, fontWeight: '800', color: '#3D2A04', marginTop: 2 },
  kidsSub: { fontSize: 14, lineHeight: 20, color: '#5A3F06', marginTop: 4 },
  kidsPlay: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF4D6', alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xxl },
  hero: {
    minHeight: 230,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', justifyContent: 'flex-end' },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  heroPillText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', marginTop: Spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  heroName: { color: '#fff', fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  heroTime: { color: '#fff', fontSize: 30, fontWeight: '300', fontVariant: ['tabular-nums'] },
  heroCountdown: { color: '#E9D49A', fontSize: 14, fontWeight: '600', marginTop: 2 },
  prayerStrip: { flexDirection: 'row', gap: 6, marginTop: Spacing.lg },
  prayerCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  prayerCellActive: { backgroundColor: '#E9D49A' },
  prayerCellName: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  prayerCellTime: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 2, fontVariant: ['tabular-nums'] },
  rowBetween: { flexDirection: 'row', alignItems: 'center' },
  arabicName: { fontFamily: ArabicFonts.regular, fontSize: 30, marginLeft: Spacing.md },
  progressTrack: { height: 6, borderRadius: 3, marginTop: Spacing.lg, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dailyArabic: {
    fontFamily: ArabicFonts.regular,
    fontSize: 26,
    lineHeight: 48,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  quick: {
    width: '48%',
    flexGrow: 1,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
