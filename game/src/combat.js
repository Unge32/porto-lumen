// Porto Lumen — pertempuran: tembakan pemain, peluru, damage, dan peti.
// Peluru adalah titik yang bergerak cepat; tabrakan dicek terhadap gedung,
// mobil, dan orang. Menembak warga menambah wanted; mengalahkan musuh
// memberi uang dan mengurangi hitungan Viper misi 3.

import { BULLET_SPEED, BULLET_DAMAGE, PLAYER_R, CAR_H } from './config.js';
import { dist } from './random.js';
import { collideBuildings } from './city.js';
import { spawnParticles } from './world.js';

// Pemain menembak ke arah mouse (jalan kaki) atau ke arah mobil (di mobil).
export function playerShoot(S, input, cam, sfx) {
  const p = S.player;
  if (p.fireCd > 0 || S.ammo <= 0 || S.mode !== 'playing' || p.dead) return;
  p.fireCd = 0.22;
  S.ammo--;
  S.stats.shotsFired++;
  const wx = cam.x + input.mouseX;
  const wy = cam.y + input.mouseY;
  const a = p.onFoot ? Math.atan2(wy - p.y, wx - p.x) : p.angle;
  const ox = p.x + Math.cos(a) * 22;
  const oy = p.y + Math.sin(a) * 22;
  S.bullets.push({ x: ox, y: oy, vx: Math.cos(a) * BULLET_SPEED, vy: Math.sin(a) * BULLET_SPEED, life: 1.1, from: 'player', damage: BULLET_DAMAGE });
  spawnParticles(S, ox, oy, '#ffe08a', 4, 120);
  sfx.shot();
}

function hitBuilding(S, b) {
  for (const g of S.city.buildings) {
    if (b.x >= g.x && b.x <= g.x + g.w && b.y >= g.y && b.y <= g.y + g.h) return true;
  }
  return false;
}

export function updateBullets(S, dt, sfx) {
  const p = S.player;
  for (const b of S.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  S.bullets = S.bullets.filter((b) => {
    if (b.life <= 0) return false;
    if (hitBuilding(S, b)) {
      spawnParticles(S, b.x, b.y, '#aaaaaa', 3, 90);
      return false;
    }
    if (b.from === 'player') {
      // Kena pejalan kaki (musuh atau warga).
      for (const ped of S.peds) {
        if (ped.hp <= 0) continue;
        if (dist(b.x, b.y, ped.x, ped.y) < 16) {
          ped.hp -= b.damage;
          spawnParticles(S, b.x, b.y, '#ff4444', 6, 150);
          if (ped.kind === 'civilian') {
            S.wanted = Math.min(5, S.wanted + 1);
            S.lastCrimeAt = S.time;
            ped.fleeing = true;
            ped.wanderCd = 3;
          }
          return false;
        }
      }
      // Kena mobil (polisi, bos, atau lalu lintas).
      for (const car of S.cars) {
        if (car === p.car) continue;
        const dx = b.x - car.x;
        const dy = b.y - car.y;
        const ca = Math.cos(-car.angle);
        const sa = Math.sin(-car.angle);
        const lx = dx * ca - dy * sa;
        const ly = dx * sa + dy * ca;
        if (Math.abs(lx) < 26 && Math.abs(ly) < 14) {
          car.hp -= b.damage;
          spawnParticles(S, b.x, b.y, '#ffaa33', 6, 150);
          if (car.kind === 'police' || car.kind === 'boss') {
            S.wanted = Math.min(5, S.wanted + 1);
            S.lastCrimeAt = S.time;
          }
          if (car.hp <= 0 && car.kind === 'traffic') {
            spawnParticles(S, car.x, car.y, '#888888', 16, 200);
            S.cars = S.cars.filter((c) => c !== car);
          }
          return false;
        }
      }
    } else {
      // Peluru musuh kena pemain.
      if (!p.dead && dist(b.x, b.y, p.x, p.y) < PLAYER_R + 4) {
        S.health -= b.damage;
        S.lastHurtAt = S.time;
        spawnParticles(S, b.x, b.y, '#ff4444', 5, 140);
        if (S.health <= 0) {
          S.health = 0;
          p.dead = true;
          S.mode = 'over';
        }
        return false;
      }
      // Peluru musuh kena mobil pemain.
      if (p.car && !p.onFoot) {
        const car = p.car;
        const dx = b.x - car.x;
        const dy = b.y - car.y;
        const ca = Math.cos(-car.angle);
        const sa = Math.sin(-car.angle);
        const lx = dx * ca - dy * sa;
        const ly = dx * sa + dy * ca;
        if (Math.abs(lx) < 26 && Math.abs(ly) < 14) {
          car.hp -= b.damage;
          spawnParticles(S, b.x, b.y, '#ffaa33', 4, 120);
          if (car.hp <= 0) {
            spawnParticles(S, car.x, car.y, '#ff8800', 20, 240);
            sfx.crash();
            p.onFoot = true;
            p.x = car.x + 40;
            p.y = car.y + 40;
            S.cars = S.cars.filter((c) => c !== car);
            p.car = null;
          }
          return false;
        }
      }
    }
    return true;
  });
}

// Peti amunisi / kesehatan: diambil saat pemain menyentuhnya.
export function updateCrates(S, sfx) {
  const p = S.player;
  for (const c of S.crates) {
    if (c.taken) continue;
    if (dist(p.x, p.y, c.x, c.y) < 30) {
      c.taken = true;
      if (c.kind === 'ammo') {
        S.ammo += 24;
        S.message = 'Ammo +24';
      } else {
        S.health = Math.min(100, S.health + 40);
        S.message = 'Health +40';
      }
      S.messageAt = S.time;
      sfx.pickup();
    }
  }
}
