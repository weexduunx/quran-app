import { ADHANS, type AdhanEntry } from '@/utils/adhanManifest';

/** Muezzin par défaut : celui marqué « default » dans muezzins.json, sinon le premier */
export const defaultAdhan = (): AdhanEntry | null => ADHANS.find((a) => a.isDefault) ?? ADHANS[0] ?? null;

/** Adhan à utiliser pour un réglage : 'auto' → muezzin par défaut, 'system' → aucun (son du téléphone) */
export function resolveAdhan(id: string): AdhanEntry | null {
  if (id === 'system') return null;
  if (id === 'auto') return defaultAdhan();
  return ADHANS.find((a) => a.id === id) ?? defaultAdhan();
}
