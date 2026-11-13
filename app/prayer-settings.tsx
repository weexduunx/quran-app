import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { useSettingsStore, type PrayerCalc } from '@/stores/settingsStore';
import { PRAYER_METHODS, prayerTimesService, recommendedMethod, type AsrSchool } from '@/services/prayerTimesService';
import { useAppTheme } from '@/hooks/useAppTheme';
import { placeLabel } from '@/utils/cities';
import { ADHANS, type AdhanEntry } from '@/utils/adhanManifest';
import { defaultAdhan } from '@/utils/adhan';
import { Radius, Spacing, Type } from '@/constants/theme';
import { IconButton, Segmented, SectionTitle, Tap } from '@/components/ui/kit';
import { CityPicker } from '@/components/CityPicker';
import { PoweredBy } from '@/components/PoweredBy';

type OffsetKey = keyof PrayerCalc['offsets'];
const ROWS: { key: OffsetKey; label: string; wo: string }[] = [
  { key: 'fajr', label: 'Fajr', wo: 'Subha' },
  { key: 'sunrise', label: 'Lever du soleil', wo: 'Lever' },
  { key: 'dhuhr', label: 'Dhuhr', wo: 'Tisbar' },
  { key: 'asr', label: 'Asr', wo: 'Takussan' },
  { key: 'maghrib', label: 'Maghrib', wo: 'Timis' },
  { key: 'isha', label: 'Isha', wo: 'Gué' },
];

