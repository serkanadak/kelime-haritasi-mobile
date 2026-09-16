#!/usr/bin/env node
/**
 * CEFR-J kelime listesindeki kelimeleri, Claude (Anthropic API) ile TAM
 * flashcard kayıtlarına dönüştüren toplu zenginleştirme hattı.
 *
 * Tasarım:
 *  - Maliyet/ölçek için **Message Batches API** (standart fiyatın %50'si).
 *  - Şema garantisi için **structured outputs** (output_config.format).
 *  - Üretilen her kayıt bir **DOĞRULAMA (verification)** adımından geçer; güvenli
 *    olmayanlar kabul edilmez, inceleme dosyasına yazılır.
 *  - Kabul edilenler data-source/enriched/*.json'a yazılır → `npm run build:data`
 *    ile uygulamaya gömülür.
 *
 * Komutlar:
 *   node scripts/enrich.js candidates --level A1            # aday sayısını göster
 *   node scripts/enrich.js submit --level A1 --limit 100    # batch gönder
 *   node scripts/enrich.js poll <batchId>                   # durum sorgula
 *   node scripts/enrich.js collect <batchId>                # sonuçları al + doğrula + yaz
 *   node scripts/enrich.js run --level A1 --limit 100       # gönder + bekle + topla
 *   node scripts/enrich.js selftest                         # API'siz doğrulama testi
 *
 * Gerekli: ANTHROPIC_API_KEY ortam değişkeni ve `@anthropic-ai/sdk` paketi.
 *   (Uygulamanın çalışması için gerekmez; yalnızca bu araç için.)
 *   npm install --no-save @anthropic-ai/sdk
 */
const fs = require('fs');
const path = require('path');
const core = require('./lib/enrich-core');

const ROOT = path.resolve(__dirname, '..');
const STATE_DIR = path.join(__dirname, '.enrich-state');
const OUT_DIR = path.join(ROOT, 'data-source', 'enriched');
const DEFAULT_MODEL = process.env.ENRICH_MODEL || 'claude-opus-4-8';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else args[key] = true;
    } else args._.push(a);
  }
  return args;
}

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('HATA: ANTHROPIC_API_KEY tanımlı değil.');
    process.exit(1);
  }
  let mod;
  try {
    mod = require('@anthropic-ai/sdk');
  } catch (e) {
    console.error('HATA: @anthropic-ai/sdk bulunamadı. Kurun:\n  npm install --no-save @anthropic-ai/sdk');
    process.exit(1);
  }
  const Anthropic = mod.default || mod;
  return new Anthropic();
}

