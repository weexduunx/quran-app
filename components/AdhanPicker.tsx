import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { Chip, IconButton } from '@/components/ui/kit';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Spacing, Type } from '@/constants/theme';
import { ADHANS } from '@/services/reminderService';
import type { AdhanSound } from '@/stores/settingsStore';

/** Fichiers pour l'écoute dans les réglages (les mêmes que ceux des notifications) */
const PREVIEW: Record<Exclude<AdhanSound, 'none'>, number> = {
  touba: require('@/assets/notification-sounds/adhan_touba.mp3'),
  senegal: require('@/assets/notification-sounds/adhan_senegal.mp3'),
  reunion: require('@/assets/notification-sounds/adhan_reunion.mp3'),
};

const OPTIONS: { value: AdhanSound; label: string }[] = [
  ...(Object.keys(ADHANS) as Exclude<AdhanSound, 'none'>[]).map((k) => ({ value: k, label: ADHANS[k].label })),
  { value: 'none', label: 'Son normal' },
];

/** Choix de l'adhan joué à l'heure des prières, avec écoute. */
export function AdhanPicker({ value, onChange }: { value: AdhanSound; onChange: (v: AdhanSound) => void }) {
  const { colors } = useAppTheme();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [previewing, setPreviewing] = useState<AdhanSound | null>(null);

  // Arrêt de l'écoute en quittant l'écran ou à la fin du fichier
  useEffect(() => () => player.pause(), [player]);
  useEffect(() => {
    if (status.didJustFinish) setPreviewing(null);
  }, [status.didJustFinish]);

  const togglePreview = () => {
    if (value === 'none') return;
    if (previewing === value && status.playing) {
      player.pause();
      setPreviewing(null);
      return;
    }
    player.replace(PREVIEW[value]);
    player.play();
    setPreviewing(value);
  };

  const select = (v: AdhanSound) => {
    if (previewing) {
      player.pause();
      setPreviewing(null);
    }
    onChange(v);
  };

  const playing = previewing === value && status.playing;

  return (
    <View style={{ gap: Spacing.sm }}>
      <Text style={[Type.caption, { color: colors.textMuted }]}>Adhan à l&apos;heure de la prière</Text>
      <View style={styles.row}>
        <View style={styles.chips}>
          {OPTIONS.map((o) => (
            <Chip key={o.value} label={o.label} active={value === o.value} onPress={() => select(o.value)} />
          ))}
        </View>
        {value !== 'none' && (
          <IconButton
            icon={playing ? 'stop' : 'play'}
            onPress={togglePreview}
            label={playing ? "Arrêter l'écoute" : "Écouter l'adhan"}
            filled
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
