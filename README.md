# Keçiören RAM Özel Eğitim · E-Bülten ve Öğretmen Başvuru Kütüphanesi

Keçiören Rehberlik ve Araştırma Merkezi Özel Eğitim Hizmetleri Bölümü için hazırlanmış statik web sitesi.
Bölümün yılda iki kez çıkardığı **özel eğitim e-bültenini** ve sahadaki öğretmenler için hazırlanan **başvuru kütüphanesini** bir arada sunar.

- Sunucu tarafında kod, veritabanı ya da kullanıcı girişi yoktur. Site yalnızca HTML, CSS ve JavaScript dosyalarından oluşur.
- Telefonda ana ekrana eklenebilir, bir kez açıldıktan sonra internetsiz çalışır (PWA).
- Her sayfanın kalıcı bir adresi ve karekodu vardır.
- WCAG 2.1 AA gözetilerek hazırlanmıştır: okuma ayarları, sesli okuma, klavyeyle kullanım, yazdırma görünümü.

---

## İçindekiler

1. [Bir kez yapılacaklar (kurulum)](#1-bir-kez-yapılacaklar-kurulum)
2. [Klasörler ne işe yarar?](#2-klasörler-ne-işe-yarar)
3. [Bir yazıyı düzenlemek](#3-bir-yazıyı-düzenlemek)
4. [Yeni bülten sayısı eklemek](#4-yeni-bülten-sayısı-eklemek)
5. [Kütüphane sayfasını düzenlemek](#5-kütüphane-sayfasını-düzenlemek)
6. [Siteyi derlemek ve önizlemek](#6-siteyi-derlemek-ve-önizlemek)
7. [Siteyi yayımlamak](#7-siteyi-yayımlamak)
8. [Karekodlar](#8-karekodlar)
9. [Taslak etiketi](#9-taslak-etiketi)
10. [Markdown kısa rehberi](#10-markdown-kısa-rehberi)
11. [Bilgi alanları (frontmatter) listesi](#11-bilgi-alanları-frontmatter-listesi)
12. [Sık karşılaşılan hatalar](#12-sık-karşılaşılan-hatalar)
13. [Teknik notlar](#13-teknik-notlar)

---

## 1. Bir kez yapılacaklar (kurulum)

Siteyi derlemek için bilgisayarınızda **Node.js** programı kurulu olmalıdır. Bunu yalnızca bir kez yaparsınız.

1. <https://nodejs.org> adresine gidin ve **LTS** yazan sürümü indirip kurun (Sürekli “İleri” demeniz yeterli).
2. Bu proje klasörünü bilgisayarınıza kopyalayın (örneğin `Belgeler\ram-site`).
3. Metin dosyalarını düzenlemek için Not Defteri yeterlidir. Daha rahat bir düzenleyici isterseniz ücretsiz **Visual Studio Code** programını kurabilirsiniz.

> Dosyaları kaydederken kodlamanın **UTF-8** olduğundan emin olun. (Not Defteri'nde “Farklı Kaydet” penceresinin altında “Kodlama: UTF-8” seçili olmalı.) Aksi hâlde Türkçe karakterler bozuk görünür.

---

## 2. Klasörler ne işe yarar?

```
ram-site/
├── icerik/                 ← SİZİN DÜZENLEYECEĞİNİZ YER
│   ├── bulten/
│   │   └── sayi-1/         ← Her sayı ayrı bir klasör
│   │       ├── _sayi.md            sayının bilgileri (numara, dönem)
│   │       ├── 00-giris-yazisi.md  giriş yazısı
│   │       ├── 01-...md … 09-...md yazılar
│   │       │                       (04-isitme-yetersizligi.md gibi)
│   │       └── 99-arka-kapak.md    arka kapak yazısı
│   ├── kutuphane/
│   │   ├── gereksinim/     ← 13 gereksinim türünün her biri bir dosya
│   │   └── surec/          ← 6 süreç rehberinin her biri bir dosya
│   └── iletisim.md         ← Adres, telefon, web sitesi
├── ornekler/               ← Kopyalayıp kullanabileceğiniz örnek dosyalar
├── site.config.yml         ← Site adı, yayın adresi, taslak etiketi ayarı
├── derle.bat               ← Windows'ta çift tıklayınca siteyi derler
├── site/                   ← Derlenmiş site (sunucuya bu klasör yüklenir)
├── kaynak/  scripts/       ← Tasarım ve program dosyaları (düzenlemeniz gerekmez)
└── README.md               ← Bu belge
```

**Kural:** Siz yalnızca `icerik/` klasöründeki `.md` dosyalarıyla, `site.config.yml` dosyasıyla ilgilenirsiniz. `site/` klasörü her derlemede sıfırdan üretilir; orada yaptığınız değişiklikler silinir.

---

## 3. Bir yazıyı düzenlemek

Her yazı bir `.md` (Markdown) dosyasıdır. Dosyanın iki bölümü vardır:

1. **Bilgi alanları:** En üstte, iki `---` satırı arasında. Başlık, yazar, branş, kurum, gereksinim türü, etiketler burada yazılır.
2. **Metin:** İkinci `---` satırından sonra gelen her şey.

Örnek (`ornekler/ornek-yazi.md`):

```markdown
---
baslik: "Sınıfımda Bir Öğrenci Var: İlk Haftada Neler Yaptım?"
tur: yazi
sira: 1
yazar: "Ayşe Yılmaz"
brans: "Sınıf Öğretmeni"
kurum: "Örnek İlkokulu"
ozet: "Kısa bir tanıtım cümlesi."
gereksinim: [ozel-ogrenme-guclugu]
etiketler: [uyarlama, ilk adımlar]
---

Yazının ilk paragrafı buraya.

## Ara başlık

Metin...

## Kaynakça

- Soyadı, A. (Yıl). *Kitabın adı*. Yayınevi.
```

**Yer tutucu yazıyı gerçek yazıyla değiştirmek için:**

1. Örneğin `icerik/bulten/sayi-1/04-isitme-yetersizligi.md` dosyasını Not Defteri ile açın.
2. `baslik`, `yazar`, `brans`, `kurum` satırlarındaki `[... GELECEK]` yazılarını silip gerçek bilgileri yazın.
3. `gereksinim` satırına yazının ilgili olduğu gereksinim türünü yazın (listeyi [11. bölümde](#11-bilgi-alanları-frontmatter-listesi) bulabilirsiniz). Yazı o türün kütüphane sayfasında **“Bültenden”** başlığı altında kendiliğinden listelenir. Hiçbir türle ilgili değilse `gereksinim: []` bırakın.
4. İkinci `---` satırının altındaki `[YAZI GELECEK]` yazısını silip yazının metnini yapıştırın.
5. Kaynakçayı en sonda `## Kaynakça` başlığının altına, her kaynak bir satırda ve başında `- ` olacak şekilde yazın.
6. Kaydedin ve siteyi [derleyin](#6-siteyi-derlemek-ve-önizlemek).

**Birden fazla yazar** varsa köşeli parantezle yazın; branş ve kurum da aynı sırayla eşleşir:

```yaml
yazar: [Ayşe Yılmaz, Mehmet Demir]
brans: [Sınıf Öğretmeni, Rehber Öğretmen]
kurum: [Örnek İlkokulu, Örnek Ortaokulu]
```

**Görsel eklemek:** Görseli yazının bulunduğu sayı klasöründe `gorseller` adlı bir klasöre koyun ve metinde şöyle yazın:

```markdown
![Görselin ne gösterdiğini anlatan kısa açıklama](gorseller/dosya-adi.jpg)
```

Köşeli parantez içindeki açıklama, ekran okuyucu kullanan okurlar içindir; **boş bırakmayın.** Boş bırakırsanız derleme sırasında uyarı görürsünüz.

**Dosya adı = yazının adresi.** Sayı 1'deki henüz konusu belli olmayan gereksinim yazıları şimdilik `01-gereksinim-yazisi-1.md` gibi adlar taşıyor. Konusu belli olunca dosyayı yayımlamadan **önce** yeniden adlandırın (ör. `02-otizm-spektrum-bozuklugu.md`), başlığı ve `gereksinim` alanını doldurun.

**Yazının sırası:** Dosya adının başındaki sayı (`01-`, `02-` …) ve `sira` alanı yazının sayı içindeki yerini belirler. `tur` alanı `giris` olan yazı her zaman başta, `arka-kapak` olan her zaman sonda yer alır.

---

## 4. Yeni bülten sayısı eklemek

Örnek: Sayı 2 · Bahar 2027

1. `icerik/bulten/` klasörünün içinde **`sayi-2`** adında yeni bir klasör açın.
2. `ornekler/ornek-sayi.md` dosyasını bu klasöre kopyalayın ve adını **`_sayi.md`** yapın (başında alt çizgi var). İçini düzenleyin:
   ```yaml
   ---
   sayi: 2
   donem: Bahar 2027
   baslik: "Sayının başlığı ya da teması"
   ---

   Sayının kısa tanıtım metni.
   ```
3. Yazıları bu klasöre koyun. En kolayı `sayi-1` klasöründeki dosyaları kopyalayıp düzenlemektir:
   - `00-giris-yazisi.md` → `tur: giris`
   - `01-...md`, `02-...md` … → `tur: yazi`
   - `99-arka-kapak.md` → `tur: arka-kapak`

   Dosya adları yazının adresi olur. Örneğin `03-oyunla-okuma.md` dosyası `…/bulten/sayi-2/oyunla-okuma/` adresinde yayımlanır. Dosya adında Türkçe karakter, boşluk kullanmayın; sözcükleri tire ile ayırın. **Yayımladıktan sonra dosya adını değiştirmeyin**, yoksa bültendeki karekod eski adresi göstermeye devam eder.
4. Siteyi derleyin: **Windows'ta `derle.bat` dosyasına çift tıklayın.**

Hepsi bu kadar. Yeni sayı bülten arşivinde ve ana sayfada “Son bülten sayısı” olarak kendiliğinden görünür, yazıları aramaya eklenir, her yazı için karekod üretilir.

---

## 5. Kütüphane sayfasını düzenlemek

Kütüphane dosyaları `icerik/kutuphane/gereksinim/` ve `icerik/kutuphane/surec/` klasörlerindedir. Gereksinim türü sayfaları şu başlıkları **aynı yazımla** taşımalıdır:

```markdown
## Bir bakışta
## Bu tanı ne anlama geliyor?
## Sınıfta neler gözlemleyebilirsiniz?
## Tedbir kararından sonra ilk adımlar
## Sınıf içi uyarlamalar
### Öğretim
### Materyal
### Ortam
### Ölçme-değerlendirme
## Aileyle iletişim
## Yanlış bilinenler
## Destek nereden alınır?
```

Her başlığın altındaki `[İÇERİK GELECEK]` yazısını silip metni yazın. “Bir bakışta” bölümü sayfada renkli bir kutu içinde gösterilir. Sayfanın başındaki “Bu sayfada” listesi ve “Bültenden” bölümü kendiliğinden oluşur. Bir başlık eksik ya da farklı yazılmışsa derleme sırasında uyarı görürsünüz.

`ozet` alanı, sayfa başlığının altında görünen bir iki cümlelik açıklamadır.

**Dosya adlarını değiştirmeyin.** Dosya adı sayfanın kalıcı adresidir ve bülten yazılarının `gereksinim` alanı bu adlara bakar.

---

## 6. Siteyi derlemek ve önizlemek

**Windows:** Proje klasöründeki `derle.bat` dosyasına çift tıklayın. İlk seferde gerekli paketleri internetten indirir (bir iki dakika sürebilir), sonra siteyi derler.

**Mac / Linux:** Terminal'de proje klasörüne gidip şunu yazın:

```
npm install      (yalnızca ilk sefer)
npm run derle
```

Derleme bitince ekranda kaç sayı, yazı ve sayfa üretildiği yazar. **⚠ uyarı** satırları, eksik başlık ya da boş görsel açıklaması gibi düzeltmeniz gereken noktaları gösterir; **✘** ile başlayan bir hata varsa site derlenmemiştir ve mesaj hangi dosyanın hangi satırında sorun olduğunu söyler.

**Önizleme:** Derlenmiş siteyi yayımlamadan önce bilgisayarınızda görmek için:

```
npm run onizle
```

Sonra tarayıcıda <http://localhost:8080> adresini açın. Durdurmak için komut penceresinde `Ctrl + C`'ye basın.

---

## 7. Siteyi yayımlamak

1. **Sitenin adresini ayarlayın** (yalnızca ilk sefer). `site.config.yml` dosyasındaki `adres` satırına sitenin yayımlanacağı tam adresi yazın, sonuna `/` koyun:
   ```yaml
   adres: "https://kurum-adresi.meb.k12.tr/ozel-egitim/"
   ```
   Karekodlar bu adrese göre üretilir.
2. Siteyi derleyin.
3. `site/` klasörünün **içindeki her şeyi** kurum sunucusundaki, MEB okul sitesindeki ya da herhangi bir statik barındırma hizmetindeki hedef klasöre kopyalayın (FTP, dosya yöneticisi vb.). Gizli `.htaccess` dosyası da dahildir.

Notlar:
- Çevrimdışı çalışma ve “Ana ekrana ekle” için site **https://** ile yayımlanmalıdır.
- Site bir alt klasörde de (ör. `/ozel-egitim/`) sorunsuz çalışır; tüm iç bağlantılar göreli yazılmıştır.
- Güncelleme yaparken eski dosyaları silip yenilerini kopyalamak en temizidir. Okurların telefonundaki kayıtlı kopya, siteyi bir sonraki açışlarında kendiliğinden yenilenir.

---

## 8. Karekodlar

Her derlemede her sayfa için karekod üretilir:

- `site/karekod/` klasöründe her sayfa için bir **SVG** (her boyutta net, baskı için önerilir) ve bir **PNG** dosyası bulunur.
- Sitedeki **Karekodlar** sayfası (`…/karekodlar/`) tüm karekodları başlık ve adresleriyle listeler; buradan tek tek indirebilir ya da sayfayı yazdırabilirsiniz.
- Her sayfanın altındaki **Karekod** bağlantısı o sayfanın karekoduna götürür. Bir yazıyı yazdırdığınızda karekodu da çıktının altında yer alır.

Karekod dosya adları sayfa adresinden türetilir. Örnek: `…/bulten/sayi-1/yazi-1/` → `karekod/bulten--sayi-1--yazi-1.svg`.

> `site.config.yml`'deki adres örnek adres olduğu sürece karekodlar geçersiz bir adresi gösterir; derleme her seferinde bunu uyarır ve Karekodlar sayfasında bir uyarı kutusu görünür. **Baskıya göndermeden önce adresi düzeltip yeniden derleyin.**

Sayfa içindeki bölümlerin de kalıcı adresi vardır (ör. `…/kutuphane/gereksinim/otizm-spektrum-bozuklugu/#sinif-ici-uyarlamalar`). Başlıkların yanındaki **#** işaretine tıklayınca bu adres kopyalanır.

---

## 9. Taslak etiketi

İçerik bölüm uzmanlarının kontrolünde olduğu için her sayfanın üstünde **“Taslak”** etiketi görünür.

- **Tek bir sayfadan kaldırmak için:** O sayfanın bilgi alanlarındaki `taslak: true` satırını `taslak: false` yapın.
- **Tüm siteden kaldırmak için:** `site.config.yml` dosyasında `taslak_etiketi: true` satırını `taslak_etiketi: false` yapın.
- Etiketin metnini `site.config.yml` dosyasındaki `taslak_metni` satırından değiştirebilirsiniz.

Ardından siteyi yeniden derleyin.

---

## 10. Markdown kısa rehberi

| Ne istiyorsunuz? | Nasıl yazılır? |
|---|---|
| Ara başlık | `## Başlık` (alt başlık için `### Başlık`) |
| Yeni paragraf | Arada bir boş satır bırakın |
| **Kalın** | `**kalın**` |
| *Eğik* | `*eğik*` |
| Madde işaretli liste | Satır başında `- ` |
| Numaralı liste | Satır başında `1. `, `2. ` |
| Alıntı | Satır başında `> ` |
| Dış bağlantı | `[Bağlantı metni](https://ornek.gov.tr)` |
| Sitedeki başka sayfaya bağlantı | `[BEP adım adım](/kutuphane/surec/bep-adim-adim/)` |
| Görsel | `![Açıklama](gorseller/dosya.jpg)` |
| Tablo | `\| Başlık 1 \| Başlık 2 \|` satırı, altında `\|---\|---\|`, sonra satırlar |
| Görünür yer tutucu | `[YAZI GELECEK]`, `[İÇERİK GELECEK]` gibi köşeli parantez içinde **GELECEK** ile biten her ifade sitede sarı kutu içinde gösterilir |

`#` ile başlayan tek diyezli başlık kullanmayın; sayfa başlığı `baslik` alanından gelir.

---

## 11. Bilgi alanları (frontmatter) listesi

### Bülten yazısı

| Alan | Zorunlu mu? | Açıklama |
|---|---|---|
| `baslik` | Evet | Yazının başlığı. İki nokta üst üste (`:`) ya da köşeli parantez içeriyorsa tırnak içine alın. |
| `tur` | Evet | `giris`, `yazi` ya da `arka-kapak` |
| `sira` | Hayır | Sayı içindeki sıra (küçük olan önce) |
| `yazar` | Evet | Yazar adı ya da `[Ad 1, Ad 2]` |
| `brans` | Evet | Yazarın branşı |
| `kurum` | Evet | Yazarın kurumu |
| `ozet` | Hayır | Kısa tanıtım; içindekiler sayfasında görünür |
| `gereksinim` | Hayır | İlgili gereksinim türleri, ör. `[otizm-spektrum-bozuklugu, down-sendromu]` |
| `etiketler` | Hayır | Anahtar sözcükler, ör. `[BEP, aile]`. Aramada kullanılır. |
| `sayi` | Hayır | Yazmanıza gerek yok; dosyanın bulunduğu klasörden anlaşılır. |
| `taslak` | Hayır | `false` yazılırsa bu sayfada Taslak etiketi gösterilmez |

### Sayı bilgisi (`_sayi.md`)

| Alan | Açıklama |
|---|---|
| `sayi` | Sayı numarası (1, 2, 3 …) |
| `donem` | “Kasım 2026”, “Bahar 2027” gibi |
| `baslik` | Sayının başlığı ya da teması (isteğe bağlı) |
| `kapak` | Kapak görseli, ör. `gorseller/kapak.jpg` (isteğe bağlı) |
| `kapak_aciklama` | Kapak görselinin açıklaması (kapak varsa zorunlu) |

### Kütüphane sayfası

| Alan | Açıklama |
|---|---|
| `baslik` | Sayfa başlığı |
| `sira` | Listelerdeki sırası |
| `ozet` | Başlığın altındaki kısa açıklama |
| `etiketler` | Arama için anahtar sözcükler |
| `taslak` | `false` yazılırsa Taslak etiketi gösterilmez |

### `gereksinim` alanında kullanılabilecek değerler

| Değer | Gereksinim türü |
|---|---|
| `zihinsel-yetersizlik` | Zihinsel yetersizlik |
| `otizm-spektrum-bozuklugu` | Otizm spektrum bozukluğu |
| `ozel-ogrenme-guclugu` | Özel öğrenme güçlüğü |
| `isitme-yetersizligi` | İşitme yetersizliği |
| `gorme-yetersizligi` | Görme yetersizliği |
| `bedensel-yetersizlik` | Bedensel yetersizlik |
| `dil-ve-konusma-bozuklugu` | Dil ve konuşma bozukluğu |
| `ozel-yetenek` | Özel yetenek |
| `dikkat-eksikligi-ve-hiperaktivite` | Dikkat eksikliği ve hiperaktivite |
| `duygusal-ve-davranissal-guclukler` | Duygusal ve davranışsal güçlükler |
| `down-sendromu` | Down sendromu |
| `suregen-hastaliklar` | Süreğen hastalıklar |
| `birden-fazla-gereksinim` | Birden fazla gereksinim |

### İletişim (`icerik/iletisim.md`)

`adres`, `telefon`, `web` ve `instagram` (başında @ olmadan) alanlarını doldurun. Telefon numarası sitede seçilip kopyalanabilir metin olarak, yanında “Numarayı kopyala” ve (telefondan bakılırken) “Ara” düğmesiyle gösterilir. Web adresini `https://` ile başlayarak yazın. Adres birden çok satırsa şöyle yazın:

```yaml
adres: |
  Örnek Mahallesi, Örnek Sokak No: 1
  Keçiören / Ankara
```

---

## 12. Sık karşılaşılan hatalar

| Mesaj | Ne yapmalı? |
|---|---|
| `Bilgi alanlarında yazım hatası var` | İki nokta üst üsteden sonra boşluk bırakın (`baslik: Metin`). Başlıkta `:` ya da `[ ]` varsa tamamını tırnak içine alın: `baslik: "BEP: Adım Adım"`. |
| `Dosyanın en başında "---" satırları … bulunamadı` | Dosyanın ilk satırı tam olarak `---` olmalı; öncesinde boş satır olmamalı. |
| `"_sayi.md" dosyası yok` | Yeni sayı klasörüne `_sayi.md` dosyasını ekleyin (bkz. 4. bölüm). |
| `"gereksinim" alanındaki "…" bilinen bir gereksinim türü değil` | 11. bölümdeki listeden birini aynen yazın. |
| `"## …" başlığı bulunamadı` | Kütüphane sayfasında standart başlıklardan biri eksik ya da farklı yazılmış. |
| Türkçe karakterler bozuk görünüyor | Dosyayı UTF-8 kodlamasıyla kaydedin. |
| `Node.js kurulu değil` | 1. bölümdeki kurulumu yapın. |

---

## 13. Teknik notlar

*(Bu bölüm teknik destek verecek kişiler içindir.)*

- `npm run derle` → `scripts/derle.mjs` çalışır: `icerik/` altındaki Markdown'ı (marked), bilgi alanlarını (js-yaml) okur; `site/` altına her sayfayı `klasor/index.html` biçiminde yazar. Böylece adresler uzantısız ve kalıcıdır (`/kutuphane/gereksinim/down-sendromu/`).
- Tüm iç bağlantılar görelidir; site herhangi bir alt klasörden sunulabilir. Yalnızca `404.html` ve `.htaccess`, `adres` ayarındaki yol kısmını kullanır.
- Arama: derleme sırasında `site/arama-dizini.json` üretilir (kütüphane sayfaları başlık bazında bölünür, böylece sonuç doğrudan ilgili bölümü açar). Tarayıcı tarafında sorgu ve metin Türkçe kurallara göre küçük harfe çevrilip `ı/i, ş/s, ğ/g, ç/c, ö/o, ü/u` sadeleştirilerek karşılaştırılır.
- PWA: `site/sw.js` derleme sırasında tüm sayfaların listesiyle üretilir; içerik değiştikçe sürüm özeti değişir ve eski önbellek silinir. Karekod PNG'leri önbelleğe alınmaz.
- Okuma ayarları `localStorage` içinde `ram-okuma-ayarlari` anahtarıyla saklanır ve sayfa çizilmeden önce `<head>` içindeki küçük betikle uygulanır.
- Sesli okuma Web Speech API (`speechSynthesis`) ile `tr-TR` dilinde yapılır; API yoksa düğmeler gizli kalır. Okunan paragraf vurgulanır.
- Görsel kimlik basılı bültenle aynıdır: başlıklarda Domine, metinde Nunito Sans; lacivert `#1F3A4D` ve kiremit (`#B4532A`, metinde AA kontrastı için `#9A4522`). Yazı tipleri `@fontsource` paketlerinden derleme sırasında `site/assets/yazitipleri/` klasörüne kopyalanır (SIL Open Font License); böylece internetsiz de aynı görünür.
- Karekodlar `qrcode` paketiyle SVG ve PNG olarak üretilir. Uygulama simgeleri derleme betiği içinde ek paket gerektirmeden üretilir.
- Erişilebilirlik denetimi axe-core ile tüm sayfa türlerinde; açık, koyu, yüksek kontrast ve en büyük yazı + geniş aralık ayarlarında, 375 piksel genişlikte yapılmıştır.
