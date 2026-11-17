/**
 * Version de l'APK installé, lue via le module natif d'expo-application.
 * Chargement facultatif : un client de développement construit avant l'ajout
 * du module démarre quand même (les valeurs sont alors nulles).
 */
import { requireOptionalNativeModule } from 'expo';

const native = requireOptionalNativeModule<{
  nativeApplicationVersion?: string | null;
  nativeBuildVersion?: string | null;
}>('ExpoApplication');

/** Ex. « 1.0.1 » (null si inconnu) */
export const appVersion: string | null = native?.nativeApplicationVersion || null;
/** versionCode Android / build iOS, ex. « 2 » (null si inconnu) */
export const appBuild: string | null = native?.nativeBuildVersion || null;
