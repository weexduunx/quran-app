import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ADHKAR, ADHKAR_MOMENTS, DAY_LABELS, EVERY_DAY, type AdhkarMoment, type Dhikr } from '@/utils/adhkar';
import { useSettingsStore, type DuaReminder } from '@/stores/settingsStore';
import { reminderService } from '@/services/reminderService';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ArabicFonts, Radius, Spacing, Type } from '@/constants/theme';
import { Chip, IconButton, Tap } from '@/components/ui/kit';

const pad = (n: number) => String(n).padStart(2, '0');
const isMoment = (m: unknown): m is AdhkarMoment => ADHKAR_MOMENTS.some((x) => x.id === m);

function daysLabel(days: number[]) {
  if (days.length === 7) return 'tous les jours';
  if (days.length === 5 && [2, 3, 4, 5, 6].every((d) => days.includes(d))) return 'du lundi au vendredi';
  const names = ['', 'dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  return [...days].sort().map((d) => names[d]).join(' ');
}

export default function AdhkarScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ moment?: string; dua?: string }>();
  const [moment, setMoment] = useState<AdhkarMoment>(isMoment(params.moment) ? params.moment : 'quotidien');
  const scroll = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  const current = ADHKAR_MOMENTS.find((m) => m.id === moment)!;

  // Ouvert depuis une notification : on va directement à l'invocation
  useEffect(() => {
    if (isMoment(params.moment)) setMoment(params.moment);
  }, [params.moment]);

  const onItemLayout = (id: string, y: number) => {
    positions.current[id] = y;
    if (params.dua === id) scroll.current?.scrollTo({ y: Math.max(0, y - Spacing.md), animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4, borderBottomColor: colors.border }]}>
        <IconButton icon="chevron-back" label="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Text style={[Type.headline, { color: colors.text, flex: 1, textAlign: 'center' }]}>Invocations</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {ADHKAR_MOMENTS.map((m) => (
          <Chip key={m.id} label={m.label} active={m.id === moment} onPress={() => setMoment(m.id)} />
        ))}
      </ScrollView>

      <ScrollView ref={scroll} contentContainerStyle={{ padding: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: insets.bottom + Spacing.xxxl, gap: Spacing.lg }}>
        <View style={styles.hint}>
          <Ionicons name={current.icon} size={18} color={colors.gold} />
          <Text style={[Type.caption, { color: colors.textMuted, flex: 1 }]}>{current.hint}</Text>
        </View>

        {ADHKAR[moment].map((d) => (
          <View key={`${moment}-${d.id}`} onLayout={(e) => onItemLayout(d.id, e.nativeEvent.layout.y)}>
            <DhikrCard dhikr={d} daily={moment === 'quotidien'} highlighted={params.dua === d.id} />
          </View>
        ))}

        <Text style={[Type.caption, { color: colors.textSubtle, textAlign: 'center' }]}>
          Les rappels du matin et du soir suivent les heures de prière de votre lieu. Réglez-les dans Réglages › Rappels.
        </Text>
      </ScrollView>
    </View>
  );
}

function DhikrCard({ dhikr, daily, highlighted }: { dhikr: Dhikr; daily: boolean; highlighted: boolean }) {
  const { colors } = useAppTheme();
  const [count, setCount] = useState(0);
  const done = count >= dhikr.repeat;

  const tick = () => {
    if (done) {
      setCount(0);
      return;
    }
    const next = count + 1;
    setCount(next);
    Haptics.impactAsync(next >= dhikr.repeat ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const share = () =>
    Share.share({ message: [dhikr.title, dhikr.ar, dhikr.tr, `« ${dhikr.fr} »`, `— ${dhikr.src}`].filter(Boolean).join('\n\n') });

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: highlighted ? colors.gold : colors.border },
        highlighted && { borderWidth: 2 },
      ]}
    >
      <View style={styles.cardHead}>
        <Text style={[Type.headline, { color: colors.text, flex: 1 }]}>{dhikr.title}</Text>
        <IconButton icon="share-outline" label={`Partager : ${dhikr.title}`} size={18} onPress={share} />
      </View>

      {!!dhikr.ar && <Text style={[styles.arabic, { color: colors.arabic }]}>{dhikr.ar}</Text>}
      {!!dhikr.tr && <Text style={[Type.callout, { color: colors.primary, fontStyle: 'italic' }]}>{dhikr.tr}</Text>}
      <Text style={[Type.body, { color: colors.text }]}>{dhikr.fr}</Text>
      <Text style={[Type.caption, { color: colors.textSubtle }]}>{dhikr.src}</Text>

      <View style={styles.actions}>
        {dhikr.quran && (
          <Tap
            onPress={() => router.push(`/surah/${dhikr.quran!.surah}${dhikr.quran!.verse ? `?verse=${dhikr.quran!.verse}` : ''}`)}
            accessibilityRole="button"
            style={[styles.pill, { backgroundColor: colors.primarySoft }]}
          >
            <Ionicons name="book-outline" size={16} color={colors.primary} />
            <Text style={[Type.caption, { color: colors.primary, fontWeight: '700' }]}>{dhikr.quran.label}</Text>
          </Tap>
        )}
        {dhikr.repeat > 1 && (
          <Tap
            haptic={false}
            onPress={tick}
            accessibilityRole="button"
            accessibilityLabel={done ? `Terminé, ${dhikr.repeat} fois. Toucher pour recommencer` : `Compter : ${count} sur ${dhikr.repeat}`}
            style={[styles.pill, { backgroundColor: done ? colors.gold : colors.goldSoft }]}
          >
            <Ionicons name={done ? 'checkmark-circle' : 'finger-print-outline'} size={16} color={done ? '#fff' : colors.gold} />
            <Text style={[Type.caption, { color: done ? '#fff' : colors.gold, fontWeight: '700', fontVariant: ['tabular-nums'] }]}>
              {done ? `${dhikr.repeat} fois · recommencer` : `${count} / ${dhikr.repeat}`}
            </Text>
          </Tap>
        )}
        {dhikr.repeat === 1 && !dhikr.quran && (
          <Text style={[Type.caption, { color: colors.textMuted }]}>Une fois</Text>
        )}
      </View>

      {daily && <DuaReminderRow dhikr={dhikr} />}
    </View>
  );
}

