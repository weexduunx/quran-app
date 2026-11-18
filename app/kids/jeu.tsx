/**
 * Jeu « Trouve la lettre » : l'enfant entend une lettre (ou un mot illustré)
 * et touche la bonne lettre parmi trois. Pas d'échec : une mauvaise réponse
 * fait juste trembler la carte, l'enfant réessaie. 5 questions par partie,
 * une étoile par partie terminée.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { KIDS_LETTERS, KidsLetter, letterAudio, letterSpeech } from '@/utils/kidsLearning';
import { kidsColor } from '@/utils/kidsContent';
import { useKidsStore } from '@/stores/kidsStore';
import { useKidsSound, useSpeechSupport } from '@/hooks/useKidsSound';
import { ArabicFonts, Spacing } from '@/constants/theme';
import { Tap } from '@/components/ui/kit';

const BG = '#FFF8EC';
const INK = '#2B2418';
const GREEN = '#2E8B57';
const QUESTIONS = 5;
const CHOICES = 3;

type Kind = 'son' | 'image';
interface Question {
  kind: Kind;
  answer: KidsLetter;
  choices: KidsLetter[];
}

const shuffle = <T,>(list: T[]) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Lettres déjà écoutées en priorité (on ne questionne pas sur l'inconnu) ;
 * au début, les 6 premières lettres de l'alphabet.
 */
function makeRound(heard: number[], soundOk: boolean): Question[] {
  const known = KIDS_LETTERS.filter((l) => heard.includes(l.n));
  const pool = known.length >= CHOICES ? known : KIDS_LETTERS.slice(0, 6);
  const answers = shuffle(pool);
  return Array.from({ length: QUESTIONS }, (_, i) => {
    const answer = answers[i % answers.length];
    const others = shuffle(KIDS_LETTERS.filter((l) => l.n !== answer.n)).slice(0, CHOICES - 1);
    return {
      // Sans voix ni enregistrement, seule la question illustrée reste jouable
      kind: soundOk && i % 2 === 0 ? 'son' : 'image',
      answer,
      choices: shuffle([answer, ...others]),
    };
  });
}