function levelsFrom(args) {
  if (!args.level) return null;
  return String(args.level).split(',').map((s) => s.trim().toUpperCase());
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

// --- komutlar -------------------------------------------------------------

function cmdCandidates(args) {
  const cands = core.loadCandidates({ levels: levelsFrom(args), limit: args.limit ? +args.limit : undefined });
  const dist = {};
  cands.forEach((c) => (dist[c.level] = (dist[c.level] || 0) + 1));
  console.log(`Zenginleştirilebilecek aday (tam kaydı olmayan): ${cands.length}`);
  console.log('Seviye dağılımı:', JSON.stringify(dist));
  console.log('Örnek:', cands.slice(0, 5).map((c) => `${c.headword}(${c.level})`).join(', '));
}

async function cmdSubmit(args) {
  const cands = core.loadCandidates({ levels: levelsFrom(args), limit: args.limit ? +args.limit : undefined });
  if (!cands.length) return console.log('Aday yok.');
  const model = args.model || DEFAULT_MODEL;
  const effort = args.effort || 'low';
  const requests = cands.map((c) => ({ custom_id: c.id, params: core.buildParams(c, { model, effort }) }));

  if (args['dry-run']) {
    console.log(`[dry-run] ${requests.length} istek hazırlandı (model=${model}, effort=${effort}).`);
    console.log('Örnek istek gövdesi:\n', JSON.stringify(requests[0], null, 2).slice(0, 900));
    return;
  }

  const client = getClient();
  console.log(`${requests.length} istek gönderiliyor (model=${model})...`);
  const batch = await client.messages.batches.create({ requests });
  ensureDir(STATE_DIR);
  const candById = Object.fromEntries(cands.map((c) => [c.id, c]));
  fs.writeFileSync(
    path.join(STATE_DIR, `${batch.id}.json`),
    JSON.stringify({ batchId: batch.id, model, createdAt: Date.now(), candidates: candById }, null, 2)
  );
  console.log(`Batch oluşturuldu: ${batch.id} (durum: ${batch.processing_status})`);
  console.log(`Topla: node scripts/enrich.js collect ${batch.id}`);
}

async function cmdPoll(args) {
  const id = args._[0];
  if (!id) return console.error('Kullanım: enrich.js poll <batchId>');
  const client = getClient();
  const b = await client.messages.batches.retrieve(id);
  console.log(`Durum: ${b.processing_status}`, JSON.stringify(b.request_counts || {}));
  return b;
}

async function cmdCollect(args) {
  const id = args._[0];
  if (!id) return console.error('Kullanım: enrich.js collect <batchId>');
  const statePath = path.join(STATE_DIR, `${id}.json`);
  if (!fs.existsSync(statePath)) return console.error(`Durum dosyası yok: ${statePath}`);
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const client = getClient();

  const accepted = [];
  const review = [];
  for await (const res of await client.messages.batches.results(id)) {
    const cand = state.candidates[res.custom_id];
    if (!cand) continue;
    if (res.result.type !== 'succeeded') {
      review.push({ candidate: cand, reason: `batch: ${res.result.type}`, error: res.result.error || null });
      continue;
    }
    let raw = null;
    try {
      const block = res.result.message.content.find((b) => b.type === 'text');
      raw = JSON.parse(block.text);
    } catch (e) {
      review.push({ candidate: cand, reason: 'JSON ayrıştırılamadı' });
      continue;
    }
    const v = core.validateAndBuild(cand, raw);
    if (v.ok) accepted.push(v.entry);
    else review.push({ candidate: cand, reason: v.reason, draft: v.draft || raw });
  }

  ensureDir(OUT_DIR);
  if (accepted.length) {
    fs.writeFileSync(path.join(OUT_DIR, `accepted-${id}.json`), JSON.stringify(accepted, null, 2));
  }
  ensureDir(STATE_DIR);
  fs.writeFileSync(path.join(STATE_DIR, `review-${id}.json`), JSON.stringify(review, null, 2));

  console.log(`Kabul: ${accepted.length} → data-source/enriched/accepted-${id}.json`);
  console.log(`İnceleme: ${review.length} → scripts/.enrich-state/review-${id}.json`);
  console.log('Uygulamaya gömmek için: npm run build:data');
}

async function cmdRun(args) {
  await cmdSubmit(args);
  if (args['dry-run']) return;
  // En son oluşturulan state dosyasını bul
  const files = fs.readdirSync(STATE_DIR).filter((f) => /^msgbatch.*\.json$/.test(f) || /\.json$/.test(f));
  const latest = files
    .map((f) => ({ f, t: fs.statSync(path.join(STATE_DIR, f)).mtimeMs }))
    .filter((x) => !x.f.startsWith('review-'))
    .sort((a, b) => b.t - a.t)[0];
  if (!latest) return;
  const id = JSON.parse(fs.readFileSync(path.join(STATE_DIR, latest.f), 'utf8')).batchId;
  const client = getClient();
  process.stdout.write('Bekleniyor');
  while (true) {
    const b = await client.messages.batches.retrieve(id);
    if (b.processing_status === 'ended') break;
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 30000));
  }
  console.log('\nBatch tamamlandı.');
  await cmdCollect({ _: [id] });
}

// API'siz doğrulama testi — hattın mantığını ağ olmadan doğrular.
function cmdSelftest() {
  const cand = { id: 'wl_negotiate', headword: 'negotiate', pos: 'verb', level: 'B1' };
  const good = {
    tr: 'müzakere etmek', en: 'to reach agreement by discussion',
    exampleEn: 'They negotiated a better price.', exampleTr: 'Daha iyi bir fiyat için pazarlık ettiler.',
    synonyms: ['bargain'], antonyms: ['dictate'], domains: ['business'], confidence: 'high',
  };
  const badMissing = { ...good, exampleEn: 'They reached a deal.' }; // kelimeyi içermiyor
  const lowConf = { ...good, confidence: 'low' };

  const r1 = core.validateAndBuild(cand, good);
  const r2 = core.validateAndBuild(cand, badMissing);
  const r3 = core.validateAndBuild(cand, lowConf);
  console.log('iyi kayıt  ->', r1.ok ? 'KABUL' : `RED (${r1.reason})`);
  console.log('eksik örnek->', r2.ok ? 'KABUL' : `RED (${r2.reason})`);
  console.log('düşük güven->', r3.ok ? 'KABUL' : `RED (${r3.reason})`);

  const cands = core.loadCandidates({ levels: ['A1'], limit: 3 });
  console.log('aday yükleme örneği (A1):', cands.map((c) => c.headword).join(', '));
  console.log('istek gövdesi modeli:', core.buildParams(cand, { model: DEFAULT_MODEL }).model);
  const allOk = r1.ok && !r2.ok && !r3.ok;
  console.log(allOk ? '\nSELF-TEST GEÇTİ ✓' : '\nSELF-TEST BAŞARISIZ ✗');
  if (!allOk) process.exit(1);
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const args = parseArgs(argv.slice(1));
  switch (cmd) {
    case 'candidates': return cmdCandidates(args);
    case 'submit': return cmdSubmit(args);
    case 'poll': return cmdPoll(args);
    case 'collect': return cmdCollect(args);
    case 'run': return cmdRun(args);
    case 'selftest': return cmdSelftest();
    default:
      console.log('Komutlar: candidates | submit | poll | collect | run | selftest');
      console.log('Örnek: node scripts/enrich.js run --level A1 --limit 100');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
