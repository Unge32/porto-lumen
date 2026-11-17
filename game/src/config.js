// Porto Lumen — semua angka dan definisi yang mengatur game.
// Kota, kendaraan, polisi, misi, dan keseimbangan hidup di sini, supaya file
// lain tinggal membaca konstanta, bukan angka ajaib yang tersebar.

export const TILE = 240; // sisi satu blok kota (bangunan), dalam piksel
export const ROAD = 64; // lebar jalan antar blok
export const PITCH = TILE + ROAD; // jarak antar garis jalan yang sama
export const BLOCKS = 11; // blok per sisi kota
export const WORLD = BLOCKS * TILE + (BLOCKS + 1) * ROAD; // 3408 x 3408
export const SEA_TOP = WORLD - 128; // garis pantai: di bawah ini pasir + laut
export const SAND_TOP = WORLD - 220; // pasir mulai di sini

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const PLAYER_R = 14;
export const PLAYER_SPEED = 210; // px/detik saat jalan kaki
export const PLAYER_HP = 100;
export const PLAYER_AMMO_START = 24;
export const BULLET_SPEED = 720;
export const BULLET_DAMAGE = 25;
export const ENEMY_BULLET_DAMAGE = 8;

export const CAR_W = 48;
export const CAR_H = 24;
export const CAR_TOP_SPEED = 420;
export const CAR_ACCEL = 320;
export const CAR_BRAKE = 520;
export const CAR_TURN = 2.9; // radian/detik pada kecepatan penuh

export const TRAFFIC_COUNT = 14;
export const PARKED_COUNT = 8;
export const PED_COUNT = 26;

// Warna kota yang disinari matahari: pastel untuk bangunan, aspal hangat
// untuk jalan, hijau taman, pasir pantai, dan biru laut.
export const COLORS = {
  road: '#3b4048',
  roadEdge: '#2e323a',
  lane: '#e8d44d',
  sidewalk: '#8a8f96',
  block: '#c9b8a3',
  park: '#5da85c',
  parkDark: '#4a8f49',
  sand: '#e8d5a0',
  sea: '#2e7fa8',
  seaDeep: '#1f6a92',
  buildingRoof: ['#b5654a', '#4a7fb5', '#c9a24a', '#7fb54a', '#a44a7f', '#4ab5a0', '#8a6fc9', '#c96a4a'],
  buildingEdge: '#00000033',
  carColors: ['#d94f3d', '#3d7fd9', '#e8c33d', '#4ad94f', '#d93d9e', '#e8e8e8', '#2b2b2b', '#7f5fd9'],
  policeCar: '#e8e8e8',
  bossCar: '#111111',
};

// Enam distrik bernama yang membentuk kota Porto Lumen.
export const DISTRICTS = [
  { name: 'Northgate', col: 0, row: 0, w: 4, h: 3 },
  { name: 'Old Town', col: 4, row: 0, w: 3, h: 3 },
  { name: 'The Heights', col: 7, row: 0, w: 4, h: 3 },
  { name: 'Dockside', col: 0, row: 3, w: 4, h: 4 },
  { name: 'The Plaza', col: 4, row: 3, w: 3, h: 4 },
  { name: 'Marina Bay', col: 7, row: 3, w: 4, h: 4 },
  { name: 'Sunset Strip', col: 0, row: 7, w: 5, h: 4 },
  { name: 'South Pier', col: 5, row: 7, w: 6, h: 4 },
];

// Titik penting misi, dinyatakan dalam koordinat blok (kolom, baris).
export const LANDMARKS = {
  garage: { col: 2, row: 2, label: 'Garage' },
  mara: { col: 2, row: 3, label: 'Mara' },
  docks: { col: 0, row: 9, label: 'Docks' },
  plaza: { col: 5, row: 5, label: 'Plaza' },
  safehouse: { col: 9, row: 2, label: 'Safehouse' },
  pier: { col: 5, row: 10, label: 'South Pier' },
  park: { col: 4, row: 4, label: 'Central Park' },
};

// Lima misi Dario Venn, berurutan. Setiap misi punya judul, teks tujuan,
// hadiah uang, dan level wanted yang dipasang saat misi dimulai.
export const MISSIONS = [
  {
    title: '1 — First Wheels',
    objective: 'Steal a car (press E near one), then drive it to the Garage',
    reward: 500,
    wantedOnStart: 0,
  },
  {
    title: '2 — The Pickup',
    objective: 'Grab the package at the Docks (E), then bring it back to Mara',
    reward: 800,
    wantedOnStart: 0,
  },
  {
    title: '3 — Clear the Plaza',
    objective: 'Defeat all 5 Viper gang members at the Plaza',
    reward: 1200,
    wantedOnStart: 1,
  },
  {
    title: '4 — The Getaway',
    objective: 'Pick up Mara in your car and drive her to the Safehouse',
    reward: 1500,
    wantedOnStart: 3,
  },
  {
    title: '5 — King of the Bay',
    objective: 'Wreck the boss car, then drive to South Pier',
    reward: 3000,
    wantedOnStart: 2,
  },
];

export const SAVE_KEY = 'porto-lumen-save-v1';
