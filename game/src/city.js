// Porto Lumen — peta kota: jalan, blok, gedung, taman, pantai, dan laut.
// Kota ini grid 11x11: jalan selebar ROAD memisahkan blok-blok TILE. Gedung
// dibangun sekali dari seed, lalu dipakai untuk gambar dan tabrakan.

import { TILE, ROAD, PITCH, BLOCKS, WORLD, SEA_TOP, SAND_TOP, LANDMARKS, COLORS } from './config.js';
import { mulberry32, rand, randInt, pick } from './random.js';

// Tepi jalan ke-i (0..BLOCKS): [i*PITCH, i*PITCH+ROAD].
export function roadBand(i) {
  return [i * PITCH, i * PITCH + ROAD];
}

// Apakah titik (x, y) berada di atas jalan (bukan di dalam blok)?
export function isRoadAt(x, y) {
  const onBand = (v) => {
    const m = ((v % PITCH) + PITCH) % PITCH;
    return m < ROAD;
  };
  return onBand(x) || onBand(y);
}

// Titik tengah jalan ke-i (dipakai kendaraan dan pejalan kaki).
export function roadCenter(i) {
  return i * PITCH + ROAD / 2;
}

// Persegi blok (kolom, baris): [x0, y0, x1, y1].
export function blockRect(col, row) {
  const x0 = col * PITCH + ROAD;
  const y0 = row * PITCH + ROAD;
  return [x0, y0, x0 + TILE, y0 + TILE];
}

// Titik tengah sebuah blok.
export function blockCenter(col, row) {
  const [x0, y0, x1, y1] = blockRect(col, row);
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}

// Titik tengah landmark dari LANDMARKS (garage, docks, plaza, ...).
export function landmarkPoint(name) {
  const lm = LANDMARKS[name];
  return blockCenter(lm.col, lm.row);
}

// Titik penanda misi: di jalan tepat di luar blok landmark (selalu bisa
// dicapai mobil dan pejalan kaki), bukan di tengah blok yang penuh gedung.
// Blok baris paling bawah (pier) memakai jalan di atasnya, karena jalan di
// bawahnya sudah masuk laut.
export function markerPoint(name) {
  const lm = LANDMARKS[name];
  const [cx, cy] = blockCenter(lm.col, lm.row);
  const southRoadY = (lm.row + 1) * PITCH + ROAD / 2;
  const northRoadY = lm.row * PITCH + ROAD / 2;
  const y = lm.row >= BLOCKS - 1 ? northRoadY : southRoadY;
  return [cx, y];
}

// Apakah titik berada di air (laut di tepi selatan)?
export function isWater(x, y) {
  return y >= SEA_TOP;
}

// Apakah titik berada di pasir pantai?
export function isSand(x, y) {
  return y >= SAND_TOP && y < SEA_TOP;
}

// Satu gedung: persegi panjang padat untuk gambar dan tabrakan.
function makeBuilding(rng, col, row, gx, gy, w, h) {
  const [bx, by] = blockRect(col, row);
  return {
    x: bx + gx,
    y: by + gy,
    w,
    h,
    color: pick(rng, COLORS.buildingRoof),
    floors: randInt(rng, 1, 4),
  };
}

// Bangun seluruh kota dari satu seed. Blok taman (4,4) tanpa gedung dan
// penuh pohon; blok baris bawah menghadap pantai (tanpa gedung di tepi laut).
export function buildCity(seed) {
  const rng = mulberry32(seed);
  const buildings = [];
  const trees = [];
  for (let row = 0; row < BLOCKS; row++) {
    for (let col = 0; col < BLOCKS; col++) {
      if (col === LANDMARKS.park.col && row === LANDMARKS.park.row) {
        for (let i = 0; i < 26; i++) {
          trees.push({
            x: col * PITCH + ROAD + rand(rng, 20, TILE - 20),
            y: row * PITCH + ROAD + rand(rng, 20, TILE - 20),
            r: rand(rng, 9, 16),
          });
        }
        continue;
      }
      if (row === BLOCKS - 1) continue; // baris pantai: pasir, bukan gedung
      const n = randInt(rng, 1, 3);
      for (let i = 0; i < n; i++) {
        const w = rand(rng, 60, 110);
        const h = rand(rng, 60, 110);
        const gx = rand(rng, 8, TILE - w - 8);
        const gy = rand(rng, 8, TILE - h - 8);
        // Jangan menumpuk gedung di dalam satu blok.
        const clash = buildings.some(
          (b) =>
            b.x < col * PITCH + ROAD + gx + w + 12 &&
            b.x + b.w > col * PITCH + ROAD + gx - 12 &&
            b.y < row * PITCH + ROAD + gy + h + 12 &&
            b.y + b.h > row * PITCH + ROAD + gy - 12,
        );
        if (!clash) buildings.push(makeBuilding(rng, col, row, gx, gy, w, h));
      }
      // Pohon hias di sudut blok.
      if (chance(rng, 0.6)) {
        trees.push({
          x: col * PITCH + ROAD + rand(rng, 16, 40),
          y: row * PITCH + ROAD + rand(rng, 16, 40),
          r: rand(rng, 8, 13),
        });
      }
    }
  }
  return { buildings, trees, seed };
}

function chance(rng, p) {
  return rng() < p;
}

// Tabrakan lingkaran (x, y, r) dengan gedung: kembalikan posisi yang sudah
// didorong keluar dari gedung, atau null bila tidak bertabrakan.
export function collideBuildings(buildings, x, y, r) {
  for (const b of buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 === 0) return { x: x + r, y };
    const d = Math.sqrt(d2);
    return { x: cx + (dx / d) * r, y: cy + (dy / d) * r };
  }
  return null;
}

// Titik jalan acak (tengah jalan), untuk spawn kendaraan dan pejalan kaki.
export function randomRoadPoint(rng) {
  const horizontal = rng() < 0.5;
  const band = randInt(rng, 0, BLOCKS);
  const along = rand(rng, 0, WORLD);
  if (horizontal) return [along, roadCenter(band)];
  return [roadCenter(band), along];
}

// Persimpangan terdekat dari (x, y): dipakai AI lalu lintas untuk belok.
export function nearestJunction(x, y) {
  const ix = Math.round((x - ROAD / 2) / PITCH);
  const iy = Math.round((y - ROAD / 2) / PITCH);
  return [
    Math.max(0, Math.min(BLOCKS, ix)) * PITCH + ROAD / 2,
    Math.max(0, Math.min(BLOCKS, iy)) * PITCH + ROAD / 2,
  ];
}
