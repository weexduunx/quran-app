import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Radius, Spacing, Type, shadow } from '@/constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tap = () => {
  if (process.env.EXPO_OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

/** Pressable avec retour visuel doux (légère réduction + opacité). */
export function Tap({
  style,
  haptic = false,
  onPress,
  children,
  ...rest
}: PressableProps & { style?: StyleProp<ViewStyle>; haptic?: boolean; children?: React.ReactNode }) {
  return (
    <Pressable
      {...rest}
      onPress={(e) => {
        if (haptic) tap();
        onPress?.(e);
      }}
      style={({ pressed }) => [style, pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] }]}
    >
      {children}
    </Pressable>
  );
}

export function Card({
  children,
  style,
  onPress,
  tone = 'surface',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'surface' | 'primary' | 'soft';
}) {
  const { colors, scheme } = useAppTheme();
  const bg =
    tone === 'primary' ? colors.primaryStrong : tone === 'soft' ? colors.primarySoft : colors.surface;
  const base: ViewStyle = {
    backgroundColor: bg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: tone === 'surface' ? StyleSheet.hairlineWidth : 0,
    borderColor: colors.border,
    ...shadow(scheme, 1),
  };
  if (onPress) {
    return (
      <Tap onPress={onPress} style={[base, style]}>
        {children}
      </Tap>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function IconButton({
  icon,
  onPress,
  color,
  size = 22,
  filled = false,
  label,
  style,
}: {
  icon: IconName;
  onPress?: () => void;
  color?: string;
  size?: number;
  filled?: boolean;
  label: string; // accessibilité
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  return (
    <Tap
      haptic
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[
        styles.iconBtn,
        { backgroundColor: filled ? colors.surfaceAlt : 'transparent' },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color ?? colors.text} />
    </Tap>
  );
}

export function Button({
  title,
  icon,
  onPress,
  variant = 'primary',
  style,
  textColor,
}: {
  title: string;
  icon?: IconName;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: StyleProp<ViewStyle>;
  textColor?: string;
}) {
  const { colors } = useAppTheme();
  const bg =
    variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.primarySoft : 'transparent';
  const fg = textColor ?? (variant === 'primary' ? colors.onPrimary : colors.primary);
  return (
    <Tap
      haptic
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.button, { backgroundColor: bg }, style]}
    >
      {icon && <Ionicons name={icon} size={18} color={fg} style={{ marginRight: 8 }} />}
      <Text style={[Type.callout, { color: fg, fontWeight: '600' }]}>{title}</Text>
    </Tap>
  );
}

export function SectionTitle({
  children,
  action,
  onAction,
  style,
}: {
  children: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={[Type.overline, { color: colors.textSubtle }]}>{children.toUpperCase()}</Text>
      {action && (
        <Tap onPress={onAction} hitSlop={8}>
          <Text style={[Type.caption, { color: colors.primary, fontWeight: '600' }]}>{action}</Text>
        </Tap>
      )}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: colors.surface }]}
          >
            <Text
              style={[
                Type.caption,
                { color: active ? colors.text : colors.textMuted, fontWeight: active ? '700' : '500' },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: IconName;
  active?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Tap
      haptic
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={active ? colors.onPrimary : colors.textMuted}
          style={{ marginRight: 6 }}
        />
      )}
      <Text style={[Type.caption, { color: active ? colors.onPrimary : colors.textMuted }]}>
        {label}
      </Text>
    </Tap>
  );
}

/** Médaillon octogonal (étoile à 8 branches stylisée) pour les numéros. */
export function NumberBadge({
  value,
  size = 38,
  textStyle,
}: {
  value: number | string;
  size?: number;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { colors } = useAppTheme();
  const square = {
    position: 'absolute' as const,
    width: size * 0.74,
    height: size * 0.74,
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: 4,
  };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={square} />
      <View style={[square, { transform: [{ rotate: '45deg' }] }]} />
      <Text
        style={[
          { fontSize: size * 0.32, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
          textStyle,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    height: 48,
    borderRadius: Radius.pill,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: Radius.md - 3,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 34,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
