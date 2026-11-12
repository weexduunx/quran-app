import React from 'react';
import { Redirect } from 'expo-router';
import { IslamicHomeScreen } from '@/components/IslamicHomeScreen';
import { useSettingsHydrated, useSettingsStore } from '@/stores/settingsStore';

export default function HomeScreen() {
  const hydrated = useSettingsHydrated();
  const hasOnboarded = useSettingsStore((s) => s.hasOnboarded);

  // Premier lancement : onboarding (une fois les réglages relus, pour ne pas
  // le montrer à tort à quelqu'un qui l'a déjà vu)
  if (hydrated && !hasOnboarded) return <Redirect href="/onboarding" />;
  return <IslamicHomeScreen />;
}
