# Mimari

```
                 ┌───────────────────────── control.html (2. ekran / laptop) ─┐
                 │ ControlPanel ── ControlBus (BroadcastChannel) ──────────┐  │
                 └─────────────────────────────────────────────────────────┼──┘
index.html (LED çıkışı)                                                     │
┌───────────────────────────────────────────────────────────────────────────▼──┐
│ OutputApp  (kontrol durumunun sahibi; komutları uygular, 4 Hz durum yayınlar) │
│   ├─ Engine ─────── WebGLRenderer, çıkış çözünürlüğü, döngü, context kurtarma │
│   ├─ AudioEngine ── Web Audio: bas/mid/tiz, onset, BPM, FlashGuard           │
│   ├─ JourneyDirector ── WorldGraph ile sıradaki dünyayı seçer, önceden kurar,│
│   │                     portal geçişini sürer, çökmede SafeFallback'e geçer  │
│   ├─ Pipeline ───── dünya RT'leri → portal composite → bloom → grade → çıktı  │
│   ├─ AdaptiveQuality / AssetCache / Logger                                    │
│   └─ ControlPanel (gömülü, telefonda ekrana dokununca açılır)                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Dünya modülü (`src/worlds/<id>/index.ts`)

Her dünya bir `WorldDefinition` dışa aktarır:

| Alan | Anlamı |
|---|---|
| `id`, `title`, `status` | `prototype` (çalışır) · `planned` (yalnız tanım) · `fallback` |
| `assets` | Kullandığı varlıklar (prosedürel olanlar dahil) |
| `cameraPath` | Kamera hareketinin tanımı ve tipik seyir süresi |
| `entryPortal` | Bu dünyaya hangi nesneden / hangi geçişle girilir |
| `exitPortals[]` | Çıkış kapıları: nesne, geçiş tipi, `leadsTo` (uyumlu sonraki dünyalar, tercih sırasıyla) |
| `rules` | `minDwell`/`maxDwell` (enerjiyle kısalır), `energyRange`, `transitionSeconds` |
| `variants` | Görsel varyantlar; aynı dünya art arda aynı varyantla gelmez |
| `performance` | `cost` 1–5 ve dünyaya özel `renderScale` |
| `brand` | Logonun bu dünyada nasıl görünebileceği ve ziyaret başına sınır |
| `create(ctx)` | Yalnız oynatılabilir dünyalarda; `WorldInstance` döndürür |

`WorldInstance`: `scene`, `camera`, `resize`, `update(frame)`, `exitPortal()` (portalın
ekrandaki merkezi + yarıçapı), `dispose`. `frame.exitProgress` 0→1 iken dünya kamerasını
portala daldırır; compositor aynı anda sıradaki dünyayı portalın içine çizer.

## World Graph ve seçim

`WorldGraph` kenarları dünyaların `exitPortals[].leadsTo` listesinden kurar. Sıradaki dünya
ağırlıklı rastgele seçilir; puan = **tercih** × **yakın geçmiş cezası** × **enerji uyumu**:

- Tercih: `leadsTo` içindeki sıra (öndeki biraz daha olası).
- Yakın geçmiş: 1 adım önce ziyaret ×0.08, 2 adım ×0.35, 3 adım ×0.65, 4 adım ×0.85.
- Enerji uyumu: müzik enerjisi dünyanın `energyRange` dışındaysa uzaklıkla azalır (min 0.2).
- Planlanmış (henüz kodu olmayan) dünyalar ve çöktüğü görülen dünyalar seçilmez.
- DJ "Manual World" ile hedef verirse seçim atlanır; "Next Portal" beklemeyi keser.

## Portal geçişi (kesintisiz zoom)

1. Bekleme süresinin bitmesine 3 sn kala sıradaki dünya kurulur ve shader'ları derlenir
   (`renderer.compile`) — portal açılırken takılma olmaz.
2. Süre dolunca geçiş vuruşa hizalanır (en fazla 1.5 sn bekler).
3. Mevcut dünya kamerasını portal nesnesine daldırır (`exitProgress`).
4. Compositor portal dairesini kırpar; içinde sıradaki dünyanın **tüm karesi**, portal yarıçapına
   sığacak kadar küçültülmüş hâlde görünür. Portal büyüdükçe ölçek 1'e iner; portal ekranı
   kapladığı anda sıradaki dünya tam ekrandır → dünya değişimi görünmez.
5. Eski dünya `dispose` edilir.

Geçiş tipleri compositor'da üç görünüme eşlenir:

| Tip | Görünüm |
|---|---|
| object-interior, infinite-zoom-in, scale-revelation | mercek/kabarcık kenarı, altın ışık halkası |
| hole-to-universe, mirror-passage | olay ufku: çevre girdap gibi deliğe akar |
| fractal-recursion, impossible-architecture, infinite-zoom-out | kaleydoskop kenarlı gül pencere |

*(mirror-passage, impossible-architecture, infinite-zoom-out için kendi görünümleri Faz 4'te.)*

## Güvenlik ve uzun süre çalışma

- **FlashGuard:** vuruş kaynaklı parlaklık darbesi saniyede en fazla 3 kez, genlik ≤ 0.6.
- **Blackout:** ~0.8 sn'de yumuşak kararma ve dönüş, ani flaş yok.
- **SafeFallback:** dünya kurulamaz ya da `update` hata verirse anında devreye girer.
- **WebGL context loss:** döngü durur, context geri gelince pipeline ve dünya yeniden kurulur.
- **AdaptiveQuality:** FPS 60'ın altına düşünce render ölçeği %10 adımlarla azalır (min %50).
- **Logger:** son 80 kayıt localStorage'da; panelde görünür.
