import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QuickTestSync } from '@/components/QuickTestSync';

/**
 * Écran de test pour la synchronisation mot par mot
 * Accessible uniquement en mode développement
 */
export default function TestSyncScreen() {
  // N'afficher cet écran qu'en mode développement
  if (!__DEV__) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <QuickTestSync />
    </SafeAreaView>
  );
}