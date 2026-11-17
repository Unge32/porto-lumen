// Porto Lumen — misi: lima babak cerita Dario Venn, berurutan.
// Setiap misi adalah mesin langkah (step): mulai, cek syarat selesai, beri
// hadiah, lanjut ke misi berikut. Banner dan teks tujuan diumumkan ke HUD.

import { MISSIONS } from './config.js';
import { dist } from './random.js';
import { addWanted } from './wanted.js';
import { spawnViper, spawnBossCar, nearestCar } from './world.js';

function setBanner(S, text) {
  S.mission.banner = text;
  S.mission.bannerAt = S.time;
}

function setObjective(S, text) {
  S.mission.objective = text;
}

export function startMission(S, index, sfx) {
  const m = S.mission;
  m.index = index;
  m.step = 0;
  m.vipersLeft = 0;
  m.bossWrecked = false;
  m.packageGot = false;
  const def = MISSIONS[index];
  S.wanted = def.wantedOnStart;
  if (def.wantedOnStart > 0) S.lastCrimeAt = S.time;
  setObjective(S, def.objective);
  setBanner(S, def.title);
  if (index === 2) {
    // Lima Viper menunggu di plaza.
    for (let i = 0; i < 5; i++) spawnViper(S);
    m.vipersLeft = 5;
  }
  if (index === 4) spawnBossCar(S);
  if (sfx) sfx.blip(660, 0.15, 0.15);
}

function completeMission(S, sfx) {
  const def = MISSIONS[S.mission.index];
  S.money += def.reward;
  S.ammo += 12;
  S.wanted = 0;
  setBanner(S, `Mission complete! +$${def.reward}`);
  if (sfx) sfx.missionDone();
  const next = S.mission.index + 1;
  if (next >= MISSIONS.length) {
    S.mode = 'win';
    return;
  }
  startMission(S, next, sfx);
}

export function updateMissions(S, dt, input, sfx) {
  const m = S.mission;
  const p = S.player;
  const near = (pt, r) => dist(p.x, p.y, pt[0], pt[1]) < r;

  switch (m.index) {
    case 0: {
      // Langkah 0: curi mobil apa saja. Langkah 1: antar ke garage.
      if (m.step === 0) {
        if (!p.onFoot && p.car) {
          m.step = 1;
          setObjective(S, 'Drive the stolen car to the Garage');
          setBanner(S, 'Car stolen — now lose the heat at the Garage');
        }
      } else if (near(S.markers.garage, 110) && !p.onFoot) {
        completeMission(S, sfx);
      }
      break;
    }
    case 1: {
      // Langkah 0: ambil paket di docks (E). Langkah 1: antar ke Mara.
      if (m.step === 0) {
        setObjective(S, 'Grab the package at the Docks (press E)');
        if (near(S.markers.docks, 55) && p.onFoot && input.wasPressed('e')) {
          m.packageGot = true;
          m.step = 1;
          addWanted(S, 2);
          setObjective(S, 'Bring the package back to Mara — the cops are on you');
          setBanner(S, 'Package secured! Wanted level 2');
          sfx.pickup();
        }
      } else if (near([S.mara.x, S.mara.y], 70)) {
        completeMission(S, sfx);
      }
      break;
    }
    case 2: {
      // Kalahkan 5 Viper; hitungan berkurang di reapDead (people.js).
      setObjective(S, `Clear the Plaza — Vipers left: ${m.vipersLeft}`);
      if (m.vipersLeft <= 0) completeMission(S, sfx);
      break;
    }
    case 3: {
      // Langkah 0: Mara naik saat pemain di mobil dan dekat dengannya.
      // Langkah 1: antar ke safehouse.
      if (m.step === 0) {
        setObjective(S, 'Pick up Mara — drive your car close to her');
        if (!p.onFoot && p.car && near([S.mara.x, S.mara.y], 90)) {
          S.mara.inCar = true;
          S.mara.visible = false;
          m.step = 1;
          setObjective(S, 'Drive Mara to the Safehouse');
          setBanner(S, 'Mara is in — go!');
          sfx.pickup();
        }
      } else if (near(S.markers.safehouse, 110) && !p.onFoot) {
        S.mara.inCar = false;
        S.mara.visible = true;
        S.mara.x = S.markers.safehouse[0] + 60;
        S.mara.y = S.markers.safehouse[1] + 60;
        completeMission(S, sfx);
      }
      break;
    }
    case 4: {
      // Langkah 0: hancurkan mobil bos. Langkah 1: ke South Pier.
      if (m.step === 0) {
        setObjective(S, 'Wreck the boss car — ram it or shoot it');
        if (m.bossWrecked) {
          m.step = 1;
          setObjective(S, 'Boss wrecked! Drive to South Pier');
          setBanner(S, 'Boss car destroyed!');
        }
      } else if (near(S.markers.pier, 120)) {
        completeMission(S, sfx);
      }
      break;
    }
    default:
      break;
  }
}

// Interaksi E: masuk/keluar mobil, atau ambil paket (ditangani misi).
export function tryEnterExitCar(S, sfx) {
  const p = S.player;
  if (!p.onFoot) {
    // Keluar dari mobil.
    const car = p.car;
    p.car = null;
    p.onFoot = true;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 44;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 44;
    car.speed = 0;
    return;
  }
  const car = nearestCar(S, p.x, p.y, 60, ['traffic', 'parked', 'police', 'boss']);
  if (!car) return;
  p.car = car;
  p.onFoot = false;
  car.kind = 'player';
  car.driver = null;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  if (S.mission.index === 0 && S.mission.step === 0) {
    addWanted(S, 1); // mencuri mobil: wanted +1
    S.stats.carsStolen++;
    sfx.blip(440, 0.1, 0.15);
  }
}
