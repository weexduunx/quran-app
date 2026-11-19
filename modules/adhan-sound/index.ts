import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

interface AdhanSoundNative {
  isSupported(): boolean;
  installAsync(sourceUri: string, fileName: string, channelId: string, channelName: string): Promise<string>;
  removeAsync(soundUri: string, channelId: string): Promise<void>;
  hasRawSound?(name: string): boolean;
  canScheduleExactAlarms?(): boolean;
  openExactAlarmSettings?(): void;
  isIgnoringBatteryOptimizations?(): boolean;
  openBatterySettings?(): void;
}

// Optionnel : un client de dev construit avant l'ajout du module ne l'a pas
const native = Platform.OS === 'android' ? requireOptionalNativeModule<AdhanSoundNative>('AdhanSound') : null;

/** Vrai si l'on peut ajouter ses propres adhans (Android 10+, module présent). */
export const customAdhanSupported = !!native && native.isSupported();

/** Copie le fichier dans les sons de notification et crée son canal. Renvoie l'URI du son. */
export function installAdhanSound(sourceUri: string, fileName: string, channelId: string, channelName: string) {
  if (!native) throw new Error('Module AdhanSound absent');
  return native.installAsync(sourceUri, fileName, channelId, channelName);
}

export async function removeAdhanSound(soundUri: string, channelId: string) {
  await native?.removeAsync(soundUri, channelId);
}

/**
 * Fiabilité des rappels sur Android. `null` : inconnu (iOS, ou client
 * construit avant l'ajout de ces fonctions) — on n'affiche alors rien.
 */
export function reminderReliability(): { exactAlarms: boolean | null; battery: boolean | null } {
  try {
    return {
      exactAlarms: native?.canScheduleExactAlarms ? native.canScheduleExactAlarms() : null,
      battery: native?.isIgnoringBatteryOptimizations ? native.isIgnoringBatteryOptimizations() : null,
    };
  } catch {
    return { exactAlarms: null, battery: null };
  }
}

export const openExactAlarmSettings = () => native?.openExactAlarmSettings?.();
export const openBatterySettings = () => native?.openBatterySettings?.();

/**
 * Vrai si le son de notification est intégré au binaire Android. Faux sur un
 * client construit avant son ajout (la fonction native y manque aussi).
 */
export function hasBundledSound(name: string): boolean {
  try {
    return !!native?.hasRawSound?.(name);
  } catch {
    return false;
  }
}
