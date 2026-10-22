// Derlenen siteyi bilgisayarınızda önizlemek için küçük bir sunucu.
// Çalıştırmak için:  npm run onizle   → tarayıcıda http://localhost:8080 adresini açın.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const PORT = Number(process.env.PORT || 8080);
const TURLER = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
};

if (!fs.existsSync(SITE)) {
  console.error('Önce siteyi derleyin:  npm run derle');
  process.exit(1);
}

http
  .createServer((istek, yanit) => {
    let yol = decodeURIComponent(new URL(istek.url, 'http://x').pathname);
    let dosya = path.join(SITE, yol);
    if (!dosya.startsWith(SITE)) {
      yanit.writeHead(403).end();
      return;
    }
    if (fs.existsSync(dosya) && fs.statSync(dosya).isDirectory()) {
      if (!yol.endsWith('/')) {
        yanit.writeHead(301, { Location: yol + '/' }).end();
        return;
      }
      dosya = path.join(dosya, 'index.html');
    }
    if (!fs.existsSync(dosya)) {
      yanit.writeHead(404, { 'Content-Type': TURLER['.html'] });
      fs.createReadStream(path.join(SITE, '404.html')).pipe(yanit);
      return;
    }
    yanit.writeHead(200, {
      'Content-Type': TURLER[path.extname(dosya).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(dosya).pipe(yanit);
  })
  .listen(PORT, () => {
    console.log(`Önizleme hazır: http://localhost:${PORT}/  (durdurmak için Ctrl+C)`);
  });
