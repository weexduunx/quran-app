import React, { useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View, ViewToken } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { BrandMark, APP_NAME } from '@/components/BrandMark';
import { CityPicker } from '@/components/CityPicker';
import { Tap } from '@/components/ui/kit';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSettingsStore } from '@/stores/settingsStore';
import { popularReciters, useReciterStore } from '@/stores/reciterStore';
import { ArabicFonts, Radius, Spacing, Type } from '@/constants/theme';

const PAGES = ['welcome', 'understand', 'learn', 'personalize'] as const;
type Page = (typeof PAGES)[number];

// Voix proposées au premier lancement : la plus claire, la plus pédagogique, la sénégalaise
const VOICES = [
  { id: 1, sub: 'Voix claire · mot à mot synchronisé' },
  { id: 12, sub: 'Lente, idéale pour apprendre' },
  { id: 20, sub: 'Hafiz sénégalais · sourates entières' },
];

const COPY: Record<Page, { title: string; body: string }> = {
  welcome: {
    title: `Assalamou alaykoum,\nbienvenue sur ${APP_NAME}`,
    body: 'Lisez, écoutez et comprenez le Coran, même sans parler arabe. Chaque verset en arabe, en phonétique et en français.',
  },
  understand: {
    title: 'Comprendre chaque verset',
    body: 'Suivez la récitation mot à mot. Touchez un mot pour l’entendre de nouveau, et lisez sa prononciation en lettres latines.',
  },
  learn: {
    title: 'Apprendre à votre rythme',
    body: 'Répétez un verset pour le mémoriser, ralentissez la voix, puis écoutez son explication en wolof.',
  },
  personalize: { title: 'Choisissez votre voix', body: 'Vous pourrez en changer à tout moment dans Récitateurs.' },
};

export default function OnboardingScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<Page>>(null);
  const [index, setIndex] = useState(0);
  const [listHeight, setListHeight] = useState(height);

  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setIndex(first.index);
  }).current;

  const finish = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const next = () => {
    if (index >= PAGES.length - 1) return finish();
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const heroHeight = Math.round(Math.min(470, height * 0.52));
  const onDarkHero = index === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        data={PAGES as unknown as Page[]}
        keyExtractor={(p) => p}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width, height: listHeight }}>
            {item === 'personalize' ? (
              <Personalize topInset={insets.top} />
            ) : (
              <>
                <Hero page={item} height={heroHeight} topInset={insets.top} />
                <View style={styles.copy}>
                  <Text style={[Type.largeTitle, { color: colors.text }]}>{COPY[item].title}</Text>
                  <Text style={[Type.body, { color: colors.textMuted, marginTop: Spacing.md }]}>{COPY[item].body}</Text>
                </View>
              </>
            )}
          </View>
        )}
      />

      {/* Passer : toujours accessible */}
      {index < PAGES.length - 1 && (
        <Tap
          onPress={finish}
          accessibilityRole="button"
          style={[styles.skip, { top: insets.top + Spacing.sm }]}
          hitSlop={8}
        >
          <Text style={[Type.callout, { fontWeight: '600', color: onDarkHero ? 'rgba(255,255,255,0.85)' : colors.primary }]}>
            Passer
          </Text>
        </Tap>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.dots} accessibilityLabel={`Étape ${index + 1} sur ${PAGES.length}`}>
          {PAGES.map((p, i) => (
            <View
              key={p}
              style={[styles.dot, { backgroundColor: i === index ? colors.primary : colors.border, width: i === index ? 24 : 6 }]}
            />
          ))}
        </View>
        <Tap haptic onPress={next} accessibilityRole="button" style={[styles.cta, { backgroundColor: colors.primary }]}>
          <Text style={[Type.callout, { color: colors.onPrimary, fontWeight: '600', fontSize: 16 }]}>
            {index === 0 ? 'Commencer' : index === PAGES.length - 1 ? 'C’est parti' : 'Suivant'}
          </Text>
          {index < PAGES.length - 1 && <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} style={{ marginLeft: 8 }} />}
        </Tap>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Illustrations (pages 1 à 3)
