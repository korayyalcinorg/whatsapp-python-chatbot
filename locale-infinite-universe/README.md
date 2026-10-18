# Locale Infinite Universe

Locale Sports Bar (Long Beach, Kuzey Kıbrıs) DJ arkasındaki yatay LED ekran için gerçek zamanlı,
müziğe tepki veren, iç içe evrenler arasında kesintisiz yolculuk yapan görsel motor.

> *Every ending is another beginning.*

- Plan ve ilerleme: [`../LOCALE_MASTER_ROADMAP.md`](../LOCALE_MASTER_ROADMAP.md)
- Mimari ve World Graph: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Logo analizi: [`docs/LOGO_ANALYSIS.md`](docs/LOGO_ANALYSIS.md)

## Çalıştırma

```bash
cd locale-infinite-universe
npm install
npm run dev        # http://localhost:5173  (LED çıkışı)   ·  /control.html (DJ paneli)
npm test           # birim testleri (World Graph, BPM, flash guard, adaptive quality)
npm run build      # dist/ üretim çıktısı
```

Aynı Wi‑Fi'deki telefondan: `npm run dev` çıktısındaki **Network** adresini aç.

## Sayfalar

| Sayfa | Ne için |
|---|---|
| `index.html` | Görsel çıkış. Telefonda/laptopta ekrana dokununca DJ paneli açılır. |
| `index.html?profile=led&w=3840&h=1080` | LED duvar: sabit çözünürlük, panel kapalı, ilk tıklamada tam ekran. |
| `control.html` | Ayrı ekranda DJ paneli. **LED Fullscreen Output** çıkışı diğer ekranda açar. Aynı bilgisayar + aynı tarayıcı gerekir (BroadcastChannel). |

## URL parametreleri

| Parametre | Örnek | Açıklama |
|---|---|---|
| `profile` | `mobile` · `desktop` · `led` | Cihaz profili (verilmezse otomatik) |
| `w`, `h` | `w=3840&h=1080` | LED kontrolcünün giriş çözünürlüğü (panelden de ayarlanır, saklanır) |
| `quality` | `low` · `medium` · `high` · `ultra` | Kalite ön ayarı |
| `panel` | `1` | Gömülü paneli açık başlat |
| `world` | `fractal-cathedral` | Başlangıç dünyası |
| `variant` | `0`…`2` | Dünya varyantını sabitle (test) |
| `logo` | `0`…`1` | Logo sıklığı |
| `hold`, `to` | `hold=0.4&to=dart-singularity` | Geçişi bu ilerlemede dondur (ekran görüntüsü / test) |
| `simstep` | `0.1` | Kare başına sabit simülasyon süresi (headless test) |

## Klavye (çıkış sayfası)

`P` panel · `F` tam ekran · `N` / boşluk: Next Portal · `B` blackout · `T` tap tempo

## Dünyalar

| # | Dünya | Durum |
|---|---|---|
| 1 | Bubbleverse | ✅ prototip |
| 2 | Dart Singularity | ✅ prototip |
| 9 | Fractal Cathedral | ✅ prototip |
| 3–8, 10–12 | Eight Ball Universe, Impossible Locale, Eye of Infinity, Mirror Paradox, Stadium Beyond, Liquid Multiverse, Time Machine, Island Within, Locale Origin | ⬜ modül tanımı hazır, render yok |

Yeni dünya eklemek: `src/worlds/<id>/index.ts` içindeki `WorldDefinition`'a `create` ekle ve
`status: 'prototype'` yap. Director onu World Graph üzerinden otomatik kullanmaya başlar.

## LED bilgisayarı için öneri

Chrome'u kiosk modunda, ses için kullanıcı hareketi istemeden açın:

```
chrome --kiosk --autoplay-policy=no-user-gesture-required "https://…/?profile=led&w=3840&h=1080"
```
