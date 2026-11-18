import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

interface AdhanSoundNative {
  isSupported(): boolean;
  installAsync(sourceUri: string, fileName: string, channelId: string, channelName: string): Promise<string>;
  removeAsync(soundUri: string, channelId: string): Promise<void>;
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
