import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

import { useSettingsStore } from '@/stores/settingsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { placeLabel } from '@/utils/cities';
import { Radius, Spacing, Type } from '@/constants/theme';
import { Button } from '@/components/ui/kit';

/** La Kaaba, à La Mecque */
const KAABA = { latitude: 21.4225, longitude: 39.8262 };
/** Écart toléré (en degrés) pour dire que le téléphone est face à la Qibla */
const ALIGNED = 5;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const norm = (d: number) => ((d % 360) + 360) % 360;

/** Direction de la Kaaba depuis un point, en degrés depuis le nord géographique */
export function qiblaBearing(lat: number, lng: number) {
  const φ1 = rad(lat);
  const φ2 = rad(KAABA.latitude);
  const Δλ = rad(KAABA.longitude - lng);
  return norm(deg(Math.atan2(Math.sin(Δλ), Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ))));
}

/** Distance jusqu'à la Kaaba (km, formule de haversine) */
function distanceKm(lat: number, lng: number) {
  const dφ = rad(KAABA.latitude - lat);
  const dλ = rad(KAABA.longitude - lng);
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(KAABA.latitude)) * Math.sin(dλ / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CARDINALS = ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ouest', 'ouest', 'nord-ouest'];
const cardinal = (d: number) => CARDINALS[Math.round(norm(d) / 45) % 8];

type Status = 'loading' | 'ready' | 'denied' | 'unavailable';

const DIAL = 300;

export default function QiblaScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const place = useSettingsStore((s) => s.place);
  const bearing = qiblaBearing(place.latitude, place.longitude);
  const distance = Math.round(distanceKm(place.latitude, place.longitude));

  const [status, setStatus] = useState<Status>('loading');
  const [heading, setHeading] = useState(0);
  const [accuracy, setAccuracy] = useState(3);
  const [attempt, setAttempt] = useState(0);

  // Rotation « déroulée » : passer de 359° à 1° tourne de 2°, pas de 358°
  const rotation = useRef(new Animated.Value(0)).current;
  const unwrapped = useRef(0);
  const wasAligned = useRef(false);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let alive = true;
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!alive) return;
      if (!perm.granted) {
        setStatus('denied');
        return;
      }
      try {
        sub = await Location.watchHeadingAsync((h) => {
          const value = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          setHeading(value);
          setAccuracy(h.accuracy);
          setStatus('ready');
        });
      } catch {
        if (alive) setStatus('unavailable');
      }
    })();
    return () => {
      alive = false;
      sub?.remove();
    };
  }, [attempt]);

  // Le cadran tourne avec le nord : la flèche (posée à l'angle de la Qibla) indique toujours la Kaaba
  useEffect(() => {
    const target = -heading;
    const delta = ((target - unwrapped.current + 540) % 360) - 180;
    unwrapped.current += delta;
    Animated.timing(rotation, {
      toValue: unwrapped.current,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [heading, rotation]);

  const offBy = Math.abs((((bearing - heading) % 360) + 540) % 360 - 180);
  const aligned = status === 'ready' && offBy <= ALIGNED;
  useEffect(() => {
    if (aligned && !wasAligned.current) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    wasAligned.current = aligned;
  }, [aligned]);

  const spin = rotation.interpolate({ inputRange: [-3600, 3600], outputRange: ['-3600deg', '3600deg'] });
  const arrow = aligned ? colors.gold : colors.primary;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Qibla</Text>
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={[styles.degrees, { color: arrow }]}>{Math.round(bearing)}°</Text>
          <Text style={[Type.body, { color: colors.textMuted, textAlign: 'center' }]}>
            Direction de La Mecque depuis {placeLabel(place)}
          </Text>
          <Text style={[Type.caption, { color: colors.textSubtle }]}>
            Vers le {cardinal(bearing)} · {distance.toLocaleString('fr-FR')} km
          </Text>
        </View>

        {status === 'denied' || status === 'unavailable' ? (
          <View style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="compass-outline" size={32} color={colors.textMuted} />
            <Text style={[Type.body, { color: colors.text, textAlign: 'center' }]}>
              {status === 'denied'
                ? 'La boussole a besoin de la localisation pour connaître le nord géographique.'
                : 'Ce téléphone n’a pas de boussole utilisable.'}
            </Text>
            <Text style={[Type.caption, { color: colors.textMuted, textAlign: 'center' }]}>
              Direction à suivre : {Math.round(bearing)}° depuis le nord, vers le {cardinal(bearing)}.
            </Text>
            {status === 'denied' && <Button title="Réessayer" icon="refresh" onPress={() => setAttempt((a) => a + 1)} />}
          </View>
        ) : (
          <View style={styles.compassWrap}>
            {/* Repère fixe : le haut du téléphone */}
            <Ionicons name="caret-down" size={26} color={aligned ? colors.gold : colors.textSubtle} style={styles.marker} />
            <Animated.View
              accessibilityRole="image"
              accessibilityLabel={
                aligned
                  ? 'Vous êtes face à la Qibla'
                  : `Boussole : la flèche verte indique la Qibla. Tournez de ${Math.round(offBy)} degrés`
              }
              style={[
                styles.dial,
                {
                  backgroundColor: colors.surface,
                  borderColor: aligned ? colors.gold : colors.border,
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <Text style={[styles.cardinal, styles.north, { color: colors.danger }]}>N</Text>
              <Text style={[styles.cardinal, styles.south, { color: colors.textSubtle }]}>S</Text>
              <Text style={[styles.cardinal, styles.west, { color: colors.textSubtle }]}>O</Text>
              <Text style={[styles.cardinal, styles.east, { color: colors.textSubtle }]}>E</Text>
              <View style={[styles.ring, { borderColor: colors.border }]} />
              <Svg width={DIAL} height={DIAL} viewBox="0 0 300 300" style={StyleSheet.absoluteFill}>
                <G rotation={bearing} origin="150, 150">
                  <Path d="M150 52 L163 150 L150 140 L137 150 Z" fill={arrow} />
                  <Rect x={140} y={34} width={20} height={20} rx={3} fill={colors.text} />
                  <Path d="M140 40.5 H160" stroke={colors.gold} strokeWidth={2.5} />
                </G>
                <Circle cx={150} cy={150} r={7} fill={colors.text} />
              </Svg>
            </Animated.View>
          </View>
        )}

        <View style={styles.footer}>
          {status === 'ready' && (
            <View style={[styles.tip, { backgroundColor: aligned ? colors.goldSoft : colors.primarySoft }]}>
              <Ionicons name={aligned ? 'checkmark-circle' : 'sync-outline'} size={24} color={arrow} />
              <Text style={[styles.tipText, { color: colors.text }]}>
                {aligned
                  ? 'Vous êtes face à la Qibla.'
                  : `Tournez le téléphone jusqu’à ce que la flèche pointe vers le haut (encore ${Math.round(offBy)}°).`}
              </Text>
            </View>
          )}
          {status === 'loading' && (
            <Text style={[Type.caption, { color: colors.textMuted, textAlign: 'center' }]}>Activation de la boussole…</Text>
          )}
          {status === 'ready' && (
            <Text style={[Type.caption, { color: accuracy < 2 ? colors.text : colors.textMuted, textAlign: 'center' }]}>
              {accuracy < 2 ? 'Boussole imprécise. ' : ''}Éloignez le téléphone des objets métalliques. Si la boussole
              hésite, faites un « 8 » dans l’air pour la recalibrer.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: Spacing.xl },
  degrees: { fontSize: 48, lineHeight: 56, fontWeight: '700', fontVariant: ['tabular-nums'] },
  compassWrap: { alignItems: 'center' },
  marker: { marginBottom: 2 },
  dial: {
    width: DIAL,
    height: DIAL,
    borderRadius: DIAL / 2,
    borderWidth: 1,
    shadowColor: '#17201C',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  ring: { position: 'absolute', top: 44, left: 44, right: 44, bottom: 44, borderRadius: DIAL, borderWidth: 1, borderStyle: 'dashed' },
  cardinal: { position: 'absolute', fontSize: 15, fontWeight: '600' },
  north: { top: 14, left: 0, right: 0, textAlign: 'center', fontWeight: '700' },
  south: { bottom: 14, left: 0, right: 0, textAlign: 'center' },
  west: { left: 16, top: DIAL / 2 - 10 },
  east: { right: 16, top: DIAL / 2 - 10 },
  footer: { alignSelf: 'stretch', gap: Spacing.md },
  notice: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  tip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, padding: Spacing.lg },
  tipText: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: '500' },
});
