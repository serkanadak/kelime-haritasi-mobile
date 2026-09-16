import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { filterWordlist, WORDLIST, WORDLIST_STATS, WORDLIST_LICENSE } from '../data';
import { useProgress } from '../state/ProgressContext';
import { STATUS } from '../logic/srs';
import { colors, STATUS_META, LEVEL_COLORS } from '../theme';
import { LevelBadge } from '../components/common';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
// Durum döngüsü: işaretsiz → bilmiyorum → pasif → aktif → işaretsiz
const CYCLE = [null, STATUS.UNKNOWN, STATUS.PASSIVE, STATUS.ACTIVE];

// CEFR Kelime Listesi (Özellik: geniş referans havuzu, seviyeye göre çalışma).
// Kaynak: CEFR-J Wordlist (atıf aşağıda gösterilir).
const STATUS_FILTERS = [
  { key: 'unknown', label: 'Bilmiyorum' },
  { key: 'passive', label: 'Pasif' },
  { key: 'active', label: 'Aktif' },
];

export default function WordlistScreen({ navigation }) {
  const { getProgress, setStatus, mergeProgress, byId } = useProgress();
  const [query, setQuery] = useState('');
  const [levels, setLevels] = useState([]); // boş = tümü
  const [statusFilter, setStatusFilter] = useState(null); // null | 'unknown' | 'passive' | 'active'
  const [mutedOnly, setMutedOnly] = useState(false); // sadece "hatırlatma" kapalı kelimeler

  const data = useMemo(() => {
    let d = filterWordlist({ levels: levels.length ? levels : null, query });
    if (mutedOnly) d = d.filter((w) => byId[w.id]?.muted);
    if (statusFilter === 'unknown') {
      d = d.filter((w) => (byId[w.id]?.status || 'unknown') === 'unknown');
    } else if (statusFilter) {
      d = d.filter((w) => byId[w.id]?.status === statusFilter);
    }
    return d;
  }, [levels, query, statusFilter, mutedOnly, byId]);

  // Durum adetleri (işaretsiz = bilmiyorum) + susturulan sayısı.
  const statusCounts = useMemo(() => {
    let passive = 0;
    let active = 0;
    let muted = 0;
    for (const w of WORDLIST) {
      const p = byId[w.id];
      if (p?.status === 'passive') passive++;
      else if (p?.status === 'active') active++;
      if (p?.muted) muted++;
    }
    return { unknown: WORDLIST.length - passive - active, passive, active, muted };
  }, [byId]);

  const toggleLevel = (lvl) =>
    setLevels((prev) => (prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl]));

  const cycleStatus = (item) => {
    const cur = getProgress(item.id)?.status || null;
    const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
    if (next) setStatus(item.id, next);
    else mergeProgress(item.id, { status: undefined });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>CEFR Kelime Listesi</Text>
        <Text style={styles.subtitle}>
          {WORDLIST_STATS.total.toLocaleString('tr-TR')} kelime (A1–C2 + deyimler) · seviyeye göre çalış ve işaretle
        </Text>

        <TextInput
          style={styles.search}
          placeholder="Listede ara…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />

        <View style={styles.chips}>
          {LEVELS.map((lvl) => {
            const on = levels.includes(lvl);
            return (
              <TouchableOpacity
                key={lvl}
                style={[styles.chip, on && { backgroundColor: LEVEL_COLORS[lvl], borderColor: LEVEL_COLORS[lvl] }]}
                onPress={() => toggleLevel(lvl)}
              >
                <Text style={[styles.chipText, on && { color: '#0f172a' }]}>
                  {lvl} ({WORDLIST_STATS.byLevel[lvl] || 0})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Durum filtresi: bilmiyorum / pasif / aktif */}
        <View style={styles.chips}>
          {STATUS_FILTERS.map((s) => {
            const on = statusFilter === s.key;
            const c = STATUS_META[s.key].color;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.chip, on && { backgroundColor: c, borderColor: c }]}
                onPress={() => setStatusFilter((f) => (f === s.key ? null : s.key))}
              >
                <Text style={[styles.chipText, on && { color: '#0f172a' }]}>
                  {s.label} ({(statusCounts[s.key] || 0).toLocaleString('tr-TR')})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Hatırlatması kapalı (susturulan) kelimeler */}
        <View style={styles.chips}>
          <TouchableOpacity
            style={[styles.chip, mutedOnly && { backgroundColor: colors.unknown, borderColor: colors.unknown }]}
            onPress={() => setMutedOnly((v) => !v)}
          >
            <Text style={[styles.chipText, mutedOnly && { color: '#0f172a' }]}>
              🔕 Hatırlatması kapalılar ({statusCounts.muted.toLocaleString('tr-TR')})
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.resultCount}>{data.length.toLocaleString('tr-TR')} sonuç</Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        initialNumToRender={20}
        windowSize={10}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const status = getProgress(item.id)?.status || null;
          const meta = status ? STATUS_META[status] : null;
          return (
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.rowMain}
                onPress={() =>
                  navigation.navigate('WordDetail', {
                    id: item.wordId || item.id,
                    // Tam kartı olmayan liste kelimesi için yedek bilgi
                    fallback: item.wordId
                      ? undefined
                      : { headword: item.headword, level: item.level, pos: item.pos },
                  })
                }
              >
                <Text style={styles.word}>{item.headword}</Text>
                <Text style={styles.pos}>{item.pos}</Text>
              </TouchableOpacity>
              <Text style={styles.hasDetail}>{item.wordId ? 'anlamlı ›' : '›'}</Text>
              <LevelBadge level={item.level} />
              <TouchableOpacity
                style={[styles.statusDot, { borderColor: meta?.color || colors.border, backgroundColor: meta?.color || 'transparent' }]}
                onPress={() => cycleStatus(item)}
              >
                <Text style={[styles.statusDotText, { color: meta ? '#0f172a' : colors.textMuted }]}>
                  {status ? meta.label[0] : '+'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListFooterComponent={
          <Text style={styles.license}>Kaynak: {WORDLIST_LICENSE}</Text>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 16, paddingBottom: 8 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.textMuted, marginTop: 4, marginBottom: 12 },
  search: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  resultCount: { color: colors.textMuted, fontSize: 12, marginTop: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  rowMain: { flex: 1 },
  word: { color: colors.text, fontSize: 15, fontWeight: '700' },
  pos: { color: colors.textMuted, fontSize: 11, fontStyle: 'italic' },
  hasDetail: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  statusDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotText: { fontWeight: '800', fontSize: 13 },
  license: { color: colors.textMuted, fontSize: 11, marginTop: 14, lineHeight: 16, fontStyle: 'italic' },
});
