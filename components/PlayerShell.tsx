/**
 * Cadre commun des lecteurs de récitation : feuille basse qui se replie en
 * mini-barre (glisser vers le bas, ou bouton ⌄) pour libérer la lecture, et se
 * déplie d'un geste vers le haut ou d'une touche sur la mini-barre.
 * La lecture continue dans les deux états.
 */
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, Type } from '@/constants/theme';
import { Tap } from '@/components/ui/kit';

export const PLAYER_COLORS = {
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.72)',
  soft: 'rgba(255,255,255,0.10)',
  line: 'rgba(255,255,255,0.22)',
  gold: '#E9D49A',
  onGold: '#0B3D2E',
};

export interface PlayerShellProps {
  isVisible: boolean;
  minimized: boolean;
  onMinimizedChange: (v: boolean) => void;
  bg: string;
  /** Hauteur occupée à l'écran, pour laisser la place sous la liste */
  onHeightChange?: (h: number) => void;
  mini: {
    title: string;
    subtitle?: string;
    playing: boolean;
    busy: boolean;
    /** 0 → 1 */
    progress: number;
    onTogglePlay: () => void;
    onClose: () => void;
  };
  children: React.ReactNode;
}

export function PlayerShell({ isVisible, minimized, onMinimizedChange, bg, onHeightChange, mini, children }: PlayerShellProps) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(600)).current;
  const c = PLAYER_COLORS;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: isVisible ? 0 : 600,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [isVisible, slide]);

  useEffect(() => {
    if (!isVisible) onHeightChange?.(0);
  }, [isVisible, onHeightChange]);

  // Geste vertical sur la poignée et l'en-tête : bas = replier, haut = déplier
  const minimizedRef = useRef(minimized);
  minimizedRef.current = minimized;
  const changeRef = useRef(onMinimizedChange);
  changeRef.current = onMinimizedChange;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 30 && !minimizedRef.current) changeRef.current(true);
        else if (g.dy < -30 && minimizedRef.current) changeRef.current(false);
      },
    })
  ).current;

  return (
    <Animated.View
      pointerEvents={isVisible ? 'box-none' : 'none'}
      onLayout={(e) => isVisible && onHeightChange?.(e.nativeEvent.layout.height)}
      style={[
        styles.sheet,
        minimized && styles.sheetMini,
        { backgroundColor: bg, paddingBottom: insets.bottom + (minimized ? Spacing.sm : Spacing.md), transform: [{ translateY: slide }] },
      ]}
    >
      {minimized ? (
        <View {...pan.panHandlers}>
          <View style={[styles.miniTrack, { backgroundColor: c.line }]}>
            <View style={[styles.miniFill, { backgroundColor: c.gold, width: `${Math.round(Math.min(1, Math.max(0, mini.progress)) * 100)}%` }]} />
          </View>
          <View style={styles.miniRow}>
            <Pressable
              onPress={() => onMinimizedChange(false)}
              accessibilityRole="button"
              accessibilityLabel="Agrandir le lecteur"
              style={styles.miniText}
            >
              <Ionicons name="chevron-up" size={18} color={c.muted} />
              <View style={{ flex: 1 }}>
                <Text style={[Type.callout, { color: c.text, fontWeight: '600' }]} numberOfLines={1}>
                  {mini.title}
                </Text>
                {!!mini.subtitle && (
                  <Text style={[Type.caption, { color: c.muted }]} numberOfLines={1}>
                    {mini.subtitle}
                  </Text>
                )}
              </View>
            </Pressable>
            <Tap
              haptic
              onPress={mini.onTogglePlay}
              accessibilityLabel={mini.playing ? 'Pause' : 'Lecture'}
              style={[styles.miniPlay, { backgroundColor: c.gold }]}
            >
              {mini.busy && !mini.playing ? (
                <ActivityIndicator color={c.onGold} size="small" />
              ) : (
                <Ionicons name={mini.playing ? 'pause' : 'play'} size={22} color={c.onGold} style={!mini.playing && { marginLeft: 2 }} />
              )}
            </Tap>
            <Tap onPress={mini.onClose} hitSlop={8} accessibilityLabel="Fermer le lecteur" style={styles.iconBtn}>
              <Ionicons name="close" size={22} color={c.text} />
            </Tap>
          </View>
        </View>
      ) : (
        <>
          <View {...pan.panHandlers}>
            <Pressable
              onPress={() => onMinimizedChange(true)}
              accessibilityRole="button"
              accessibilityLabel="Réduire le lecteur"
              style={styles.handleZone}
            >
              <View style={[styles.handle, { backgroundColor: c.line }]} />
            </Pressable>
          </View>
          {children}
        </>
      )}
    </Animated.View>
  );
}

/** Bouton ⌄ à placer dans l'en-tête du lecteur déplié */
export function MinimizeButton({ onPress }: { onPress: () => void }) {
  return (
    <Tap onPress={onPress} hitSlop={10} accessibilityLabel="Réduire le lecteur" style={styles.iconBtn}>
      <Ionicons name="chevron-down" size={24} color={PLAYER_COLORS.text} />
    </Tap>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetMini: { paddingHorizontal: Spacing.lg, overflow: 'hidden' },
  handleZone: { alignItems: 'center', paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  handle: { width: 40, height: 4, borderRadius: 2 },
  miniTrack: { height: 3, borderRadius: 2, marginTop: Spacing.sm, overflow: 'hidden' },
  miniFill: { height: 3 },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.sm },
  miniText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 44 },
  miniPlay: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
