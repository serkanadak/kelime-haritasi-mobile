import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { getWord, applyEdits } from '../data';
import { useProgress } from '../state/ProgressContext';
import { STATUS } from '../logic/srs';
import { StatusPicker, LevelBadge, Badge } from '../components/common';
import { colors } from '../theme';
import { TYPES } from '../data/schema';

export default function WordDetailScreen({ route, navigation }) {
  const { id, fallback } = route.params;
  const { getProgress, setStatus, mergeProgress } = useProgress();
  const word = applyEdits(getWord(id), getProgress(id)?.edits);
  const muted = !!getProgress(id)?.muted;

  // Tam Türkçe kartı olmayan (CEFR liste) kelime: yine de başlık/seviye + işaretleme göster.
  if (!word) {
    if (fallback) {
      const fbStatus = getProgress(id)?.status || STATUS.UNKNOWN;
      return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.headword}>{fallback.headword}</Text>
          {!!fallback.pos && <Text style={styles.pos}>{fallback.pos}</Text>}
          <View style={styles.row}>
            <LevelBadge level={fallback.level} />
            <Badge label="CEFR listesi" color={colors.primary} />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Durumun</Text>
            <StatusPicker value={fbStatus} onChange={(s) => setStatus(id, s)} />
          </View>
          <Text style={styles.note}>
            Bu kelime CEFR seviye listesinden geliyor; Türkçe anlam ve örnek cümle içeren tam kart
            içeriği henüz hazır değil. Yine de durumunu işaretleyebilir, ilerlemene katabilirsin.
          </Text>
        </ScrollView>
      );
    }
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Kelime bulunamadı.</Text>
      </View>
    );
  }

  // İşaretsiz kelimeler varsayılan olarak "Bilmiyorum" kabul edilir.
  const status = getProgress(word.id)?.status || STATUS.UNKNOWN;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.headword}>{word.headword}</Text>
      {!!word.pronunciation && <Text style={styles.pron}>{word.pronunciation}</Text>}
      <Text style={styles.pos}>{word.pos}</Text>
      <View style={styles.row}>
        <LevelBadge level={word.level} />
        <Badge label={TYPES[word.type] || word.type} color={colors.primary} />
        {word.domains.map((d) => (
          <Badge key={d} label={d} />
        ))}
      </View>

      <Section title="Anlamlar ve örnek cümleler">
        {word.meanings.map((m, i) => (
          <View key={i} style={styles.meaningBlock}>
            <Text style={styles.meaningTr}>{i + 1}. {m.tr}</Text>
            {!!m.en && <Text style={styles.meaningEn}>{m.en}</Text>}
            <Text style={styles.exampleEn}>“{m.exampleEn}”</Text>
            {!!m.exampleTr && <Text style={styles.exampleTr}>{m.exampleTr}</Text>}
          </View>
        ))}
      </Section>

      {!!word.synonyms?.length && (
        <Section title="Eş anlamlılar">
          <Text style={[styles.list, { color: colors.active }]}>{word.synonyms.join(', ')}</Text>
        </Section>
      )}
      {!!word.antonyms?.length && (
        <Section title="Zıt anlamlılar">
          <Text style={[styles.list, { color: colors.unknown }]}>{word.antonyms.join(', ')}</Text>
        </Section>
      )}
      {!!word.collocations?.length && (
        <Section title="Sık kullanımlar">
          <Text style={styles.list}>{word.collocations.join(' · ')}</Text>
        </Section>
      )}

      <Section title="Durumun">
        <StatusPicker value={status} onChange={(s) => setStatus(word.id, s)} />
        <TouchableOpacity
          style={styles.muteToggle}
          onPress={() => mergeProgress(word.id, { muted: !muted })}
        >
          <View style={[styles.checkbox, muted && styles.checkboxOn]}>
            {muted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.muteLabel}>
            Bu kelimeyi hatırlatma (testte/kartlarda hiç çıkmaz)
          </Text>
        </TouchableOpacity>
      </Section>

      <TouchableOpacity
        style={styles.graphBtn}
        onPress={() => navigation.navigate('Ağ', { id: word.id })}
      >
        <Text style={styles.graphBtnText}>İlişki ağında göster →</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => navigation.navigate('EditWord', { id })}
      >
        <Text style={styles.editBtnText}>✏️ Bu kartı düzenle / ekle</Text>
      </TouchableOpacity>
      {!!word.edited && <Text style={styles.editedNote}>Bu kartta senin düzenlemelerin var.</Text>}
    </ScrollView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted },
  note: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 14, fontStyle: 'italic' },
  headword: { color: colors.text, fontSize: 30, fontWeight: '800' },
  pron: { color: colors.primary, fontSize: 16, marginTop: 4 },
  pos: { color: colors.textMuted, fontStyle: 'italic', marginTop: 2, marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { color: colors.textMuted, fontWeight: '700', marginBottom: 8, fontSize: 13 },
  meaningBlock: { marginBottom: 12 },
  meaningTr: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meaningEn: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  exampleEn: { color: colors.text, marginTop: 6, fontStyle: 'italic' },
  exampleTr: { color: colors.textMuted, marginTop: 2 },
  list: { color: colors.text, lineHeight: 22 },
  muteToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.unknown, borderColor: colors.unknown },
  checkmark: { color: '#0f172a', fontWeight: '900', fontSize: 14 },
  muteLabel: { color: colors.text, fontSize: 13, flex: 1, lineHeight: 18 },
  graphBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  graphBtnText: { color: '#0f172a', fontWeight: '800' },
  editBtn: {
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  editBtnText: { color: colors.primary, fontWeight: '800' },
  editedNote: { color: colors.textMuted, fontSize: 12, marginTop: 8, textAlign: 'center', fontStyle: 'italic' },
});
