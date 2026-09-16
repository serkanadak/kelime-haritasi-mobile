import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Circle, Text as SvgText } from 'react-native-svg';
import { WORDS, getWord, searchWords } from '../data';
import { useProgress } from '../state/ProgressContext';
import { LevelBadge } from '../components/common';
import { buildNeighborhood, radialLayout, RELATION_COLORS, RELATION_LABELS } from '../logic/graph';
import { colors, LEVEL_COLORS, STATUS_META } from '../theme';

const { width } = Dimensions.get('window');
const SIZE = Math.min(width - 24, 360);
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const STATUS_FILTERS = [
  { key: 'unknown', label: 'Bilmiyorum' },
  { key: 'passive', label: 'Pasif' },
  { key: 'active', label: 'Aktif' },
];

// Kelime ilişki ağı görselleştirmesi (Özellik 6).
export default function GraphScreen({ route, navigation }) {
  const initialId = route.params?.id || WORDS[0]?.id;
  const [centerId, setCenterId] = useState(initialId);
  const [query, setQuery] = useState('');
  // Rastgele seçim havuzunu belirleyen filtreler (boş = kısıtlama yok).
  const [levels, setLevels] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const { byId } = useProgress();

  // Başka ekrandan id ile gelindiğinde merkezi güncelle.
  useEffect(() => {
    if (route.params?.id) setCenterId(route.params.id);
  }, [route.params?.id]);

  const graph = useMemo(() => buildNeighborhood(centerId), [centerId]);
  const positions = useMemo(() => radialLayout(graph, SIZE, SIZE), [graph]);
  const center = graph.nodes.find((n) => n.relation === 'center');
  const centerWord = getWord(centerId);

  // Arama önerileri (yalnızca kartı olan kelimeler).
  const suggestions = useMemo(() => {
    if (query.trim().length < 2) return [];
    return searchWords(query).slice(0, 8);
  }, [query]);

  // Filtreye uyan rastgele-seçim havuzu (işaretsiz = bilmiyorum sayılır).
  const pool = useMemo(() => {
    return WORDS.filter((w) => {
      if (levels.length && !levels.includes(w.level)) return false;
      if (statuses.length) {
        const s = byId[w.id]?.status || 'unknown';
        if (!statuses.includes(s)) return false;
      }
      return true;
    });
  }, [levels, statuses, byId]);

  const goTo = (id) => {
    setCenterId(id);
    setQuery('');
  };

  const randomWord = () => {
    if (!pool.length) return;
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (w) goTo(w.id);
  };

  const toggleLevel = (lvl) =>
    setLevels((prev) => (prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl]));
  const toggleStatus = (key) =>
    setStatuses((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>İlişki Ağı</Text>

      {/* Arama */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Ağını görmek istediğin kelime…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestBox}>
          {suggestions.map((w) => (
            <TouchableOpacity key={w.id} style={styles.suggestRow} onPress={() => goTo(w.id)}>
              <Text style={styles.suggestWord}>{w.headword}</Text>
              <Text style={styles.suggestMeaning} numberOfLines={1}>
                {w.meanings[0].tr}
              </Text>
              <LevelBadge level={w.level} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Rastgele seçim havuzu filtresi: seviye + durum */}
      <Text style={styles.filterLabel}>🎲 Rastgele havuzu filtrele (seçim yapmazsan tümü):</Text>
      <View style={styles.chips}>
        {LEVELS.map((lvl) => {
          const on = levels.includes(lvl);
          return (
            <TouchableOpacity
              key={lvl}
              style={[styles.chip, on && { backgroundColor: LEVEL_COLORS[lvl], borderColor: LEVEL_COLORS[lvl] }]}
              onPress={() => toggleLevel(lvl)}
            >
              <Text style={[styles.chipText, on && { color: '#0f172a' }]}>{lvl}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.chips}>
        {STATUS_FILTERS.map((s) => {
          const on = statuses.includes(s.key);
          const c = STATUS_META[s.key].color;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.chip, on && { backgroundColor: c, borderColor: c }]}
              onPress={() => toggleStatus(s.key)}
            >
              <Text style={[styles.chipText, on && { color: '#0f172a' }]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.randomBtn, !pool.length && styles.randomBtnDisabled]}
        onPress={randomWord}
        disabled={!pool.length}
      >
        <Text style={styles.randomBtnText}>
          🎲 Havuzdan rastgele kelime ({pool.length.toLocaleString('tr-TR')})
        </Text>
      </TouchableOpacity>

      <Text style={styles.subtitle}>
        “{center?.headword}”{centerWord ? ` (${centerWord.level})` : ''} — eş/zıt anlam, kök ve ilişkili bağlantıları
      </Text>

      <View style={styles.canvas}>
        <Svg width={SIZE} height={SIZE}>
          {graph.edges.map((e, i) => {
            const a = positions[e.from];
            const b = positions[e.to];
            if (!a || !b) return null;
            return (
              <Line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={RELATION_COLORS[e.kind] || colors.border}
                strokeWidth={2}
                strokeOpacity={0.7}
              />
            );
          })}
          {graph.nodes.map((n) => {
            const p = positions[n.id];
            if (!p) return null;
            const isCenter = n.relation === 'center';
            const onTap = () => { if (!n.isLabel) setCenterId(n.id); };
            return (
              <React.Fragment key={n.id}>
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={isCenter ? 26 : 20}
                  fill={isCenter ? colors.primary : n.isLabel ? colors.surface : colors.surfaceAlt}
                  stroke={RELATION_COLORS[n.relation] || colors.border}
                  strokeWidth={2.5}
                  strokeDasharray={n.isLabel ? '3,3' : undefined}
                  onPress={onTap}
                />
                <SvgText
                  x={p.x}
                  y={p.y + 38}
                  fill={colors.text}
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                  onPress={onTap}
                >
                  {clip(n.headword)}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      <View style={styles.legend}>
        {Object.entries(RELATION_LABELS)
          .filter(([k]) => k !== 'center')
          .map(([k, label]) => (
            <View key={k} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: RELATION_COLORS[k] }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
      </View>

      <Text style={styles.hint}>Bir düğüme dokunarak ağda gezinebilirsin.</Text>

      <TouchableOpacity
        style={styles.detailBtn}
        onPress={() => navigation.navigate('WordDetail', { id: centerId })}
      >
        <Text style={styles.detailBtnText}>“{center?.headword}” detayını aç</Text>
      </TouchableOpacity>

      <View style={styles.related}>
        <Text style={styles.relatedTitle}>Bağlantılı kelimeler</Text>
        {graph.nodes
          .filter((n) => n.relation !== 'center')
          .map((n) => (
            <TouchableOpacity
              key={n.id}
              style={styles.relRow}
              onPress={() => { if (!n.isLabel) setCenterId(n.id); }}
              activeOpacity={n.isLabel ? 1 : 0.5}
            >
              <View style={[styles.dot, { backgroundColor: RELATION_COLORS[n.relation] }]} />
              <Text style={styles.relWord}>{n.headword}</Text>
              <Text style={styles.relKind}>
                {RELATION_LABELS[n.relation]}{n.isLabel ? ' (kart yok)' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        {graph.nodes.length <= 1 && (
          <Text style={styles.hint}>Bu kelime için tanımlı bağlantı bulunamadı.</Text>
        )}
      </View>
    </ScrollView>
  );
}

function clip(s) {
  return s.length > 14 ? s.slice(0, 13) + '…' : s;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  searchRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  search: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterLabel: { color: colors.textMuted, fontSize: 12, marginTop: 14, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  randomBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  randomBtnDisabled: { opacity: 0.4 },
  randomBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 14 },
  suggestBox: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestWord: { color: colors.text, fontWeight: '700', fontSize: 14 },
  suggestMeaning: { color: colors.textMuted, fontSize: 12, flex: 1 },
  subtitle: { color: colors.textMuted, marginTop: 14, marginBottom: 4 },
  canvas: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  legendText: { color: colors.textMuted, fontSize: 12 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 10, fontStyle: 'italic' },
  detailBtn: {
    marginTop: 14,
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  detailBtnText: { color: '#0f172a', fontWeight: '800' },
  related: { marginTop: 16 },
  relatedTitle: { color: colors.textMuted, fontWeight: '700', marginBottom: 8 },
  relRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  relWord: { color: colors.text, fontWeight: '700', flex: 1 },
  relKind: { color: colors.textMuted, fontSize: 12 },
});
