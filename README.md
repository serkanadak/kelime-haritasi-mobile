# Kelime Haritası 📇🕸️

> İşletme, ekonomi ve iletişim odaklı, CEFR A1–C2 seviyelerinde İngilizce kelime öğrenme (flashcard) mobil uygulaması. Anlamlar hem Türkçe hem İngilizce verilir; deyim, argo ve yaygın iş ifadelerini kapsar.

Bu depo, bağımsızlaştırılmış ve Apple App Store ile Google Play Store yayın standartlarına göre yapılandırılmış modern **React Native / Expo** mobil projesidir.

---

## 📱 Proje ve Mağaza Kimlikleri

| Alan | Değer |
| :--- | :--- |
| **Uygulama Adı** | Kelime |
| **Paket / Bundle ID** | `com.serkanadak.kelimeharitasi` |
| **Kategori** | Eğitim / Dil Öğrenimi |
| **Hedef Platformlar** | iOS (App Store), Android (Google Play Store) |
| **Mimari** | React Native / Expo Native Runtime (Target SDK 34+ / iOS 15+) |
| **Gizlilik / KVKK** | Cihaz İçi Güvenli Depolama (AsyncStorage), Harici Sunucusuz |

---

## ✨ Öne Çıkan Özellikler

- ✅ **CEFR Seviyeli Flashcard Sistemi (A1-C2)**
- ✅ **Türkçe & İngilizce Çift Dilli Anlamlar ve Örnek Cümleler**
- ✅ **Deyim, Argo ve İş İngilizcesi Özel Koleksiyonları**
- ✅ **Öğrenme İlerleme Takibi & Akıllı Tekrar Algoritması**
- ✅ **Çevrimdışı Çalışma (Yerel AsyncStorage Hafızası)**

---

## 🚀 Hızlı Başlangıç (Geliştirme & Test)

### 1. Ön Koşullar
- Bilgisayarınızda **Node.js (v18+)** ve **Git** kurulu olmalıdır.
- Mobil cihazınızda test etmek için **Expo Go** (App Store / Google Play üzerinden ücretsiz) uygulamasını indirin.

### 2. Kurulum ve Çalıştırma
```bash
# 1. Depoyu klonlayın
git clone https://github.com/serkanadak/kelime-haritasi-mobile.git
cd kelime-haritasi-mobile

# 2. Bağımlılıkları yükleyin
npm install

# 3. Expo geliştirici sunucusunu başlatın
npx expo start
```

Terminalde beliren **QR Kodu**:
- **iPhone** için doğrudan Kamera uygulamasıyla okutun.
- **Android** için **Expo Go** uygulamasını açıp "Scan QR code" ile okutun.

---

## 🏗️ Native Derleme ve Dağıtım (Store Releases)

### A. EAS Build ile Bulutta APK / AAB / IPA Üretimi
Uygulama doğrudan `eas.json` yapılandırmasına sahiptir:

```bash
# EAS CLI kurulumu ve oturum açma
npm install -g eas-cli
eas login

# Android Play Store için Production AAB Derleme:
npx eas build --platform android --profile production

# iOS App Store için Production IPA Derleme:
npx eas build --platform ios --profile production
```

### B. Yerel Native Projeleri Üretme (Prebuild)
Dilerseniz React Native Xcode ve Android Studio projelerini yerel olarak dışa aktarabilirsiniz:

```bash
# Native android/ ve ios/ klasörlerini üretir:
npx expo prebuild

# Android Studio veya Xcode ile yerel çalıştırma:
npx expo run:android
npx expo run:ios
```

---

## 🛠️ Mağaza Otomasyonu (Fastlane & Keystore)

- **iOS TestFlight Yayını:**
  ```bash
  fastlane ios beta
  ```
- **Google Play Internal Test Yayını:**
  ```bash
  fastlane android internal
  ```
- **Android İmzalaması İçin Keystore Üretimi:**
  ```bash
  ./scripts/generate_keystore.sh
  ```

---

## 🔒 Gizlilik, KVKK ve Apple Standartları

- **`PrivacyInfo.xcprivacy`**: Apple App Store zorunlu gizlilik manifestosu proje kök dizinindedir.
- **`PRIVACY_POLICY.md`**: GDPR ve KVKK uyumlu gizlilik metni ve veri silme hakları (Apple Guideline 5.1.1v) mevcuttur.

---

## 📄 Lisans ve İletişim

- **Geliştirici:** Serkan Adak
- **İletişim:** sa.sosyal02@gmail.com
