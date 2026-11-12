import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, Type } from '@/constants/theme';

/** Pastille discrète affichée par-dessus l'écran quand Internet est coupé. */
export function OfflineBanner() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        // isInternetReachable vaut null tant qu'il n'est pas connu : ce n'est pas « hors ligne »
        setOffline(state.isConnected === false || state.isInternetReachable === false);
      }),
    []
  );

  if (!offline) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + Spacing.xs }]}>
      <View style={[styles.pill, { backgroundColor: colors.text }]} accessibilityLiveRegion="polite">
        <Ionicons name="cloud-offline-outline" size={16} color={colors.background} />
        <Text style={[Type.caption, { color: colors.background, marginLeft: 6, fontWeight: '600' }]}>
          Hors ligne · contenus déjà chargés disponibles
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
});
