// Zenginleştirme hattının saf (API'siz) çekirdeği: aday seçimi, istek gövdesi,
// yapılandırılmış çıktı şeması ve DOĞRULAMA (verification) adımı.
// Bu dosya ağ erişimi gerektirmez ve birim testiyle çalıştırılabilir.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const DOMAINS = ['business', 'economics', 'communication', 'general'];

// JSON dizisini "export default [ ... ];" biçimindeki bir modülden ayıklar.
function readJsonArrayFromModule(file) {
  const text = fs.readFileSync(file, 'utf8');
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) return [];
  return JSON.parse(text.slice(start, end + 1));
}

// Tam (Türkçe anlamlı) kayıtların halihazırda kapsadığı başlıkları toplar.
function loadCoveredHeadwords() {
  const covered = new Set();
  const curated = [
    'words.business.js',
    'words.economics.js',
    'words.communication.js',
    'words.general.js',
    'idioms.js',
  ];
  for (const f of curated) {
    const p = path.join(DATA_DIR, f);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    for (const m of content.matchAll(/headword:\s*'([^']+)'/g)) {
      covered.add(m[1].toLowerCase());
    }
  }
  // generated.js (JSON) ve enriched/*.json
  const gen = path.join(DATA_DIR, 'generated.js');
  if (fs.existsSync(gen)) {
    for (const e of readJsonArrayFromModule(gen)) covered.add(e.headword.toLowerCase());
  }
  const enrichedDir = path.join(ROOT, 'data-source', 'enriched');
  if (fs.existsSync(enrichedDir)) {
    for (const f of fs.readdirSync(enrichedDir).filter((x) => /\.json$/i.test(x))) {
      for (const e of JSON.parse(fs.readFileSync(path.join(enrichedDir, f), 'utf8'))) {
        covered.add(e.headword.toLowerCase());
      }
    }
  }
  return covered;
}

// CEFR-J listesinden, henüz tam kaydı OLMAYAN adayları döndürür.
function loadCandidates({ levels, limit } = {}) {
  const wl = readJsonArrayFromModule(path.join(DATA_DIR, 'wordlist.generated.js'));
  const covered = loadCoveredHeadwords();
  let out = wl
    .filter((e) => !covered.has(e.h.toLowerCase()))
    .filter((e) => !levels || !levels.length || levels.includes(e.l))
    .map((e) => ({ id: `wl_${e.h.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, headword: e.h, pos: e.p, level: e.l }));
  if (limit) out = out.slice(0, limit);
  return out;
}

// Yapılandırılmış çıktı şeması (output_config.format).
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tr: { type: 'string' },
    en: { type: 'string' },
    pronunciation: { type: 'string' },
    exampleEn: { type: 'string' },
    exampleTr: { type: 'string' },
    synonyms: { type: 'array', items: { type: 'string' } },
    antonyms: { type: 'array', items: { type: 'string' } },
    domains: { type: 'array', items: { type: 'string', enum: DOMAINS } },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['tr', 'en', 'pronunciation', 'exampleEn', 'exampleTr', 'synonyms', 'antonyms', 'domains', 'confidence'],
};

const SYSTEM_PROMPT =
  'You are a careful English–Turkish lexicographer producing flashcard data for ' +
  'a CEFR-leveled vocabulary app focused on business, economics and communication. ' +
  'For the given English headword, produce: an accurate Turkish meaning (tr), a short ' +
  'English definition (en), the IPA pronunciation (pronunciation, e.g. /ˈbʌdʒɪt/), ' +
  'one natural English example sentence that USES the headword ' +
  '(exampleEn), its Turkish translation (exampleTr), a few real synonyms and antonyms ' +
  '(English; empty arrays if none), and the relevant domains. Translations must be ' +
  'accurate and idiomatic. If you are not confident the data is correct (rare/ambiguous ' +
  'word, proper noun, function word), set confidence to "low" rather than guessing. ' +
  'Never invent fake words. Respond ONLY with the structured object.';

// Bir aday için Messages API parametre gövdesi (batch veya create ile kullanılır).
function buildParams(candidate, { model, effort }) {
  return {
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    output_config: {
      effort: effort || 'low',
      format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content:
          `Headword: ${candidate.headword}\n` +
          `Part of speech: ${candidate.pos}\n` +
          `CEFR level: ${candidate.level}\n\n` +
          'Produce the flashcard fields for this exact word.',
      },
    ],
  };
}

// DOĞRULAMA (verification): model çıktısını şema kaydına çevirir; güvenli değilse
// reddeder/incelemeye yönlendirir. Dönen: { ok, entry?, reason? }
function validateAndBuild(candidate, raw) {
  const problems = [];
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'çıktı yok' };
  const tr = (raw.tr || '').trim();
  const exampleEn = (raw.exampleEn || '').trim();
  const exampleTr = (raw.exampleTr || '').trim();
  if (!tr) problems.push('tr boş');
  if (!exampleEn) problems.push('exampleEn boş');
  if (!exampleTr) problems.push('exampleTr boş');
  if (raw.confidence === 'low') problems.push('düşük güven');

  // Örnek cümle kelimeyi (kökünü) gerçekten içeriyor mu?
  const stem = candidate.headword.toLowerCase().split(/[\s/]/)[0].slice(0, 4);
  if (stem && !exampleEn.toLowerCase().includes(stem)) problems.push('örnek kelimeyi içermiyor');

  if (problems.length) return { ok: false, reason: problems.join('; '), draft: raw };

  const domains = Array.isArray(raw.domains) && raw.domains.length ? raw.domains : ['general'];
  const entry = {
    id: candidate.id,
    headword: candidate.headword,
    pos: candidate.pos,
    level: candidate.level,
    domains,
    type: 'word',
    source: 'cefrj+llm', // izlenebilirlik
    pronunciation: (raw.pronunciation || '').trim() || undefined,
    meanings: [{ tr, en: (raw.en || '').trim(), exampleEn, exampleTr }],
    synonyms: Array.isArray(raw.synonyms) ? raw.synonyms : [],
    antonyms: Array.isArray(raw.antonyms) ? raw.antonyms : [],
  };
  return { ok: true, entry };
}

module.exports = {
  LEVELS,
  DOMAINS,
  OUTPUT_SCHEMA,
  SYSTEM_PROMPT,
  readJsonArrayFromModule,
  loadCoveredHeadwords,
  loadCandidates,
  buildParams,
  validateAndBuild,
};
