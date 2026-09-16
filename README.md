# Kelime Haritası 📇🕸️

İşletme, ekonomi ve iletişim odaklı, **CEFR A1–C2** seviyelerinde **İngilizce kelime
öğrenme (flashcard)** uygulaması. Anlamlar hem **Türkçe** hem **İngilizce** verilir.
Günlük dilde kullanılan **deyim, argo ve yaygın iş ifadelerini** de kapsar.

Cross-platform: **Expo / React Native** ile geliştirildi → tek kod tabanından
**iOS (App Store)**, **Android (Google Play)** ve web.

---

## İstenen 8 özellik ve karşılığı

| # | İstek | Nerede |
|---|-------|--------|
| 1 | Veriler uygulamaya **gömülü** | `src/data/*` — çalışma zamanında ağ gerekmez |
| 2 | Türkçe anlam, eş/zıt anlam, her anlama örnek cümle | Kelime şeması: `src/data/schema.js` |
| 3 | Kelimeleri **pasif / aktif / bilmiyorum** olarak kategorize etme | `StatusPicker` + `src/state/ProgressContext.js` (kalıcı saklama) |
| 4 | Testler **bilinmeyen/pasif** kelimelere öncelik versin, aktif çok az çıksın | `src/logic/srs.js` (ağırlıklı seçim + Leitner) |
| 5 | Major mağazalara hazır, **cross-platform** | Expo / React Native (`app.json`) |
| 6 | İlişkili kelimeleri **harita/ağ** olarak gösterme | `src/logic/graph.js` + `src/screens/GraphScreen.js` (SVG) |
| 7 | Resmî sözlüklerde olmayan **deyim/argo/günlük ifade** havuzu | `src/data/idioms.js` |
| 8 | Kelimeleri **makale ve hikâye** içinde bağlamsal sunma | `src/data/stories.js` + `src/screens/ReaderScreen.js` |

---

## Kurulum ve çalıştırma

```bash
npm install
npm start          # Expo geliştirici aracı
npm run android    # Android emülatör/cihaz
npm run ios        # iOS simülatör (macOS)
npm run web        # Tarayıcı
npm run build:data # data-source/ → gömülü kelime havuzu üret
npm run gen:assets # ikon / splash / favicon görsellerini üret
```

**Kart etkileşimi:** Karta dokun → 3B çevirme animasyonuyla anlamı görünür.
Kartı **sağa kaydır = "biliyorum"**, **sola kaydır = "bilmiyorum"** olarak işaretler
ve sıradaki karta geçer (kaydırma + döndürme animasyonlu).

> Expo SDK 51 kullanır. Telefonda **Expo Go** ile QR okutarak da çalıştırabilirsin.

---

## Kelime havuzu ve 10.000'e ölçekleme

Bugünkü depo **~500+ gömülü kelime** ile gelir: `src/data/*` altındaki elle
yazılmış çekirdek (curated) set + `data-source/*.csv` kaynaklarından `build:data`
ile üretilen genişletilmiş set. Tümü işletme/ekonomi/iletişim odaklı; deyim/argo
ve örnek hikâyeler dahil. Her kayıtta Türkçe & İngilizce anlam, eş/zıt anlamlılar
ve örnek cümleler vardır; seviyeler A1–C2 aralığına yayılır.

**Neden tamamı elle yazılmadı?** 10.000 kelimenin tamamını *doğru* çeviri, eş/zıt
anlam ve örnek cümleyle elle üretmek tek seferde mümkün değildir; uydurma içerik bir
öğrenme uygulamasına zarar verir. Bunun yerine havuzu **güvenle ölçekleyen bir
içe-aktarma hattı** sağlanmıştır.

### Havuzu büyütmek

1. Sözlük/terim verini `data-source/` klasörüne **CSV** veya **JSON** olarak koy.
   Örnek: `data-source/words.sample.csv` (kolon başlıkları şablon niteliğindedir).
2. Üret:
   ```bash
   npm run build:data
   ```
3. Betik tüm kaynakları okur, şemaya çevirir, doğrular, curated kayıtlarla
   çakışanları eler ve sonucu `src/data/generated.js` içine **gömülü** olarak yazar.
   Uygulama bir sonraki açılışta yeni kelimeleri kullanır.

CSV kolonları:

```
headword,pos,level,domains,type,root,pronunciation,tr,en,exampleEn,exampleTr,synonyms,antonyms,collocations,related
```

- `domains`, `synonyms`, `antonyms`, `collocations`, `related`: `|` ile çoklu değer.
- Aynı `headword` birden çok satırda olursa anlamlar birleştirilir.
- `level` mutlaka `A1..C2` olmalı; eksik `tr`/`exampleEn` olan satır atlanır.

Böylece 10.000+ kelimeye, içeriğin kalitesini koruyarak ulaşırsın.

### CEFR Kelime Listesi katmanı (≈6.860 kelime, A1–B2)

Uygulamada ayrı bir **"Liste"** sekmesi, seviyeye göre gezilip işaretlenebilen
geniş bir referans havuzu sunar. Bu katmanın kaynağı açık lisanslı **CEFR-J
Wordlist**'tir:

- Kaynak: *The CEFR-J Wordlist Version 1.6*, Yukio Tono (TUFS). Araştırma ve
  ticari kullanıma **kaynak gösterme şartıyla** açıktır (bkz. `LICENSES.md` ve
  uygulama içi atıf).
