// Porto Lumen — peladen statis kecil untuk main lokal (Node 22, pustaka standar saja).
// Melayani folder game/ di http://localhost:8080 lalu membukanya di browser.
// Jalankan dari root repo:  node serve.ts

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const akarRepo = fileURLToPath(new URL('.', import.meta.url));
const folderGame = join(akarRepo, 'game');
const port = 8080;

// Jenis konten yang dikenali berdasarkan akhiran nama berkas.
const jenisKonten = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
};

const peladen = createServer((permintaan, jawaban) => {
  const alamat = new URL(permintaan.url ?? '/', 'http://localhost');
  let jalur = alamat.pathname === '/' ? 'index.html' : alamat.pathname.slice(1);
  jalur = normalize(jalur).replace(/^(\.\.[/\\])+/, '');
  const berkas = join(folderGame, jalur);
  if (!berkas.startsWith(folderGame) || !existsSync(berkas) || !statSync(berkas).isFile()) {
    jawaban.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    jawaban.end('Tidak ditemukan: ' + alamat.pathname);
    return;
  }
  const akhiran = extname(berkas).toLowerCase();
  jawaban.writeHead(200, { 'content-type': jenisKonten[akhiran] ?? 'application/octet-stream' });
  jawaban.end(readFileSync(berkas));
});

peladen.listen(port, () => {
  console.log(`Porto Lumen tersaji di http://localhost:${port}`);
});
