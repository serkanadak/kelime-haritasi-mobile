# Kelime Haritası - App Store & Google Play Mağaza Hazırlık Rehberi

## 📱 Mağaza Bilgileri
- **Uygulama Adı:** Kelime Haritası
- **Bundle ID (iOS):** `com.serkanadak.kelimeharitasi`
- **Package Name (Android):** `com.serkanadak.kelimeharitasi`
- **Geliştirici:** Serkan Adak
- **Hedef Platformlar:** iOS (App Store), Android (Google Play Store)

## 🚀 Hızlı Başlatma (Terminal Komutları)
```bash
# Bağımlılıkları yükleyin
npm install

# Test / Geliştirme ortamında çalıştırın
npx expo start

# Android için APK / AAB Çıktısı (EAS Build)
npx eas build --platform android --profile production

# iOS için IPA Çıktısı
npx eas build --platform ios --profile production
```

## 🛠️ Fastlane Dağıtım
- TestFlighta yüklemek için: `fastlane ios beta`
- Google Play Internal teste yüklemek için: `fastlane android internal`

## 🔐 Android Keystore
`./scripts/generate_keystore.sh` komutuyla otomatik üretim yapabilirsiniz.
