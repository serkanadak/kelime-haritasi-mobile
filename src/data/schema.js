// Kelime havuzu veri şeması (data schema)
// Tüm kelime kayıtları aşağıdaki yapıya uyar. Bu şema hem elle hazırlanmış
// (curated) kayıtlar hem de CSV/JSON'dan içe aktarılan kayıtlar için ortaktır.
//
// Bir kayıt (WordEntry):
// {
//   id:            string   - benzersiz kimlik, ör. "w_leverage"
//   headword:      string   - öğrenilen İngilizce kelime/ifade
//   pos:           string   - kelime türü (noun, verb, adj, idiom, phrase...)
//   level:         "A1"|"A2"|"B1"|"B2"|"C1"|"C2"   - CEFR seviyesi
//   domains:       string[] - "business" | "economics" | "communication" | "general"
//   type:          "word"|"idiom"|"slang"|"phrase" - içerik türü
//   root:          string   - ortak kök (grafik/ağ ilişkisi için), opsiyonel
//   pronunciation: string   - IPA telaffuz, opsiyonel
//   meanings: [             - en az bir anlam, her anlamın örnek cümlesi olmalı
//     {
//       tr:        string   - Türkçe anlam
//       en:        string   - İngilizce tanım
//       exampleEn: string   - İngilizce örnek cümle
//       exampleTr: string   - örnek cümlenin Türkçesi
//     }
//   ],
//   synonyms:      string[] - eş anlamlılar
//   antonyms:      string[] - zıt anlamlılar
//   collocations:  string[] - sık birliktelikler, opsiyonel
//   related:       string[] - ilişkili kayıt id'leri (açık ilişki), opsiyonel
// }

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const DOMAINS = {
  business: 'İşletme',
  economics: 'Ekonomi',
  communication: 'İletişim',
  general: 'Genel',
};

export const TYPES = {
  word: 'Kelime',
  idiom: 'Deyim',
  slang: 'Argo / Günlük',
  phrase: 'Kalıp İfade',
};

// Geliştirme/QA: bir kaydın şemaya uyup uymadığını kontrol eder.
export function validateEntry(e) {
  const errors = [];
  if (!e.id) errors.push('id eksik');
  if (!e.headword) errors.push('headword eksik');
  if (!LEVELS.includes(e.level)) errors.push(`geçersiz level: ${e.level}`);
  if (!Array.isArray(e.domains) || e.domains.length === 0) errors.push('domains boş');
  if (!Array.isArray(e.meanings) || e.meanings.length === 0) {
    errors.push('en az bir anlam gerekli');
  } else {
    e.meanings.forEach((m, i) => {
      if (!m.tr) errors.push(`meanings[${i}].tr eksik`);
      if (!m.exampleEn) errors.push(`meanings[${i}].exampleEn eksik`);
    });
  }
  return errors;
}
