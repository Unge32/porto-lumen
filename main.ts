// Porto Lumen — program penyerahan entri gta6-01 (Node 22, pustaka standar saja).
// Game-nya ada di folder game/ di sebelah file ini: berkas statis yang dimainkan
// browser desktop tanpa jaringan (game/index.html beserta modul-modulnya, tanpa
// pustaka luar dan tanpa satu pun permintaan jaringan). Program ini menyalin game/
// dan screenshots/ ke /output lalu menulis /output/dossier.json — ringkasan yang
// dibaca juri — memakai pustaka make.fun yang sudah di-vendor di vendor/.
// Di luar kontainer penilai, MAKEFUN_OUTPUT_DIR menggantikan /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Folder repo ini (tempat main.ts berada) dan folder keluaran yang dituju.
const akarRepo = fileURLToPath(new URL('.', import.meta.url));
const folderKeluar = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Batas yang dipakai penilai untuk dossier (lihat gate.json di kit): hanya
// text_max_bytes yang membentuk isi dossier; batas lain menolak entri yang
// memang akan ditolak penilai (lebih dari 4 screenshot atau satu di atas 256 KiB;
// game/ lebih dari 993 entri atau 48 MiB; satu path di bawah game/ di atas 1000 byte).
const batasDossier = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function salinGameKeKeluaran(): void {
  mkdirSync(folderKeluar, { recursive: true });
  cpSync(join(akarRepo, 'game'), join(folderKeluar, 'game'), { recursive: true });
  const folderScreenshot = join(akarRepo, 'screenshots');
  if (existsSync(folderScreenshot)) {
    cpSync(folderScreenshot, join(folderKeluar, 'screenshots'), { recursive: true });
  }
}

function tulisDossier(): void {
  const isi = buildDossier(folderKeluar, batasDossier);
  writeFileSync(join(folderKeluar, 'dossier.json'), isi);
}

salinGameKeKeluaran();
tulisDossier();
