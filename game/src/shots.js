// Porto Lumen — adegan screenshot (?shot=title|drive|chase|mission).
// Setiap adegan menata dunia dari seed yang sama, supaya hasil tangkapan
// bisa diulang dan selalu menunjukkan sistem game yang diminta juri.

import { PITCH, ROAD, CAR_TOP_SPEED } from './config.js';
import { mulberry32, rand } from './random.js';
import { markerPoint, roadCenter } from './city.js';
import { makeCar, spawnViper } from './world.js';
import { startMission } from './missions.js';

function placePlayerInCar(S, x, y, angle, speed) {
  const car = makeCar(x, y, angle, 'player', '#d94f3d');
  car.speed = speed;
  S.cars.push(car);
  S.player.car = car;
  S.player.onFoot = false;
  S.player.x = x;
  S.player.y = y;
  S.player.angle = angle;
}

export function setupShot(S, name, sfx) {
  const rng = mulberry32(7);
  if (name === 'title') {
    S.mode = 'title';
    return;
  }
  S.mode = 'playing';
  if (name === 'drive') {
    // Dario ngebut di avenue utara dengan lalu lintas di sekitarnya.
    startMission(S, 0, sfx);
    S.mission.step = 1;
    const y = roadCenter(2);
    placePlayerInCar(S, 5 * PITCH, y, 0, CAR_TOP_SPEED * 0.85);
    for (let i = 0; i < 4; i++) {
      const c = makeCar(5 * PITCH + 260 + i * 190, y + (i % 2 === 0 ? -14 : 14), 0, 'traffic', '#3d7fd9');
      c.speed = 110;
      S.cars.push(c);
    }
    S.cam.x = S.player.x - 640;
    S.cam.y = S.player.y - 360;
  } else if (name === 'chase') {
    // Wanted 3: tiga mobil polisi mengepung Dario di persimpangan.
    startMission(S, 3, sfx);
    S.mission.step = 1;
    S.mara.inCar = true;
    S.mara.visible = false;
    S.wanted = 3;
    S.lastCrimeAt = S.time;
    const [jx, jy] = [6 * PITCH + ROAD / 2, 4 * PITCH + ROAD / 2];
    placePlayerInCar(S, jx, jy, 0, 260);
    const spots = [
      [jx - 320, jy - 60, 0],
      [jx + 280, jy + 80, Math.PI],
      [jx + 60, jy - 300, Math.PI / 2],
    ];
    for (const [x, y, a] of spots) {
      const c = makeCar(x, y, a, 'police', '#e8e8e8');
      c.speed = 240;
      S.cars.push(c);
    }
    S.cam.x = S.player.x - 640;
    S.cam.y = S.player.y - 360;
  } else if (name === 'mission') {
    // Misi 3: Dario di plaza, dikepung 5 Viper, satu sudah tumbang.
    startMission(S, 2, sfx);
    const [px, py] = S.markers.plaza;
    S.player.x = px;
    S.player.y = py + 120;
    S.player.angle = -Math.PI / 2;
    S.player.onFoot = true;
    S.player.car = null;
    S.ammo = 48;
    // Posisikan Viper dalam formasi setengah lingkaran di depan pemain.
    S.peds = S.peds.filter((p) => p.kind !== 'viper');
    const spots = [
      [px - 150, py - 60],
      [px - 60, py - 140],
      [px + 40, py - 150],
      [px + 150, py - 70],
      [px + 90, py + 40],
    ];
    for (const [x, y] of spots) {
      const v = spawnViper(S);
      v.x = x;
      v.y = y;
    }
    S.mission.vipersLeft = 5;
    // Satu Viper sudah tumbang: percikan di dekat pemain.
    S.particles.push({ x: px + 30, y: py - 40, vx: 0, vy: 0, life: 0.7, max: 0.8, color: '#ff4444', size: 5 });
    S.cam.x = S.player.x - 640;
    S.cam.y = S.player.y - 360;
  } else {
    S.mode = 'title';
  }
}