export default function KidsGame() {
  const insets = useSafeAreaInsets();
  const heard = useKidsStore((s) => s.lettersHeard);
  const gamesWon = useKidsStore((s) => s.gamesWon);
  const completeGame = useKidsStore((s) => s.completeGame);
  const voice = useSpeechSupport('ar');
  const sound = useKidsSound();

  // null (détection en cours) compte comme oui : la partie ne change pas en route
  const soundOk = voice !== false;
  const [round, setRound] = useState(0);
  const questions = useMemo(
    () => makeRound(heard, soundOk),
    // Nouvelle partie seulement quand on la demande (pas à chaque lettre écoutée)
    [round, soundOk] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [qi, setQi] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [found, setFound] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [done, setDone] = useState(false);

  const shake = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const next = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = questions[qi];

  const say = (question: Question) => {
    const part = question.kind === 'son' ? 'nom' : 'mot';
    sound.play(`q-${qi}-${part}`, letterAudio(question.answer, part), letterSpeech(question.answer, part));
  };

  // Chaque question se fait entendre toute seule
  useEffect(() => {
    if (done || !q) return;
    const t = setTimeout(() => say(q), 400);
    return () => clearTimeout(t);
  }, [qi, round, done]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      if (next.current) clearTimeout(next.current);
    },
    []
  );

  const choose = (l: KidsLetter) => {
    if (found || wrong.includes(l.n)) return;
    if (l.n !== q.answer.n) {
      setWrong((w) => [...w, l.n]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      shake.setValue(0);
      Animated.timing(shake, { toValue: 1, duration: 420, easing: Easing.linear, useNativeDriver: true }).start();
      return;
    }

    setFound(true);
    if (wrong.length === 0) setFirstTry((n) => n + 1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // La bonne réponse est redite : l'enfant associe la forme et le son
    sound.play(`ok-${qi}`, letterAudio(q.answer, 'nom'), letterSpeech(q.answer, 'nom'));
    pop.setValue(0.8);
    Animated.spring(pop, { toValue: 1, friction: 3, tension: 120, useNativeDriver: true }).start();

    next.current = setTimeout(() => {
      if (qi + 1 < questions.length) {
        setQi(qi + 1);
        setWrong([]);
        setFound(false);
      } else {
        completeGame();
        setDone(true);
      }
    }, 1600);
  };

  const replay = () => {
    sound.stop();
    setRound((r) => r + 1);
    setQi(0);
    setWrong([]);
    setFound(false);
    setFirstTry(0);
    setDone(false);
  };

  const shakeX = shake.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, -10, 10, -6, 6, 0] });

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Tap
          haptic
          onPress={() => {
            sound.stop();
            router.back();
          }}
          accessibilityLabel="Retour"
          style={[styles.round, { backgroundColor: '#D8EBC3' }]}
        >
          <Ionicons name="arrow-back" size={28} color="#2E4A12" />
        </Tap>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Trouve la lettre</Text>
          {!done && <Text style={styles.sub}>Écoute, puis touche la bonne lettre</Text>}
        </View>
        <View style={styles.stars} accessibilityLabel={`${gamesWon} parties gagnées`}>
          <Ionicons name="trophy" size={18} color="#E2A400" />
          <Text style={styles.starsText}>{gamesWon}</Text>
        </View>
      </View>

      {done ? (
        <View style={styles.end}>
          <Ionicons name="trophy" size={110} color="#E2A400" />
          <Text style={styles.endTitle}>Bravo, mâ châ’ Allâh !</Text>
          <View style={styles.endStars} accessibilityLabel={`${firstTry} bonnes réponses du premier coup sur ${QUESTIONS}`}>
            {Array.from({ length: QUESTIONS }, (_, k) => (
              <Ionicons key={k} name={k < firstTry ? 'star' : 'star-outline'} size={38} color={k < firstTry ? '#E2A400' : '#C9BCA0'} />
            ))}
          </View>
          <Tap haptic onPress={replay} accessibilityRole="button" accessibilityLabel="Rejouer" style={styles.again}>
            <Ionicons name="refresh" size={28} color="#fff" />
            <Text style={styles.againText}>Rejouer</Text>
          </Tap>
        </View>
      ) : (
        <View style={[styles.body, { paddingBottom: insets.bottom + Spacing.xl }]}>
          {/* Progression : un point par question */}
          <View style={styles.dots} accessibilityLabel={`Question ${qi + 1} sur ${QUESTIONS}`}>
            {questions.map((_, k) => (
              <View key={k} style={[styles.dot, k < qi || (k === qi && found) ? styles.dotDone : k === qi && styles.dotNow]} />
            ))}
          </View>

          {/* La question : un gros haut-parleur, ou l'image du mot */}
          <Tap
            haptic
            onPress={() => say(q)}
            accessibilityLabel={q.kind === 'son' ? 'Réécouter la lettre' : `Réécouter le mot ${q.answer.wordFr}`}
            style={styles.question}
          >
            {q.kind === 'son' ? (
              <Ionicons name={sound.playing ? 'volume-high' : 'volume-medium'} size={88} color="#123A5C" />
            ) : (
              <>
                <Ionicons name={q.answer.icon} size={76} color="#123A5C" />
                <Text style={styles.word}>{q.answer.wordFr}</Text>
                <Text style={styles.hint}>Par quelle lettre commence ce mot ?</Text>
              </>
            )}
            <View style={styles.replay}>
              <Ionicons name="play" size={18} color="#CFE3F6" style={{ marginLeft: 2 }} />
            </View>
          </Tap>

          {/* Les choix, en ordre arabe (droite à gauche) */}
          <View style={styles.choices}>
            {q.choices.map((l, k) => {
              const isWrong = wrong.includes(l.n);
              const isRight = found && l.n === q.answer.n;
              const c = kidsColor(k + qi);
              return (
                <Animated.View
                  key={l.n}
                  style={[
                    styles.choiceWrap,
                    isWrong && { transform: [{ translateX: wrong[wrong.length - 1] === l.n ? shakeX : 0 }] },
                    isRight && { transform: [{ scale: pop }] },
                  ]}
                >
                  <Tap
                    haptic
                    onPress={() => choose(l)}
                    disabled={found || isWrong}
                    accessibilityRole="button"
                    accessibilityLabel={`Lettre ${l.name}`}
                    style={[
                      styles.choice,
                      { backgroundColor: isRight ? GREEN : c.bg },
                      isWrong && { opacity: 0.3 },
                      found && !isRight && { opacity: 0.3 },
                    ]}
                  >
                    <Text style={[styles.choiceLetter, { color: isRight ? '#fff' : c.ink }]}>{l.letter}</Text>
                    {isRight && <Ionicons name="checkmark-circle" size={30} color="#fff" style={styles.check} />}
                  </Tap>
                </Animated.View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  round: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: INK },
  sub: { fontSize: 15, fontWeight: '600', color: '#6B5E48' },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFEFC2', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  starsText: { fontSize: 17, fontWeight: '800', color: '#5A3F06' },
  body: { flex: 1, paddingHorizontal: Spacing.xl, gap: Spacing.xl, justifyContent: 'space-between' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: Spacing.sm },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#E6DFCF' },
  dotNow: { backgroundColor: '#F8E1A6', transform: [{ scale: 1.25 }] },
  dotDone: { backgroundColor: '#E2A400' },
  question: {
    flex: 1,
    maxHeight: 300,
    borderRadius: 32,
    backgroundColor: '#CFE3F6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: 6,
  },
  word: { fontSize: 24, fontWeight: '800', color: '#123A5C', marginTop: 4 },
  hint: { fontSize: 14, fontWeight: '600', color: '#123A5C', opacity: 0.75, textAlign: 'center' },
  replay: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#123A5C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choices: { flexDirection: 'row-reverse', gap: 12 },
  choiceWrap: { flex: 1 },
  choice: { height: 132, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  choiceLetter: { fontFamily: ArabicFonts.bold, fontSize: 60, lineHeight: 84 },
  check: { position: 'absolute', top: 8, right: 8 },
  end: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.xl },
  endTitle: { fontSize: 28, fontWeight: '800', color: INK, textAlign: 'center' },
  endStars: { flexDirection: 'row', gap: 6 },
  again: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 18,
    marginTop: Spacing.lg,
  },
  againText: { fontSize: 22, fontWeight: '800', color: '#fff' },
});
