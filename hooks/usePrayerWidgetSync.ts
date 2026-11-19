import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSettingsStore, useSettingsHydrated } from '@/stores/settingsStore';
import { widgetsAvailable } from '@/widgets/available';

/** Redessine le widget dès que le lieu ou le calcul change, et au retour dans l'app. */
export function usePrayerWidgetSync() {
  const hydrated = useSettingsHydrated();
  const place = useSettingsStore((s) => s.place);
  const calc = useSettingsStore((s) => s.prayerCalc);

  useEffect(() => {
    if (!widgetsAvailable || !hydrated) return;
    const { requestWidgetUpdate } = require('react-native-android-widget') as typeof import('react-native-android-widget');
    const { PRAYER_WIDGET_NAME, prayerWidgetData } = require('@/widgets/prayerWidgetData') as typeof import('@/widgets/prayerWidgetData');
    const { renderPrayerWidget } = require('@/widgets/PrayerTimesWidget') as typeof import('@/widgets/PrayerTimesWidget');

    const update = () =>
      requestWidgetUpdate({
        widgetName: PRAYER_WIDGET_NAME,
        renderWidget: (info) => renderPrayerWidget(prayerWidgetData(place, calc), info),
      }).catch(() => {});
    update();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && update());
    return () => sub.remove();
  }, [hydrated, place, calc]);
}
