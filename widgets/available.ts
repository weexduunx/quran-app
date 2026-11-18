import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

/**
 * Vrai si le module natif des widgets est dans l'APK. Un client de dev construit
 * avant son ajout ne l'a pas : importer react-native-android-widget y planterait
 * (getEnforcing), d'où les `require` différés derrière ce test.
 */
export const widgetsAvailable =
  Platform.OS === 'android' && !!(TurboModuleRegistry.get('AndroidWidget') ?? NativeModules.AndroidWidget);
