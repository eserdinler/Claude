// Keçiören RAM Özel Eğitim · tarayıcı betiği
// Okuma ayarları, sesli okuma, arama, bağlantı kopyalama ve çevrimdışı kullanım.
(function () {
  'use strict';

  var kok = document.documentElement.getAttribute('data-kok') || './';
  var duyuruAlani = document.querySelector('.duyuru');
  var duyuruZamani;

  function duyur(metin) {
    if (!duyuruAlani) return;
    duyuruAlani.textContent = '';
    clearTimeout(duyuruZamani);
    setTimeout(function () { duyuruAlani.textContent = metin; }, 30);
    duyuruZamani = setTimeout(function () { duyuruAlani.textContent = ''; }, 3500);
  }

  // ------------------------------------------------------------
  // Okuma ayarları
  // ------------------------------------------------------------
  var ANAHTAR = 'ram-okuma-ayarlari';
  var VARSAYILAN = { yazi: '0', tema: 'sistem', kontrast: false, aralik: false };

  function ayarOku() {
    try {
      var a = JSON.parse(localStorage.getItem(ANAHTAR) || '{}');
      return Object.assign({}, VARSAYILAN, a);
    } catch (e) {
      return Object.assign({}, VARSAYILAN);
    }
  }

  function ayarUygula(a) {
    var d = document.documentElement;
    if (a.yazi && a.yazi !== '0') d.setAttribute('data-yazi', a.yazi); else d.removeAttribute('data-yazi');
    if (a.tema && a.tema !== 'sistem') d.setAttribute('data-tema', a.tema); else d.removeAttribute('data-tema');
    if (a.kontrast) d.setAttribute('data-kontrast', 'yuksek'); else d.removeAttribute('data-kontrast');
    if (a.aralik) d.setAttribute('data-aralik', 'genis'); else d.removeAttribute('data-aralik');
  }

  function ayarKaydet(a) {
    try { localStorage.setItem(ANAHTAR, JSON.stringify(a)); } catch (e) { /* özel pencerede kayıt yapılamayabilir */ }
  }

  var ayarDugmesi = document.querySelector('.ayar-dugmesi');
  var panel = document.getElementById('okuma-ayarlari');
  var form = panel && panel.querySelector('form');

  function formuDoldur(a) {
    if (!form) return;
    form.querySelectorAll('input[name="yazi"]').forEach(function (r) { r.checked = r.value === String(a.yazi); });
    form.querySelectorAll('input[name="tema"]').forEach(function (r) { r.checked = r.value === a.tema; });
    form.kontrast.checked = !!a.kontrast;
    form.aralik.checked = !!a.aralik;
  }

  function paneliAc(ac) {
    panel.hidden = !ac;
    ayarDugmesi.setAttribute('aria-expanded', ac ? 'true' : 'false');
    if (ac) {
      var ilk = form.querySelector('input:checked') || form.querySelector('input');
      if (ilk) ilk.focus();
    }
  }

  if (ayarDugmesi && panel && form) {
    formuDoldur(ayarOku());
    ayarDugmesi.addEventListener('click', function () { paneliAc(panel.hidden); });
    form.addEventListener('change', function () {
      var secili = function (ad) { var r = form.querySelector('input[name="' + ad + '"]:checked'); return r ? r.value : VARSAYILAN[ad]; };
      var a = { yazi: secili('yazi'), tema: secili('tema'), kontrast: form.kontrast.checked, aralik: form.aralik.checked };
      ayarUygula(a);
      ayarKaydet(a);
    });
    panel.querySelector('[data-ayar-sifirla]').addEventListener('click', function () {
      var a = Object.assign({}, VARSAYILAN);
      ayarUygula(a);
      ayarKaydet(a);
      formuDoldur(a);
      duyur('Okuma ayarları varsayılana döndü.');
    });
    panel.querySelector('[data-ayar-kapat]').addEventListener('click', function () {
      paneliAc(false);
      ayarDugmesi.focus();
    });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        paneliAc(false);
        ayarDugmesi.focus();
      }
    });
  }

  // Başka sekmede değişen ayarları bu sekmeye de uygula
  window.addEventListener('storage', function (e) {
    if (e.key === ANAHTAR) {
      var a = ayarOku();
      ayarUygula(a);
      formuDoldur(a);
    }
  });

  // ------------------------------------------------------------
  // Kopyalama
  // ------------------------------------------------------------
  function kopyala(metin, basari) {
    function eskiYol() {
      var t = document.createElement('textarea');
      t.value = metin;
      t.setAttribute('readonly', '');
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(t);
      duyur(ok ? basari : 'Kopyalanamadı. Metni seçip elle kopyalayın.');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(metin).then(function () { duyur(basari); }, eskiYol);
    } else {
      eskiYol();
    }
  }

  function kaliciAdres() {
    var el = document.querySelector('[data-kalici]');
    var adres = el ? el.getAttribute('data-kalici') : '';
    // Site henüz örnek adresteyse ya da başka adreste açıldıysa, tarayıcıdaki adresi kullan
    if (!adres || adres.indexOf('ornek-adres.example') !== -1) adres = location.href.split('#')[0];
    return adres;
  }

  var kaliciEl = document.querySelector('[data-kalici]');
  if (kaliciEl && kaliciEl.getAttribute('data-kalici').indexOf('ornek-adres.example') !== -1 && /^https?:/.test(location.protocol)) {
    kaliciEl.textContent = location.href.split('#')[0];
  }

  document.addEventListener('click', function (e) {
    var hedef = e.target.closest('[data-kopyala-adres], [data-kopyala], [data-yazdir]');
    if (!hedef) return;
    if (hedef.hasAttribute('data-yazdir')) {
      window.print();
    } else if (hedef.hasAttribute('data-kopyala-adres')) {
      kopyala(kaliciAdres(), 'Sayfa bağlantısı kopyalandı.');
    } else {
      var kaynak = document.querySelector(hedef.getAttribute('data-kopyala'));
      if (kaynak) kopyala(kaynak.textContent.trim(), 'Kopyalandı: ' + kaynak.textContent.trim());
    }
  });

  // Bölüm bağlantısına tıklanınca adresi kopyala
  document.addEventListener('click', function (e) {
    var a = e.target.closest('.bolum-baglantisi');
    if (!a) return;
    var adres = kaliciAdres() + a.getAttribute('href');
    if (history.replaceState) {
      e.preventDefault();
      history.replaceState(null, '', a.getAttribute('href'));
      var hedef = document.getElementById(a.getAttribute('href').slice(1));
      if (hedef) hedef.scrollIntoView();
    }
    kopyala(adres, 'Bölüm bağlantısı kopyalandı.');
  });

  // ------------------------------------------------------------
  // Sesli okuma (Web Speech API)
  // ------------------------------------------------------------
  var sesli = document.querySelector('.sesli-okuma');
  var okunacak = document.querySelector('[data-okunacak]');
  var konusmaVar = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

  if (sesli && okunacak && konusmaVar) {
    var ss = window.speechSynthesis;
    var d = {
      baslat: sesli.querySelector('[data-sesli="baslat"]'),
      duraklat: sesli.querySelector('[data-sesli="duraklat"]'),
      devam: sesli.querySelector('[data-sesli="devam"]'),
      durdur: sesli.querySelector('[data-sesli="durdur"]'),
      hiz: sesli.querySelector('[data-sesli="hiz"]')
    };
    var parcalar = [];
    var sira = 0;
    var calisiyor = false;
    var turkceSes = null;

    function sesSec() {
      var sesler = ss.getVoices() || [];
      turkceSes = sesler.filter(function (v) { return /^tr(-|_|$)/i.test(v.lang); })[0] || null;
    }
    sesSec();
    if (typeof ss.addEventListener === 'function') ss.addEventListener('voiceschanged', sesSec);

    sesli.hidden = false;

    function durum(ad) {
      d.baslat.hidden = ad !== 'bos';
      d.duraklat.hidden = ad !== 'okuyor';
      d.devam.hidden = ad !== 'duraklatildi';
      d.durdur.hidden = ad === 'bos';
    }

    function isaretKaldir() {
      okunacak.querySelectorAll('.okunuyor').forEach(function (el) { el.classList.remove('okunuyor'); });
    }

    function parcalariTopla() {
      var secici = 'h1, h2, h3, h4, p, li, blockquote, td, th, dt, dd';
      var liste = [];
      okunacak.querySelectorAll(secici).forEach(function (el) {
        if (el.closest('.arac-cubugu, .icindekiler, .etiketler, [aria-hidden="true"]')) return;
        // Yalnızca içinde başka okunacak blok bulunmayan öğeleri al (iki kez okumayı önler)
        if (el.querySelector(secici)) return;
        var kopya = el.cloneNode(true);
        kopya.querySelectorAll('.bolum-baglantisi, [aria-hidden="true"]').forEach(function (x) { x.remove(); });
        var metin = kopya.textContent.replace(/\s+/g, ' ').trim();
        if (metin) liste.push({ el: el, metin: metin });
      });
      return liste;
    }

    function oku() {
      if (sira >= parcalar.length) { bitir(); return; }
      var p = parcalar[sira];
      isaretKaldir();
      p.el.classList.add('okunuyor');
      var u = new SpeechSynthesisUtterance(p.metin);
      u.lang = 'tr-TR';
      if (turkceSes) u.voice = turkceSes;
      u.rate = parseFloat(d.hiz.value) || 1;
      u.onend = function () {
        if (!calisiyor) return;
        sira++;
        oku();
      };
      u.onerror = function (e) {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        bitir();
        duyur('Sesli okuma başlatılamadı.');
      };
      ss.speak(u);
    }

    function bitir() {
      calisiyor = false;
      ss.cancel();
      isaretKaldir();
      durum('bos');
    }

    d.baslat.addEventListener('click', function () {
      ss.cancel();
      parcalar = parcalariTopla();
      sira = 0;
      calisiyor = true;
      durum('okuyor');
      d.duraklat.focus();
      oku();
    });
    d.duraklat.addEventListener('click', function () {
      ss.pause();
      durum('duraklatildi');
      d.devam.focus();
    });
    d.devam.addEventListener('click', function () {
      ss.resume();
      durum('okuyor');
      d.duraklat.focus();
    });
    d.durdur.addEventListener('click', function () {
      bitir();
      d.baslat.focus();
    });
    d.hiz.addEventListener('change', function () {
      if (calisiyor && !ss.paused) {
        // Yeni hızla bulunulan paragraftan devam et
        calisiyor = false;
        ss.cancel();
        calisiyor = true;
        oku();
      }
    });
    window.addEventListener('pagehide', function () { ss.cancel(); });
  }

  // ------------------------------------------------------------
  // Arama
  // ------------------------------------------------------------
  var HARF = { 'ı': 'i', 'i': 'i', 'ş': 's', 'ğ': 'g', 'ç': 'c', 'ö': 'o', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
  function sadelestir(s) {
    return String(s).toLocaleLowerCase('tr').replace(/[ışğçöüâîû]/g, function (h) { return HARF[h]; });
  }
  function kacis(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  var aramaFormu = document.querySelector('[data-arama-formu]');
  if (aramaFormu) {
    var kutu = aramaFormu.querySelector('input[type="search"]');
    var durumEl = document.querySelector('[data-arama-durum]');
    var sonucEl = document.querySelector('[data-arama-sonuclari]');
    var dizin = null;
    var zamanlayici;

    function dizinYukle() {
      if (dizin) return Promise.resolve(dizin);
      return fetch(kok + 'arama-dizini.json')
        .then(function (r) { return r.json(); })
        .then(function (veri) {
          dizin = veri.map(function (k) {
            return Object.assign({}, k, { sb: sadelestir(k.b), sm: sadelestir(k.m), se: sadelestir(k.e || '') });
          });
          return dizin;
        });
    }

    function ozetle(k, terimler) {
      var metin = k.m;
      var sade = k.sm;
      var konum = -1;
      for (var i = 0; i < terimler.length && konum === -1; i++) konum = sade.indexOf(terimler[i]);
      var bas = Math.max(0, konum - 80);
      var son = Math.min(metin.length, bas + 220);
      var parca = metin.slice(bas, son);
      var sadeParca = sade.slice(bas, son);
      // Eşleşmeleri işaretle (sadeleştirme uzunluğu koruduğu için konumlar aynıdır)
      var araliklar = [];
      terimler.forEach(function (t) {
        var j = 0;
        while ((j = sadeParca.indexOf(t, j)) !== -1) { araliklar.push([j, j + t.length]); j += t.length; }
      });
      araliklar.sort(function (a, b) { return a[0] - b[0]; });
      var html = '';
      var imlec = 0;
      araliklar.forEach(function (a) {
        if (a[0] < imlec) return;
        html += kacis(parca.slice(imlec, a[0])) + '<mark>' + kacis(parca.slice(a[0], a[1])) + '</mark>';
        imlec = a[1];
      });
      html += kacis(parca.slice(imlec));
      return (bas > 0 ? '… ' : '') + html + (son < metin.length ? ' …' : '');
    }

    function ara(sorgu) {
      var terimler = sadelestir(sorgu).split(/[^a-z0-9]+/).filter(function (t) { return t.length > 1 || /\d/.test(t); });
      sonucEl.innerHTML = '';
      if (!terimler.length) {
        durumEl.textContent = sorgu.trim() ? 'En az iki harf yazın.' : '';
        return;
      }
      dizinYukle().then(function (d) {
        var sonuclar = [];
        d.forEach(function (k) {
          var puan = 0;
          for (var i = 0; i < terimler.length; i++) {
            var t = terimler[i];
            var p = 0;
            if (k.sb.indexOf(t) !== -1) p += 10;
            if (k.se.indexOf(t) !== -1) p += 5;
            if (k.sm.indexOf(t) !== -1) p += 1 + Math.min(4, k.sm.split(t).length - 2);
            if (!p) return;
            puan += p;
          }
          sonuclar.push({ k: k, puan: puan });
        });
        sonuclar.sort(function (a, b) { return b.puan - a.puan; });
        durumEl.textContent = sonuclar.length
          ? '“' + sorgu.trim() + '” için ' + sonuclar.length + ' sonuç bulundu.'
          : '“' + sorgu.trim() + '” için sonuç bulunamadı. Farklı bir sözcük deneyin.';
        sonucEl.innerHTML = sonuclar.slice(0, 50).map(function (s) {
          return '<li><p class="tur">' + kacis(s.k.t) + '</p><h2><a href="' + kok + s.k.u + '">' + kacis(s.k.b) + '</a></h2><p>' + ozetle(s.k, terimler) + '</p></li>';
        }).join('');
      }).catch(function () {
        durumEl.textContent = 'Arama dizini yüklenemedi. Sayfayı yenileyip yeniden deneyin.';
      });
    }

    var ilkSorgu = new URLSearchParams(location.search).get('q') || '';
    kutu.value = ilkSorgu;
    if (ilkSorgu) ara(ilkSorgu);

    aramaFormu.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = kutu.value;
      if (history.replaceState) history.replaceState(null, '', q ? '?q=' + encodeURIComponent(q) : location.pathname);
      ara(q);
    });
    kutu.addEventListener('input', function () {
      clearTimeout(zamanlayici);
      zamanlayici = setTimeout(function () { ara(kutu.value); }, 250);
    });
  }

  // ------------------------------------------------------------
  // Çevrimdışı kullanım (PWA)
  // ------------------------------------------------------------
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(kok + 'sw.js').catch(function () { /* kurulamazsa site yine çalışır */ });
    });
  }
})();
