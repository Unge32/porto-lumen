// Porto Lumen — wanted level: naik saat berbuat kriminal, turun saat
// bersembunyi, dan jumlah polisi yang dikerahkan mengikuti levelnya.

import { dist } from './random.js';
import { spawnPoliceCar, spawnFootCop } from './world.js';

// Kejahatan: naikkan wanted, catat waktunya.
export function addWanted(S, n) {
  S.wanted = Math.min(5, S.wanted + n);
  S.lastCrimeAt = S.time;
}

export function updateWanted(S, dt, sfx) {
  // Turun perlahan bila sudah lama tidak berbuat kriminal dan tidak ada
  // polisi yang dekat.
  if (S.wanted > 0 && S.time - S.lastCrimeAt > 20) {
    let policeNear = false;
    for (const car of S.cars) {
      if (car.kind === 'police' && dist(car.x, car.y, S.player.x, S.player.y) < 600) {
        policeNear = true;
        break;
      }
    }
    if (!policeNear) {
      S.heatTimer += dt;
      if (S.heatTimer > 8) {
        S.heatTimer = 0;
        S.wanted--;
      }
    } else {
      S.heatTimer = 0;
    }
  } else {
    S.heatTimer = 0;
  }

  // Kerahkan polisi sesuai level: mobil polisi + polisi jalan kaki.
  const wantCars = Math.min(S.wanted, 4);
  const wantCops = S.wanted >= 2 ? Math.min(S.wanted - 1, 3) : 0;
  const haveCars = S.cars.filter((c) => c.kind === 'police').length;
  const haveCops = S.peds.filter((p) => p.kind === 'cop').length;
  if (haveCars < wantCars) spawnPoliceCar(S);
  if (haveCops < wantCops) spawnFootCop(S);
  // Wanted 0: polisi pulang (mobil menjauh, pejalan kaki kembali jadi warga).
  if (S.wanted === 0) {
    S.cars = S.cars.filter((c) => {
      if (c.kind !== 'police') return true;
      return dist(c.x, c.y, S.player.x, S.player.y) < 500;
    });
    for (const ped of S.peds) {
      if (ped.kind === 'cop' && dist(ped.x, ped.y, S.player.x, S.player.y) > 500) {
        ped.kind = 'civilian';
      }
    }
  }
  sfx.siren(dt, S.wanted);
}
