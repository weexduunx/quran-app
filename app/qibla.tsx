import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

import { useSettingsStore } from '@/stores/settingsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { placeLabel } from '@/utils/cities';
import { Radius, Spacing, Type } from '@/constants/theme';
import { Button, IconButton } from '@/components/ui/kit';

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

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const cardinal = (d: number) => CARDINALS[Math.round(norm(d) / 45) % 8];

type Status = 'loading' | 'ready' | 'denied' | 'unavailable';

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

  // Le cadran tourne pour que la flèche indique toujours la Kaaba
  const target = bearing - heading;
  useEffect(() => {
    const delta = ((target - unwrapped.current + 540) % 360) - 180;
    unwrapped.current += delta;
    Animated.timing(rotation, {
      toValue: unwrapped.current,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [target, rotation]);

  const offBy = Math.abs(((target % 360) + 540) % 360 - 180);
  const aligned = status === 'ready' && offBy <= ALIGNED;
  useEffect(() => {
    if (aligned && !wasAligned.current) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    wasAligned.current = aligned;
  }, [aligned]);

  const spin = rotation.interpolate({ inputRange: [-3600, 3600], outputRange: ['-3600deg', '3600deg'] });
  const accent = aligned ? colors.gold : colors.primary;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4, borderBottomColor: colors.border }]}>
        <IconButton icon="chevron-back" label="Retour" onPress={() => router.back()} />
        <Text style={[Type.headline, { color: colors.text, flex: 1, textAlign: 'center' }]}>Qibla</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={[Type.caption, { color: colors.textMuted }]}>Depuis {placeLabel(place)}</Text>
          <Text style={[Type.largeTitle, { color: colors.text, fontVariant: ['tabular-nums'] }]}>
            {Math.round(bearing)}° {cardinal(bearing)}
          </Text>
          <Text style={[Type.caption, { color: colors.textMuted }]}>
            La Mecque à {distance.toLocaleString('fr-FR')} km
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
            {/* Repère fixe en haut : la direction du téléphone */}
            <Ionicons name="caret-down" size={28} color={accent} style={styles.marker} />
            <Animated.View
              style={[styles.dial, { borderColor: accent, backgroundColor: colors.surface, transform: [{ rotate: spin }] }]}
              accessibilityLabel={aligned ? 'Vous êtes face à la Qibla' : `Tournez de ${Math.round(offBy)} degrés`}
            >
              {/* Le cadran tourne avec le nord ; la Kaaba est posée à son angle */}
              <View style={styles.needle}>
                <View style={[styles.kaaba, { backgroundColor: accent }]}>
                  <Ionicons name="cube" size={22} color="#fff" />
                </View>
                <View style={[styles.stem, { backgroundColor: accent }]} />
              </View>
              <View style={[styles.center, { backgroundColor: accent }]} />
            </Animated.View>
          </View>
        )}

        {status === 'ready' && (
          <View style={{ alignItems: 'center', gap: Spacing.sm }}>
            <Text style={[Type.title, { color: aligned ? colors.gold : colors.text }]}>
              {aligned ? 'Vous êtes face à la Qibla' : `Tournez de ${Math.round(offBy)}°`}
            </Text>
            {accuracy < 2 && (
              <View style={[styles.calibrate, { backgroundColor: colors.goldSoft }]}>
                <Ionicons name="infinite-outline" size={18} color={colors.gold} />
                <Text style={[Type.caption, { color: colors.text, flex: 1 }]}>
                  Boussole imprécise : dessinez un « 8 » dans l’air avec le téléphone, loin des objets métalliques.
                </Text>
              </View>
            )}
          </View>
        )}
        {status === 'loading' && <Text style={[Type.caption, { color: colors.textMuted }]}>Activation de la boussole…</Text>}
      </View>
    </View>
  );
}

const DIAL = 260;

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  body: { flex: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: Spacing.xl },
  compassWrap: { alignItems: 'center' },
  marker: { marginBottom: -4 },
  dial: { width: DIAL, height: DIAL, borderRadius: DIAL / 2, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  needle: { position: 'absolute', top: 14, alignItems: 'center' },
  kaaba: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  stem: { width: 4, height: DIAL / 2 - 14 - 44, borderRadius: 2 },
  center: { width: 14, height: 14, borderRadius: 7 },
  notice: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  calibrate: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.md, padding: Spacing.md, maxWidth: 340 },
});
