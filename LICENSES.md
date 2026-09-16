# Üçüncü Taraf İçerik ve Lisanslar

Bu uygulama, kendi özgün içeriğinin yanında aşağıdaki açık lisanslı veri
kaynağını kullanır. Lisans gereği kaynak gösterimi burada ve uygulama içinde
("CEFR Kelime Listesi" ekranının altında) yapılır.

## CEFR-J Wordlist (CEFR Kelime Listesi katmanı)

- **Kaynak:** The CEFR-J Wordlist Version 1.6
- **Derleyen:** Yukio Tono, Tokyo University of Foreign Studies (TUFS), Tono Laboratory
- **Adres:** https://www.cefr-j.org/download_eng
- **Kullanım koşulu:** Araştırma ve ticari kullanıma, **kaynak gösterilmesi şartıyla**
  ücretsiz olarak açıktır. Telif hakkı Tono Laboratory (TUFS) üzerindedir.
- **Bu uygulamadaki kullanım:** Yalnızca kelime + sözcük türü + CEFR seviyesi
  (A1–B2) bilgisi, bir referans/çalışma listesi olarak gömülüdür
  (`src/data/wordlist.generated.js`). Tanım, örnek cümle veya çeviriler bu
  kaynaktan ALINMAMIŞTIR; bunlar uygulamanın kendi özgün içeriğidir.

Önerilen atıf:
> The CEFR-J Wordlist Version 1.6. Compiled by Yukio Tono, Tokyo University of
> Foreign Studies.

## Dahil EDİLMEYEN kaynaklar (lisans nedeniyle)

- **Oxford 3000™ / Oxford 5000™:** © Oxford University Press. Tescilli marka ve
  telifli içeriktir; ticari kullanımı izne tabidir. Açık lisanslı olmadığı için
  bu uygulamaya **dahil edilmemiştir**. (CEFR seviyelendirmesi için CEFR-J yeterli
  kapsamı sağlar.)

## Uygulamanın özgün içeriği

`src/data/words.*.js`, `src/data/idioms.js`, `src/data/stories.js` ve
`data-source/*.csv` dosyalarındaki Türkçe/İngilizce anlamlar, örnek cümleler,
eş/zıt anlamlılar bu proje için özgün olarak hazırlanmıştır.

`data-source/enriched/*.json` kayıtları, CEFR-J başlık listesinden seçilen
kelimeler için Claude (Anthropic API) ile üretilip doğrulama adımından geçirilerek
oluşturulur (bkz. `scripts/enrich.js`). Başlık seçimi CEFR-J'e dayanır (yukarıda
atıf yapıldı); anlam/örnek metinleri model tarafından üretilmiştir.
