// Porto Lumen — kendaraan: fisika mengemudi, lalu lintas, dan kejar-kejaran.
// Mobil pemain dikendalikan input; lalu lintas mengikuti jalan; polisi mengejar;
// mobil bos kabur. Tabrakan dengan gedung dan antar mobil ditangani di sini.

import { CAR_W, CAR_H, CAR_TOP_SPEED, CAR_ACCEL, CAR_BRAKE, CAR_TURN, WORLD, PITCH } from './config.js';
import { clamp, dist, angleTo, turnToward } from './random.js';
import { collideBuildings, nearestJunction } from './city.js';
import { spawnParticles } from './world.js';

// Dorong lingkaran keluar dari persegi gedung, dan jaga di dalam dunia.
function resolveWalls(S, e, r) {
  e.x = clamp(e.x, r, WORLD - r);
  e.y = clamp(e.y, r, WORLD - r);
  const hit = collideBuildings(S.city.buildings, e.x, e.y, r);
  if (hit) {
    e.x = hit.x;
    e.y = hit.y;
    return true;
  }
  return false;
}

// Satu langkah fisika mobil: gas, rem, belok, lalu geser dan tabrakan.
function driveStep(S, car, dt, throttle, steer) {
  const top = car.kind === 'police' ? CAR_TOP_SPEED * 1.08 : car.kind === 'boss' ? CAR_TOP_SPEED * 0.95 : CAR_TOP_SPEED;
  if (throttle > 0) car.speed += CAR_ACCEL * throttle * dt;
  else if (throttle < 0) car.speed += CAR_BRAKE * throttle * dt; // mundur / rem
  else car.speed *= Math.pow(0.4, dt); // melambat sendiri
  car.speed = clamp(car.speed, -140, top);
  const steerPower = clamp(Math.abs(car.speed) / 120, 0, 1) * CAR_TURN;
  car.angle += steer * steerPower * dt * (car.speed >= 0 ? 1 : -1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  car.x = nx;
  car.y = ny;
  if (resolveWalls(S, car, CAR_H / 2 + 4)) {
    if (Math.abs(car.speed) > 180) spawnParticles(S, car.x, car.y, '#888888', 6, 120);
    car.speed *= 0.4;
  }
}

// Tabrakan antar mobil: dorong berpisah, kurangi kecepatan, beri damage kecil
// saat benturan keras (dipakai untuk merusak mobil bos dengan cara menabrak).
function collideCars(S, dt) {
  const cars = S.cars;
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = 44;
      if (d >= min || d === 0) continue;
      const push = (min - d) / 2;
      const nx = dx / d;
      const ny = dy / d;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      const rel = Math.abs(a.speed - b.speed);
      if (rel > 160) {
        if (a.kind === 'boss' || b.kind === 'boss') {
          const boss = a.kind === 'boss' ? a : b;
          boss.hp -= 12;
          spawnParticles(S, boss.x, boss.y, '#ffaa33', 10, 200);
        }
        a.speed *= 0.6;
        b.speed *= 0.6;
      }
    }
  }
}

