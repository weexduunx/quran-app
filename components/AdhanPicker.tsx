import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';

import { Chip, IconButton } from '@/components/ui/kit';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, Type } from '@/constants/theme';
import { ADHANS, type BuiltinAdhan } from '@/services/reminderService';
import { useSettingsStore, type AdhanSound } from '@/stores/settingsStore';
import { customAdhanSupported, installAdhanSound, removeAdhanSound } from '@/modules/adhan-sound';

/** Fichiers pour l'écoute dans les réglages (les mêmes que ceux des notifications) */
const PREVIEW: Record<BuiltinAdhan, number> = {
  senegal: require('@/assets/notification-sounds/adhan_senegal.mp3'),
  reunion: require('@/assets/notification-sounds/adhan_reunion.mp3'),
};

/** Au-delà, l'adhan ne serait de toute façon pas joué en entier par une notification */
const MAX_BYTES = 8 * 1024 * 1024;

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const baseName = (name: string) => name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 30) || 'Mon adhan';

/** Choix de l'adhan joué à l'heure des prières, avec écoute et ajout de ses propres adhans. */
export function AdhanPicker({ value, onChange }: { value: AdhanSound; onChange: (v: AdhanSound) => void }) {
  const { colors } = useAppTheme();
  const custom = useSettingsStore((s) => s.customAdhans);
  const addCustomAdhan = useSettingsStore((s) => s.addCustomAdhan);
  const removeCustomAdhan = useSettingsStore((s) => s.removeCustomAdhan);
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [previewing, setPreviewing] = useState<AdhanSound | null>(null);
  const [importing, setImporting] = useState(false);

  // Arrêt de l'écoute en quittant l'écran ou à la fin du fichier
  useEffect(() => () => player.pause(), [player]);
  useEffect(() => {
    if (status.didJustFinish) setPreviewing(null);
  }, [status.didJustFinish]);

  const options: { value: AdhanSound; label: string; customId?: string }[] = [
    ...(Object.keys(ADHANS) as BuiltinAdhan[]).map((k) => ({ value: k as AdhanSound, label: ADHANS[k].label })),
    ...custom.map((a) => ({ value: `custom-${a.id}` as AdhanSound, label: a.label, customId: a.id })),
    { value: 'none', label: 'Son normal' },
  ];

  const sourceOf = (v: AdhanSound) => {
    if (v.startsWith('custom-')) {
      const a = custom.find((c) => `custom-${c.id}` === v);
      return a ? { uri: a.uri } : null;
    }
    return v === 'none' ? null : PREVIEW[v as BuiltinAdhan];
  };

  const stopPreview = () => {
    player.pause();
    setPreviewing(null);
  };

  const togglePreview = () => {
    const source = sourceOf(value);
    if (!source) return;
    if (previewing === value && status.playing) return stopPreview();
    player.replace(source);
    player.play();
    setPreviewing(value);
  };

  const select = (v: AdhanSound) => {
    if (previewing) stopPreview();
    onChange(v);
  };

  const importAdhan = async () => {
    if (importing) return;
    const picked = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]) return;
    const file = picked.assets[0];
    if (file.size && file.size > MAX_BYTES) {
      Alert.alert('Fichier trop lourd', 'Choisissez un adhan de moins de 8 Mo (environ 5 minutes en MP3).');
      return;
    }
    setImporting(true);
    try {
      const id = newId();
      const label = baseName(file.name);
      const channel = `adhan-perso-${id}`;
      const ext = /\.[a-z0-9]+$/i.exec(file.name)?.[0] ?? '.mp3';
      const uri = await installAdhanSound(file.uri, `bayan-adhan-${id}${ext}`, channel, `Adhan · ${label}`);
      if (previewing) stopPreview();
      addCustomAdhan({ id, label, channel, uri });
    } catch {
      Alert.alert('Import impossible', 'Ce fichier audio n’a pas pu être ajouté. Essayez un fichier MP3.');
    } finally {
      setImporting(false);
    }
  };

  const confirmRemove = (id: string, label: string) => {
    const a = custom.find((c) => c.id === id);
    if (!a) return;
    Alert.alert('Supprimer cet adhan ?', `« ${label} » sera retiré de Bayân et du téléphone.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          if (previewing) stopPreview();
          removeCustomAdhan(id);
          removeAdhanSound(a.uri, a.channel).catch(() => {});
        },
      },
    ]);
  };

  const playing = previewing === value && status.playing;

  return (
    <View style={{ gap: Spacing.sm }}>
      <Text style={[Type.caption, { color: colors.textMuted }]}>Adhan à l&apos;heure de la prière</Text>
      <View style={styles.row}>
        <View style={styles.chips}>
          {options.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              active={value === o.value}
              onPress={() => select(o.value)}
              onLongPress={o.customId ? () => confirmRemove(o.customId!, o.label) : undefined}
              accessibilityHint={o.customId ? 'Appui long pour supprimer' : undefined}
            />
          ))}
        </View>
        {sourceOf(value) && (
          <IconButton
            icon={playing ? 'stop' : 'play'}
            onPress={togglePreview}
            label={playing ? "Arrêter l'écoute" : "Écouter l'adhan"}
            filled
          />
        )}
      </View>

      {customAdhanSupported && (
        <Pressable
          onPress={importAdhan}
          disabled={importing}
          accessibilityRole="button"
          style={({ pressed }) => [styles.add, { borderColor: colors.border, opacity: pressed || importing ? 0.6 : 1 }]}
        >
          {importing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[Type.body, { color: colors.text, fontWeight: '600' }]}>
              {importing ? 'Ajout en cours…' : 'Ajouter mon adhan'}
            </Text>
            <Text style={[Type.caption, { color: colors.textMuted }]}>
              Un fichier audio du téléphone (MP3, M4A…).{custom.length ? ' Appui long sur un adhan ajouté pour le supprimer.' : ''}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
});
