# LOCALE INFINITE UNIVERSE — Master Roadmap

> *Every Ending Is Another Beginning.*

Locale Sports Bar (Long Beach, Kuzey Kıbrıs) için DJ arkasındaki yatay LED ekranda çalışan,
müziğe tepki veren, iç içe evrenler arasında kesintisiz yolculuk yapan gerçek zamanlı görsel motor.

- **Kod:** [`locale-infinite-universe/`](locale-infinite-universe/) — Three.js + WebGL + TypeScript + Vite
- **Mimari:** [`docs/ARCHITECTURE.md`](locale-infinite-universe/docs/ARCHITECTURE.md) · **Logo:** [`docs/LOGO_ANALYSIS.md`](locale-infinite-universe/docs/LOGO_ANALYSIS.md)
- **Geliştirme dalı:** `ccr-ff93c632-w655ei`
- Proje geçici olarak `whatsapp-python-chatbot` reposunda. Taşırken `locale-infinite-universe/`,
  bu dosya ve `.github/workflows/locale-universe.yml` birlikte taşınmalı.

## ⚡ Yön değişikliği (2026-10-19): Canlı sistem → 60 sn loop videolar

LED'i bilgisayar/telefondan canlı sürecek bir donanım düzeni yok. Bu yüzden ana çıktı artık
**her dünya için 60 saniyelik, kesintisiz dönen (seamless loop) video**. Videolar YouTube'a
yüklenip LED'e bağlı cihazdan oynatılacak (USB ile oynatma yedek yol olarak hazır tutulacak).

Canlı motor çöpe gitmiyor: aynı kod **video render motoru** olarak kullanılıyor. Canlı DJ
kontrolü, ses analizi ve uzaktan kontrol çalışmaları **askıya alındı**.

### Konsept: her son, aynı videonun başlangıcı

Her videoda kamera dünyanın portalına dalar (kabarcık, bullseye, gül pencere) ve portalın
içinden **aynı videonun ilk karesi** çıkar. Video bittiğinde aslında başa dönmüş olur; izleyici
kesmeyi göremez. Bu, *Every Ending Is Another Beginning* fikrinin birebir karşılığı.

```
0 s ─────────── seyir (≈52 sn) ─────────── portala dalış (≈8 sn) ─► 60 s = 0 s
                                             portalın içinde: videonun 0. saniyesi
```

Teknik olarak: aynı tohum (seed) ve varyantla kurulan iki dünya kopyası, sabit adımlı zamanla
(`simstep`) birebir aynı kareleri üretir. Video, ilk kopyanın geçiş süresi kadar ilerisinden
başlatılır; böylece 60. saniyedeki kare = 0. saniyedeki kare olur.

### Ölçülen render süreleri (GPU'suz bulut makine, 1920×1080, 30 fps, 1800 kare)

| Dünya | Kare başı | 60 sn video |
|---|---|---|
| Bubbleverse | ~4 sn | ~2 saat |
| Dart Singularity | ~5 sn | ~2.5 saat |
| Fractal Cathedral | ~8 sn | ~4 saat |

GitHub Actions iş limiti 6 saat → 1080p30 tek işte sığar. 4K / 60 fps için kareler parçalara
bölünüp paralel işlerde render edilir, sonra birleştirilir. GPU'lu bir bilgisayarda aynı iş dakikalar sürer.

### Video yol haritası

| Faz | Başlık | Durum |
|---|---|---|
| V0 | Teknik kararlar (çözünürlük, oynatıcı, fps, ritim) | ⏳ Senden bilgi bekliyor |
| V1 | Loop modu: deterministik zaman + kendine dönen portal | ⬜ |
| V2 | Offline renderer: kare yakalama → ffmpeg → MP4 | ⬜ |
| V3 | GitHub Actions render hattı (telefondan tetikle, linkten indir) | ⬜ |
| V4 | İlk 3 video: Bubbleverse, Dart Singularity, Fractal Cathedral | ⬜ |
| V5 | Offline kalite yükseltmesi (süper örnekleme, hareket bulanıklığı) | ⬜ |
| V6 | YouTube yayını ve LED'de oynatma testi | ⬜ |
| V7 | Kalan 9 dünyanın videoları | ⬜ |

#### V0 — Teknik kararlar ⏳
- [ ] **LED çözünürlüğü ve en-boy oranı** (ör. 3840×1080 = 32:9) ve LED'e görüntünün nasıl
      gittiği (HDMI ile hangi cihaz: Smart TV kutusu, Android box, PC, LED kontrolcünün kendi USB oynatıcısı?).
- [ ] Oynatma yolu: **YouTube** (internet + reklam riski) mi, **USB/yerel dosya** mı, ikisi birden mi?
- [ ] fps: **30** (önerilen, render süresi yarı) veya 60.
- [ ] Ritim: videoda **128 BPM** hafif nabız (60 sn = tam 32 ölçü, house setleriyle uyumlu) veya ritimsiz "sakin" sürüm.
- Varsayılan (cevap gelene kadar): 1920×1080, 30 fps, 128 BPM nabızlı + nabızsız iki sürüm.

#### V1 — Loop modu ⬜
- [ ] `?loop=60` modu: dünya 60 sn içinde seyir → portala dalış → kendisine geri dönüş yapar.
- [ ] Bütün rastgelelik tohumlu (seeded); `Math.random` kullanan yerler (dartboard dokusu dahil) temizlenir.
- [ ] Ses yerine sabit 128 BPM saat; nabız ölçü başına denk gelir, 60. saniyede faz sıfırlanır.
- [ ] Logo anı: 60 sn içinde en fazla 1 kez, sabit zamanda (ör. 40. saniye) — tekrar izlenince sürpriz kalır.
- [ ] **Otomatik loop testi:** 0. kare ile 1800. kare piksel farkı (PSNR) eşiğin üstünde olmalı;
      geçmezse test kırmızı.

