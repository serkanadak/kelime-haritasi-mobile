#!/usr/bin/env node
/**
 * Veri havuzu üretici (build pipeline).
 *
 * data-source/ klasöründeki tüm .csv ve .json kaynaklarını okur, şemaya
 * dönüştürür, doğrular, curated kayıtlarla çakışanları eler ve sonucu
 * src/data/generated.js içine GÖMÜLÜ (embedded) bir ES modülü olarak yazar.
 *
 * Böylece havuz çalışma zamanında ağ gerektirmeden 10.000+ kelimeye ölçeklenir.
 *
 * Kullanım:
 *   npm run build:data
 *
 * CSV kolonları (başlık satırı zorunlu):
 *   headword,pos,level,domains,type,root,pronunciation,tr,en,exampleEn,exampleTr,synonyms,antonyms,collocations,related
 *   - domains/synonyms/antonyms/collocations/related: "|" ile ayrılmış çoklu değer
 *   - Aynı headword birden çok satırda olursa anlamlar (meanings) birleştirilir.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'data-source');
const OUT_FILE = path.join(ROOT, 'src', 'data', 'generated.js');

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Tırnaklı alanları destekleyen basit CSV ayrıştırıcı.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((x) => x.trim() !== '')) rows.push(row);
  }
  return rows;
}

function splitList(s) {
  if (!s) return [];
  return s
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);
}

function rowsToEntries(rows) {
  const header = rows[0].map((h) => h.trim());
  const idx = (name) => header.indexOf(name);
  const byHeadword = new Map();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (name) => {
      const i = idx(name);
      return i >= 0 ? (row[i] || '').trim() : '';
    };
    const headword = get('headword');
    if (!headword) continue;
    const level = get('level');
    if (!LEVELS.includes(level)) {
      console.warn(`  ! atlandı (geçersiz level "${level}"): ${headword}`);
      continue;
    }

    const meaning = {
      tr: get('tr'),
      en: get('en'),
      exampleEn: get('exampleEn'),
      exampleTr: get('exampleTr'),
    };
    if (!meaning.tr || !meaning.exampleEn) {
      console.warn(`  ! atlandı (tr/exampleEn eksik): ${headword}`);
      continue;
    }

    const id = 'w_' + slugify(headword);
    if (byHeadword.has(id)) {
      byHeadword.get(id).meanings.push(meaning);
    } else {
      byHeadword.set(id, {
        id,
        headword,
        pos: get('pos') || 'word',
        level,
        domains: splitList(get('domains')).length ? splitList(get('domains')) : ['general'],
        type: get('type') || 'word',
        root: get('root') || undefined,
        pronunciation: get('pronunciation') || undefined,
        meanings: [meaning],
        synonyms: splitList(get('synonyms')),
        antonyms: splitList(get('antonyms')),
        collocations: splitList(get('collocations')),
        related: splitList(get('related')),
      });
    }
  }
  return Array.from(byHeadword.values());
}

const CURATED_FILES = [
  'words.business.js', 'words.economics.js', 'words.communication.js', 'words.general.js', 'idioms.js',
];

function loadCuratedField(re) {
  const out = new Set();
  for (const f of CURATED_FILES) {
    const p = path.join(ROOT, 'src', 'data', f);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    for (const m of content.matchAll(re)) out.add(m[1]);
  }
  return out;
}

function loadCuratedIds() {
  // generated dışındaki kaynak dosyalardaki id'leri toplayıp çakışmayı önler.
  return loadCuratedField(/id:\s*'([^']+)'/g);
}

function loadCuratedHeadwords() {
  // Aynı kelimenin curated + generated'da iki kez görünmesini önlemek için başlıklar.
  const out = new Set();
  for (const h of loadCuratedField(/headword:\s*'([^']+)'/g)) out.add(h.toLowerCase());
  return out;
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`Kaynak klasörü yok: ${SRC_DIR}`);
    process.exit(1);
  }
  // data-source/ kökü (CSV/JSON) + data-source/enriched/ (LLM ile üretilen JSON).
  // Not: data-source/licensed/ bilinçli olarak HARİÇ — orası ham CEFR-J kaynağıdır.
  const rootFiles = fs
    .readdirSync(SRC_DIR)
    .filter((f) => /\.(csv|json)$/i.test(f))
    .map((f) => path.join(SRC_DIR, f));
  const enrichedDir = path.join(SRC_DIR, 'enriched');
  const enrichedFiles = fs.existsSync(enrichedDir)
    ? fs
        .readdirSync(enrichedDir)
        .filter((f) => /\.json$/i.test(f))
        .map((f) => path.join(enrichedDir, f))
    : [];
  const files = [...rootFiles, ...enrichedFiles];
  if (!files.length) {
    console.log('data-source/ içinde .csv veya .json bulunamadı. Çıkılıyor.');
    return;
  }

  const curatedIds = loadCuratedIds();
  let all = [];
  for (const full of files) {
    const f = path.relative(SRC_DIR, full);
    const text = fs.readFileSync(full, 'utf8');
    let entries = [];
    if (/\.csv$/i.test(full)) entries = rowsToEntries(parseCsv(text));
    else entries = JSON.parse(text);
    console.log(`+ ${f}: ${entries.length} kayıt`);
    all = all.concat(entries);
  }

  // Curated ile çakışan ve kendi içinde tekrar eden id/başlıkları ele.
  const curatedHeadwords = loadCuratedHeadwords();
  const seen = new Set();
  const seenHw = new Set(curatedHeadwords);
  const result = [];
  let skipped = 0;
  for (const e of all) {
    const hw = (e.headword || '').toLowerCase();
    if (curatedIds.has(e.id) || seen.has(e.id) || seenHw.has(hw)) {
      skipped++;
      continue;
    }
    seen.add(e.id);
    seenHw.add(hw);
    result.push(e);
  }

  // ---------------------------------------------------------------------
  // Çok-anlamlı kart bindirmesi (meanings overlay).
  // data-source/meanings-extra/*.json → var olan kartlara YAYGIN DİĞER
  // anlamları ekler. Yeni kart açmaz; yalnızca mevcut kartın meanings[]
  // dizisini genişletir. Dedup: aynı Türkçe anlam tekrar eklenmez.
  // Şema: [{ id?, headword, extraMeanings: [{tr,en,exampleEn,exampleTr}] }]
  // ---------------------------------------------------------------------
  const extraDir = path.join(SRC_DIR, 'meanings-extra');
  const byIdMap = new Map(result.map((e) => [e.id, e]));
  const byHwMap = new Map();
  for (const e of result) byHwMap.set((e.headword || '').toLowerCase(), e);
  let addedMeanings = 0;
  let overlayFiles = 0;
  if (fs.existsSync(extraDir)) {
    const oFiles = fs
      .readdirSync(extraDir)
      .filter((f) => /\.json$/i.test(f))
      .map((f) => path.join(extraDir, f));
    for (const full of oFiles) {
      let entries;
      try {
        entries = JSON.parse(fs.readFileSync(full, 'utf8'));
      } catch (err) {
        console.warn(`  ! overlay atlandı (JSON hatası): ${path.basename(full)}`);
        continue;
      }
      overlayFiles++;
      for (const ov of entries) {
        if (!ov || !Array.isArray(ov.extraMeanings) || !ov.extraMeanings.length) continue;
        const hw = (ov.headword || '').toLowerCase();
        const card = (ov.id && byIdMap.get(ov.id)) || byHwMap.get(hw);
        if (!card) continue;
        const existing = new Set(card.meanings.map((m) => (m.tr || '').trim().toLowerCase()));
        for (const m of ov.extraMeanings) {
          const tr = (m.tr || '').trim();
          const ex = (m.exampleEn || '').trim();
          if (!tr || !ex) continue;
          const key = tr.toLowerCase();
          if (existing.has(key)) continue;
          existing.add(key);
          card.meanings.push({
            tr,
            en: (m.en || '').trim(),
            exampleEn: ex,
            exampleTr: (m.exampleTr || '').trim(),
          });
          addedMeanings++;
        }
      }
    }
  }

  const banner =
    '// OTOMATİK ÜRETİLDİ — elle düzenlemeyin. Kaynak: data-source/, üretim: npm run build:data\n';
  const body = `export default ${JSON.stringify(result, null, 2)};\n`;
  fs.writeFileSync(OUT_FILE, banner + body, 'utf8');

  console.log(
    `\nTamam: ${result.length} kayıt yazıldı → src/data/generated.js (çakışma/atlama: ${skipped}).`
  );
  if (overlayFiles) {
    console.log(`Çok-anlamlı bindirme: ${overlayFiles} dosya, +${addedMeanings} ek anlam eklendi.`);
  }
}

main();
