# Native App Derleme Rehberi (App Store & Google Play)

Bu proje tek bir Expo (React Native) kaynak kodudur. **Web sürümü ile mağaza
uygulaması AYNI koddan** üretilir — dolayısıyla uygulamada gördüğün her özellik
(13.744 kelime kartı, çok-anlamlı kartlar, İng↔Tür yön seçimi, aktif/pasif
önceliklendirme, hatırlatma susturma tiki, ilişki ağı, Oku, Liste, manuel
düzenleme…) native derlemede otomatik olarak yer alır. Ek bir "uygulama" işlemi
gerekmez; sadece aşağıdaki adımlarla derleyip mağazaya gönderirsin.

## Önkoşullar (bir bilgisayarda, bir kez)
1. **Node.js** (LTS) kur: https://nodejs.org
2. Ücretsiz bir **Expo hesabı** aç: https://expo.dev/signup
3. Terminalde araçları kur:
   ```
   npm install -g eas-cli
   npm install
   eas login
   ```

## Uygulamayı mağazalar için derle
> Derleme Expo'nun bulut sunucularında yapılır — kendi Mac/Windows'unda Xcode
> veya Android Studio kurman **gerekmez**.

- **Android (Google Play için .aab):**
  ```
  eas build --platform android --profile production
  ```
- **iOS (App Store için):**
  ```
  eas build --platform ios --profile production
  ```
  (iOS için bir **Apple Developer** hesabı gerekir — yıllık 99 USD. EAS,
  sertifika/provisioning işlerini senin için otomatik yapar.)

- **Hızlı deneme (kurulabilir APK, mağazasız):**
  ```
  eas build --platform android --profile preview
  ```
  Çıkan APK linkini telefonuna indirip doğrudan kurabilirsin.

## Mağazaya gönderme
```
eas submit --platform android   # Google Play
eas submit --platform ios       # App Store
```

## Sürüm yükseltme (her güncellemede)
`app.json` içinde:
- `expo.version` (ör. "1.0.1") — her iki mağaza için görünen sürüm.
- `ios.buildNumber` ve `android.versionCode` — her yeni derlemede artır.
  (production profili `autoIncrement: true` ile versionCode'u otomatik artırır.)

## Notlar
- **Veri güncelleme:** Yeni kelime/kart eklersen `npm run build:data` çalıştır,
  sonra yeniden derle. Tüm veri uygulamaya gömülüdür; internet gerekmez.
- **İlerleme saklama:** Kullanıcı işaretlemeleri cihazda (AsyncStorage) tutulur;
  native ve web'de sorunsuz çalışır, kullanıcılar birbirini etkilemez.
- **`experiments.baseUrl: "/Vocabulary"`** yalnızca GitHub Pages web sürümü
  içindir; native derlemeyi etkilemez, kaldırmana gerek yok.
- **OTA güncelleme (opsiyonel):** İleride sadece JS değişikliklerini mağaza
  onayı beklemeden yollamak için `eas update` kullanılabilir.