export default function PrayerSettingsScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const place = useSettingsStore((s) => s.place);
  const setPlace = useSettingsStore((s) => s.setPlace);
  const calc = useSettingsStore((s) => s.prayerCalc);
  const setCalc = useSettingsStore((s) => s.setPrayerCalc);
  const setOffset = useSettingsStore((s) => s.setPrayerOffset);
  const adhanId = useSettingsStore((s) => s.adhanId);
  const setAdhanId = useSettingsStore((s) => s.setAdhanId);
  const [picker, setPicker] = useState(false);

  const times = useMemo(() => prayerTimesService.calculatePrayerTimes(new Date(), place, calc), [place, calc]);
  const recommended = recommendedMethod(place.countryCode);
  const offsetsUsed = Object.values(calc.offsets).some((v) => v !== 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4, borderBottomColor: colors.border }]}>
        <IconButton icon="chevron-back" label="Retour" onPress={() => router.back()} />
        <Text style={[Type.headline, { color: colors.text, flex: 1, textAlign: 'center' }]}>Heures de prière</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: insets.bottom + Spacing.xxxl }}>
        {/* Aperçu du jour */}
        <View style={[styles.preview, { backgroundColor: colors.primaryStrong }]}>
          <Text style={styles.previewOverline}>AUJOURD’HUI · {placeLabel(place).toUpperCase()}</Text>
          <View style={styles.previewGrid}>
            {ROWS.map((r) => (
              <View key={r.key} style={styles.previewCell}>
                <Text style={styles.previewName}>{r.wo}</Text>
                <Text style={styles.previewTime}>{times[r.key].time}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.previewFoot}>
            {place.latitude.toFixed(4)}°, {place.longitude.toFixed(4)}° · {place.timezone}
          </Text>
        </View>

        <SectionTitle style={styles.gap}>Lieu</SectionTitle>
        <Group>
          <Tap onPress={() => setPicker(true)} accessibilityRole="button" style={styles.row}>
            <Ionicons name={place.source === 'gps' ? 'navigate' : 'location-outline'} size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[Type.callout, { color: colors.text }]}>{placeLabel(place)}</Text>
              <Text style={[Type.caption, { color: colors.textMuted }]}>
                {place.source === 'gps' ? 'Position exacte du téléphone' : 'Changer de ville ou utiliser ma position'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
          </Tap>
        </Group>

        <SectionTitle style={styles.gap}>Convention de calcul</SectionTitle>
        <Group>
          {PRAYER_METHODS.map((m, i) => {
            const active = calc.method === m.id;
            return (
              <Tap
                key={m.id}
                onPress={() => setCalc({ method: m.id })}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={[styles.row, i < PRAYER_METHODS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              >
                <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? colors.primary : colors.textSubtle} />
                <View style={{ flex: 1 }}>
                  <Text style={[Type.callout, { color: colors.text, fontWeight: active ? '600' : '400' }]}>{m.name}</Text>
                  <Text style={[Type.caption, { color: colors.textMuted }]}>{m.description}</Text>
                </View>
                {m.id === recommended && (
                  <View style={[styles.badge, { backgroundColor: colors.goldSoft }]}>
                    <Text style={[styles.badgeText, { color: colors.gold }]}>Conseillée</Text>
                  </View>
                )}
              </Tap>
            );
          })}
        </Group>
        {calc.method === 'custom' && (
          <Group style={{ marginTop: Spacing.md }}>
            <Step
              title="Angle du Fajr"
              value={`${calc.customFajrAngle.toString().replace('.', ',')}°`}
              onMinus={() => setCalc({ customFajrAngle: Math.max(10, calc.customFajrAngle - 0.5) })}
              onPlus={() => setCalc({ customFajrAngle: Math.min(20, calc.customFajrAngle + 0.5) })}
            />
            <Step
              title="Angle de l’Isha"
              value={`${calc.customIshaAngle.toString().replace('.', ',')}°`}
              onMinus={() => setCalc({ customIshaAngle: Math.max(10, calc.customIshaAngle - 0.5) })}
              onPlus={() => setCalc({ customIshaAngle: Math.min(20, calc.customIshaAngle + 0.5) })}
              last
            />
          </Group>
        )}

        <SectionTitle style={styles.gap}>Heure de l’Asr</SectionTitle>
        <Segmented<AsrSchool>
          value={calc.asrSchool}
          onChange={(asrSchool) => setCalc({ asrSchool })}
          options={[
            { value: 'standard', label: 'Malikite · Chaféite' },
            { value: 'hanafi', label: 'Hanafite' },
          ]}
        />
        <Text style={[Type.caption, { color: colors.textMuted, marginTop: Spacing.sm }]}>
          Au Sénégal et en Afrique de l’Ouest, l’école malikite est la référence.
        </Text>

        <SectionTitle
          style={styles.gap}
          action={offsetsUsed ? 'Remettre à zéro' : undefined}
          onAction={() => ROWS.forEach((r) => setOffset(r.key, 0))}
        >
          Ajustements (minutes)
        </SectionTitle>
        <Text style={[Type.caption, { color: colors.textMuted, marginBottom: Spacing.sm }]}>
          Pour suivre les horaires de votre mosquée ou ajouter une marge de précaution.
        </Text>
        <Group>
          {ROWS.map((r, i) => {
            const v = calc.offsets[r.key];
            return (
              <Step
                key={r.key}
                title={`${r.wo} · ${times[r.key].time}`}
                subtitle={r.label}
                value={v > 0 ? `+${v}` : String(v)}
                onMinus={() => setOffset(r.key, v - 1)}
                onPlus={() => setOffset(r.key, v + 1)}
                last={i === ROWS.length - 1}
              />
            );
          })}
        </Group>

        <SectionTitle style={styles.gap}>Adhan des notifications</SectionTitle>
        <AdhanChooser value={adhanId} onChange={setAdhanId} />

        <View style={{ marginTop: Spacing.xxl }}>
          <PoweredBy />
        </View>
      </ScrollView>

      <CityPicker
        visible={picker}
        selected={place}
        onClose={() => setPicker(false)}
        onSelect={(p) => {
          setPlace(p);
          setPicker(false);
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Choix du muezzin, avec écoute
// ---------------------------------------------------------------------------
function AdhanChooser({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { colors } = useAppTheme();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const fallback = defaultAdhan();
  const selected = value === 'auto' ? fallback?.id ?? 'system' : value;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);
  useEffect(() => {
    if (status.didJustFinish) setPreviewing(null);
  }, [status.didJustFinish]);

  const preview = (a: AdhanEntry) => {
    if (previewing === a.id) {
      player.pause();
      setPreviewing(null);
      return;
    }
    player.replace(a.source);
    player.play();
    setPreviewing(a.id);
  };

  const options: { id: string; title: string; sub: string; entry?: AdhanEntry }[] = [
    ...ADHANS.map((a) => ({
      id: a.id,
      title: a.name,
      sub: [a.origin, a.isDefault ? 'par défaut' : '', a.fajrFile ? 'adhan spécial pour le Fajr' : ''].filter(Boolean).join(' · '),
      entry: a,
    })),
    { id: 'system', title: 'Son du téléphone', sub: 'Notification courte, sans adhan' },
  ];

  return (
    <>
      <Group>
        {options.map((o, i) => {
          const active = selected === o.id;
          return (
            <Tap
              key={o.id}
              onPress={() => onChange(o.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[styles.row, i < options.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
            >
              <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? colors.primary : colors.textSubtle} />
              <View style={{ flex: 1 }}>
                <Text style={[Type.callout, { color: colors.text, fontWeight: active ? '600' : '400' }]}>{o.title}</Text>
                {!!o.sub && <Text style={[Type.caption, { color: colors.textMuted }]}>{o.sub}</Text>}
              </View>
              {o.entry && (
                <IconButton
                  icon={previewing === o.id ? 'pause' : 'play'}
                  label={previewing === o.id ? 'Arrêter' : `Écouter ${o.title}`}
                  size={18}
                  filled
                  onPress={() => preview(o.entry!)}
                />
              )}
            </Tap>
          );
        })}
      </Group>
      <Text style={[Type.caption, { color: colors.textMuted, marginTop: Spacing.sm }]}>
        {ADHANS.length
          ? 'L’adhan sonne pour les notifications « À l’heure ». Les rappels avant la prière gardent un son court.'
          : 'Les adhans de muezzins sénégalais arrivent avec la prochaine mise à jour. En attendant, le son du téléphone est utilisé.'}
      </Text>
    </>
  );
}

function Group({ children, style }: { children: React.ReactNode; style?: object }) {
  const { colors } = useAppTheme();
  return <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>;
}

function Step(props: { title: string; subtitle?: string; value: string; onMinus: () => void; onPlus: () => void; last?: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.row, !props.last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[Type.callout, { color: colors.text }]}>{props.title}</Text>
        {!!props.subtitle && <Text style={[Type.caption, { color: colors.textMuted }]}>{props.subtitle}</Text>}
      </View>
      <IconButton icon="remove" label={`Diminuer : ${props.title}`} size={18} filled onPress={props.onMinus} />
      <Text style={[Type.headline, { color: colors.text, minWidth: 44, textAlign: 'center', fontVariant: ['tabular-nums'] }]}>{props.value}</Text>
      <IconButton icon="add" label={`Augmenter : ${props.title}`} size={18} filled onPress={props.onPlus} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  gap: { marginTop: Spacing.xxl },
  preview: { borderRadius: Radius.xl, padding: Spacing.lg },
  previewOverline: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.md, rowGap: Spacing.md },
  previewCell: { width: '33.33%' },
  previewName: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  previewTime: { color: '#fff', fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  previewFoot: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: Spacing.md },
  group: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
