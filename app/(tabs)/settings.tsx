import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  useSettingsStore,
  ARABIC_SIZES,
  TRANSLATION_SIZES,
  ThemeMode,
} from '@/stores/settingsStore';
import { useProgressStore } from '@/stores/progressStore';
import { useReciterStore } from '@/stores/reciterStore';
import { useTafsirStore } from '@/stores/tafsirStore';
import { quranApi } from '@/services/api';
import { useAppTheme } from '@/hooks/useAppTheme';
import { toHijri, formatHijri } from '@/utils/hijri';
import { ArabicFonts, Radius, Spacing, Type } from '@/constants/theme';
import { IconButton, Segmented, SectionTitle, Tap } from '@/components/ui/kit';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const s = useSettingsStore();
  const bookmarksCount = useProgressStore((p) => p.bookmarks.length);
  const clearProgress = useProgressStore((p) => p.clearAll);
  const reciter = useReciterStore((r) => r.getSelectedReciter());

  const arabicSize = ARABIC_SIZES[s.arabicSizeIndex];
  const translationSize = TRANSLATION_SIZES[s.translationSizeIndex];

  const clearCache = () =>
    Alert.alert('Vider le cache', 'Les textes seront retéléchargés. Vos favoris et votre progression sont conservés.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Vider',
        style: 'destructive',
        onPress: async () => {
          await quranApi.forceClearCache();
          Alert.alert('Cache vidé', 'Le cache a été vidé avec succès.');
        },
      },
    ]);

  const resetAll = () =>
    Alert.alert('Tout réinitialiser', 'Réglages, favoris et progression seront effacés. Continuer ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Réinitialiser',
        style: 'destructive',
        onPress: () => {
          s.reset();
          clearProgress();
          useReciterStore.getState().resetStore();
          useTafsirStore.setState({ favoriteBooks: [], preferredTextBook: 'muyassar' });
        },
      },
    ]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.md, paddingBottom: Spacing.xxxl }}
    >
      <View style={styles.pad}>
        <Text style={[Type.largeTitle, { color: colors.text, marginBottom: Spacing.xl }]}>Réglages</Text>

        {/* Aperçu en direct */}
        <View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text
            style={{
              fontFamily: ArabicFonts.regular,
              fontSize: arabicSize,
              lineHeight: arabicSize * 1.9,
              color: colors.arabic,
              textAlign: 'right',
              writingDirection: 'rtl',
            }}
          >
            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </Text>
          {s.showTransliteration && (
            <Text style={{ fontStyle: 'italic', color: colors.primary, fontSize: translationSize - 1 }}>
              Bismi Allāhi ar-Raḥmāni ar-Raḥīm
            </Text>
          )}
          {s.showTranslation && (
            <Text style={{ color: colors.text, fontSize: translationSize, marginTop: 6 }}>
              Au nom d&apos;Allah, le Tout Miséricordieux, le Très Miséricordieux.
            </Text>
          )}
        </View>

        <SectionTitle style={styles.sectionGap}>Apparence</SectionTitle>
        <Group>
          <View style={styles.rowPad}>
            <Segmented<ThemeMode>
              value={s.themeMode}
              onChange={s.setThemeMode}
              options={[
                { value: 'system', label: 'Auto' },
                { value: 'light', label: 'Clair' },
                { value: 'dark', label: 'Sombre' },
              ]}
            />
          </View>
        </Group>

        <SectionTitle style={styles.sectionGap}>Lecture</SectionTitle>
        <Group>
          <Stepper
            icon="text"
            title="Taille de l'arabe"
            value={arabicSize}
            onMinus={() => s.setArabicSizeIndex(s.arabicSizeIndex - 1)}
            onPlus={() => s.setArabicSizeIndex(s.arabicSizeIndex + 1)}
          />
          <Stepper
            icon="language-outline"
            title="Taille de la traduction"
            value={translationSize}
            onMinus={() => s.setTranslationSizeIndex(s.translationSizeIndex - 1)}
            onPlus={() => s.setTranslationSizeIndex(s.translationSizeIndex + 1)}
          />
          <Toggle
            icon="chatbox-ellipses-outline"
            title="Phonétique"
            subtitle="Lire l'arabe en lettres latines"
            value={s.showTransliteration}
            onChange={s.toggleTransliteration}
          />
          <Toggle
            icon="reader-outline"
            title="Traduction française"
            subtitle="Hamidullah"
            value={s.showTranslation}
            onChange={s.toggleTranslation}
            last
          />
        </Group>

        <SectionTitle style={styles.sectionGap}>Écoute</SectionTitle>
        <Group>
          <Link
            icon="mic-outline"
            title="Récitateur"
            subtitle={reciter?.name}
            onPress={() => router.push('/hafiz')}
          />
          <Link
            icon="bookmark-outline"
            title="Mes favoris"
            subtitle={`${bookmarksCount} verset${bookmarksCount > 1 ? 's' : ''}`}
            onPress={() => router.push('/bookmarks')}
            last
          />
        </Group>

        <SectionTitle style={styles.sectionGap}>Calendrier</SectionTitle>
        <Group>
          <Stepper
            icon="moon-outline"
            title="Ajustement hégirien"
            subtitle={formatHijri(toHijri(new Date(), s.hijriOffset))}
            value={s.hijriOffset > 0 ? `+${s.hijriOffset}` : String(s.hijriOffset)}
            onMinus={() => s.setHijriOffset(s.hijriOffset - 1)}
            onPlus={() => s.setHijriOffset(s.hijriOffset + 1)}
            last
          />
        </Group>

        <SectionTitle style={styles.sectionGap}>Données</SectionTitle>
        <Group>
          <Link icon="trash-outline" title="Vider le cache" subtitle="Conserve favoris et progression" onPress={clearCache} />
          <Link icon="refresh-outline" title="Tout réinitialiser" onPress={resetAll} danger last />
        </Group>

        <Text style={[Type.caption, { color: colors.textSubtle, textAlign: 'center', marginTop: Spacing.xxl }]}>
          Coran · Tafsir en wolof — version 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>
  );
}