// ---------------------------------------------------------------------------
function Hero({ page, height, topInset }: { page: Page; height: number; topInset: number }) {
  const { colors } = useAppTheme();

  if (page === 'welcome') {
    return (
      <View style={[styles.hero, { height, backgroundColor: colors.primaryStrong, justifyContent: 'center', alignItems: 'center' }]}>
        <BrandMark size={150} />
        <Text style={styles.heroArabic}>ٱقْرَأْ بِٱسْمِ رَبِّكَ</Text>
        <Text style={styles.heroQuote}>« Lis, au nom de ton Seigneur » — 96:1</Text>
      </View>
    );
  }

  if (page === 'understand') {
    const words = [
      { ar: 'ٱلْحَمْدُ', tr: 'al-ḥamdu', state: 'done' },
      { ar: 'لِلَّهِ', tr: 'lillāhi', state: 'now' },
      { ar: 'رَبِّ', tr: 'rabbi', state: 'next' },
      { ar: 'ٱلْعَٰلَمِينَ', tr: 'al-ʿālamīna', state: 'next' },
    ];
    return (
      <View style={[styles.hero, { height, backgroundColor: colors.primarySoft, paddingTop: topInset + 64 }]}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[Type.caption, { color: colors.gold, fontWeight: '700', flex: 1 }]}>Al-Fatiha · 1:2</Text>
            <Text style={[styles.badge, { color: colors.primary, backgroundColor: colors.primarySoft }]}>En écoute</Text>
          </View>
          <View style={styles.words}>
            {words.map((w) => (
              <View
                key={w.ar}
                style={[styles.word, { backgroundColor: w.state === 'now' ? '#E9D49A' : colors.surfaceAlt }]}
              >
                <Text
                  style={{
                    fontFamily: ArabicFonts.regular,
                    fontSize: 24,
                    lineHeight: 38,
                    color: w.state === 'now' ? '#0B3D2E' : w.state === 'done' ? colors.textSubtle : colors.text,
                  }}
                >
                  {w.ar}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '500', color: w.state === 'now' ? '#0B3D2E' : colors.textMuted }}>{w.tr}</Text>
              </View>
            ))}
          </View>
          <Text style={[Type.callout, { color: colors.primary, fontStyle: 'italic', marginTop: Spacing.md }]}>
            Al-ḥamdu lillāhi rabbi al-ʿālamīn
          </Text>
          <Text style={[Type.callout, { color: colors.text, marginTop: 4 }]}>Louange à Allah, Seigneur de l’univers.</Text>
        </View>
        <Text style={[Type.caption, { color: colors.primary, fontWeight: '600', textAlign: 'center', marginTop: Spacing.md }]}>
          Le mot récité s’allume en or
        </Text>
      </View>
    );
  }

  // learn
  return (
    <View style={[styles.hero, { height, backgroundColor: colors.goldSoft, paddingTop: topInset + 64, gap: Spacing.md }]}>
      <View style={[styles.player, { backgroundColor: '#0B3D2E' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.playerAvatar}>
            <Ionicons name="mic-outline" size={18} color="#E9D49A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Al-Husary — Enseignement</Text>
            <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12 }}>Al-Ikhlas · verset 1 · 2/3</Text>
          </View>
        </View>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: '60%' }]} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.pill}>0,75×</Text>
          <View style={styles.playBtn}>
            <Ionicons name="pause" size={22} color="#0B3D2E" />
          </View>
          <View style={[styles.pillRow, { borderColor: '#E9D49A', backgroundColor: 'rgba(255,255,255,0.10)' }]}>
            <Ionicons name="repeat" size={14} color="#E9D49A" />
            <Text style={{ color: '#E9D49A', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>×3</Text>
          </View>
        </View>
      </View>
      <MiniRow icon="headset-outline" title="Tafsir en wolof" sub="Baye Niasse · Oustaz Ibrahima Fall" />
      <MiniRow icon="flame-outline" title="Une habitude chaque jour" sub="Reprise automatique et série de jours" />
    </View>
  );
}

