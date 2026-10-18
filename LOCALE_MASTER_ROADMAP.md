# LOCALE INFINITE UNIVERSE — Master Roadmap

Locale Sports Bar'da DJ kabininin arkasındaki geniş yatay LED ekran için sonsuz zoom,
iç içe evrenler, hipnotik geçişler ve müziğe tepki veren gerçek zamanlı görseller.

- **Kod:** [`locale-infinite-universe/`](locale-infinite-universe/) (Three.js + WebGL + TypeScript + Vite)
- **Geliştirme dalı:** `ccr-ff93c632-w655ei`
- **Not:** Proje geçici olarak `whatsapp-python-chatbot` reposunda duruyor. Ayrı repoya
  taşırken `locale-infinite-universe/`, bu dosya ve `.github/workflows/locale-universe.yml`
  birlikte taşınmalı (workflow'daki `working-directory` yolu güncellenmeli).

## Durum özeti

| Aşama | Başlık | Durum |
|---|---|---|
| 0 | Repo inceleme ve proje iskeleti | ✅ Tamamlandı |
| 1 | Altyapı + basit sonsuz zoom demosu | ✅ Tamamlandı |
| 2 | Ses analizi ve müzik tepkisi (gerçek DJ girişi) | 🟡 Temel hazır |
| 3 | Sahne sistemi ve hipnotik geçişler | ⬜ Planlandı |
| 4 | Evren kütüphanesi (yeni sahneler) | ⬜ Planlandı |
| 5 | LED ekran entegrasyonu ve performans | 🟡 Temel hazır |
| 6 | Canlı kontrol (telefon / MIDI ile VJ paneli) | ⬜ Planlandı |
| 7 | Gece boyu çalışma (show mode, kararlılık) | ⬜ Planlandı |

Durum: ✅ tamamlandı · 🟡 kısmen · ⬜ başlanmadı

---

## Aşama 0 — Repo inceleme ve iskelet ✅
- [x] Mevcut repo incelendi: Python/Flask WhatsApp botu. Mevcut koda dokunulmadı.
- [x] Yeni proje `locale-infinite-universe/` alt klasöründe izole kuruldu.
- [x] Node 22 + Vite 7 + TypeScript 5.9 (strict) + Three.js 0.186.

## Aşama 1 — Altyapı ve sonsuz zoom demosu ✅
- [x] `Engine`: WebGL renderer, yeniden boyutlandırma, delta süresi sınırlandırılmış
      animasyon döngüsü, sekme gizlenince duraklama, FPS ölçümü.
- [x] `DisplayProfile`: `mobile` / `desktop` / `led` profilleri (pixel ratio, render
      ölçeği, antialias, HUD). URL parametreleriyle zorlanabilir.
- [x] LED için sabit çözünürlük: `?profile=led&w=3840&h=1080`.
- [x] `SceneManager` + `VisualScene` arayüzü (her sahne kendi Three.js sahnesini taşır).
- [x] `InfiniteZoomScene`: tam ekran shader, 7 katman iç içe halka-evren, kesintisiz döngü
      (katmanlar küçükken belirir, ekranı aşınca söner), kaleydoskop simetri, yıldızlar,
      merkez portal parıltısı, LED'de patlamayı önleyen yumuşak tone-map.
- [x] `AudioInput`: `demo` (124 BPM sentetik vuruş), `mic` (canlı), `off`.
- [x] Dokunmatik HUD: tam ekran, mikrofon, hız ±, ses kapat/demo; klavye kısayolları.
- [x] GitHub Actions: her push'ta build + GitHub Pages'e otomatik yayın.
- [x] Mobil (390×844) ve LED (1920×540, 32:9) ekran görüntüleriyle doğrulandı.

## Aşama 2 — Ses analizi ve müzik tepkisi 🟡
- [x] Bas / orta / tiz bantları ve basit enerji tabanlı beat algılama.
- [ ] DJ mikserinden line-in / USB ses kartı seçimi (cihaz listesi).
- [ ] BPM tahmini ve faz kilidi (zoom hızını tempoya senkronlama).
- [ ] Drop / break algılama (enerji eğrisi) → sahne olaylarını tetikleme.
- [ ] Otomatik kazanç (sessiz/yüksek ortamlar için normalizasyon).

## Aşama 3 — Sahne sistemi ve hipnotik geçişler ⬜
- [ ] İki sahneyi render target'a çizip shader ile karıştırma (crossfade).
- [ ] Geçiş efektleri: zoom-through portal, spiral wipe, kaleydoskop çözülme, beat-cut.
- [ ] Sahne çalma listesi / otomatik rotasyon (ör. her 32 vuruşta geçiş).

## Aşama 4 — Evren kütüphanesi ⬜
- [ ] Mandelbrot / Julia derin zoom (çift hassasiyet hilesiyle).
- [ ] Tünel / solucan deliği.
- [ ] Parçacık galaksileri (GPU instancing).
- [ ] Raymarching fraktal (Mandelbox / Menger).
- [ ] Locale logosu / marka evreni (logo içinden sonsuz zoom).
- [ ] Spor temalı evren (saha çizgileri, top, skor anları için özel efekt).

## Aşama 5 — LED ekran entegrasyonu ve performans 🟡
- [x] Sabit native çözünürlük ve LED profili.
- [ ] LED panelin gerçek çözünürlüğü ve en-boy oranının netleştirilmesi.
- [ ] Adaptif kalite (FPS düşünce render ölçeğini otomatik düşür).
- [ ] Parlaklık / gamma / renk limiti ayarları (LED'de beyaz patlamasını önlemek için).
- [ ] Kiosk modu: tarayıcıyı tam ekran otomatik açma (Chrome `--kiosk`), uyku engelleme.

## Aşama 6 — Canlı kontrol ⬜
- [ ] Telefondan uzaktan kontrol paneli (WebSocket / WebRTC ile LED PC'ye bağlanma).
- [ ] Web MIDI desteği (DJ kontrolcüsünden knob → parametre).
- [ ] Preset kaydetme / geri çağırma.

## Aşama 7 — Gece boyu çalışma ⬜
- [ ] Saatlerce çalışmada bellek / GPU kaynak sızıntısı testleri.
- [ ] Hata durumunda otomatik yeniden başlatma, WebGL context-lost kurtarma.
- [ ] Offline çalışma (PWA / yerel kurulum).

---

## Değişiklik günlüğü

### 2026-10-18 — Aşama 0 + 1
- Proje iskeleti, motor, profiller, sahne yöneticisi, ses girişi, HUD.
- İlk sahne: `InfiniteZoomScene` (iç içe halka evrenler, sonsuz zoom).
- GitHub Actions ile build + GitHub Pages yayını.
