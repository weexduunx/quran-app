'use no memo';
// Le React Compiler (activé dans app.json) transformerait ces composants en
// composants à hooks ; or la bibliothèque les appelle comme de simples
// fonctions, hors rendu React → « Invalid hook call », et le widget restait
// transparent. Ce fichier en est donc exclu.
/**
 * Widget Android « Heures de prière » (react-native-android-widget).
 * Ce n'est pas une vue React Native : seuls les composants *Widget sont permis.
 */
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { PrayerWidgetData } from './prayerWidgetData';

type Hex = `#${string}`;
const THEMES: Record<'light' | 'dark', { bg: Hex; text: Hex; muted: Hex; accent: Hex; pill: Hex; pillText: Hex }> = {
  light: { bg: '#F8F5EE', text: '#17201C', muted: '#5E6863', accent: '#12664B', pill: '#12664B', pillText: '#FFFFFF' },
  dark: { bg: '#121C19', text: '#EBEFEA', muted: '#A3ADA7', accent: '#48B98F', pill: '#48B98F', pillText: '#0B1311' },
};

/** Taille réelle du widget en dp (fournie par Android ; inconnue : grand format) */
export type WidgetSize = { width?: number; height?: number };

export function PrayerTimesWidget({ data, theme, size }: { data: PrayerWidgetData; theme: 'light' | 'dark'; size?: WidgetSize }) {
  const c = THEMES[theme];
  const width = size?.width || 320;
  const height = size?.height || 140;
  // Une seule rangée de cellules : la prochaine prière seulement
  const oneRow = height < 90;
  // Étroit : les cinq horaires en plus petit, le lieu masqué
  const narrow = width < 250;
  const tiny = width < 210;

  if (oneRow || tiny) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        accessibilityLabel={`Prochaine prière : ${data.next.name} à ${data.next.time}, ${data.place}`}
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: c.bg,
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 6,
          flexDirection: oneRow && !tiny ? 'row' : 'column',
          alignItems: oneRow && !tiny ? 'center' : 'flex-start',
          justifyContent: oneRow && !tiny ? 'space-between' : 'center',
        }}
      >
        <TextWidget
          text={data.next.tomorrow ? 'Demain' : 'Prochaine'}
          style={{ fontSize: 11, color: c.muted, fontWeight: '600' }}
        />
        <TextWidget
          text={`${data.next.name} · ${data.next.time}`}
          maxLines={1}
          truncate="END"
          style={{ fontSize: tiny ? 16 : 18, color: c.accent, fontWeight: '700' }}
        />
        {oneRow && !tiny && !narrow && (
          <TextWidget text={data.place} maxLines={1} truncate="END" style={{ fontSize: 11, color: c.muted }} />
        )}
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`Prochaine prière : ${data.next.name} à ${data.next.time}, ${data.place}`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: c.bg,
        borderRadius: 24,
        paddingHorizontal: narrow ? 10 : 16,
        paddingVertical: narrow ? 8 : 12,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Prochaine prière, bien visible */}
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text={data.next.tomorrow ? 'Demain' : 'Prochaine prière'}
            style={{ fontSize: 12, color: c.muted, fontWeight: '600' }}
          />
          <TextWidget
            text={`${data.next.name} · ${data.next.time}`}
            style={{ fontSize: narrow ? 18 : 22, color: c.accent, fontWeight: '700' }}
          />
        </FlexWidget>
        {!narrow && (
          <TextWidget text={data.place} maxLines={1} truncate="END" style={{ fontSize: 12, color: c.muted, textAlign: 'right' }} />
        )}
      </FlexWidget>

      {/* Les cinq prières du jour */}
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
        {data.prayers.map((p) => (
          <FlexWidget
            key={p.key}
            style={{
              flexDirection: 'column',
              alignItems: 'center',
              paddingHorizontal: narrow ? 3 : 8,
              paddingVertical: narrow ? 2 : 4,
              borderRadius: narrow ? 8 : 12,
              backgroundColor: p.next ? c.pill : '#00000000',
            }}
          >
            <TextWidget
              text={narrow && p.name.length > 6 ? `${p.name.slice(0, 5)}.` : p.name}
              maxLines={1}
              style={{ fontSize: narrow ? 9 : 11, color: p.next ? c.pillText : c.muted, fontWeight: '600' }}
            />
            <TextWidget
              text={p.time}
              maxLines={1}
              style={{ fontSize: narrow ? 12 : 15, color: p.next ? c.pillText : c.text, fontWeight: '700' }}
            />
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}

/** Version claire et sombre : Android choisit selon le thème du téléphone */
export const renderPrayerWidget = (data: PrayerWidgetData, size?: WidgetSize) => ({
  light: <PrayerTimesWidget data={data} theme="light" size={size} />,
  dark: <PrayerTimesWidget data={data} theme="dark" size={size} />,
});