// AI lalu lintas: pilih persimpangan berikutnya, lalu ikuti jalan lurus.
// Di persimpangan, 70% lurus, sisanya belok kiri/kanan.
function trafficAI(S, car, dt) {
  if (!car.wp) {
    const [jx, jy] = nearestJunction(car.x, car.y);
    car.wp = [jx, jy];
  }
  const [wx, wy] = car.wp;
  const d = dist(car.x, car.y, wx, wy);
  if (d < 26) {
    // Sampai di persimpangan: pilih arah baru.
    const r = Math.random();
    const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    let next = car.wpAngle;
    if (r < 0.7) {
      next = car.wpAngle; // lurus
    } else if (r < 0.85) {
      next = car.wpAngle + Math.PI / 2; // kiri
    } else {
      next = car.wpAngle - Math.PI / 2; // kanan
    }
    const jx = car.wp[0] + Math.cos(next) * PITCH;
    const jy = car.wp[1] + Math.sin(next) * PITCH;
    if (jx > 40 && jx < WORLD - 40 && jy > 40 && jy < WORLD - 40) {
      car.wp = [jx, jy];
      car.wpAngle = next;
    } else {
      // Ujung kota: putar balik.
      car.wpAngle = next + Math.PI;
      car.wp = [car.wp[0] + Math.cos(car.wpAngle) * PITCH, car.wp[1] + Math.sin(car.wpAngle) * PITCH];
    }
    return;
  }
  const target = angleTo(car.x, car.y, wx, wy);
  car.angle = turnToward(car.angle, target, 2.2 * dt);
  // Pelan-pelan di tikungan tajam, ngebut di jalan lurus.
  const want = Math.abs(((target - car.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > 0.6 ? 60 : 110;
  car.speed += clamp(want - car.speed, -160 * dt, 90 * dt);
  driveStep(S, car, dt, 0, 0);
}

// AI polisi: kejar pemain (atau mobilnya), tabrak untuk menghentikan.
function policeAI(S, car, dt) {
  const p = S.player;
  const target = angleTo(car.x, car.y, p.x, p.y);
  car.angle = turnToward(car.angle, target, 3.1 * dt);
  car.speed += clamp(CAR_TOP_SPEED * 1.05 - car.speed, -260 * dt, 300 * dt);
  driveStep(S, car, dt, 0, 0);
  // Menabrak pemain (jalan kaki atau mobil) memberi damage.
  const d = dist(car.x, car.y, p.x, p.y);
  if (d < 46) {
    hurtPlayer(S, car.kind === 'police' ? 12 : 6);
    car.speed *= 0.5;
    spawnParticles(S, p.x, p.y, '#ff5555', 5, 140);
  }
}

// AI bos: kabur dari pemain lewat jalan, sesekali belok di persimpangan.
function bossAI(S, car, dt) {
  const p = S.player;
  if (!car.wp || dist(car.x, car.y, car.wp[0], car.wp[1]) < 30) {
    const away = angleTo(p.x, p.y, car.x, car.y);
    const [jx, jy] = nearestJunction(car.x, car.y);
    const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    let best = dirs[0];
    let bestScore = -1e9;
    for (const dir of dirs) {
      const nx = jx + Math.cos(dir) * PITCH;
      const ny = jy + Math.sin(dir) * PITCH;
      if (nx < 40 || nx > WORLD - 40 || ny < 40 || ny > WORLD - 40) continue;
      const score = Math.cos(dir - away) + Math.random() * 0.4;
      if (score > bestScore) {
        bestScore = score;
        best = dir;
      }
    }
    car.wp = [jx + Math.cos(best) * PITCH, jy + Math.sin(best) * PITCH];
  }
  const target = angleTo(car.x, car.y, car.wp[0], car.wp[1]);
  car.angle = turnToward(car.angle, target, 2.6 * dt);
  car.speed += clamp(CAR_TOP_SPEED * 0.92 - car.speed, -200 * dt, 260 * dt);
  driveStep(S, car, dt, 0, 0);
}

function hurtPlayer(S, amount) {
  if (S.mode !== 'playing' || S.player.dead) return;
  S.health -= amount;
  S.lastHurtAt = S.time;
  if (S.health <= 0) {
    S.health = 0;
    S.player.dead = true;
    S.mode = 'over';
  }
}

export function updateCars(S, dt, input, sfx) {
  const p = S.player;
  // Mobil pemain: kendali dari input.
  if (!p.onFoot && p.car) {
    const car = p.car;
    const throttle = input.down('w', 'ArrowUp') ? 1 : input.down('s', 'ArrowDown') ? -1 : 0;
    const steer = input.down('a', 'ArrowLeft') ? -1 : input.down('d', 'ArrowRight') ? 1 : 0;
    driveStep(S, car, dt, throttle, steer);
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    sfx.engine(Math.abs(car.speed) / CAR_TOP_SPEED);
  } else {
    sfx.engine(0);
  }
  for (const car of S.cars) {
    if (car === p.car) continue;
    if (car.kind === 'traffic') trafficAI(S, car, dt);
    else if (car.kind === 'police') policeAI(S, car, dt);
    else if (car.kind === 'boss') bossAI(S, car, dt);
    // 'parked' diam di tempat.
  }
  collideCars(S, dt);
  // Mobil bos yang hancur: asap + ledakan kecil, lalu hilang dari jalan.
  for (const car of [...S.cars]) {
    if (car.kind === 'boss' && car.hp <= 0 && !S.mission.bossWrecked) {
      S.mission.bossWrecked = true;
      spawnParticles(S, car.x, car.y, '#ff8800', 26, 260);
      spawnParticles(S, car.x, car.y, '#555555', 18, 120);
      sfx.crash();
      S.cars = S.cars.filter((c) => c !== car);
    }
  }
}
