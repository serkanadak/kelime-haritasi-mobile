import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WORDS } from '../data';
import { useProgress } from '../state/ProgressContext';
import { selectForQuiz, buildQuestion, updateProgressAfterAnswer } from '../logic/srs';
import { colors, LEVEL_COLORS } from '../theme';

const QUIZ_SIZE = 10;
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Bilinmeyen ve pasif kelimelere öncelik veren çoktan seçmeli test (Özellik 4).
export default function TestScreen() {
  const { getProgress, mergeProgress } = useProgress();
  const [sessionKey, setSessionKey] = useState(0);
  const [direction, setDirection] = useState('en-tr'); // 'en-tr' | 'tr-en'
  const [levels, setLevels] = useState([]); // boş = tüm seviyeler

  const questions = useMemo(() => {
    const pool = levels.length ? WORDS.filter((w) => levels.includes(w.level)) : WORDS;
    const picked = selectForQuiz(pool, getProgress, QUIZ_SIZE);
    // Çeldiriciler tüm havuzdan gelsin ki her zaman 4 şık olsun.
    return picked.map((w) => buildQuestion(w, WORDS, direction));
    // sessionKey/direction/levels değişince yeni test üretilir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, direction, levels]);

  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);

  const restart = () => {
    setScore(0);
    setQIndex(0);
    setSelected(null);
    setSessionKey((k) => k + 1);
  };

  const setDir = (d) => {
    if (d === direction) return;
    setDirection(d);
    restart();
  };

  const toggleLevel = (lvl) => {
    setLevels((prev) => (prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl]));
    restart();
  };

  const q = questions[qIndex];
  const done = qIndex >= questions.length;

  if (done) {
    return (
      <View style={styles.container}>
        <DirectionToggle direction={direction} onChange={setDir} />
        <LevelChips levels={levels} onToggle={toggleLevel} />
        <View style={styles.centerFill}>
          {questions.length === 0 ? (
            <Text style={styles.resultTitle}>Seçili seviyede kelime yok. Başka seviye seç.</Text>
          ) : (
            <>
              <Text style={styles.resultTitle}>Test bitti</Text>
              <Text style={styles.resultScore}>
                {score} / {questions.length} doğru
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={restart}>
                <Text style={styles.primaryBtnText}>Yeni test başlat</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  const answer = (opt) => {
    if (selected) return;
    const isCorrect = opt === q.correct;
    setSelected(opt);
    if (isCorrect) setScore((s) => s + 1);
    mergeProgress(q.word.id, updateProgressAfterAnswer(getProgress(q.word.id), isCorrect));
  };

  const goNext = () => {
    setSelected(null);
    setQIndex((i) => i + 1);
  };

  return (
    <View style={styles.container}>
      <DirectionToggle direction={direction} onChange={setDir} />
      <LevelChips levels={levels} onToggle={toggleLevel} />
      <Text style={styles.counter}>
        Soru {qIndex + 1} / {questions.length}
      </Text>
      <View style={styles.promptCard}>
        <Text style={styles.promptLabel}>
          {direction === 'tr-en' ? 'Bu anlamın İngilizcesi nedir?' : 'Bu kelimenin anlamı nedir?'}
        </Text>
        <Text style={styles.prompt}>{q.prompt}</Text>
      </View>

      <View style={styles.options}>
        {q.options.map((opt) => {
          let state = null;
          if (selected) {
            if (opt === q.correct) state = 'correct';
            else if (opt === selected) state = 'wrong';
          }
          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.option,
                state === 'correct' && styles.optCorrect,
                state === 'wrong' && styles.optWrong,
              ]}
              onPress={() => answer(opt)}
              disabled={!!selected}
            >
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!!selected && (
        <TouchableOpacity style={styles.primaryBtn} onPress={goNext}>
          <Text style={styles.primaryBtnText}>
            {qIndex + 1 >= questions.length ? 'Sonucu gör' : 'Sonraki soru →'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// A1–C2 seviye filtresi (çoklu seçim; boş = tümü).
function LevelChips({ levels, onToggle }) {
  return (
    <View style={styles.levelRow}>
      {LEVELS.map((lvl) => {
        const on = levels.includes(lvl);
        return (
          <TouchableOpacity
            key={lvl}
            style={[styles.levelChip, on && { backgroundColor: LEVEL_COLORS[lvl], borderColor: LEVEL_COLORS[lvl] }]}
            onPress={() => onToggle(lvl)}
          >
            <Text style={[styles.levelChipText, on && { color: '#0f172a' }]}>{lvl}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// EN→TR / TR→EN yön seçici.
function DirectionToggle({ direction, onChange }) {
  const opts = [
    { key: 'en-tr', label: 'İngilizce → Türkçe' },
    { key: 'tr-en', label: 'Türkçe → İngilizce' },
  ];
  return (
    <View style={styles.dirRow}>
      {opts.map((o) => {
        const on = direction === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            style={[styles.dirBtn, on && styles.dirBtnOn]}
            onPress={() => onChange(o.key)}
          >
            <Text style={[styles.dirText, on && styles.dirTextOn]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  levelChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  levelChipText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  dirRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  dirBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  dirBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dirText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  dirTextOn: { color: '#0f172a' },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  counter: { color: colors.textMuted, textAlign: 'center', marginBottom: 12 },
  promptCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptLabel: { color: colors.textMuted, marginBottom: 8 },
  prompt: { color: colors.text, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  options: { marginTop: 18, gap: 10 },
  option: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optCorrect: { borderColor: colors.active, backgroundColor: '#14331f' },
  optWrong: { borderColor: colors.unknown, backgroundColor: '#3a1717' },
  optionText: { color: colors.text, fontSize: 15 },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
  resultTitle: { color: colors.textMuted, fontSize: 18 },
  resultScore: { color: colors.text, fontSize: 40, fontWeight: '800', marginVertical: 16 },
});
