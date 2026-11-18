/**
 * Tâche de fond Android des widgets : appelée à l'ajout, au redimensionnement
 * et toutes les 30 min (updatePeriodMillis), même app fermée.
 */
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { useSettingsStore } from '@/stores/settingsStore';
import { PRAYER_WIDGET_NAME, prayerWidgetData } from './prayerWidgetData';
import { renderPrayerWidget } from './PrayerTimesWidget';

export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetInfo.widgetName !== PRAYER_WIDGET_NAME) return;
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;

  // App fermée : on relit les réglages enregistrés (lieu, convention de calcul)
  if (!useSettingsStore.persist.hasHydrated()) await useSettingsStore.persist.rehydrate();
  const { place, prayerCalc } = useSettingsStore.getState();
  renderWidget(renderPrayerWidget(prayerWidgetData(place, prayerCalc)));
}
