import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, Type } from '@/constants/theme';
import { Tap } from '@/components/ui/kit';
import { updateService, type AvailableUpdate } from '@/services/updateService';

/** Carte affichée au démarrage quand un APK plus récent est publié sur le site. */
export function UpdateBanner() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);

  useEffect(() => {
    let alive = true;
    updateService.check().then((u) => alive && setUpdate(u));
    return () => {
      alive = false;
    };
  }, []);

  if (!update) return null;

  const later = () => {
    updateService.dismiss(update.versionCode);
    setUpdate(null);
  };

  const install = () => {
    Linking.openURL(update.downloadUrl).catch(() => Linking.openURL(update.pageUrl));
    setUpdate(null);
  };

  return (
    <View style={[styles.wrap, { top: insets.top + Spacing.xs }]} pointerEvents="box-none">
      <View
        style={[styles.card, { backgroundColor: colors.primaryStrong }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <Ionicons name="arrow-down-circle-outline" size={24} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={[Type.callout, styles.title]}>Nouvelle version disponible{update.version ? ` · ${update.version}` : ''}</Text>
          <Text style={[Type.caption, styles.sub]}>Installez-la par-dessus : vos favoris et réglages sont conservés.</Text>
        </View>
      </View>
      <View style={[styles.actions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Tap onPress={later} accessibilityRole="button" style={styles.action}>
          <Text style={[Type.callout, { color: colors.textMuted }]}>Plus tard</Text>
        </Tap>
        <Tap onPress={install} accessibilityRole="button" style={styles.action}>
          <Text style={[Type.callout, { color: colors.primary, fontWeight: '700' }]}>Télécharger</Text>
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: Spacing.lg, right: Spacing.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  title: { color: '#fff', fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  action: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
});
