#!/usr/bin/env node
/**
 * CEFR-J Wordlist'i uygulamaya gömülü referans kelime listesine dönüştürür.
 *
 * Kaynak: The CEFR-J Wordlist Version 1.6. Yukio Tono tarafından derlenmiştir,
 *         Tokyo University of Foreign Studies (TUFS).
 *         Araştırma ve ticari kullanıma kaynak gösterimi şartıyla açıktır.
 *         https://www.cefr-j.org/download_eng
 *
 * Bu liste yalnızca kelime + tür + CEFR seviyesi içerir (Türkçe anlam/örnek YOK).
 * Bu yüzden tam flashcard kaydı değil; seviyeye göre gezilip işaretlenebilen
 * ayrı bir "CEFR Kelime Listesi" katmanı olarak gömülür (src/data/wordlist.generated.js).
 *
 * Kullanım: npm run build:wordlist
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'data-source', 'licensed', 'cefrj-vocabulary-profile-1.6.csv');
const OUT = path.join(ROOT, 'src', 'data', 'wordlist.generated.js');

const POS_SET = new Set([
  'noun', 'adjective', 'verb', 'adverb', 'pronoun', 'preposition', 'determiner',
  'conjunction', 'number', 'modal auxiliary', 'be-verb', 'interjection',
  'do-verb', 'have-verb', 'infinitive-to',
]);

const POS_SHORT = {
  noun: 'noun', adjective: 'adj', verb: 'verb', adverb: 'adv', pronoun: 'pron',
  preposition: 'prep', determiner: 'det', conjunction: 'conj', number: 'num',
  'modal auxiliary': 'modal', 'be-verb': 'verb', interjection: 'interj',
  'do-verb': 'verb', 'have-verb': 'verb', 'infinitive-to': 'to',
};

const CEFR = /^[ABC][12]$/;

// Başlıkta virgül olabildiğinden, POS token'ını bularak güvenli ayrıştırma yaparız.
function parseLine(line) {
  const parts = line.split(',');
  let posIdx = -1;
  for (let i = 1; i < parts.length; i++) {
    if (POS_SET.has(parts[i].trim())) {
      posIdx = i;
      break;
    }
  }
  if (posIdx === -1) return null;
  const headword = parts.slice(0, posIdx).join(',').trim();
  const pos = parts[posIdx].trim();
  const level = (parts[posIdx + 1] || '').trim();
  if (!headword || !CEFR.test(level)) return null;
  return { headword, pos, level };
}

// Görüntülenecek birincil biçim: ilk varyant ve parantez/notları temizle.
function primary(headword) {
  return headword.split('/')[0].split('(')[0].replace(/\s+/g, ' ').trim();
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`Kaynak yok: ${SRC}\nÖnce CEFR-J CSV dosyasını indirip buraya koyun.`);
    process.exit(1);
  }
  const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/);
  const seen = new Set();
  const out = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const row = parseLine(lines[i]);
    if (!row) {
      skipped++;
      continue;
    }
    const h = primary(row.headword);
    const key = h.toLowerCase();
    // Kısaltma artıkları ve harf içermeyen girdileri ele ('m, 're, vb.)
    if (!h || h.startsWith("'") || !/[a-z]/i.test(h) || seen.has(key)) continue;
    seen.add(key);
    out.push({ h, p: POS_SHORT[row.pos] || row.pos, l: row.level });
  }

  // Seviyeye göre sırala (A1 → C2) sonra alfabetik.
  const order = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };
  out.sort((a, b) => order[a.l] - order[b.l] || a.h.localeCompare(b.h));

  const banner =
    '// OTOMATİK ÜRETİLDİ — elle düzenlemeyin. Üretim: npm run build:wordlist\n' +
    '// Kaynak: The CEFR-J Wordlist Version 1.6 (Yukio Tono, TUFS) — kaynak gösterimi şartıyla kullanılır.\n' +
    '// h=headword, p=pos, l=CEFR level\n';
  fs.writeFileSync(OUT, banner + `export default ${JSON.stringify(out)};\n`, 'utf8');

  const dist = {};
  out.forEach((w) => (dist[w.l] = (dist[w.l] || 0) + 1));
  console.log(`Yazıldı: ${out.length} kelime → src/data/wordlist.generated.js`);
  console.log('Seviye dağılımı:', JSON.stringify(dist), '| atlanan:', skipped);
}

main();
