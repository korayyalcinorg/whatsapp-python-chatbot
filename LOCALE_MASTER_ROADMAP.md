# LOCALE INFINITE UNIVERSE — Master Roadmap

> *Every Ending Is Another Beginning.*

Locale Sports Bar (Long Beach, Kuzey Kıbrıs) için DJ arkasındaki yatay LED ekranda çalışan,
müziğe tepki veren, iç içe evrenler arasında kesintisiz yolculuk yapan gerçek zamanlı görsel motor.

- **Kod:** [`locale-infinite-universe/`](locale-infinite-universe/) — Three.js + WebGL + TypeScript + Vite
- **Mimari:** [`docs/ARCHITECTURE.md`](locale-infinite-universe/docs/ARCHITECTURE.md) · **Logo:** [`docs/LOGO_ANALYSIS.md`](locale-infinite-universe/docs/LOGO_ANALYSIS.md)
- **Geliştirme dalı:** `ccr-ff93c632-w655ei`
- Proje geçici olarak `whatsapp-python-chatbot` reposunda. Taşırken `locale-infinite-universe/`,
  bu dosya ve `.github/workflows/locale-universe.yml` birlikte taşınmalı.

## Durum özeti

| Faz | Başlık | Durum |
|---|---|---|
| 1 | Foundation | ✅ Tamamlandı (gerçek LED donanımında test edilmedi) |
| 2 | Recursive Prototype (3 dünya) | 🟡 Çalışan prototip — **senin gerçek ekranda onayın bekleniyor** |
| 3 | World Graph | 🟡 Veri modeli + seçim motoru hazır; varyasyon motoru temel |
| 4 | Full World Library | ⬜ 9 dünyanın yalnız modül tanımı var |
| 5 | Audio & DJ Control | 🟡 Kod hazır; gerçek DJ mikseri / müzikle test edilmedi |
| 6 | LED Optimization | ⬜ Gerçek ekran ve bilgisayar bekleniyor |

✅ tamamlandı ve test edildi · 🟡 kısmen / test bekliyor · ⬜ başlanmadı

---

## Faz 1 — Foundation ✅

- [x] Repo incelendi (Python WhatsApp botu; dokunulmadı). Proje alt klasörde izole.
- [x] **Logo analizi** → `docs/LOGO_ANALYSIS.md`: boyut, yapı, ölçülen marka renkleri,
      beyaz arka planın orijinal piksellere dokunmadan kaldırılması (`locale-logo-alpha.png`).
- [x] Marka renk tokenları (`src/brand/brand.ts`): logo değerleri + LED için parlak versiyonları.
- [x] **Ekran çıkışı:** `Engine` — sabit LED çözünürlüğü (`?w=&h=` veya panelden, saklanır),
      mobile/desktop/led profilleri, sekme gizlenince duraklama.
- [x] **Render pipeline:** dünya RT'leri → portal compositor → bloom → renk teması/blackout →
      ACES tone map → logo katmanı (tone map sonrası, renkler bozulmadan).
- [x] **Kontrol paneli:** gömülü (telefon/laptop) + ayrı `control.html` (2. ekran, BroadcastChannel).
- [x] **Sahne yönetimi:** `JourneyDirector` (dünya yaşam döngüsü, önceden kurma, geçiş, dispose).
- [x] Uzun çalışma altyapısı: `AssetCache`, kaynak `dispose`, **WebGL context kurtarma**,
      kalite ön ayarları, **adaptive quality**, **SafeFallback** dünyası, `Logger` (localStorage).
- [x] Birim testleri (Vitest, 17 test) + GitHub Actions'ta test + build + Pages.

## Faz 2 — Recursive Prototype 🟡

Döngü: **Bubbleverse → Dart Singularity → Fractal Cathedral → Bubbleverse** (her yön bağlı).

- [x] **Bubbleverse** — bira bardağının içi: amber derinlik, köpükten inen ışık huzmeleri,
      kostik, instanced CO₂ kabarcıkları (mercek/fresnel shader). Portal: büyük "hero" kabarcık.
      Varyantlar: Locale Lager, Burgundy Ale, Emerald Night.
- [x] **Dart Singularity** — neon halka tünelinin sonunda dönen, regülasyon ölçülerinde dart
      tahtası (Locale yeşil/bordo yatakları, tel örümcek, sayılar, sisal doku), metal oklar
      vuruşta tahtaya saplanır, spot ışık + gölgeler. Portal: bullseye (olay ufku girdabı).
- [x] **Fractal Cathedral** — raymarched sonsuz gotik nef: sivri tonoz, demet sütunlar,
      kaburgalar, iç içe kemerli kör arkadlar (fraktal), Locale renklerinde vitraylar, hacimsel
      ışık, cilalı mermer zemin. Portal: hep aynı mesafede kalan yüzen gül pencere.
- [x] **Portal geçişi:** sıradaki dünya 3 sn önceden kurulup shader'ları derlenir; kamera portala
      dalar; sıradaki dünyanın tam karesi portalın içinde küçültülmüş görünür ve portal ekranı
      kapladığı anda tam boyuta ulaşır → görünür kesme yok. Geçiş vuruşa hizalanır.
