// Test önceliklendirme ve aralıklı tekrar mantığı (Özellik 4).
// Bilinmeyen ve pasif bilinen kelimelere öncelik verir; aktif bilinenler
// testlerde çok az yer alır.

export const STATUS = {
  UNKNOWN: 'unknown', // bilmiyorum
  PASSIVE: 'passive', // pasif biliyorum
  ACTIVE: 'active', // aktif biliyorum
};

// Duruma göre temel ağırlık. Yüksek ağırlık = teste girme olasılığı yüksek.
// Aktif bilinenler çok seyrek, bilinmeyen/pasif olanlar sık hatırlatılır.
const STATUS_WEIGHT = {
  [STATUS.UNKNOWN]: 12,
  [STATUS.PASSIVE]: 5,
  [STATUS.ACTIVE]: 0.15, // aktif bildiklerini çok az hatırlat
  unseen: 12, // işaretsiz kelimeler varsayılan olarak "bilmiyorum" sayılır
};

// Bir kelimenin seçilme ağırlığını hesaplar.
// progress: { status, box, lastReviewed (ms), wrongCount } | undefined
export function weightFor(word, progress) {
  const status = progress?.status || 'unseen';
  let weight = STATUS_WEIGHT[status] ?? STATUS_WEIGHT.unseen;

  // Yanlış cevaplananları biraz daha sık göster.
  if (progress?.wrongCount) weight *= 1 + Math.min(progress.wrongCount, 5) * 0.2;

  // Aralıklı tekrar: uzun süredir görülmeyene küçük bir artış.
  if (progress?.lastReviewed) {
    const days = (Date.now() - progress.lastReviewed) / (1000 * 60 * 60 * 24);
    weight *= 1 + Math.min(days / 7, 1.5);
  }

  return Math.max(weight, 0.05);
}

// Ağırlıklı rastgele seçim (tekrarsız) ile bir test kelime listesi üretir.
// "Hatırlatma" tiki kapatılan (muted) kelimeler hiç seçilmez.
export function selectForQuiz(words, getProgress, count) {
  const eligible = words.filter((w) => !getProgress(w.id)?.muted);
  const pool = eligible.map((w) => ({ word: w, weight: weightFor(w, getProgress(w.id)) }));
  const chosen = [];
  const available = [...pool];
  const target = Math.min(count, available.length);

  for (let i = 0; i < target; i++) {
    const total = available.reduce((s, p) => s + p.weight, 0);
    if (total <= 0) break;
    let r = Math.random() * total;
    let idx = 0;
    for (let j = 0; j < available.length; j++) {
      r -= available[j].weight;
      if (r <= 0) {
        idx = j;
        break;
      }
    }
    chosen.push(available[idx].word);
    available.splice(idx, 1);
  }
  return chosen;
}

// Çoktan seçmeli soru üretir: doğru cevap + 3 çeldirici.
// direction: 'en-tr' → İngilizce kelime sorulur, Türkçe anlam seçilir (varsayılan).
//            'tr-en' → Türkçe anlam sorulur, İngilizce kelime seçilir.
export function buildQuestion(word, allWords, direction = 'en-tr') {
  const trOf = (w) => w.meanings[0].tr;
  const enOf = (w) => w.headword;
  const [promptOf, answerOf] = direction === 'tr-en' ? [trOf, enOf] : [enOf, trOf];

  const correct = answerOf(word);
  const distractors = [];
  const pool = allWords.filter((w) => w.id !== word.id);
  // Karıştır
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (const w of pool) {
    const opt = answerOf(w);
    if (opt !== correct && !distractors.includes(opt)) distractors.push(opt);
    if (distractors.length >= 3) break;
  }
  const options = shuffle([correct, ...distractors]);
  return { word, prompt: promptOf(word), correct, options, direction };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Cevaba göre Leitner kutusu/istatistik günceller.
export function updateProgressAfterAnswer(prev, isCorrect) {
  const box = prev?.box ?? 0;
  return {
    ...prev,
    box: isCorrect ? Math.min(box + 1, 5) : Math.max(box - 1, 0),
    lastReviewed: Date.now(),
    correctCount: (prev?.correctCount || 0) + (isCorrect ? 1 : 0),
    wrongCount: (prev?.wrongCount || 0) + (isCorrect ? 0 : 1),
    // Doğru cevap pasif bilineni zamanla aktife taşıyabilir (öneri amaçlı).
    status: prev?.status || STATUS.UNKNOWN,
  };
}
