// Porto Lumen — dunia game: satu objek state (S) dan semua spawn.
// main.js membuat dunia lewat createWorld(); modul lain menerima S dan
// menggerakkan bagiannya masing-masing tiap frame.

import {
  WORLD,
  PLAYER_HP,
  PLAYER_AMMO_START,
  TRAFFIC_COUNT,
  PARKED_COUNT,
  PED_COUNT,
  COLORS,
  LANDMARKS,
} from './config.js';
import { mulberry32, rand, randInt, pick } from './random.js';
import { buildCity, landmarkPoint, markerPoint, randomRoadPoint, isRoadAt } from './city.js';

let nextCarId = 1;
let nextPedId = 1;

// Satu mobil: dipakai untuk lalu lintas, mobil parkir, polisi, dan bos.
export function makeCar(x, y, angle, kind, color) {
  return {
    id: nextCarId++,
    x,
    y,
    angle,
    speed: 0,
    color,
    kind, // 'traffic' | 'parked' | 'police' | 'boss' | 'player'
    hp: kind === 'boss' ? 100 : 60,
    driver: kind === 'traffic' ? 'traffic' : kind === 'police' ? 'police' : kind === 'boss' ? 'boss' : null,
    wp: null, // waypoint AI lalu lintas berikutnya
    wpAngle: 0,
    stuck: 0,
    sirenPhase: Math.random() * 2,
  };
}

// Satu pejalan kaki: warga, polisi jalan kaki, atau anggota geng Viper.
export function makePed(x, y, kind) {
  return {
    id: nextPedId++,
    x,
    y,
    angle: rand(Math.random, 0, Math.PI * 2),
    speed: 0,
    kind, // 'civilian' | 'cop' | 'viper'
    hp: kind === 'viper' ? 50 : kind === 'cop' ? 40 : 20,
    color: kind === 'viper' ? '#7a2d8f' : kind === 'cop' ? '#1f3a8f' : pick(Math.random, ['#e8e0c8', '#c8d8e8', '#e8c8c8', '#c8e8c8', '#d8d8d8']),
    targetAngle: 0,
    shootCd: 0,
    wanderCd: 0,
    fleeing: false,
  };
}

export function createWorld(seed = 20261118) {
  const city = buildCity(seed);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const [px, py] = markerPoint('garage');

  const S = {
    seed,
    city,
    time: 0,
    mode: 'title', // 'title' | 'playing' | 'paused' | 'over' | 'win'
    money: 50,
    health: PLAYER_HP,
    ammo: PLAYER_AMMO_START,
    wanted: 0,
    lastCrimeAt: -999,
    lastHurtAt: -999,
    heatTimer: 0,
    player: {
      x: px + 90,
      y: py + 40,
      angle: -Math.PI / 2,
      onFoot: true,
      car: null, // mobil yang sedang dikendarai
      dead: false,
      fireCd: 0,
    },
    cars: [],
    peds: [],
    bullets: [],
    particles: [],
    crates: [],
    mara: { x: px + 150, y: py, inCar: false, visible: true },
    markers: {
      garage: markerPoint('garage'),
      docks: markerPoint('docks'),
      plaza: markerPoint('plaza'),
      safehouse: markerPoint('safehouse'),
      pier: markerPoint('pier'),
    },
    mission: {
      index: 0,
      step: 0,
      objective: '',
      vipersLeft: 0,
      bossWrecked: false,
      packageGot: false,
      banner: '',
      bannerAt: -999,
    },
    cam: { x: px, y: py },
    stats: { kills: 0, carsStolen: 0, shotsFired: 0 },
    muted: false,
    message: '',
    messageAt: -999,
  };

  // Peti amunisi / kesehatan di tepi jalan dekat tiga titik kota.
  const crateSpots = [markerPoint('garage'), markerPoint('docks'), markerPoint('plaza')];
  for (const [cx, cy] of crateSpots) {
    S.crates.push({ x: cx + 90, y: cy, kind: 'ammo', taken: false });
    S.crates.push({ x: cx - 90, y: cy, kind: 'health', taken: false });
  }

  // Lalu lintas: mobil yang melaju di jalan.
  for (let i = 0; i < TRAFFIC_COUNT; i++) {
    const [x, y] = randomRoadPoint(rng);
    const angle = pick(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    const car = makeCar(x, y, angle, 'traffic', pick(rng, COLORS.carColors));
    car.speed = rand(rng, 70, 120);
    S.cars.push(car);
  }
  // Mobil parkir di tepi jalan.
  for (let i = 0; i < PARKED_COUNT; i++) {
    const [x, y] = randomRoadPoint(rng);
    const angle = pick(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    S.cars.push(makeCar(x, y, angle, 'parked', pick(rng, COLORS.carColors)));
  }
  // Pejalan kaki di trotoar.
  for (let i = 0; i < PED_COUNT; i++) {
    const [x, y] = randomRoadPoint(rng);
    S.peds.push(makePed(x, y, 'civilian'));
  }
  return S;
}

// Partikel sekali pakai (percikan, asap, darah): hidup singkat, lalu hilang.
export function spawnParticles(S, x, y, color, n, speed = 160) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    S.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0.4 + Math.random() * 0.4,
      max: 0.8,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

export function updateParticles(S, dt) {
  for (const p of S.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2.4 * dt;
    p.vy *= 1 - 2.4 * dt;
    p.life -= dt;
  }
  S.particles = S.particles.filter((p) => p.life > 0);
}

// Mobil polisi muncul di jalan, agak jauh dari pemain.
export function spawnPoliceCar(S) {
  const p = S.player;
  for (let tries = 0; tries < 12; tries++) {
    const [x, y] = randomRoadPoint(Math.random);
    const d = Math.hypot(x - p.x, y - p.y);
    if (d > 700 && d < 1400) {
      const car = makeCar(x, y, Math.atan2(p.y - y, p.x - x), 'police', COLORS.policeCar);
      car.speed = 200;
      S.cars.push(car);
      return car;
    }
  }
  return null;
}

// Polisi jalan kaki muncul di dekat pemain.
export function spawnFootCop(S) {
  const p = S.player;
  const a = Math.random() * Math.PI * 2;
  const x = p.x + Math.cos(a) * 420;
  const y = p.y + Math.sin(a) * 420;
  if (!isRoadAt(x, y)) return null;
  const cop = makePed(x, y, 'cop');
  S.peds.push(cop);
  return cop;
}

// Anggota geng Viper muncul di sekitar penanda plaza (di jalan).
export function spawnViper(S) {
  const [px, py] = S.markers.plaza;
  const a = Math.random() * Math.PI * 2;
  const r = 50 + Math.random() * 130;
  const v = makePed(px + Math.cos(a) * r, py + Math.sin(a) * r, 'viper');
  S.peds.push(v);
  return v;
}

// Mobil bos untuk misi terakhir.
export function spawnBossCar(S) {
  const p = S.player;
  const [x, y] = randomRoadPoint(Math.random);
  const car = makeCar(x, y, Math.atan2(p.y - y, p.x - x), 'boss', COLORS.bossCar);
  car.speed = 150;
  S.cars.push(car);
  return car;
}

// Mobil terdekat dari titik (x, y) dalam radius r (apa pun jenisnya).
export function nearestCar(S, x, y, r, kinds = null) {
  let best = null;
  let bestD = r;
  for (const c of S.cars) {
    if (kinds && !kinds.includes(c.kind)) continue;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
