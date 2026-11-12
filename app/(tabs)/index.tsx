import React from 'react';
import { Redirect } from 'expo-router';
import { IslamicHomeScreen } from '@/components/IslamicHomeScreen';
import { useSettingsHydrated, useSettingsStore } from '@/stores/settingsStore';
import { useKidsStore } from '@/stores/kidsStore';

export default function HomeScreen() {
  const hydrated = useSettingsHydrated();
  const hasOnboarded = useSettingsStore((s) => s.hasOnboarded);
  const kidsLocked = useKidsStore((s) => s.locked);
  const kidsHydrated = useKidsStore.persist.hasHydrated();

  // Premier lancement : onboarding (une fois les réglages relus, pour ne pas
  // le montrer à tort à quelqu'un qui l'a déjà vu)
  if (hydrated && !hasOnboarded) return <Redirect href="/onboarding" />;
  // Téléphone laissé à un enfant : on rouvre directement son espace
  if (kidsHydrated && kidsLocked) return <Redirect href="/kids" />;
  return <IslamicHomeScreen />;
}
