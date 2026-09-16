import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { STORIES, getWord } from '../data';
import { useProgress } from '../state/ProgressContext';
import { STATUS } from '../logic/srs';
import { LevelBadge, Badge } from '../components/common';
import { colors, STATUS_META } from '../theme';

// Okuma içinde kelimeyi sınıflandırma: işaretsiz → bilmiyorum → pasif → aktif → işaretsiz
const CYCLE = [null, STATUS.UNKNOWN, STATUS.PASSIVE, STATUS.ACTIVE];

// Bağlamsal okuma (Özellik 8): makale/hikâyeler içinde kelimeleri tıklanabilir sunar.
export default function ReaderScreen({ navigation }) {
  const [storyId, setStoryId] = useState(null);
  const { getProgress, setStatus, mergeProgress } = useProgress();
  const story = STORIES.find((s) => s.id === storyId);

  const cycleStatus = (id) => {
    const cur = getProgress(id)?.status || null;
    const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
    if (next) setStatus(id, next);
    else mergeProgress(id, { status: undefined });
  };

  if (!story) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Hikâyeler & Makaleler</Text>
        <Text style={styles.subtitle}>Kelimeleri bağlam içinde oku, dokunarak anlamına bak.</Text>
        {STORIES.map((s) => (
          <TouchableOpacity key={s.id} style={styles.storyCard} onPress={() => setStoryId(s.id)}>
            <Text style={styles.storyTitle}>{s.title}</Text>
            <Text style={styles.storyTitleTr}>{s.titleTr}</Text>
            <View style={styles.row}>
              <LevelBadge level={s.level} />
              {s.domains.map((d) => (
                <Badge key={d} label={d} />
              ))}
              <Badge label={`${s.vocab.length} kelime`} color={colors.primary} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  const vocab = story.vocab.map((id) => getWord(id)).filter(Boolean);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity onPress={() => setStoryId(null)}>
        <Text style={styles.back}>‹ Tüm hikâyeler</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{story.title}</Text>
      <Text style={styles.subtitle}>{story.titleTr}</Text>

      {story.paragraphs.map((p, i) => (
        <View key={i} style={styles.paragraph}>
          <Text style={styles.en}>
            {highlight(p.en, vocab, (w) => navigation.navigate('WordDetail', { id: w.id }))}
          </Text>
          <Text style={styles.tr}>{p.tr}</Text>
        </View>
      ))}

      <Text style={styles.vocabHeader}>Bu metindeki kelimeler — dokunup işaretle</Text>
      {vocab.map((w) => {
        const status = getProgress(w.id)?.status || null;
        const meta = status ? STATUS_META[status] : null;
        return (
          <View key={w.id} style={styles.vocabRow}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => navigation.navigate('WordDetail', { id: w.id })}
            >
              <Text style={styles.vocabWord}>{w.headword}</Text>
              <Text style={styles.vocabMeaning} numberOfLines={1}>
                {w.meanings[0].tr}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusBtn, { borderColor: meta?.color || colors.border, backgroundColor: meta?.color || 'transparent' }]}
              onPress={() => cycleStatus(w.id)}
            >
              <Text style={[styles.statusBtnText, { color: meta ? '#0f172a' : colors.textMuted }]}>
                {status ? meta.label : 'İşaretle'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

// Metindeki sözcük dağarcığını tıklanabilir biçimde işaretler.
function highlight(text, vocab, onPress) {
  const terms = vocab
    .map((w) => ({ w, term: w.headword.toLowerCase() }))
    .sort((a, b) => b.term.length - a.term.length); // önce uzun ifadeler

  const segments = [];
  let i = 0;
  const lower = text.toLowerCase();
  while (i < text.length) {
    let matched = null;
    for (const { w, term } of terms) {
      if (lower.startsWith(term, i)) {
        matched = { w, len: term.length };
        break;
      }
    }
    if (matched) {
      const slice = text.slice(i, i + matched.len);
      segments.push(
        <Text key={i} style={styles.token} onPress={() => onPress(matched.w)}>
          {slice}
        </Text>
      );
      i += matched.len;
    } else {
      // bir sonraki eşleşmeye kadar düz metin biriktir
      let next = i + 1;
      while (next < text.length) {
        let hit = false;
        for (const { term } of terms) {
          if (lower.startsWith(term, next)) {
            hit = true;
            break;
          }
        }
        if (hit) break;
        next++;
      }
      segments.push(<Text key={`t${i}`}>{text.slice(i, next)}</Text>);
      i = next;
    }
  }
  return segments;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.textMuted, marginTop: 4, marginBottom: 14 },
  back: { color: colors.primary, marginBottom: 10, fontWeight: '700' },
  storyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storyTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  storyTitleTr: { color: colors.textMuted, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  paragraph: { marginBottom: 16 },
  en: { color: colors.text, fontSize: 16, lineHeight: 26 },
  tr: { color: colors.textMuted, marginTop: 6, lineHeight: 22 },
  token: { color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
  vocabHeader: { color: colors.textMuted, fontWeight: '700', marginTop: 10, marginBottom: 8 },
  vocabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  vocabWord: { color: colors.text, fontSize: 15, fontWeight: '700' },
  vocabMeaning: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statusBtn: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  statusBtnText: { fontSize: 12, fontWeight: '700' },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { color: colors.text, fontWeight: '600' },
});