#### V2 — Offline renderer ⬜
- [ ] `npm run render -- --world bubbleverse --size 1920x1080 --fps 30 --seconds 60`
- [ ] Playwright ile her kare deterministik çizilir, PNG olarak alınır, ffmpeg'e aktarılır.
- [ ] Çıktılar: YouTube için H.264 MP4 (yüksek bitrate), LED/USB için ayrıca yüksek kaliteli master,
      ayrıca kapak görseli (thumbnail).
- [ ] Kesintisiz uzun sürüm: 60 sn loop ×60 = **1 saatlik video** (yeniden kodlamadan, ffmpeg ile birleştirme).
      YouTube'un "döngü" özelliği her turda kısa bir duraklama yapabilir; uzun sürüm bunu önler.

#### V3 — GitHub Actions render hattı ⬜ (telefondan yönetim)
- [ ] Actions → **Render video** → dünya / çözünürlük / fps seç → "Run workflow" (GitHub mobil uygulamasından da).
- [ ] Her dünya ayrı paralel işte; 4K veya 60 fps'te kareler parçalara bölünür.
- [ ] Bitmiş videolar bir **GitHub Release**'e eklenir → telefondan tek tıkla indirme linki.
- [ ] Önizleme: tam render'dan önce 5 sn'lik düşük çözünürlüklü taslak (dakikalar içinde).

#### V4 — İlk 3 video ⬜
- [ ] Bubbleverse 60 sn (3 varyant: Lager, Burgundy Ale, Emerald Night)
- [ ] Dart Singularity 60 sn
- [ ] Fractal Cathedral 60 sn
- [ ] Bonus: **3 dünyalı yolculuk** (Bubbleverse → Dart → Cathedral → Bubbleverse), 3 dakikalık kesintisiz loop.
- [ ] Senin onayın: telefonda ve mümkünse LED'de izleyip değerlendirme.

#### V5 — Offline kalite yükseltmesi ⬜
Gerçek zaman sınırı kalktığı için kalite artırılabilir:
- [ ] 2× süper örnekleme (tırtıklı kenarlar ve katedraldeki basamaklanma kaybolur)
- [ ] Hareket bulanıklığı (kare başına birkaç alt-kare ortalaması)
- [ ] Katedralde daha fazla ışın adımı, yumuşak gölgeler
- [ ] Vektör/yüksek çözünürlüklü logo (logo analizindeki eksik)

#### V6 — YouTube ve LED oynatma ⬜
- [ ] Kanal ve **liste dışı (unlisted)** oynatma listesi.
- [ ] LED 1080p olsa bile **4K yükleme** önerilir: YouTube 4K videolara daha yüksek bit hızı verir, görüntü daha temiz olur.
- [ ] Reklam riski: YouTube para kazanmayan kanallarda da reklam gösterebilir → barın hesabında
      **YouTube Premium** veya yerel USB oynatma.
- [ ] LED en-boy oranı 16:9 değilse YouTube kenarlara siyah bant koyar → video LED kontrolcünün
      görüntü eşlemesine göre üretilmeli (V0'daki bilgiye bağlı).
- [ ] Videolarda müzik yok → telif (Content ID) sorunu yok.
- [ ] Gerçek LED'de test: parlaklık, renk, flaş güvenliği, döngü noktası.

#### V7 — Kalan 9 dünya ⬜
Eight Ball Universe · Impossible Locale · Eye of Infinity · Mirror Paradox · Stadium Beyond ·
Liquid Multiverse · Time Machine · Island Within · Locale Origin — her biri 60 sn loop video olarak.
Gerektiğinde hibrit üretim: fotogerçekçi sahneler için yapay zekâ video araçlarıyla üretilen
klipler bu motorun portal geçişleriyle birleştirilebilir.

### Askıya alınan işler
Canlı DJ paneli, gerçek zamanlı ses tepkisi, BPM tahmini, telefondan uzaktan kontrol, Web MIDI,
LED PC kiosk kurulumu. Kod repoda duruyor; ileride canlı sisteme dönülürse kaldığı yerden devam edilir.

---

# Önceki plan: canlı sistem (askıda)

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

### 2026-10-19 — Video yönüne geçiş
- Ana çıktı 60 sn seamless loop videolar oldu; video yol haritası (V0–V7) eklendi.
- Bulut makinede render süreleri ölçüldü (1080p30: dünya başına 2–4 saat).
- Canlı kontrol / ses tepkisi işleri askıya alındı.

### 2026-10-18 — Master Directive: Faz 1 + Faz 2 prototipi
- Yeni mimari: World modülleri, World Graph, JourneyDirector, portal compositor, DJ paneli,
  ses motoru (onset/BPM/FlashGuard), kalite/adaptive, context kurtarma, safe fallback, logger.
- Üç oynanabilir dünya + aralarında kesintisiz portal geçişleri; 9 dünya modül tanımı.
- Logo analizi ve marka tokenları; logo yalnız portal anlarında, orijinal renklerle.
- İlk demo (iç içe halkalar) **Safe Fallback** dünyasına dönüştürüldü.

### 2026-10-18 — İlk altyapı
- Vite + TypeScript + Three.js iskeleti, profil sistemi, basit sonsuz zoom demosu, GitHub Pages.