/** Rappel d'une invocation du quotidien : heure et jours choisis */
function DuaReminderRow({ dhikr }: { dhikr: Dhikr }) {
  const { colors } = useAppTheme();
  const reminder = useSettingsStore((s) => s.duaReminders[dhikr.id]);
  const setDuaReminder = useSettingsStore((s) => s.setDuaReminder);
  const [editing, setEditing] = useState(false);

  const enable = async () => {
    const granted = await reminderService.requestPermission();
    if (!granted) {
      Alert.alert('Notifications désactivées', "Autorisez les notifications de l'app dans les réglages du téléphone pour recevoir ce rappel.");
      return;
    }
    const s = dhikr.suggested ?? { hour: 8, minute: 0, days: EVERY_DAY };
    setDuaReminder(dhikr.id, { hour: s.hour, minute: s.minute, days: [...s.days] });
    setEditing(true);
  };

  const update = (patch: Partial<DuaReminder>) => reminder && setDuaReminder(dhikr.id, { ...reminder, ...patch });
  const shift = (delta: number) => {
    if (!reminder) return;
    const total = (((reminder.hour * 60 + reminder.minute + delta) % 1440) + 1440) % 1440;
    update({ hour: Math.floor(total / 60), minute: total % 60 });
  };
  const toggleDay = (d: number) => {
    if (!reminder) return;
    const days = reminder.days.includes(d) ? reminder.days.filter((x) => x !== d) : [...reminder.days, d];
    // Sans aucun jour, le rappel est supprimé
    setDuaReminder(dhikr.id, { ...reminder, days });
    if (!days.length) setEditing(false);
  };

  if (!reminder) {
    return (
      <Tap onPress={enable} accessibilityRole="button" style={[styles.reminder, { borderTopColor: colors.border }]}>
        <Ionicons name="notifications-outline" size={18} color={colors.primary} />
        <Text style={[Type.callout, { color: colors.primary, fontWeight: '600', flex: 1 }]}>Me le rappeler</Text>
        {dhikr.suggested && (
          <Text style={[Type.caption, { color: colors.textMuted }]}>
            {pad(dhikr.suggested.hour)}:{pad(dhikr.suggested.minute)}
          </Text>
        )}
      </Tap>
    );
  }

  return (
    <View style={[styles.reminderBox, { borderTopColor: colors.border }]}>
      <Tap onPress={() => setEditing((e) => !e)} accessibilityRole="button" style={styles.reminderHead}>
        <Ionicons name="notifications" size={18} color={colors.gold} />
        <Text style={[Type.callout, { color: colors.text, flex: 1 }]}>
          Rappel à {pad(reminder.hour)}:{pad(reminder.minute)} · {daysLabel(reminder.days)}
        </Text>
        <Ionicons name={editing ? 'chevron-up' : 'create-outline'} size={18} color={colors.textSubtle} />
      </Tap>
      {editing && (
        <View style={{ gap: Spacing.md }}>
          <View style={styles.timeRow}>
            <IconButton icon="remove" label="15 minutes plus tôt" size={18} filled onPress={() => shift(-15)} />
            <Text style={[Type.title, { color: colors.text, minWidth: 80, textAlign: 'center', fontVariant: ['tabular-nums'] }]}>
              {pad(reminder.hour)}:{pad(reminder.minute)}
            </Text>
            <IconButton icon="add" label="15 minutes plus tard" size={18} filled onPress={() => shift(15)} />
          </View>
          <View style={styles.days}>
            {[2, 3, 4, 5, 6, 7, 1].map((d) => (
              <Chip key={d} label={DAY_LABELS[d]} active={reminder.days.includes(d)} onPress={() => toggleDay(d)} />
            ))}
          </View>
          <Tap
            onPress={() => {
              setDuaReminder(dhikr.id, null);
              setEditing(false);
            }}
            accessibilityRole="button"
            style={styles.remove}
          >
            <Text style={[Type.caption, { color: colors.danger, fontWeight: '600' }]}>Supprimer le rappel</Text>
          </Tap>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  tabsScroll: { flexGrow: 0 },
  tabs: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: Spacing.sm },
  hint: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.lg, gap: Spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  arabic: { fontFamily: ArabicFonts.regular, fontSize: 24, lineHeight: 46, textAlign: 'right', writingDirection: 'rtl' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.pill },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md, marginTop: Spacing.xs },
  reminderBox: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md, marginTop: Spacing.xs, gap: Spacing.md },
  reminderHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  remove: { alignSelf: 'center', padding: Spacing.sm },
});
