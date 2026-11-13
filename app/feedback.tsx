import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { feedbackService, type FeedbackCategory, type FeedbackFeature } from '@/services/feedbackService';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { placeLabel } from '@/utils/cities';
import { Radius, Spacing, Type } from '@/constants/theme';
import { Button, Chip, IconButton, SectionTitle, Tap } from '@/components/ui/kit';

const CATEGORIES: { id: FeedbackCategory; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'general', label: 'Avis général', icon: 'chatbubble-ellipses-outline' },
  { id: 'bug', label: 'Un problème', icon: 'bug-outline' },
  { id: 'idea', label: 'Une idée', icon: 'bulb-outline' },
  { id: 'content', label: 'Le contenu', icon: 'book-outline' },
];

const FEATURES: { id: FeedbackFeature; label: string }[] = [
  { id: 'lecture', label: 'Lecture du Coran' },
  { id: 'ecoute', label: 'Écoute' },
  { id: 'tafsir', label: 'Tafsir' },
  { id: 'prieres', label: 'Heures de prière' },
  { id: 'enfants', label: 'Espace enfants' },
  { id: 'hors_ligne', label: 'Hors ligne' },
];

const RATING_WORDS = ['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent'];

const PLACEHOLDERS: Record<FeedbackCategory, string> = {
  general: 'Qu’est-ce qui vous a plu ? Qu’est-ce qui vous a gêné ?',
  bug: 'Que faisiez-vous, et que s’est-il passé ? (écran, sourate, bouton…)',
  idea: 'Quelle fonctionnalité aimeriez-vous trouver dans Bayân ?',
  content: 'Une erreur dans un texte, une traduction, une heure de prière ?',
};

export default function FeedbackScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const place = useSettingsStore((s) => s.place);

  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [liked, setLiked] = useState<FeedbackFeature[]>([]);
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState<'edit' | 'sending' | 'sent' | 'queued'>('edit');

  const canSend = rating > 0 || message.trim().length > 0;

  const toggle = (f: FeedbackFeature) => setLiked((l) => (l.includes(f) ? l.filter((x) => x !== f) : [...l, f]));

  const send = async () => {
    if (!canSend || state === 'sending') return;
    setState('sending');
    const res = await feedbackService.send({
      rating,
      category,
      liked,
      message,
      contact,
      screen: typeof from === 'string' ? from : 'reglages',
      place: placeLabel(place),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setState(res);
  };

  if (state === 'sent' || state === 'queued') {
    return (
      <View style={[styles.done, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.doneIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="heart" size={40} color={colors.primary} />
        </View>
        <Text style={[Type.largeTitle, { color: colors.text, textAlign: 'center', marginTop: Spacing.xl }]}>Merci !</Text>
        <Text style={[Type.body, { color: colors.textMuted, textAlign: 'center', marginTop: Spacing.sm }]}>
          {state === 'sent'
            ? 'Votre avis nous aide à améliorer Bayân. Qu’Allah vous récompense.'
            : 'Vous n’êtes pas connecté : votre avis est gardé sur le téléphone et partira automatiquement au retour de la connexion.'}
        </Text>
        <Button title="Retour" onPress={() => router.back()} style={{ marginTop: Spacing.xxl, alignSelf: 'stretch' }} />
        <Tap onPress={() => {
          setRating(0); setLiked([]); setMessage(''); setCategory('general'); setState('edit');
        }} style={{ padding: Spacing.md, marginTop: Spacing.sm }}>
          <Text style={[Type.callout, { color: colors.primary, fontWeight: '600' }]}>Envoyer un autre avis</Text>
        </Tap>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4, borderBottomColor: colors.border }]}>
        <IconButton icon="chevron-back" label="Retour" onPress={() => router.back()} />
        <Text style={[Type.headline, { color: colors.text, flex: 1, textAlign: 'center' }]}>Donner mon avis</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.xl, paddingBottom: insets.bottom + Spacing.xxxl }}>
        <View style={[styles.beta, { backgroundColor: colors.goldSoft }]}>
          <Text style={[styles.betaTag, { color: colors.gold }]}>VERSION BÊTA</Text>
          <Text style={[Type.callout, { color: colors.text, marginTop: 2 }]}>
            Vous faites partie des premiers à utiliser Bayân. Dites-nous honnêtement ce que vous en pensez.
          </Text>
        </View>

        <SectionTitle style={styles.gap}>Votre note</SectionTitle>
        <View style={styles.stars} accessibilityRole="adjustable" accessibilityLabel={`Note : ${rating} sur 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Tap key={n} haptic onPress={() => setRating(n === rating ? 0 : n)} accessibilityLabel={`${n} étoile${n > 1 ? 's' : ''}`} hitSlop={6}>
              <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={40} color={n <= rating ? '#E2A400' : colors.textSubtle} />
            </Tap>
          ))}
        </View>
        <Text style={[Type.caption, { color: colors.textMuted, textAlign: 'center', minHeight: 18 }]}>{RATING_WORDS[rating]}</Text>

        <SectionTitle style={styles.gap}>C’est à propos de…</SectionTitle>
        <View style={styles.cats}>
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <Tap
                key={c.id}
                haptic
                onPress={() => setCategory(c.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={[styles.cat, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primarySoft : colors.surface }]}
              >
                <Ionicons name={c.icon} size={20} color={active ? colors.primary : colors.textMuted} />
                <Text style={[Type.callout, { color: colors.text, fontWeight: active ? '600' : '400' }]}>{c.label}</Text>
              </Tap>
            );
          })}
        </View>

        <SectionTitle style={styles.gap}>Ce que vous appréciez</SectionTitle>
        <View style={styles.chips}>
          {FEATURES.map((f) => (
            <Chip key={f.id} label={f.label} active={liked.includes(f.id)} onPress={() => toggle(f.id)} />
          ))}
        </View>

        <SectionTitle style={styles.gap}>Votre message</SectionTitle>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={PLACEHOLDERS[category]}
          placeholderTextColor={colors.textSubtle}
          multiline
          maxLength={3000}
          textAlignVertical="top"
          accessibilityLabel="Votre message"
          style={[styles.input, styles.textarea, Type.body, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        />

        <SectionTitle style={styles.gap}>Pour vous recontacter (facultatif)</SectionTitle>
        <TextInput
          value={contact}
          onChangeText={setContact}
          placeholder="E-mail ou numéro WhatsApp"
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={120}
          accessibilityLabel="Contact facultatif"
          style={[styles.input, Type.body, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        />
        <Text style={[Type.caption, { color: colors.textMuted, marginTop: Spacing.sm }]}>
          Sont joints : la version de l’app, le modèle du téléphone et votre lieu de prière ({placeLabel(place)}). Rien d’autre.
        </Text>

        <Tap
          haptic
          onPress={send}
          disabled={!canSend || state === 'sending'}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSend }}
          style={[styles.send, { backgroundColor: colors.primary, opacity: canSend ? 1 : 0.4 }]}
        >
          {state === 'sending' ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          <Text style={styles.sendText}>Envoyer</Text>
        </Tap>
        {!canSend && (
          <Text style={[Type.caption, { color: colors.textMuted, textAlign: 'center', marginTop: Spacing.sm }]}>
            Donnez une note ou écrivez un message.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  gap: { marginTop: Spacing.xl },
  beta: { borderRadius: Radius.lg, padding: Spacing.lg },
  betaTag: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: Spacing.sm },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cat: { width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12 },
  textarea: { minHeight: 130 },
  send: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 54, borderRadius: Radius.pill, marginTop: Spacing.xxl },
  sendText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl },
  doneIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
});