- [x] Headless Chromium'da (yazılım GPU) her dünya, üç geçiş, logo anı ekran görüntüsüyle doğrulandı.
- [ ] **Gerçek GPU'da akıcılık ve "etkileyicilik" değerlendirmesi** — senin onayın gerekiyor.
- [ ] Bubbleverse hero kabarcığı daha belirgin olmalı (şu an diğer kabarcıklardan az ayrışıyor).
- [ ] Katedralde düşük kalitede raymarch basamaklanması (aliasing) görülüyor.

## Faz 3 — World Graph 🟡

- [x] Veri modeli: World ID, assets, camera path, entry portal, exit portals, compatible next
      worlds (`leadsTo`), transition rules, visual variants, performance profile, brand rules.
- [x] 12 dünyanın her biri ayrı modül (`src/worlds/<id>/index.ts`), bağlantıları tanımlı.
- [x] Seçim motoru: geçmişi hatırlar, tekrarı cezalandırır, enerjiye uygun dünyayı tercih eder,
      planlanmış/çökmüş dünyaları atlar; DJ "Manual World" ve "Next Portal" ile müdahale.
- [x] Varyant: aynı dünya art arda aynı varyantla gelmez.
- [ ] Varyasyon motoru: varyant seçiminde enerji/tema etkisi, dünya içi parametre rastgeleliği.
- [ ] Çoklu çıkış portalı olan dünyalar (bir dünyada farklı nesnelerden farklı dünyalara).

## Faz 4 — Full World Library ⬜

- [ ] Eight Ball Universe · Impossible Locale · Eye of Infinity · Mirror Paradox ·
      Stadium Beyond · Liquid Multiverse · Time Machine · Island Within · Locale Origin
- [ ] Geçiş tiplerinin kendi görünümleri: mirror-passage, impossible-architecture, infinite-zoom-out
- [ ] Hibrit render: önceden hazırlanmış video/görsel katmanları (`assets` alanı hazır)
- [ ] Yüksek çözünürlüklü / vektör logo (bkz. logo analizi)

## Faz 5 — Audio & DJ Control 🟡

- [x] Web Audio: bas / mid / tiz, spectral-flux **onset**, genel enerji, hassasiyet ayarı.
- [x] Ses kartı / mikrofon seçimi (panelde cihaz listesi).
- [x] **BPM tahmini** (otokorelasyon) + güven skoru; güven düşükse **manuel BPM**; **Tap** ve **Lock**.
      Sentetik ritimlerle test edildi (100–174 BPM, ±%3).
- [x] Ses yokken **otomatik görsel mod** (manuel BPM'e kilitli yumuşak ritim).
- [x] **FlashGuard:** saniyede en fazla 3 parlaklık darbesi, genlik sınırlı; blackout yumuşak.
- [x] Panel: Auto Journey, Manual World, Next Portal, Energy (auto/manual), Visual Speed,
      Color Theme (4), Logo Frequency, Audio Sensitivity, Transition Intensity, Blackout,
      LED Fullscreen Output, Performance Monitoring (FPS, ms, çözünürlük, draw call, bellek, log).
- [ ] **Gerçek DJ mikseri ve kulüp müziğiyle test** (BPM tahmini gerçek müzikte doğrulanmadı).
- [ ] Telefondan uzaktan kontrol (farklı cihaz → WebSocket sunucusu gerekir).
- [ ] Web MIDI (DJ kontrolcüsü), preset kaydet/çağır, drop/break algılama.

## Faz 6 — LED Optimization ⬜

- [ ] LED'in gerçek çözünürlüğü, en-boy oranı, piksel aralığı ve kontrolcü girişi.
- [ ] LED bilgisayarının GPU'sunda FPS ölçümü; kalite ön ayarlarının buna göre kalibrasyonu.
- [ ] Saatlerce çalışma testi (bellek / GPU sızıntısı), kiosk kurulumu.
- [ ] LED parlaklık / gamma ayarı.

---

## Test edilmemiş olanlar (açıkça)

- Gerçek bir GPU'da FPS (testler yazılım GPU'sunda yapıldı, FPS ölçümü anlamsız).
- Gerçek ses girişi ve gerçek müzikle BPM / onset doğruluğu.
- `control.html` → ikinci ekranda açma (Window Management API izni) gerçek çift ekranda.
- iOS Safari (tam ekran API'si yok; "Ana Ekrana Ekle" gerekebilir).

## Değişiklik günlüğü

### 2026-10-18 — Master Directive: Faz 1 + Faz 2 prototipi
- Yeni mimari: World modülleri, World Graph, JourneyDirector, portal compositor, DJ paneli,
  ses motoru (onset/BPM/FlashGuard), kalite/adaptive, context kurtarma, safe fallback, logger.
- Üç oynanabilir dünya + aralarında kesintisiz portal geçişleri; 9 dünya modül tanımı.
- Logo analizi ve marka tokenları; logo yalnız portal anlarında, orijinal renklerle.
- İlk demo (iç içe halkalar) **Safe Fallback** dünyasına dönüştürüldü.

### 2026-10-18 — İlk altyapı
- Vite + TypeScript + Three.js iskeleti, profil sistemi, basit sonsuz zoom demosu, GitHub Pages.
