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

export function PrayerTimesWidget({ data, theme }: { data: PrayerWidgetData; theme: 'light' | 'dark' }) {
  const c = THEMES[theme];
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`Prochaine prière : ${data.next.name} à ${data.next.time}, ${data.place}`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: c.bg,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
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
            style={{ fontSize: 22, color: c.accent, fontWeight: '700' }}
          />
        </FlexWidget>
        <TextWidget text={data.place} maxLines={1} truncate="END" style={{ fontSize: 12, color: c.muted, textAlign: 'right' }} />
      </FlexWidget>

      {/* Les cinq prières du jour */}
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
        {data.prayers.map((p) => (
          <FlexWidget
            key={p.key}
            style={{
              flexDirection: 'column',
              alignItems: 'center',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: p.next ? c.pill : '#00000000',
            }}
          >
            <TextWidget text={p.name} style={{ fontSize: 11, color: p.next ? c.pillText : c.muted, fontWeight: '600' }} />
            <TextWidget text={p.time} style={{ fontSize: 15, color: p.next ? c.pillText : c.text, fontWeight: '700' }} />
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}

/** Version claire et sombre : Android choisit selon le thème du téléphone */
export const renderPrayerWidget = (data: PrayerWidgetData) => ({
  light: <PrayerTimesWidget data={data} theme="light" />,
  dark: <PrayerTimesWidget data={data} theme="dark" />,
});