- Yalnızca **kelime + tür + CEFR seviyesi** içerir; tanım/örnek/çeviri **içermez**
  ve bu kaynaktan alınmaz. Tam Türkçe anlamlı kayıtla eşleşen kelimeler, o kaydın
  detayına bağlanır.
- Üretim: ham CSV `data-source/licensed/` altındadır; gömülü liste şununla üretilir:
  ```bash
  npm run build:wordlist   # → src/data/wordlist.generated.js
  ```

> **Oxford 3000/5000 neden yok?** Oxford listeleri © Oxford University Press olup
> tescilli ve ticari kullanımı izne tabidir; **açık lisanslı değildir**, bu yüzden
> dahil edilmemiştir. CEFR seviyelendirmesi için CEFR-J yeterli kapsamı sağlar.

### Liste kelimelerini TAM karta dönüştürme (LLM zenginleştirme hattı)

CEFR-J listesi yalnızca kelime + seviye içerir. Bu kelimeleri Türkçe anlam, örnek
cümle ve eş/zıt anlamlılarla **tam flashcard'a** dönüştürmek için Claude (Anthropic
API) tabanlı toplu bir hat vardır. Doğruluk için iki koruma:

1. **Structured outputs** (`output_config.format`) → çıktı her zaman şemaya uyar.
2. **Doğrulama (verification) adımı** → her kayıt kontrol edilir (boş alan yok, örnek
   cümle kelimeyi içeriyor, model "düşük güven" demediyse). Geçmeyenler kabul
   edilmez; `scripts/.enrich-state/review-*.json` dosyasına ayrılır.

Maliyet için **Message Batches API** kullanılır (standart fiyatın %50'si). Varsayılan
model `claude-opus-4-8`; `--model claude-haiku-4-5` ile daha ucuza alınabilir.

```bash
# Gerekenler: ANTHROPIC_API_KEY + (yalnızca bu araç için) SDK
export ANTHROPIC_API_KEY=sk-ant-...
npm install --no-save @anthropic-ai/sdk

npm run enrich -- candidates --level A1            # kaç aday var?
npm run enrich -- run --level A1 --limit 100       # gönder + bekle + doğrula + yaz
npm run build:data                                 # kabul edilenleri uygulamaya göm
```

Kabul edilen kayıtlar `data-source/enriched/accepted-<batchId>.json`'a yazılır;
`build:data` bunları otomatik gömer. Ağ olmadan mantığı test etmek için:
`npm run enrich -- selftest`.

> **Dürüst not:** LLM çıktısı doğrulamadan geçse de %100 hatasız değildir.
> İnceleme (review) dosyasını gözden geçirmek ve örnek bir kabul partisini elle
> denetlemek önerilir — özellikle mağaza yayını öncesi.

---

## Proje yapısı

```
App.js                      # kök bileşen
app.json                    # Expo / mağaza yapılandırması (iOS + Android)
src/
  data/
    schema.js               # veri şeması + doğrulama
    words.business.js       # curated: işletme
    words.economics.js      # curated: ekonomi
    words.communication.js  # curated: iletişim
    words.general.js        # curated: genel/sosyal (A1-A2)
    idioms.js               # deyim / argo / günlük ifade (Özellik 7)
    stories.js              # bağlamsal okuma içeriği (Özellik 8)
    generated.js            # içe aktarılan/üretilen havuz (build:data yazar)
    wordlist.generated.js   # CEFR-J referans listesi (build:wordlist yazar)
    index.js                # birleştirme + sorgu API'si
  logic/
    srs.js                  # test önceliklendirme + Leitner (Özellik 4)
    graph.js                # ilişki ağı modeli (Özellik 6)
  state/
    ProgressContext.js      # kategoriler + istatistik (kalıcı, Özellik 3)
  components/common.js      # StatusPicker, rozetler
  screens/                  # Ana, Kartlar, Test, Ağ, Oku, Liste, Detay
  navigation/RootNavigator.js
scripts/build-dataset.js    # tam kayıt üretim hattı (CSV/JSON → generated.js)
scripts/build-wordlist.js   # CEFR-J → wordlist.generated.js
scripts/gen-assets.js       # ikon/splash/favicon üretimi
scripts/enrich.js           # Claude ile liste→tam kart zenginleştirme (Batches)
scripts/lib/enrich-core.js  # aday seçimi + şema + doğrulama (API'siz, test edilebilir)
data-source/                # CSV/JSON kaynakları (10k'ya ölçekleme)
data-source/licensed/       # açık lisanslı ham kaynaklar (CEFR-J)
data-source/enriched/       # LLM ile üretilen doğrulanmış tam kayıtlar (build:data gömer)
LICENSES.md                 # üçüncü taraf içerik atıfları
```

---

## Mağazaya yayın notları

- `app.json` içinde `ios.bundleIdentifier` ve `android.package` ayarlı.
- Yayın profilleri `eas.json` içinde tanımlı (development / preview / production):
  ```bash
  npm install -g eas-cli
  eas login
  eas build --platform all       # iOS + Android derleme
  eas submit -p ios              # App Store'a gönderim
  eas submit -p android          # Google Play'e gönderim
  ```
- İkon, adaptive-icon, splash ve favicon görselleri `assets/` altında hazırdır ve
  `npm run gen:assets` ile koddan yeniden üretilebilir. Mağaza vitrin görselleri
  (ekran görüntüleri vb.) yayından önce ayrıca eklenmelidir.
