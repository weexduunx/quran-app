import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/hooks/useAppTheme';
import { Spacing } from '@/constants/theme';
import { Tap } from '@/components/ui/kit';

export const STUDIO_URL = 'https://digitalspiritsn.com';

/** Signature « Powered by Digital Spirit Studio with ♥ », lien vers le site du studio */
export function PoweredBy() {
  const { colors } = useAppTheme();
  return (
    <Tap
      onPress={() => Linking.openURL(STUDIO_URL).catch(() => {})}
      accessibilityRole="link"
      accessibilityLabel="Powered by Digital Spirit Studio. Ouvrir digitalspiritsn.com"
      hitSlop={8}
      style={styles.wrap}
    >
      <View style={styles.row}>
        <Text style={[styles.text, { color: colors.textSubtle }]}>Powered by </Text>
        <Text style={[styles.text, styles.brand, { color: colors.primary }]}>Digital Spirit Studio</Text>
        <Text style={[styles.text, { color: colors.textSubtle }]}> with </Text>
        <Ionicons name="heart" size={13} color="#D93A4A" />
      </View>
      <Text style={[styles.url, { color: colors.textSubtle }]}>digitalspiritsn.com</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  text: { fontSize: 13 },
  brand: { fontWeight: '700', textDecorationLine: 'underline' },
  url: { fontSize: 11, marginTop: 2 },
});
