/**
 * Android : signale ce qui empêche les rappels de sonner à l'heure, avec un
 * accès direct au bon réglage du téléphone.
 * - « Alarmes et rappels » refusé (Android 14+) : notifications retardées,
 *   regroupées, parfois perdues en veille.
 * - Optimisation de batterie : sur beaucoup de téléphones (Tecno, Infinix,
 *   Xiaomi, Samsung…), l'app est endormie et ses rappels ne partent plus.
 * Rien ne s'affiche quand tout est bon, ou sur iOS.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

import { openBatterySettings, openExactAlarmSettings, reminderReliability } from '@/modules/adhan-sound';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, Type } from '@/constants/theme';
import { Tap } from '@/components/ui/kit';
import { onPermissionChecked } from '@/services/reminderService';

/**
 * Rappels activés mais notifications non autorisées : sans ce bandeau, rien
 * ne sonne et rien ne l'explique (Android 13+ ne les accorde pas d'office).
 */
export function NotificationsBlocked({ active }: { active: boolean }) {
  const { colors } = useAppTheme();
  const [perm, setPerm] = useState<Notifications.NotificationPermissionsStatus | null>(null);

  const refresh = useCallback(() => {
    Notifications.getPermissionsAsync().then(setPerm).catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    const off = onPermissionChecked(refresh);
    return () => {
      sub.remove();
      off();
    };
  }, [refresh]);

  if (!active || !perm || perm.granted) return null;
  const allow = async () => {
    if (perm.canAskAgain) {
      const asked = await Notifications.requestPermissionsAsync();
      setPerm(asked);
      if (asked.granted) return;
    }
    Linking.openSettings().catch(() => {});
  };
  return (
    <View style={[styles.box, { backgroundColor: colors.goldSoft, borderColor: colors.gold, marginBottom: Spacing.sm }]}>
      <Ionicons name="notifications-off-outline" size={18} color={colors.gold} />
      <Text style={[Type.caption, { color: colors.text, flex: 1 }]}>
        Les notifications de Bayân sont bloquées : aucun adhan ni rappel ne peut sonner.
      </Text>
      <Tap haptic onPress={allow} accessibilityRole="button" style={[styles.btn, { backgroundColor: colors.primary }]}>
        <Text style={[Type.caption, { color: colors.onPrimary, fontWeight: '700' }]}>Autoriser</Text>
      </Tap>
    </View>
  );
}

export function ReminderReliability() {
  const { colors } = useAppTheme();
  const [state, setState] = useState(() => reminderReliability());

  const refresh = useCallback(() => setState(reminderReliability()), []);
  // Relu au retour des réglages du téléphone
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  if (Platform.OS !== 'android') return null;
  const items = [
    state.exactAlarms === false && {
      key: 'alarms',
      text: 'Autorisez « Alarmes et rappels » pour que l’adhan sonne à l’heure exacte, chaque fois.',
      action: 'Autoriser',
      onPress: openExactAlarmSettings,
    },
    state.battery === false && {
      key: 'battery',
      text: 'Le téléphone peut endormir Bayân et bloquer les rappels. Choisissez « Ne pas optimiser » / « Sans restriction » pour Bayân.',
      action: 'Batterie',
      onPress: openBatterySettings,
    },
  ].filter(Boolean) as { key: string; text: string; action: string; onPress: () => void }[];
  if (!items.length) return null;

  return (
    <View style={{ gap: Spacing.sm }}>
      {items.map((it) => (
        <View key={it.key} style={[styles.box, { backgroundColor: colors.goldSoft, borderColor: colors.gold }]}>
          <Ionicons name="warning-outline" size={18} color={colors.gold} />
          <Text style={[Type.caption, { color: colors.text, flex: 1 }]}>{it.text}</Text>
          <Tap
            haptic
            onPress={it.onPress}
            accessibilityRole="button"
            style={[styles.btn, { backgroundColor: colors.primary }]}
          >
            <Text style={[Type.caption, { color: colors.onPrimary, fontWeight: '700' }]}>{it.action}</Text>
          </Tap>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  btn: { paddingHorizontal: Spacing.md, minHeight: 36, borderRadius: Radius.pill, justifyContent: 'center' },
});