function RowShell({
  icon,
  title,
  subtitle,
  right,
  last,
  danger,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  last?: boolean;
  danger?: boolean;
}) {
  const { colors } = useAppTheme();
  const tint = danger ? colors.danger : colors.primary;
  return (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: danger ? 'transparent' : colors.primarySoft }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[Type.callout, { color: danger ? colors.danger : colors.text }]}>{title}</Text>
        {!!subtitle && <Text style={[Type.caption, { color: colors.textMuted }]}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

function Toggle(props: {
  icon: IconName;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: () => void;
  last?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <RowShell
      {...props}
      right={
        <Switch
          value={props.value}
          onValueChange={props.onChange}
          trackColor={{ true: colors.primary, false: colors.surfaceAlt }}
          thumbColor="#fff"
        />
      }
    />
  );
}

function Stepper(props: {
  icon: IconName;
  title: string;
  subtitle?: string;
  value: number | string;
  onMinus: () => void;
  onPlus: () => void;
  last?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <RowShell
      {...props}
      right={
        <View style={styles.stepper}>
          <IconButton icon="remove" label="Diminuer" size={18} filled onPress={props.onMinus} />
          <Text style={[Type.headline, { color: colors.text, minWidth: 34, textAlign: 'center' }]}>{props.value}</Text>
          <IconButton icon="add" label="Augmenter" size={18} filled onPress={props.onPlus} />
        </View>
      }
    />
  );
}

function Link(props: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  last?: boolean;
  danger?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Tap onPress={props.onPress} accessibilityRole="button">
      <RowShell {...props} right={<Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />} />
    </Tap>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: Spacing.xl },
  sectionGap: { marginTop: Spacing.xxl },
  preview: { borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: StyleSheet.hairlineWidth },
  group: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  rowPad: { padding: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  rowIcon: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
