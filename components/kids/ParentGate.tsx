/**
 * Contrôle parent : maintenir 3 secondes pour agir (sortir de l'espace enfants,
 * changer un réglage). Un enfant de 4 ans tape, il ne maintient pas.
 */
import React, { useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const HOLD_MS = 3000;

export function ParentGate({
  label = 'Parents : maintenir 3 s',
  icon = 'lock-closed',
  onUnlock,
  tint = '#0B3D2E',
}: {
  label?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  onUnlock: () => void;
  tint?: string;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);

  const start = () => {
    setHolding(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      progress.setValue(0);
      setHolding(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onUnlock();
    });
  };

  const stop = () => {
    progress.stopAnimation();
    Animated.timing(progress, { toValue: 0, duration: 150, useNativeDriver: false }).start();
    setHolding(false);
  };

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Pressable
      onPressIn={start}
      onPressOut={stop}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Maintenez le bouton appuyé pendant trois secondes"
      style={[styles.btn, { borderColor: tint }]}
    >
      <Animated.View style={[styles.fill, { width, backgroundColor: tint }]} />
      <View style={styles.content}>
        <Ionicons name={icon} size={14} color={tint} />
        <Text style={[styles.label, { color: tint }]}>{holding ? 'Continuez à maintenir…' : label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { height: 40, borderRadius: 20, borderWidth: 1.5, overflow: 'hidden', justifyContent: 'center', paddingHorizontal: 14 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.18 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 13, fontWeight: '700' },
});
