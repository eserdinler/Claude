// Keçiören RAM Özel Eğitim sitesi derleyicisi.
// "icerik/" klasöründeki Markdown dosyalarını okuyup "site/" klasörüne
// kurum sunucusuna kopyalanabilecek statik HTML, CSS ve JavaScript dosyaları üretir.
//
// Çalıştırmak için:  npm run derle

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { Marked } from 'marked';
import QRCode from 'qrcode';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ICERIK = path.join(KOK, 'icerik');
const KAYNAK = path.join(KOK, 'kaynak');
const CIKTI = path.join(KOK, 'site');
const ORNEK_ADRES = 'https://ornek-adres.example/';

const uyarilar = [];
const uyar = (m) => uyarilar.push(m);

class IcerikHatasi extends Error {}
for (const olay of ['uncaughtException', 'unhandledRejection']) {
  process.on(olay, (e) => {
    if (e instanceof IcerikHatasi) {
      console.error(`\n✘ Site derlenemedi:\n  ${e.message}\n`);
      process.exit(1);
    }
    console.error(e);
    process.exit(1);
  });
}

// ------------------------------------------------------------------
// Yardımcılar
// ------------------------------------------------------------------

const TR_HARF = { ı: 'i', i: 'i', ş: 's', ğ: 'g', ç: 'c', ö: 'o', ü: 'u', â: 'a', î: 'i', û: 'u' };

/** Türkçe harfleri sadeleştirir (Sınıf → sinif). Uzunluğu korur. */
export function sadelestir(s) {
  return String(s)
    .toLocaleLowerCase('tr')
    .replace(/[ışğçöüâîû]/g, (h) => TR_HARF[h]);
}

