import { DarkTheme, DefaultTheme, ThemeProvider, Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';
import { useFonts, Amiri_400Regular } from '@expo-google-fonts/amiri';
import {
  ScheherazadeNew_400Regular,
  ScheherazadeNew_700Bold,
} from '@expo-google-fonts/scheherazade-new';
import * as SplashScreen from 'expo-splash-screen';

import { useAppTheme } from '@/hooks/useAppTheme';
import { useQuranStore } from '@/stores/quranStore';
import { OfflineBanner } from '@/components/OfflineBanner';
import { UpdateBanner } from '@/components/UpdateBanner';
import { useReminderSync } from '@/hooks/useReminderSync';
import { feedbackService } from '@/services/feedbackService';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const { colors, isDark } = useAppTheme();
  useReminderSync();
  const setOffline = useQuranStore((s) => s.setOffline);

  const [fontsLoaded, fontError] = useFonts({
    Amiri_400Regular,
    ScheherazadeNew_400Regular,
    ScheherazadeNew_700Bold,
  });

  useEffect(() => {
    // On masque le splash même si une police échoue : mieux vaut une police
    // système qu'une application bloquée sur l'écran de démarrage.
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setOffline(offline);
      // Avis bêta écrits hors ligne : envoyés dès que la connexion revient
      if (!offline) feedbackService.flush();
    });
    return unsubscribe;
  }, [setOffline]);

  const navTheme: Theme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [isDark, colors]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="kids/index" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="kids/[surah]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="kids/alphabet" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="kids/lettre/[n]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="kids/invocations" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="surah/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="bookmarks" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="downloads" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="prayer-settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="adhkar" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="qibla" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="feedback" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="tafsir/[bookId]" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <OfflineBanner />
      <UpdateBanner />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
