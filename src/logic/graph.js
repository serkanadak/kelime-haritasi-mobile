// Kelime ilişki ağı (Özellik 6).
// Kelimeleri ortak kök, eş/zıt anlam ve açık ilişkilere göre bir ağ olarak modeller.

import { WORDS, WORD_MAP, getWord } from '../data';

// Headword metnini var olan bir kayda eşlemek için indeks.
const headwordIndex = new Map();
for (const w of WORDS) {
  headwordIndex.set(w.headword.toLowerCase(), w.id);
}

// Çekimli/çoğul biçimleri temel karta bağlamak için hafif lemmatizasyon.
// Örn. "assets" → "asset", "funds" → "fund", "companies" → "company".
// Böylece aynı kelimenin çekimi ayrı "kartı yok" düğümü olarak görünmez.
function lemmaCandidates(k) {
  const c = [];
  if (k.endsWith('ies') && k.length > 4) c.push(k.slice(0, -3) + 'y');
  if (k.endsWith('es') && k.length > 3) c.push(k.slice(0, -2));
  if (k.endsWith('s') && !k.endsWith('ss') && k.length > 3) c.push(k.slice(0, -1));
  if (k.endsWith('ing') && k.length > 5) {
    c.push(k.slice(0, -3));
    c.push(k.slice(0, -3) + 'e');
  }
  if (k.endsWith('ed') && k.length > 4) {
    c.push(k.slice(0, -2));
    c.push(k.slice(0, -1));
    c.push(k.slice(0, -3) + 'y');
  }
  return c;
}

// id indeksi: "board" gibi bir referans, başlığı farklı olsa da (ör. kart
// başlığı "board of directors") w_board id'li karta çözülebilsin diye.
const idIndex = new Set(WORDS.map((w) => w.id));
const slugId = (t) => 'w_' + (t || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

function resolveToId(text) {
  const k = (text || '').trim().toLowerCase();
  if (!k) return null;
  const direct = headwordIndex.get(k);
  if (direct) return direct;
  // Başlık eşleşmese de w_<slug> id'li bir kart varsa ona bağla.
  const sid = slugId(k);
  if (idIndex.has(sid)) return sid;
  // Son çare: çekimli biçimi temel karta indirgemeyi dene.
  for (const cand of lemmaCandidates(k)) {
    const id = headwordIndex.get(cand);
    if (id) return id;
  }
  return null;
}

// Verilen kelimenin komşuluğunu (1. derece ilişkiler) çıkarır.
// Dönen yapı: { nodes, edges } — GraphScreen bunu görselleştirir.
export function buildNeighborhood(wordId) {
  const center = getWord(wordId);
  if (!center) return { nodes: [], edges: [] };

  const nodes = new Map();
  const edges = [];
  nodes.set(center.id, { ...nodeOf(center), relation: 'center' });

  const addEdge = (toId, kind) => {
    const target = getWord(toId);
    if (!target || target.id === center.id) return;
    if (!nodes.has(target.id)) nodes.set(target.id, { ...nodeOf(target), relation: kind });
    if (!edges.some((e) => e.to === toId && e.kind === kind)) {
      edges.push({ from: center.id, to: toId, kind });
    }
  };

  // Kartı olmayan eş/zıt anlamları da ağda etiket düğümü olarak göster.
  const addLeaf = (label, kind) => {
    const id = `lbl_${kind}_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    if (!nodes.has(id)) nodes.set(id, { id, headword: label, relation: kind, isLabel: true });
    if (!edges.some((e) => e.to === id && e.kind === kind)) {
      edges.push({ from: center.id, to: id, kind });
    }
  };

  // Açık ilişkiler
  (center.related || []).forEach((id) => addEdge(id, 'related'));
  // Eş anlamlılar — kart varsa düğüm, yoksa etiket
  (center.synonyms || []).forEach((s) => {
    const id = resolveToId(s);
    if (id) addEdge(id, 'synonym');
    else addLeaf(s, 'synonym');
  });
  // Zıt anlamlılar — kart varsa düğüm, yoksa etiket
  (center.antonyms || []).forEach((a) => {
    const id = resolveToId(a);
    if (id) addEdge(id, 'antonym');
    else addLeaf(a, 'antonym');
  });
  // Aynı kök
  if (center.root) {
    WORDS.forEach((w) => {
      if (w.id !== center.id && w.root && w.root === center.root) addEdge(w.id, 'root');
    });
  }

  return { nodes: Array.from(nodes.values()), edges };
}

function nodeOf(w) {
  return {
    id: w.id,
    headword: w.headword,
    level: w.level,
    type: w.type,
    domains: w.domains,
  };
}

// Düğümleri merkez etrafında dairesel (radyal) yerleştirir.
// width/height: çizim alanı boyutu. Dönen: id -> {x, y}
export function radialLayout(graph, width, height) {
  const positions = {};
  const cx = width / 2;
  const cy = height / 2;
  const others = graph.nodes.filter((n) => n.relation !== 'center');
  positions[graph.nodes.find((n) => n.relation === 'center')?.id] = { x: cx, y: cy };
  const radius = Math.min(width, height) * 0.36;
  others.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(others.length, 1) - Math.PI / 2;
    positions[n.id] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });
  return positions;
}

export const RELATION_COLORS = {
  center: '#f59e0b',
  synonym: '#22c55e',
  antonym: '#ef4444',
  root: '#3b82f6',
  related: '#a855f7',
};

export const RELATION_LABELS = {
  synonym: 'Eş anlam',
  antonym: 'Zıt anlam',
  root: 'Aynı kök',
  related: 'İlişkili',
  center: 'Merkez',
};