function MiniRow({ icon, title, sub }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; sub: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.miniRow, { backgroundColor: colors.surface }]}>
      <View style={[styles.miniIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[Type.callout, { color: colors.text, fontWeight: '600' }]}>{title}</Text>
        <Text style={[Type.caption, { color: colors.textMuted }]}>{sub}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Page 4 : voix + ville
// ---------------------------------------------------------------------------
function Personalize({ topInset }: { topInset: number }) {
  const { colors } = useAppTheme();
  const selectedId = useReciterStore((s) => s.getSelectedReciter().id);
  const setReciter = useReciterStore((s) => s.setSelectedReciter);
  const city = useSettingsStore((s) => s.city);
  const setCity = useSettingsStore((s) => s.setCity);
  const [picker, setPicker] = useState(false);

  return (
    <View style={{ flex: 1, paddingTop: topInset + 56, paddingHorizontal: Spacing.xl }}>
      <Text style={[Type.largeTitle, { color: colors.text }]}>{COPY.personalize.title}</Text>
      <Text style={[Type.body, { color: colors.textMuted, marginTop: Spacing.sm }]}>{COPY.personalize.body}</Text>

      <View accessibilityRole="radiogroup" style={{ marginTop: Spacing.xl, gap: 10 }}>
        {VOICES.map((v) => {
          const reciter = popularReciters.find((r) => r.id === v.id);
          if (!reciter) return null;
          const active = selectedId === v.id;
          return (
            <Tap
              key={v.id}
              haptic
              onPress={() => setReciter(reciter)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[
                styles.voice,
                {
                  borderColor: active ? colors.primary : colors.border,
                  borderWidth: active ? 2 : 1,
                  backgroundColor: active ? colors.primarySoft : colors.surface,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[Type.headline, { color: colors.text }]}>{reciter.name}</Text>
                <Text style={[Type.caption, { color: colors.textMuted }]}>{v.sub}</Text>
              </View>
              <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={24} color={active ? colors.primary : colors.textSubtle} />
            </Tap>
          );
        })}
      </View>

      <Text style={[Type.overline, { color: colors.textSubtle, marginTop: Spacing.xxl, marginBottom: Spacing.sm }]}>
        HEURES DE PRIÈRE
      </Text>
      <Tap
        onPress={() => setPicker(true)}
        accessibilityRole="button"
        accessibilityLabel={`Ville : ${city}. Modifier`}
        style={[styles.voice, { borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surface }]}
      >
        <View style={[styles.miniIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="location-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[Type.callout, { color: colors.text, fontWeight: '600' }]}>Ville</Text>
          <Text style={[Type.caption, { color: colors.textMuted }]}>{city}</Text>
        </View>
        <Text style={[Type.callout, { color: colors.primary, fontWeight: '600' }]}>Modifier</Text>
      </Tap>

      <CityPicker
        visible={picker}
        selected={city}
        onClose={() => setPicker(false)}
        onSelect={(name) => {
          setCity(name);
          setPicker(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingHorizontal: Spacing.xl, overflow: 'hidden' },
  heroArabic: { fontFamily: ArabicFonts.regular, fontSize: 26, lineHeight: 46, color: '#E9D49A', marginTop: Spacing.xl },
  heroQuote: { color: 'rgba(255,255,255,0.78)', fontSize: 14, fontStyle: 'italic' },
  copy: { paddingHorizontal: Spacing.xl + 4, paddingTop: Spacing.xxl + 20 },
  skip: { position: 'absolute', right: Spacing.lg, height: 44, justifyContent: 'center', paddingHorizontal: Spacing.md },
  footer: { paddingHorizontal: Spacing.xl + 4, gap: Spacing.xl },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  cta: { height: 54, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: Radius.xl, padding: Spacing.lg },
  badge: { fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, overflow: 'hidden' },
  words: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: Spacing.md },
  word: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md, alignItems: 'center' },
  player: { borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md },
  playerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)' },
  trackFill: { height: 4, borderRadius: 2, backgroundColor: '#E9D49A' },
  pill: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
    overflow: 'hidden',
  },
  pillRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 10, height: 32 },
  playBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E9D49A', alignItems: 'center', justifyContent: 'center' },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, padding: Spacing.md },
  miniIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  voice: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, padding: Spacing.md },
});
