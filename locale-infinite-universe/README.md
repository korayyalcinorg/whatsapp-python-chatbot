# Locale Infinite Universe

Locale Sports Bar LED ekranı için müziğe tepki veren sonsuz zoom görselleri.
İlerleme ve plan: [`../LOCALE_MASTER_ROADMAP.md`](../LOCALE_MASTER_ROADMAP.md)

## Hızlı başlangıç

```bash
cd locale-infinite-universe
npm install
npm run dev        # http://localhost:5173 (aynı Wi-Fi'deki telefondan IP ile açılır)
npm run build      # dist/ klasörüne üretim çıktısı
npm run preview    # dist/ çıktısını yerelde sunar
```

Her push'ta GitHub Actions projeyi derler ve GitHub Pages'e yayınlar
(Settings → Pages → Source: **GitHub Actions** seçili olmalı).

## URL parametreleri

| Parametre | Örnek | Açıklama |
|---|---|---|
| `profile` | `mobile`, `desktop`, `led` | Kalite profili (verilmezse cihaza göre seçilir) |
| `w`, `h` | `w=3840&h=1080` | Sabit render çözünürlüğü (LED kontrolcünün girişi) |
| `scale` | `0.5` | Render ölçeği (zayıf GPU için düşür) |
| `hud` | `0` / `1` | Kontrol panelini başta gizle / göster |
| `speed` | `1.5` | Zoom hız çarpanı |
| `audio` | `off` | Demo vuruşu kapat |
| `scene` | `infinite-zoom` | Başlangıç sahnesi |

LED örneği: `…/?profile=led&w=3840&h=1080&hud=0`

## Kontroller

- Ekrana dokun / tıkla: paneli göster/gizle
- `H` panel · `F` tam ekran · `M` mikrofon · `←/→` hız

## Mimari

```
src/
  main.ts                    giriş: profil → motor → sahneler → HUD
  core/Engine.ts             WebGL renderer, boyutlandırma, döngü, FPS
  core/profiles.ts           mobile / desktop / led profilleri + URL parametreleri
  core/SceneManager.ts       sahne kaydı ve aktif sahne (geçişler buraya gelecek)
  core/types.ts              VisualScene, FrameContext, AudioFeatures
  audio/AudioInput.ts        mikrofon / demo vuruş → bas, orta, tiz, beat
  scenes/InfiniteZoomScene.ts
  shaders/*.glsl             shader kaynakları (?raw ile içe aktarılır)
  ui/Hud.ts                  dokunmatik kontrol paneli
```

Yeni sahne eklemek: `VisualScene` arayüzünü uygulayan bir sınıf yaz,
`main.ts` içinde `scenes.register('id', () => new MyScene())` ile kaydet.
