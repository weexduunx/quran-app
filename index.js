// Point d'entrée : l'app (Expo Router) + la tâche de fond des widgets Android
import 'expo-router/entry';

import { widgetsAvailable } from './widgets/available';

if (widgetsAvailable) {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./widgets/widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
}