function kisaAd(s) {
  return sadelestir(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function kacis(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function etiketsiz(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function goreli(dosya) {
  return path.relative(KOK, dosya).split(path.sep).join('/');
}

function dosyaOku(dosya) {
  const ham = fs.readFileSync(dosya, 'utf8').replace(/^﻿/, '');
  const m = ham.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) {
    throw new IcerikHatasi(
      `${goreli(dosya)}: Dosyanın en başında "---" satırları arasında bilgi alanları bulunamadı. README'deki örnek dosyaya bakın.`
    );
  }
  let bilgi;
  try {
    bilgi = yaml.load(m[1]) || {};
  } catch (e) {
    throw new IcerikHatasi(
      `${goreli(dosya)}: Bilgi alanlarında yazım hatası var (satır ${e.mark ? e.mark.line + 2 : '?'}). ` +
        `İki nokta üst üsteden sonra boşluk bıraktığınızdan ve köşeli parantez içeren değerleri tırnak içine aldığınızdan emin olun.`
    );
  }
  return { bilgi, govde: m[2], dosya };
}

function listele(klasor, uzanti = '.md') {
  if (!fs.existsSync(klasor)) return [];
  return fs
    .readdirSync(klasor)
    .filter((f) => f.endsWith(uzanti))
    .sort((a, b) => a.localeCompare(b, 'tr'))
    .map((f) => path.join(klasor, f));
}

function dizi(v) {
  if (v === undefined || v === null || v === '') return [];
  return Array.isArray(v) ? v.map(String) : [String(v)];
}

function yaz(gorece, icerik) {
  const hedef = path.join(CIKTI, gorece);
  fs.mkdirSync(path.dirname(hedef), { recursive: true });
  fs.writeFileSync(hedef, icerik);
}

function kopyalaKlasor(kaynak, hedef, suzgec = () => true) {
  if (!fs.existsSync(kaynak)) return;
  for (const g of fs.readdirSync(kaynak, { withFileTypes: true })) {
    const k = path.join(kaynak, g.name);
    const h = path.join(hedef, g.name);
    if (g.isDirectory()) kopyalaKlasor(k, h, suzgec);
    else if (suzgec(g.name)) {
      fs.mkdirSync(path.dirname(h), { recursive: true });
      fs.copyFileSync(k, h);
    }
  }
}

// ------------------------------------------------------------------
// Markdown
// ------------------------------------------------------------------

let basliklar = [];
let kullanilanKimlikler = new Set();

const md = new Marked({ gfm: true, breaks: false });
md.use({
  renderer: {
    heading({ tokens, depth }) {
      const ic = this.parser.parseInline(tokens);
      const duz = etiketsiz(ic);
      const seviye = Math.min(6, Math.max(2, depth));
      let kimlik = kisaAd(duz) || 'bolum';
      let n = 2;
      while (kullanilanKimlikler.has(kimlik)) kimlik = `${kisaAd(duz)}-${n++}`;
      kullanilanKimlikler.add(kimlik);
      basliklar.push({ seviye, kimlik, metin: duz });
      const baglanti =
        seviye <= 3
          ? ` <a class="bolum-baglantisi" href="#${kimlik}" aria-label="“${kacis(duz)}” bölümünün bağlantısı">#</a>`
          : '';
      return `<h${seviye} id="${kimlik}">${ic}${baglanti}</h${seviye}>\n`;
    },
    image({ href, title, text }) {
      return `<img src="${kacis(href)}" alt="${kacis(text)}"${title ? ` title="${kacis(title)}"` : ''} loading="lazy">`;
    },
  },
});

/**
 * Markdown'ı HTML'e çevirir.
 * derinlik: sayfanın, Markdown dosyasının bulunduğu klasöre göre kaç klasör altta olduğu.
 */
function cevir(govde, { kok, derinlik, dosya }) {
  basliklar = [];
  kullanilanKimlikler = new Set();
  let html = md.parse(govde);

  // Görsellerde alternatif metin denetimi
  for (const m of html.matchAll(/<img [^>]*alt="([^"]*)"/g)) {
    if (!m[1].trim()) uyar(`${goreli(dosya)}: Bir görselin alternatif metni boş. ![Görselin açıklaması](dosya.jpg) biçiminde yazın.`);
  }

  // Bağlantı ve görsel adreslerini sayfanın konumuna göre düzelt
  const onEk = '../'.repeat(derinlik);
  html = html.replace(/(href|src)="([^"]*)"/g, (tam, nitelik, adres) => {
    if (/^(#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(adres)) return tam;
    if (adres.startsWith('/')) return `${nitelik}="${kok}${adres.slice(1)}"`;
    return `${nitelik}="${onEk}${adres}"`;
  });

  // Dış bağlantılar yeni sekmede açılmasın; yalnızca görünür olarak işaretlensin
  html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a class="dis-baglanti" href="$1" rel="noopener"');

  // Yer tutucuları görünür yap: [YAZI GELECEK], [İÇERİK GELECEK] ...
  html = yerTutucu(html);

  return { html, basliklar: basliklar.slice() };
}

function yerTutucu(html) {
  return html.replace(/\[([^\]\[<>]*GELECEK)\]/g, '<mark class="yer-tutucu">[$1]</mark>');
}

/** h2 başlıklarına göre içerik bölümlerini <section> içine alır. */
function bolumle(html) {
  const parcalar = html.split(/(?=<h2 id=")/);
  return parcalar
    .map((p) => {
      const m = p.match(/^<h2 id="([^"]+)"/);
      if (!m) return p;
      return `<section class="bolum bolum-${m[1]}" aria-labelledby="${m[1]}">\n${p}</section>\n`;
    })
    .join('');
}

/** h2 başlıklarına göre arama dizini için bölümlere ayırır. */
function bolumMetinleri(html) {
  const sonuc = [];
  const parcalar = html.split(/(?=<h2 id=")/);
  for (const p of parcalar) {
    const m = p.match(/^<h2 id="([^"]+)">([\s\S]*?)<\/h2>/);
    const metin = etiketsiz(m ? p.slice(m[0].length) : p);
    sonuc.push({ kimlik: m ? m[1] : null, baslik: m ? etiketsiz(m[2]).replace(/\s*#$/, '') : null, metin });
  }
  return sonuc;
}

// ------------------------------------------------------------------
// Ayarlar
// ------------------------------------------------------------------

const ayarlar = yaml.load(fs.readFileSync(path.join(KOK, 'site.config.yml'), 'utf8')) || {};
let ADRES = String(ayarlar.adres || ORNEK_ADRES).trim();
if (!ADRES.endsWith('/')) ADRES += '/';
const ADRES_ORNEK = ADRES === ORNEK_ADRES;
if (ADRES_ORNEK) {
  uyar(
    'site.config.yml içindeki "adres" hâlâ örnek adres. Karekodlar bu adresi gösteriyor; sitenin gerçek adresi belli olunca değiştirip yeniden derleyin.'
  );
}
const SITE = {
  ad: ayarlar.site_adi || 'Keçiören RAM Özel Eğitim',
  altBaslik: ayarlar.site_alt_baslik || '',
  kurum: ayarlar.kurum_adi || '',
  taslak: ayarlar.taslak_etiketi !== false,
  taslakMetni: ayarlar.taslak_metni || 'Taslak',
};

// ------------------------------------------------------------------
// İçeriği oku
// ------------------------------------------------------------------

function kutuphaneOku(alt, tur) {
  return listele(path.join(ICERIK, 'kutuphane', alt))
    .filter((f) => !path.basename(f).startsWith('_'))
    .map((dosya) => {
      const { bilgi, govde } = dosyaOku(dosya);
      const kisa = path.basename(dosya, '.md');
      if (!bilgi.baslik) throw new IcerikHatasi(`${goreli(dosya)}: "baslik" alanı eksik.`);
      return {
        tur,
        kisa,
        baslik: String(bilgi.baslik),
        sira: Number(bilgi.sira ?? 999),
        ozet: bilgi.ozet ? String(bilgi.ozet) : '',
        etiketler: dizi(bilgi.etiketler),
        taslak: bilgi.taslak !== false,
        govde,
        dosya,
        yol: `kutuphane/${alt}/${kisa}/`,
      };
    })
    .sort((a, b) => a.sira - b.sira || a.baslik.localeCompare(b.baslik, 'tr'));
}

const gereksinimler = kutuphaneOku('gereksinim', 'gereksinim');
const surecler = kutuphaneOku('surec', 'surec');
const gereksinimHaritasi = new Map(gereksinimler.map((g) => [g.kisa, g]));

const STANDART_BASLIKLAR = [
  'Bir bakışta',
  'Bu tanı ne anlama geliyor?',
  'Sınıfta neler gözlemleyebilirsiniz?',
  'Tedbir kararından sonra ilk adımlar',
  'Sınıf içi uyarlamalar',
  'Aileyle iletişim',
  'Yanlış bilinenler',
  'Destek nereden alınır?',
];

const TUR_ADLARI = { giris: 'Giriş yazısı', yazi: 'Yazı', 'arka-kapak': 'Arka kapak yazısı' };
const TUR_SIRASI = { giris: 0, yazi: 1, 'arka-kapak': 2 };

const sayilar = [];
const bultenKlasoru = path.join(ICERIK, 'bulten');
if (fs.existsSync(bultenKlasoru)) {
  for (const ad of fs.readdirSync(bultenKlasoru).sort((a, b) => a.localeCompare(b, 'tr'))) {
    const klasor = path.join(bultenKlasoru, ad);
    if (!fs.statSync(klasor).isDirectory()) continue;
    const sayiDosyasi = path.join(klasor, '_sayi.md');
    if (!fs.existsSync(sayiDosyasi)) {
      throw new IcerikHatasi(
        `${goreli(klasor)}: Bu sayı klasöründe "_sayi.md" dosyası yok. Bir önceki sayının "_sayi.md" dosyasını kopyalayıp düzenleyin.`
      );
    }
    const s = dosyaOku(sayiDosyasi);
    const no = Number(s.bilgi.sayi);
    if (!no) throw new IcerikHatasi(`${goreli(sayiDosyasi)}: "sayi" alanına sayı numarasını yazın (örnek: sayi: 2).`);
    const kisa = kisaAd(ad);
    const sayi = {
      no,
      kisa,
      donem: String(s.bilgi.donem || ''),
      baslik: s.bilgi.baslik ? String(s.bilgi.baslik) : '',
      tanitim: s.govde.trim(),
      kapak: s.bilgi.kapak ? String(s.bilgi.kapak) : '',
      kapakAciklama: s.bilgi.kapak_aciklama ? String(s.bilgi.kapak_aciklama) : '',
      yol: `bulten/${kisa}/`,
      klasor,
      ad,
      dosya: sayiDosyasi,
      yazilar: [],
    };
    if (sayi.kapak && !sayi.kapakAciklama) uyar(`${goreli(sayiDosyasi)}: Kapak görseli için "kapak_aciklama" alanını doldurun.`);
    for (const dosya of listele(klasor)) {
      if (path.basename(dosya).startsWith('_')) continue;
      const { bilgi, govde } = dosyaOku(dosya);
      if (!bilgi.baslik) throw new IcerikHatasi(`${goreli(dosya)}: "baslik" alanı eksik.`);
      const tur = String(bilgi.tur || 'yazi');
      if (!TUR_ADLARI[tur]) {
        throw new IcerikHatasi(`${goreli(dosya)}: "tur" alanı giris, yazi ya da arka-kapak olmalı (şu an: ${tur}).`);
      }
      const yaziKisa = kisaAd(path.basename(dosya, '.md').replace(/^\d+[-_ ]*/, '')) || kisaAd(String(bilgi.baslik));
      const gereksinim = dizi(bilgi.gereksinim);
      for (const g of gereksinim) {
        if (!gereksinimHaritasi.has(g)) {
          uyar(
            `${goreli(dosya)}: "gereksinim" alanındaki "${g}" bilinen bir gereksinim türü değil. Geçerli değerler: ${[...gereksinimHaritasi.keys()].join(', ')}`
          );
        }
      }
      if (bilgi.sayi !== undefined && Number(bilgi.sayi) !== no) {
        uyar(`${goreli(dosya)}: "sayi: ${bilgi.sayi}" yazıyor ama dosya Sayı ${no} klasöründe. Klasör esas alındı.`);
      }
      sayi.yazilar.push({
        baslik: String(bilgi.baslik),
        tur,
        sira: Number(bilgi.sira ?? 50),
        yazar: dizi(bilgi.yazar),
        brans: dizi(bilgi.brans),
        kurum: dizi(bilgi.kurum),
        ozet: bilgi.ozet ? String(bilgi.ozet) : '',
        gereksinim: gereksinim.filter((g) => gereksinimHaritasi.has(g)),
        etiketler: dizi(bilgi.etiketler),
        taslak: bilgi.taslak !== false,
        govde,
        dosya,
        kisa: yaziKisa,
        yol: `${sayi.yol}${yaziKisa}/`,
        sayi,
      });
    }
    const gorulen = new Set();
    for (const y of sayi.yazilar) {
      if (gorulen.has(y.kisa)) throw new IcerikHatasi(`${goreli(y.dosya)}: Aynı sayıda aynı adlı iki yazı dosyası var.`);
      gorulen.add(y.kisa);
    }
    sayi.yazilar.sort((a, b) => TUR_SIRASI[a.tur] - TUR_SIRASI[b.tur] || a.sira - b.sira || a.baslik.localeCompare(b.baslik, 'tr'));
    sayilar.push(sayi);
  }
}
sayilar.sort((a, b) => b.no - a.no);
for (let i = 1; i < sayilar.length; i++) {
  if (sayilar[i].no === sayilar[i - 1].no) throw new IcerikHatasi(`İki ayrı klasörde "sayi: ${sayilar[i].no}" yazıyor.`);
}
const tumYazilar = sayilar.flatMap((s) => s.yazilar);

const iletisimDosyasi = path.join(ICERIK, 'iletisim.md');
const iletisim = fs.existsSync(iletisimDosyasi) ? dosyaOku(iletisimDosyasi) : { bilgi: {}, govde: '', dosya: iletisimDosyasi };

// ------------------------------------------------------------------
// Sayfa şablonu
// ------------------------------------------------------------------

const MENU = [
  { yol: '', ad: 'Ana sayfa' },
  { yol: 'bulten/', ad: 'Bülten' },
  { yol: 'kutuphane/', ad: 'Kütüphane' },
  { yol: 'arama/', ad: 'Arama' },
  { yol: 'iletisim/', ad: 'İletişim' },
];

const sayfalar = []; // { yol, baslik }
const aramaDizini = [];

function kokYolu(yol) {
  const derinlik = yol.split('/').filter(Boolean).length;
  return derinlik ? '../'.repeat(derinlik) : './';
}

function karekodAdi(yol) {
  return yol ? yol.replace(/\/$/, '').replace(/\//g, '--') : 'ana-sayfa';
}

function taslakEtiketi(gosterilsin) {
  if (!SITE.taslak || !gosterilsin) return '';
  return `<p class="taslak-etiketi" role="note"><span class="taslak-isaret" aria-hidden="true">!</span> ${kacis(SITE.taslakMetni)}</p>`;
}

function aracCubugu({ okuma = true } = {}) {
  return `<div class="arac-cubugu" role="group" aria-label="Sayfa araçları">
  ${
    okuma
      ? `<div class="sesli-okuma" hidden>
    <button type="button" class="dugme" data-sesli="baslat"><span aria-hidden="true">▶</span> Sesli dinle</button>
    <button type="button" class="dugme" data-sesli="duraklat" hidden><span aria-hidden="true">❚❚</span> Duraklat</button>
    <button type="button" class="dugme" data-sesli="devam" hidden><span aria-hidden="true">▶</span> Devam et</button>
    <button type="button" class="dugme" data-sesli="durdur" hidden><span aria-hidden="true">■</span> Durdur</button>
    <label class="hiz">Hız
      <select data-sesli="hiz">
        <option value="0.8">Yavaş</option>
        <option value="1" selected>Normal</option>
        <option value="1.2">Hızlı</option>
      </select>
    </label>
  </div>`
      : ''
  }
  <button type="button" class="dugme" data-yazdir><span aria-hidden="true">⎙</span> Yazdır</button>
  <button type="button" class="dugme" data-kopyala-adres><span aria-hidden="true">🔗</span> Bağlantıyı kopyala</button>
</div>`;
}

function sayfa({ yol, baslik, aciklama = '', govde, yolIzi = [], taslak = true, sinif = '' }) {
  const kok = kokYolu(yol);
  const kalici = ADRES + yol;
  const kk = karekodAdi(yol);
  sayfalar.push({ yol, baslik, karekod: kk });
  const menu = MENU.map((m) => {
    const aktif = m.yol === '' ? yol === '' : yol.startsWith(m.yol);
    return `<li><a href="${kok}${m.yol}"${aktif ? ' aria-current="page"' : ''}>${m.ad}</a></li>`;
  }).join('');
  const iz = yolIzi.length
    ? `<nav class="yol-izi" aria-label="Bulunduğunuz yer"><ol><li><a href="${kok}">Ana sayfa</a></li>${yolIzi
        .map((p, i) =>
          i === yolIzi.length - 1
            ? `<li><span aria-current="page">${kacis(p.ad)}</span></li>`
            : `<li><a href="${kok}${p.yol}">${kacis(p.ad)}</a></li>`
        )
        .join('')}</ol></nav>`
    : '';
  const tamBaslik = yol === '' ? SITE.ad : `${baslik} · ${SITE.ad}`;
  return `<!doctype html>
<html lang="tr" data-kok="${kok}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${kacis(tamBaslik)}</title>
<meta name="description" content="${kacis(aciklama || SITE.altBaslik)}">
${ADRES_ORNEK ? '' : `<link rel="canonical" href="${kacis(kalici)}">`}
<meta name="theme-color" content="#1f3a4d">
<link rel="manifest" href="${kok}manifest.webmanifest">
<link rel="icon" href="${kok}simgeler/simge.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${kok}simgeler/simge-180.png">
<script>${AYAR_BETIGI}</script>
<link rel="stylesheet" href="${kok}assets/yazitipleri/yazitipleri.css">
<link rel="stylesheet" href="${kok}assets/stil.css">
<script src="${kok}assets/uygulama.js" defer></script>
</head>
<body class="${sinif}">
<a class="icerige-gec" href="#ana-icerik">İçeriğe geç</a>
<header class="ust-bant">
  <div class="kap ust-ic">
    <a class="logo" href="${kok}">
      <img src="${kok}simgeler/simge.svg" alt="" width="40" height="40">
      <span class="logo-metin"><span class="logo-ad">${kacis(SITE.ad)}</span><span class="logo-alt">${kacis(SITE.altBaslik)}</span></span>
    </a>
    <button type="button" class="dugme ayar-dugmesi" aria-expanded="false" aria-controls="okuma-ayarlari">
      <span aria-hidden="true">Aa</span> Okuma ayarları
    </button>
  </div>
  <div id="okuma-ayarlari" class="ayar-paneli" role="region" aria-label="Okuma ayarları" hidden>
    <div class="kap">
      <form class="ayar-formu" onsubmit="return false">
        <fieldset>
          <legend>Yazı boyutu</legend>
          <label><input type="radio" name="yazi" value="0" checked> Normal</label>
          <label><input type="radio" name="yazi" value="1"> Büyük</label>
          <label><input type="radio" name="yazi" value="2"> Daha büyük</label>
          <label><input type="radio" name="yazi" value="3"> En büyük</label>
        </fieldset>
        <fieldset>
          <legend>Tema</legend>
          <label><input type="radio" name="tema" value="sistem" checked> Cihaza göre</label>
          <label><input type="radio" name="tema" value="acik"> Açık</label>
          <label><input type="radio" name="tema" value="koyu"> Koyu</label>
        </fieldset>
        <fieldset>
          <legend>Görünüm</legend>
          <label><input type="checkbox" name="kontrast"> Yüksek kontrast</label>
          <label><input type="checkbox" name="aralik"> Satır aralığını artır</label>
        </fieldset>
        <div class="ayar-alt">
          <button type="button" class="dugme" data-ayar-sifirla>Varsayılana dön</button>
          <button type="button" class="dugme dugme-birincil" data-ayar-kapat>Kapat</button>
        </div>
        <p class="ayar-not">Seçimleriniz bu cihazda hatırlanır.</p>
      </form>
    </div>
  </div>
  <nav class="ana-menu" aria-label="Ana menü">
    <ul class="kap">${menu}</ul>
  </nav>
</header>
<main id="ana-icerik" tabindex="-1">
  <div class="kap">
    ${iz}
    ${taslakEtiketi(taslak)}
    ${govde}
  </div>
</main>
<footer class="alt-bant">
  <div class="kap">
    <p class="kalici-adres">
      <span>Bu sayfanın kalıcı adresi:</span>
      <code data-kalici="${kacis(kalici)}">${kacis(kalici)}</code>
      <button type="button" class="dugme dugme-kucuk" data-kopyala-adres>Kopyala</button>
      <a href="${kok}karekodlar/#kk-${kk}">Karekod</a>
    </p>
    <p class="yazdirma-karekod"><img src="${kok}karekod/${kk}.svg" alt="Bu sayfanın karekodu" width="96" height="96"></p>
    <p>${kacis(SITE.kurum)}</p>
    <ul class="alt-menu">
      <li><a href="${kok}iletisim/">İletişim</a></li>
      <li><a href="${kok}karekodlar/">Karekodlar</a></li>
      <li><a href="${kok}erisilebilirlik/">Erişilebilirlik</a></li>
    </ul>
  </div>
</footer>
<div class="duyuru" role="status" aria-live="polite"></div>
</body>
</html>
`;
}

// Okuma tercihlerini sayfa çizilmeden önce uygular (göz kırpmayı önler).
const AYAR_BETIGI = `try{var a=JSON.parse(localStorage.getItem('ram-okuma-ayarlari')||'{}'),d=document.documentElement;if(a.yazi)d.dataset.yazi=a.yazi;if(a.tema&&a.tema!=='sistem')d.dataset.tema=a.tema;if(a.kontrast)d.dataset.kontrast='yuksek';if(a.aralik)d.dataset.aralik='genis';}catch(e){}`;

function yazarSatiri(y) {
  const kisiler = y.yazar.map((ad, i) => {
    const ek = [y.brans[i] ?? y.brans[0], y.kurum[i] ?? y.kurum[0]].filter(Boolean).map(kacis).join(' · ');
    return `<li><span class="yazar-adi">${kacis(ad)}</span>${ek ? `<span class="yazar-ek">${ek}</span>` : ''}</li>`;
  });
  return kisiler.length ? yerTutucu(`<ul class="yazarlar" aria-label="Yazar">${kisiler.join('')}</ul>`) : '';
}

function etiketListesi(etiketler, kok) {
  if (!etiketler.length) return '';
  return `<ul class="etiketler" aria-label="Etiketler">${etiketler
    .map((e) => `<li><a href="${kok}arama/?q=${encodeURIComponent(e)}">${kacis(e)}</a></li>`)
    .join('')}</ul>`;
}

function sayiAdi(s) {
  return `Sayı ${s.no}${s.donem ? ` · ${s.donem}` : ''}`;
}

function yaziKarti(y, kok, { sayiGoster = false } = {}) {
  return `<li class="kart">
  <p class="kart-ust">${kacis(TUR_ADLARI[y.tur])}${sayiGoster ? ` · ${kacis(sayiAdi(y.sayi))}` : ''}</p>
  <h3 class="kart-baslik"><a href="${kok}${y.yol}">${yerTutucu(kacis(y.baslik))}</a></h3>
  ${y.yazar.length ? `<p class="kart-alt">${yerTutucu(y.yazar.map(kacis).join(', '))}</p>` : ''}
  ${y.ozet ? `<p>${yerTutucu(kacis(y.ozet))}</p>` : ''}
</li>`;
}

// ------------------------------------------------------------------
// Sayfaları üret
// ------------------------------------------------------------------

fs.rmSync(CIKTI, { recursive: true, force: true });
fs.mkdirSync(CIKTI, { recursive: true });

// --- Kütüphane sayfaları
function kutuphaneSayfasi(k) {
  const kok = kokYolu(k.yol);
  const { html, basliklar: bs } = cevir(k.govde, { kok, derinlik: 1, dosya: k.dosya });

  if (k.tur === 'gereksinim') {
    const var_ = new Set(bs.filter((b) => b.seviye === 2).map((b) => sadelestir(b.metin)));
    for (const s of STANDART_BASLIKLAR) {
      if (!var_.has(sadelestir(s))) uyar(`${goreli(k.dosya)}: "## ${s}" başlığı bulunamadı.`);
    }
  }

  const ilgili = k.tur === 'gereksinim' ? tumYazilar.filter((y) => y.gereksinim.includes(k.kisa)) : [];
  const bultenden =
    k.tur === 'gereksinim'
      ? `<section class="bolum bultenden" aria-labelledby="bultenden">
  <h2 id="bultenden">Bültenden <a class="bolum-baglantisi" href="#bultenden" aria-label="“Bültenden” bölümünün bağlantısı">#</a></h2>
  ${
    ilgili.length
      ? `<ul class="kartlar">${ilgili.map((y) => yaziKarti(y, kok, { sayiGoster: true })).join('')}</ul>`
      : '<p>Bu konuda henüz bülten yazısı yayımlanmadı.</p>'
  }
</section>`
      : '';

  const h2ler = bs.filter((b) => b.seviye === 2);
  if (k.tur === 'gereksinim') h2ler.push({ kimlik: 'bultenden', metin: 'Bültenden' });
  const icindekiler =
    h2ler.length > 1
      ? `<nav class="icindekiler" aria-labelledby="icindekiler-baslik">
  <h2 id="icindekiler-baslik" class="icindekiler-baslik">Bu sayfada</h2>
  <ol>${h2ler.map((b) => `<li><a href="#${b.kimlik}">${kacis(b.metin)}</a></li>`).join('')}</ol>
</nav>`
      : '';

  const ustBaslik = k.tur === 'gereksinim' ? 'Gereksinim türleri' : 'Süreç rehberleri';
  const govde = `<article class="makale" data-okunacak>
  <header class="makale-ust">
    <p class="ust-baslik">${ustBaslik}</p>
    <h1>${kacis(k.baslik)}</h1>
    ${k.ozet ? `<p class="ozet">${yerTutucu(kacis(k.ozet))}</p>` : ''}
    ${etiketListesi(k.etiketler, kok)}
  </header>
  ${aracCubugu()}
  ${icindekiler}
  <div class="makale-govde">
  ${bolumle(html)}
  </div>
  ${bultenden}
</article>`;
  yaz(
    `${k.yol}index.html`,
    sayfa({
      yol: k.yol,
      baslik: k.baslik,
      aciklama: k.ozet && !/GELECEK/.test(k.ozet) ? k.ozet : `${k.baslik} · ${ustBaslik}`,
      govde,
      taslak: k.taslak,
      yolIzi: [
        { ad: 'Kütüphane', yol: 'kutuphane/' },
        { ad: ustBaslik, yol: `kutuphane/#${k.tur === 'gereksinim' ? 'gereksinim-turleri' : 'surec-rehberleri'}` },
        { ad: k.baslik, yol: k.yol },
      ],
    })
  );

  for (const b of bolumMetinleri(html)) {
    if (!b.metin && !b.baslik) continue;
    aramaDizini.push({
      b: b.baslik ? `${k.baslik} › ${b.baslik}` : k.baslik,
      u: b.kimlik ? `${k.yol}#${b.kimlik}` : k.yol,
      t: `Kütüphane · ${ustBaslik}`,
      m: b.metin,
      e: k.etiketler.join(' '),
    });
  }
}
gereksinimler.forEach(kutuphaneSayfasi);
surecler.forEach(kutuphaneSayfasi);

function kutuphaneListesi(liste, kok) {
  return `<ul class="kisayollar">${liste
    .map((k) => `<li><a href="${kok}${k.yol}">${kacis(k.baslik)}</a></li>`)
    .join('')}</ul>`;
}

{
  const yol = 'kutuphane/';
  const kok = kokYolu(yol);
  yaz(
    `${yol}index.html`,
    sayfa({
      yol,
      baslik: 'Kütüphane',
      aciklama: 'Gereksinim türleri ve süreç rehberleri',
      yolIzi: [{ ad: 'Kütüphane', yol }],
      govde: `<h1>Kütüphane</h1>
<section aria-labelledby="gereksinim-turleri">
  <h2 id="gereksinim-turleri">Gereksinim türleri</h2>
  ${kutuphaneListesi(gereksinimler, kok)}
</section>
<section aria-labelledby="surec-rehberleri">
  <h2 id="surec-rehberleri">Süreç rehberleri</h2>
  ${kutuphaneListesi(surecler, kok)}
</section>`,
    })
  );
}

// --- Bülten
for (const s of sayilar) {
  s.yazilar.forEach((y, i) => {
    const kok = kokYolu(y.yol);
    const { html } = cevir(y.govde, { kok, derinlik: 1, dosya: y.dosya });
    const onceki = s.yazilar[i - 1];
    const sonraki = s.yazilar[i + 1];
    const ilgili = y.gereksinim.map((g) => gereksinimHaritasi.get(g));
    const govde = `<article class="makale" data-okunacak>
  <header class="makale-ust">
    <p class="ust-baslik"><a href="${kok}${s.yol}">${kacis(sayiAdi(s))}</a> · ${kacis(TUR_ADLARI[y.tur])}</p>
    <h1>${yerTutucu(kacis(y.baslik))}</h1>
    ${yazarSatiri(y)}
    ${y.ozet ? `<p class="ozet">${yerTutucu(kacis(y.ozet))}</p>` : ''}
    ${
      ilgili.length
        ? `<p class="ilgili">İlgili kütüphane sayfası: ${ilgili
            .map((g) => `<a href="${kok}${g.yol}">${kacis(g.baslik)}</a>`)
            .join(', ')}</p>`
        : ''
    }
    ${etiketListesi(y.etiketler, kok)}
  </header>
  ${aracCubugu()}
  <div class="makale-govde">
  ${bolumle(html)}
  </div>
</article>
<nav class="sayi-gezinti" aria-label="Bu sayıdaki diğer yazılar">
  ${onceki ? `<a class="onceki" href="${kok}${onceki.yol}"><span>Önceki yazı</span> ${yerTutucu(kacis(onceki.baslik))}</a>` : '<span></span>'}
  ${sonraki ? `<a class="sonraki" href="${kok}${sonraki.yol}"><span>Sonraki yazı</span> ${yerTutucu(kacis(sonraki.baslik))}</a>` : ''}
</nav>`;
    yaz(
      `${y.yol}index.html`,
      sayfa({
        yol: y.yol,
        baslik: y.baslik,
        aciklama: y.ozet || `${sayiAdi(s)} · ${y.yazar.join(', ')}`,
        govde,
        taslak: y.taslak,
        yolIzi: [
          { ad: 'Bülten', yol: 'bulten/' },
          { ad: sayiAdi(s), yol: s.yol },
          { ad: y.baslik, yol: y.yol },
        ],
      })
    );
    aramaDizini.push({
      b: y.baslik,
      u: y.yol,
      t: `Bülten · ${sayiAdi(s)}`,
      m: etiketsiz(html),
      e: [...y.yazar, ...y.etiketler, ...ilgili.map((g) => g.baslik)].join(' '),
    });
  });

  // Sayı içindekiler sayfası
  const kok = kokYolu(s.yol);
  const tanitim = s.tanitim ? cevir(s.tanitim, { kok, derinlik: 1, dosya: s.dosya }).html : '';
  const gruplar = ['giris', 'yazi', 'arka-kapak']
    .map((t) => [t, s.yazilar.filter((y) => y.tur === t)])
    .filter(([, l]) => l.length);
  yaz(
    `${s.yol}index.html`,
    sayfa({
      yol: s.yol,
      baslik: sayiAdi(s),
      aciklama: `Özel eğitim e-bülteni ${sayiAdi(s)}`,
      yolIzi: [
        { ad: 'Bülten', yol: 'bulten/' },
        { ad: sayiAdi(s), yol: s.yol },
      ],
      govde: `<header class="makale-ust">
  <p class="ust-baslik">Özel Eğitim E-Bülteni</p>
  <h1>${kacis(sayiAdi(s))}</h1>
  ${s.baslik ? `<p class="ozet">${yerTutucu(kacis(s.baslik))}</p>` : ''}
</header>
${s.kapak ? `<p><img class="kapak" src="${kacis(s.kapak)}" alt="${kacis(s.kapakAciklama)}"></p>` : ''}
${tanitim}
${gruplar
  .map(
    ([t, l]) => `<section aria-labelledby="g-${t}">
  <h2 id="g-${t}">${t === 'yazi' ? 'Yazılar' : TUR_ADLARI[t]}</h2>
  <ul class="kartlar">${l.map((y) => yaziKarti(y, kok)).join('')}</ul>
</section>`
  )
  .join('')}`,
    })
  );
}

{
  const yol = 'bulten/';
  const kok = kokYolu(yol);
  yaz(
    `${yol}index.html`,
    sayfa({
      yol,
      baslik: 'Bülten',
      aciklama: 'Özel eğitim e-bülteni sayı arşivi',
      yolIzi: [{ ad: 'Bülten', yol }],
      govde: `<h1>Özel Eğitim E-Bülteni</h1>
<h2>Sayı arşivi</h2>
${
  sayilar.length
    ? `<ul class="kartlar">${sayilar
        .map(
          (s) => `<li class="kart">
  <h3 class="kart-baslik"><a href="${kok}${s.yol}">${kacis(sayiAdi(s))}</a></h3>
  ${s.baslik ? `<p>${yerTutucu(kacis(s.baslik))}</p>` : ''}
  <p class="kart-alt">${s.yazilar.length} yazı</p>
</li>`
        )
        .join('')}</ul>`
    : '<p>Henüz yayımlanmış sayı yok.</p>'
}`,
    })
  );
}

// --- Ana sayfa
{
  const kok = './';
  const son = sayilar[0];
  yaz(
    'index.html',
    sayfa({
      yol: '',
      baslik: 'Ana sayfa',
      sinif: 'ana-sayfa',
      govde: `<h1 class="ana-baslik">${kacis(SITE.ad)}<span>${kacis(SITE.altBaslik)}</span></h1>
<form class="arama-formu buyuk" role="search" action="${kok}arama/" method="get">
  <label for="ana-arama">Bülten ve kütüphanede arayın</label>
  <div class="arama-satiri">
    <input id="ana-arama" type="search" name="q" autocomplete="off" placeholder="Örnek: sınıf içi uyarlama">
    <button class="dugme dugme-birincil" type="submit">Ara</button>
  </div>
</form>
${
  son
    ? `<section class="son-sayi" aria-labelledby="son-sayi">
  <h2 id="son-sayi">Son bülten sayısı</h2>
  <div class="kart vurgulu">
    <h3 class="kart-baslik"><a href="${kok}${son.yol}">${kacis(sayiAdi(son))}</a></h3>
    ${son.baslik ? `<p>${yerTutucu(kacis(son.baslik))}</p>` : ''}
    <ul class="duz-liste">${son.yazilar.map((y) => `<li><a href="${kok}${y.yol}">${yerTutucu(kacis(y.baslik))}</a></li>`).join('')}</ul>
    <p><a href="${kok}bulten/">Tüm sayılar</a></p>
  </div>
</section>`
    : ''
}
<section aria-labelledby="gereksinim-turleri">
  <h2 id="gereksinim-turleri">Gereksinim türleri</h2>
  ${kutuphaneListesi(gereksinimler, kok)}
</section>
<section aria-labelledby="surec-rehberleri">
  <h2 id="surec-rehberleri">Süreç rehberleri</h2>
  ${kutuphaneListesi(surecler, kok)}
</section>`,
    })
  );
}

// --- Arama
{
  const yol = 'arama/';
  yaz(
    `${yol}index.html`,
    sayfa({
      yol,
      baslik: 'Arama',
      aciklama: 'Bülten yazıları ve kütüphanede arama',
      yolIzi: [{ ad: 'Arama', yol }],
      govde: `<h1>Arama</h1>
<form class="arama-formu" role="search" action="./" method="get" data-arama-formu>
  <label for="arama-kutusu">Aranacak sözcük</label>
  <div class="arama-satiri">
    <input id="arama-kutusu" type="search" name="q" autocomplete="off" aria-describedby="arama-ipucu">
    <button class="dugme dugme-birincil" type="submit">Ara</button>
  </div>
  <p id="arama-ipucu" class="ipucu">Türkçe karakterleri yazmasanız da bulur: “sinif” yazınca “sınıf” da çıkar.</p>
</form>
<p class="arama-durum" role="status" aria-live="polite" data-arama-durum></p>
<ol class="arama-sonuclari" data-arama-sonuclari></ol>
<noscript><p>Arama için tarayıcınızda JavaScript açık olmalıdır.</p></noscript>`,
    })
  );
}

// --- İletişim
{
  const yol = 'iletisim/';
  const kok = kokYolu(yol);
  const b = iletisim.bilgi;
  const telefon = String(b.telefon || '');
  const telRakam = telefon.replace(/[^\d+]/g, '');
  const giris = iletisim.govde.trim() ? cevir(iletisim.govde, { kok, derinlik: 1, dosya: iletisim.dosya }).html : '';
  const web = String(b.web || '');
  const webGercek = /^https?:\/\//.test(web);
  const instagram = String(b.instagram || '').replace(/^@/, '').trim();
  yaz(
    `${yol}index.html`,
    sayfa({
      yol,
      baslik: 'İletişim',
      aciklama: 'Keçiören RAM Özel Eğitim Hizmetleri Bölümü iletişim bilgileri',
      yolIzi: [{ ad: 'İletişim', yol }],
      taslak: b.taslak !== false,
      govde: `<h1>İletişim</h1>
${giris}
<div class="iletisim-karti">
  <h2>${kacis(b.kurum || '')}${b.bolum ? `<span>${kacis(b.bolum)}</span>` : ''}</h2>
  <dl>
    <dt>Adres</dt>
    <dd><address>${yerTutucu(kacis(b.adres || '[ADRES GELECEK]')).replace(/\n/g, '<br>')}</address></dd>
    <dt>Telefon</dt>
    <dd>
      <span class="telefon" id="telefon-metni">${yerTutucu(kacis(telefon || '[TELEFON GELECEK]'))}</span>
      <span class="iletisim-dugmeleri">
        <button type="button" class="dugme dugme-kucuk" data-kopyala="#telefon-metni">Numarayı kopyala</button>
        ${telRakam.length >= 7 ? `<a class="dugme dugme-kucuk" href="tel:${kacis(telRakam)}">Ara</a>` : ''}
      </span>
    </dd>
    <dt>Web sitesi</dt>
    <dd>${webGercek ? `<a class="dis-baglanti" href="${kacis(web)}" rel="noopener">${kacis(web.replace(/^https?:\/\//, ''))}</a>` : yerTutucu(kacis(web || '[WEB SİTESİ GELECEK]'))}</dd>
    ${
      instagram
        ? `<dt>Instagram</dt>
    <dd><a class="dis-baglanti" href="https://www.instagram.com/${encodeURIComponent(instagram)}/" rel="noopener">@${kacis(instagram)}</a></dd>`
        : ''
    }
  </dl>
</div>`,
    })
  );
}

// --- Erişilebilirlik
{
  const yol = 'erisilebilirlik/';
  yaz(
    `${yol}index.html`,
    sayfa({
      yol,
      baslik: 'Erişilebilirlik',
      taslak: false,
      yolIzi: [{ ad: 'Erişilebilirlik', yol }],
      govde: `<h1>Erişilebilirlik</h1>
<p>Bu site WCAG 2.1 AA düzeyi gözetilerek hazırlanmıştır.</p>
<ul>
  <li>Sayfanın üstündeki <strong>Okuma ayarları</strong> düğmesiyle yazı boyutunu büyütebilir, açık ya da koyu temayı, yüksek kontrastı ve geniş satır aralığını seçebilirsiniz. Seçimleriniz bu cihazda hatırlanır.</li>
  <li>Yazıların üstündeki <strong>Sesli dinle</strong> düğmesi, tarayıcınızın Türkçe sesiyle metni okur. Tarayıcınız bu özelliği desteklemiyorsa düğme görünmez.</li>
  <li>Tüm site klavyeyle kullanılabilir: <kbd>Sekme</kbd> tuşuyla ilerleyin, <kbd>Enter</kbd> ile seçin, açık paneli <kbd>Esc</kbd> ile kapatın.</li>
  <li>Cihazınızda “hareketi azalt” ayarı açıksa site kayma ve geçiş efektlerini kullanmaz.</li>
  <li><strong>Yazdır</strong> düğmesi menüler olmadan sade bir çıktı verir.</li>
  <li>Site bir kez açıldıktan sonra internet olmadan da çalışır. Telefonunuzda tarayıcı menüsünden “Ana ekrana ekle”yi seçebilirsiniz.</li>
</ul>
<p>Erişimde sorun yaşarsanız <a href="../iletisim/">bize ulaşın</a>.</p>`,
    })
  );
}

// --- Çevrimdışı ve 404 sayfaları
{
  yaz(
    'cevrimdisi/index.html',
    sayfa({
      yol: 'cevrimdisi/',
      baslik: 'İnternet bağlantısı yok',
      taslak: false,
      govde: `<h1>İnternet bağlantısı yok</h1>
<p>Bu sayfa henüz cihazınıza kaydedilmedi. Bağlantınız geri geldiğinde yeniden deneyin.</p>
<p><a href="../">Ana sayfaya dönün</a>; daha önce açtığınız sayfalar internetsiz de açılır.</p>`,
    })
  );
  const kokYol = new URL(ADRES).pathname;
  const html = sayfa({
    yol: '',
    baslik: 'Sayfa bulunamadı',
    taslak: false,
    govde: `<h1>Sayfa bulunamadı</h1>
<p>Aradığınız sayfa taşınmış ya da kaldırılmış olabilir.</p>
<p><a href="${kokYol}">Ana sayfaya dönün</a> ya da <a href="${kokYol}arama/">arama yapın</a>.</p>`,
  })
    .replace(/<title>[^<]*<\/title>/, `<title>Sayfa bulunamadı · ${kacis(SITE.ad)}</title>`)
    .replace(/(href|src)="\.\/(?!\/)/g, `$1="${kokYol}`)
    .replace('data-kok="./"', `data-kok="${kokYol}"`);
  sayfalar.pop(); // 404 sayfası karekod listesine girmez
  yaz('404.html', html);
}

// --- Karekodlar
{
  const yol = 'karekodlar/';
  const kok = kokYolu(yol);
  const liste = [...sayfalar];
  liste.push({ yol, baslik: 'Karekodlar', karekod: karekodAdi(yol) });
  fs.mkdirSync(path.join(CIKTI, 'karekod'), { recursive: true });
  for (const s of liste) {
    const adres = ADRES + s.yol;
    const svg = await QRCode.toString(adres, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#000000', light: '#ffffff' } });
    yaz(`karekod/${s.karekod}.svg`, svg);
    await QRCode.toFile(path.join(CIKTI, 'karekod', `${s.karekod}.png`), adres, { errorCorrectionLevel: 'M', margin: 2, width: 600 });
  }
  yaz(
    `${yol}index.html`,
    sayfa({
      yol,
      baslik: 'Karekodlar',
      taslak: false,
      aciklama: 'Bülten ve kütüphane sayfalarının karekodları',
      yolIzi: [{ ad: 'Karekodlar', yol }],
      govde: `<h1>Karekodlar</h1>
<p>Her karekod doğrudan ilgili sayfayı açar. Bülten tasarımına eklemek için SVG (her boyutta net) ya da PNG dosyasını indirin.</p>
${ADRES_ORNEK ? '<p class="uyari" role="note"><strong>Dikkat:</strong> Sitenin gerçek adresi henüz ayarlanmadı. Bu karekodlar örnek adresi gösteriyor; basılı bültende kullanmadan önce <code>site.config.yml</code> dosyasındaki adresi düzeltip siteyi yeniden derleyin.</p>' : ''}
<ul class="karekod-listesi">
${liste
  .map(
    (s) => `<li id="kk-${s.karekod}" class="karekod-karti">
  <img src="${kok}karekod/${s.karekod}.svg" alt="“${kacis(s.baslik)}” sayfasının karekodu" width="160" height="160" loading="lazy">
  <div>
    <h2 class="karekod-baslik"><a href="${kok}${s.yol}">${yerTutucu(kacis(s.baslik))}</a></h2>
    <p class="karekod-adres"><code>${kacis(ADRES + s.yol)}</code></p>
    <p><a href="${kok}karekod/${s.karekod}.svg" download>SVG indir</a> · <a href="${kok}karekod/${s.karekod}.png" download>PNG indir</a></p>
  </div>
</li>`
  )
  .join('\n')}
</ul>`,
    })
  );
}

// ------------------------------------------------------------------
// Varlıklar, simgeler, arama dizini, PWA
// ------------------------------------------------------------------

kopyalaKlasor(path.join(KAYNAK, 'assets'), path.join(CIKTI, 'assets'));
yazitipleriniKopyala();
fs.mkdirSync(path.join(CIKTI, 'simgeler'), { recursive: true });
fs.copyFileSync(path.join(KAYNAK, 'simge.svg'), path.join(CIKTI, 'simgeler', 'simge.svg'));
for (const boyut of [180, 192, 512]) {
  fs.writeFileSync(path.join(CIKTI, 'simgeler', `simge-${boyut}.png`), simgePng(boyut));
}

// İçerik klasörlerindeki görseller ve belgeler (Markdown dışındaki dosyalar)
for (const s of sayilar) kopyalaKlasor(s.klasor, path.join(CIKTI, s.yol), (f) => !f.endsWith('.md'));
for (const alt of ['gereksinim', 'surec']) {
  kopyalaKlasor(path.join(ICERIK, 'kutuphane', alt), path.join(CIKTI, 'kutuphane', alt), (f) => !f.endsWith('.md'));
}

yaz('arama-dizini.json', JSON.stringify(aramaDizini));

yaz(
  'manifest.webmanifest',
  JSON.stringify(
    {
      name: SITE.ad,
      short_name: 'RAM Özel Eğitim',
      description: SITE.altBaslik,
      lang: 'tr',
      dir: 'ltr',
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: '#fffdf9',
      theme_color: '#1f3a4d',
      icons: [
        { src: 'simgeler/simge-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: 'simgeler/simge-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        { src: 'simgeler/simge.svg', sizes: 'any', type: 'image/svg+xml' },
      ],
    },
    null,
    2
  )
);

if (!ADRES_ORNEK) {
  yaz(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sayfalar
      .filter((s) => s.yol !== 'cevrimdisi/')
      .map((s) => `  <url><loc>${kacis(ADRES + s.yol)}</loc></url>`)
      .join('\n')}\n</urlset>\n`
  );
}

// Hizmet çalışanı (service worker): tüm sayfaları cihaza kaydeder, internetsiz açılmasını sağlar.
{
  const onbellek = [];
  const ozet = crypto.createHash('sha256');
  (function gez(klasor, onEk) {
    for (const g of fs.readdirSync(klasor, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const tam = path.join(klasor, g.name);
      const goreceAd = onEk + g.name;
      if (g.isDirectory()) gez(tam, goreceAd + '/');
      else {
        ozet.update(goreceAd);
        ozet.update(fs.readFileSync(tam));
        if (goreceAd === '404.html' || goreceAd === 'sitemap.xml') continue;
        if (goreceAd.startsWith('karekod/') && goreceAd.endsWith('.png')) continue;
        if (g.name === 'index.html') onbellek.push('./' + onEk);
        else onbellek.push('./' + goreceAd);
      }
    }
  })(CIKTI, '');
  const surum = ozet.digest('hex').slice(0, 12);
  const sablon = fs.readFileSync(path.join(KAYNAK, 'sw.js'), 'utf8');
  yaz('sw.js', sablon.replace('__SURUM__', surum).replace('__DOSYALAR__', JSON.stringify(onbellek, null, 1)));
}

// .htaccess: Apache sunucularında 404 sayfası ve doğru dosya türleri
yaz(
  '.htaccess',
  `ErrorDocument 404 ${new URL(ADRES).pathname}404.html
AddType application/manifest+json .webmanifest
AddDefaultCharset utf-8
<IfModule mod_headers.c>
  <Files "sw.js">
    Header set Cache-Control "no-cache"
  </Files>
</IfModule>
`
);

// ------------------------------------------------------------------
// Yazı tipleri: bültenle aynı yazı tipleri (Domine, Nunito Sans) siteye gömülür,
// böylece internetsiz de aynı görünür. Lisans: SIL Open Font License.
// ------------------------------------------------------------------

function yazitipleriniKopyala() {
  const ARALIK = {
    latin:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    'latin-ext':
      'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  };
  const AILELER = [
    { ad: 'Domine', paket: 'domine', bicemler: ['normal'] },
    { ad: 'Nunito Sans', paket: 'nunito-sans', bicemler: ['normal', 'italic'] },
  ];
  const hedef = path.join(CIKTI, 'assets', 'yazitipleri');
  fs.mkdirSync(hedef, { recursive: true });
  let css = '/* Domine ve Nunito Sans · SIL Open Font License 1.1 (lisans metinleri bu klasörde) */\n';
  for (const a of AILELER) {
    const klasor = path.join(KOK, 'node_modules', '@fontsource', a.paket);
    if (!fs.existsSync(klasor)) {
      uyar(`${a.ad} yazı tipi bulunamadı; "npm install" komutunu çalıştırın. Site sistem yazı tipiyle derlendi.`);
      continue;
    }
    fs.copyFileSync(path.join(klasor, 'LICENSE'), path.join(hedef, `LICENSE-${a.paket}.txt`));
    for (const bicem of a.bicemler) {
      for (const agirlik of [400, 700]) {
        for (const [alt, aralik] of Object.entries(ARALIK)) {
          const dosya = `${a.paket}-${alt}-${agirlik}-${bicem}.woff2`;
          fs.copyFileSync(path.join(klasor, 'files', dosya), path.join(hedef, dosya));
          css += `@font-face{font-family:'${a.ad}';font-style:${bicem};font-weight:${agirlik};font-display:swap;src:url(${dosya}) format('woff2');unicode-range:${aralik}}\n`;
        }
      }
    }
  }
  fs.writeFileSync(path.join(hedef, 'yazitipleri.css'), css);
}

// ------------------------------------------------------------------
// Uygulama simgesi (PNG) — ek kütüphane gerektirmeden üretilir
// ------------------------------------------------------------------

function simgePng(n) {
  const zemin = [31, 58, 77];
  const beyaz = [255, 253, 249];
  const sari = [180, 83, 42];
  const satirlar = [];
  for (let y = 0; y < n; y++) {
    const satir = Buffer.alloc(1 + n * 3);
    for (let x = 0; x < n; x++) {
      const u = x / n;
      const v = y / n;
      let r = zemin;
      // Açık kitap: iki sayfa, ortada sırt
      const solSayfa = u > 0.22 && u < 0.485 && v > 0.32 + (0.485 - u) * 0.12 && v < 0.7 + (0.485 - u) * 0.06;
      const sagSayfa = u > 0.515 && u < 0.78 && v > 0.32 + (u - 0.515) * 0.12 && v < 0.7 + (u - 0.515) * 0.06;
      if (solSayfa || sagSayfa) r = beyaz;
      // Satır çizgileri
      if (solSayfa || sagSayfa) {
        const satirNo = Math.floor((v - 0.4) / 0.065);
        const ic = (v - 0.4) % 0.065;
        if (v > 0.4 && v < 0.64 && ic < 0.018 && (solSayfa ? u > 0.27 && u < 0.45 : u > 0.55 && u < 0.73) && satirNo < 4) r = zemin;
      }
      // Ayraç
      if (u > 0.6 && u < 0.66 && v > 0.26 && v < 0.42 && !(v > 0.38 && Math.abs(u - 0.63) < (v - 0.38) * 0.75)) r = sari;
      satir[1 + x * 3] = r[0];
      satir[2 + x * 3] = r[1];
      satir[3 + x * 3] = r[2];
    }
    satirlar.push(satir);
  }
  const veri = zlib.deflateSync(Buffer.concat(satirlar), { level: 9 });
  const parca = (tur, icerik) => {
    const uz = Buffer.alloc(4);
    uz.writeUInt32BE(icerik.length);
    const turVeri = Buffer.concat([Buffer.from(tur, 'ascii'), icerik]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(turVeri) >>> 0);
    return Buffer.concat([uz, turVeri, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(n, 0);
  ihdr.writeUInt32BE(n, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    parca('IHDR', ihdr),
    parca('IDAT', veri),
    parca('IEND', Buffer.alloc(0)),
  ]);
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c;
}

// ------------------------------------------------------------------
// Rapor
// ------------------------------------------------------------------

console.log(`\n✔ Site derlendi → site/ klasörü`);
console.log(`  ${sayilar.length} bülten sayısı, ${tumYazilar.length} yazı, ${gereksinimler.length} gereksinim türü, ${surecler.length} süreç rehberi`);
console.log(`  ${sayfalar.length} sayfa için karekod üretildi → site/karekod/`);
if (uyarilar.length) {
  console.log(`\n⚠ ${uyarilar.length} uyarı:`);
  for (const u of uyarilar) console.log(`  - ${u}`);
}
console.log('');
