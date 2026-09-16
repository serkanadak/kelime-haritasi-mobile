import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { getWord, applyEdits } from '../data';
import { useProgress } from '../state/ProgressContext';
import { colors } from '../theme';

// Bir flashcard'ın tüm alanlarını elle düzenleme/ekleme. Değişiklikler cihazda
// (ProgressContext) saklanır; temel veri değişmez.
export default function EditWordScreen({ route, navigation }) {
  const { id } = route.params;
  const { getProgress, mergeProgress } = useProgress();
  const base = getWord(id);
  const word = applyEdits(base, getProgress(id)?.edits);

  const m0 = (word && word.meanings && word.meanings[0]) || {};
  const m1 = (word && word.meanings && word.meanings[1]) || {};

  const [pron, setPron] = useState(word?.pronunciation || '');
  const [tr0, setTr0] = useState(m0.tr || '');
  const [en0, setEn0] = useState(m0.en || '');
  const [exEn0, setExEn0] = useState(m0.exampleEn || '');
  const [exTr0, setExTr0] = useState(m0.exampleTr || '');
  const [tr1, setTr1] = useState(m1.tr || '');
  const [exEn1, setExEn1] = useState(m1.exampleEn || '');
  const [exTr1, setExTr1] = useState(m1.exampleTr || '');
  const [syn, setSyn] = useState((word?.synonyms || []).join(', '));
  const [ant, setAnt] = useState((word?.antonyms || []).join(', '));

  if (!base) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Bu kelimenin düzenlenebilir bir kartı yok.</Text>
      </View>
    );
  }

  const splitList = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

  const save = () => {
    const meanings = [{ tr: tr0.trim(), en: en0.trim(), exampleEn: exEn0.trim(), exampleTr: exTr0.trim() }];
    if (tr1.trim() || exEn1.trim()) {
      meanings.push({ tr: tr1.trim(), en: '', exampleEn: exEn1.trim(), exampleTr: exTr1.trim() });
    }
    const edits = {
      pronunciation: pron.trim(),
      synonyms: splitList(syn),
      antonyms: splitList(ant),
      meanings,
    };
    mergeProgress(id, { edits });
    navigation.goBack();
  };

  const reset = () => {
    mergeProgress(id, { edits: undefined });
    navigation.goBack();
  };

  const Field = ({ label, value, onChange, placeholder, multiline }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        autoCapitalize="none"
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.headword}>{word.headword}</Text>
      <Text style={styles.note}>Tüm alanları düzenleyebilir veya ekleyebilirsin. Değişiklikler bu cihazda saklanır.</Text>

      <Field label="Telaffuz (IPA)" value={pron} onChange={setPron} placeholder="/ˈ.../" />

      <Text style={styles.section}>1. Anlam</Text>
      <Field label="Türkçe anlam" value={tr0} onChange={setTr0} placeholder="Türkçe anlam" />
      <Field label="İngilizce tanım" value={en0} onChange={setEn0} placeholder="English definition" />
      <Field label="Örnek (İngilizce)" value={exEn0} onChange={setExEn0} placeholder="Example sentence" multiline />
      <Field label="Örnek (Türkçe)" value={exTr0} onChange={setExTr0} placeholder="Örnek çeviri" multiline />

      <Text style={styles.section}>2. Anlam (isteğe bağlı)</Text>
      <Field label="Türkçe anlam" value={tr1} onChange={setTr1} placeholder="Diğer bir anlam" />
      <Field label="Örnek (İngilizce)" value={exEn1} onChange={setExEn1} placeholder="Example sentence" multiline />
      <Field label="Örnek (Türkçe)" value={exTr1} onChange={setExTr1} placeholder="Örnek çeviri" multiline />

      <Text style={styles.section}>İlişkiler</Text>
      <Field label="Eş anlamlılar (virgülle)" value={syn} onChange={setSyn} placeholder="word1, word2" />
      <Field label="Zıt anlamlılar (virgülle)" value={ant} onChange={setAnt} placeholder="word1, word2" />

      <TouchableOpacity style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveText}>Kaydet</Text>
      </TouchableOpacity>
      {!!getProgress(id)?.edits && (
        <TouchableOpacity style={styles.resetBtn} onPress={reset}>
          <Text style={styles.resetText}>Düzenlemeyi sıfırla (orijinale dön)</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: colors.textMuted },
  headword: { color: colors.text, fontSize: 26, fontWeight: '800' },
  note: { color: colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: 12 },
  section: { color: colors.primary, fontWeight: '800', marginTop: 16, marginBottom: 4 },
  field: { marginTop: 10 },
  label: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputMulti: { minHeight: 56, textAlignVertical: 'top' },
  saveBtn: { marginTop: 22, backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  saveText: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
  resetBtn: { marginTop: 12, padding: 12, alignItems: 'center' },
  resetText: { color: colors.unknown, fontWeight: '700' },
});
