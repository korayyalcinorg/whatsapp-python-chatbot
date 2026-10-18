# Logo analizi — Locale Sports Bar

Kaynak: `public/brand/locale-logo-original.jpg` (kullanıcının yüklediği orijinal dosya, değiştirilmedi).

## Teknik özellikler

| Özellik | Değer |
|---|---|
| Format | JPEG, RGB, şeffaflık yok |
| Boyut | **416 × 415 px** |
| Arka plan | Düz beyaz (#FFFFFF), toplam alanın ~%41'i |
| Şekil | Dairesel rozet; "locale" el yazısı dairenin sağından ve solundan taşıyor |

## Yapı

- Dış halka: koyu zümrüt yeşili, üstte **LONG BEACH**, altta **SPORTS BAR** (beyaz, büyük harf).
  "SPORTS" kelimesindeki **O harfi bir 8 topu**.
- İç disk: bordo / koyu kahve zemin; solda **dart tahtası**, ortada **köpüklü bira bardağı**, sağda **futbol topu**.
- Ön planda siyah konturlu beyaz el yazısı **"locale"**.

Logo zaten projedeki dünyaların haritası: bira → *Bubbleverse*, dart → *Dart Singularity*,
8 topu → *Eight Ball Universe*, futbol → *Stadium Beyond*. *Locale Origin* dünyası bu bağı kullanacak.

## Logodan ölçülen renkler

| Rol | Logodaki değer | LED ekranda kullanılan değer |
|---|---|---|
| Dark Emerald Green | `#132517` (halka, medyan) | `#0f6b3a`, neon `#19c46a` |
| Burgundy | `#2b130f` (iç disk, medyan) | `#7a1426`, neon `#e0284f` |
| Beer Gold | `#fec907` (bira) | `#ffb21a` |
| Warm White | `#ffe9c6` (köpük / krem) | `#fff1dc` |
| Night Black | — (kontur) | `#050806` |

Logodaki baskı renkleri LED'de çok karanlık görünür; bu yüzden ışık olarak kullanılan
renkler aynı tonların daha parlak hâlleridir (`src/brand/brand.ts`).

## Yapılan işlem

`public/brand/locale-logo-alpha.png`: yalnızca **dış beyaz arka plan** kaldırıldı (kenarlardan
flood-fill, siyah konturda durur; kenar pikselleri yumuşak alfa). Logonun içindeki hiçbir piksel
değiştirilmedi; beyaz yazılar korunuyor.

## Kullanım kuralları (kodda uygulanıyor)

- Logo yalnızca **eşit ölçekle** büyütülür/küçültülür; germe, eğme, renk değişimi yok
  (`composite.frag.glsl`, "brand reveal").
- Logo sabit filigran olarak durmaz; **portal anlarında sürpriz** olarak belirir.
  Sıklık DJ panelindeki **Logo Frequency** ile ayarlanır (0 = hiç).
- Her dünya ziyaretinde en fazla 1 kez (`brand.maxPerVisit`).

## Sorun: çözünürlük yetersiz

416 px'lik logo, 4K genişliğindeki bir LED duvarda ekran yüksekliğinin yarısı kadar
gösterildiğinde **2–3 kat büyütülmüş** olur ve yumuşak / bulanık görünür.

**İhtiyaç:** logonun vektör (SVG / AI / PDF) veya en az 2000 px şeffaf PNG versiyonu.
Gelince `public/brand/` altına konup `LOGO_URL` güncellenecek.
