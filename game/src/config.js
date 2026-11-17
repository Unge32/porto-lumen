// Porto Lumen — tuning and constants. Every number the game balances on
// lives here, so a tweak never means hunting through the world code.
// Distances are in world pixels; speeds in pixels per second; time in seconds.
export const STEP = 1 / 60;

// The city is one square of streets. Roads run on a grid; blocks hold
// buildings, parks and plazas between them.
export const WORLD = {
  size: 3600,
  roadGap: 300,
  roadWidth: 92,
  sidewalk: 16,
  blockInset: 14,
};

// The beach and the sea run along the south edge; the marina sits east.
export const BEACH = { y: 3180, sandHeight: 220 };
export const SEA = { y: 3400 };

export const PLAYER = {
  radius: 13,
  walkSpeed: 205,
  sprintSpeed: 305,
  health: 100,
  startAmmo: 24,
  maxAmmo: 120,
  fireInterval: 0.16,
  bulletSpeed: 900,
  bulletDamage: 34,
  bulletRange: 560,
};

export const CAR = {
  length: 64,
  width: 32,
  accel: 420,
  brake: 700,
  reverseAccel: 260,
  maxSpeed: 560,
  maxReverse: 180,
  steer: 2.6,
  grip: 0.92,
  health: 100,
  stealTime: 0.55,
};

// How the city fills itself: cars on the roads, people on the sidewalks.
export const TRAFFIC = { cars: 30, peds: 42 };
export const PED = { radius: 10, walkSpeed: 58, fleeSpeed: 150 };

export const WANTED = {
  maxStars: 5,
  steal: 1,
  runOver: 1,
  shotHeard: 1,
  kill: 1,
  decayDelay: 9,
  decayInterval: 7,
  policeCars: [0, 1, 2, 3, 4, 6],
  policeFoot: [0, 0, 1, 2, 3, 4],
  bustSeconds: 1.4,
};

export const MONEY = {
  start: 150,
  ammoPrice: 60,
  ammoPack: 24,
  hospitalFee: 120,
  bustFee: 200,
};

export const SAVE_KEY = 'porto-lumen-save-v1';
export const BEST_KEY = 'porto-lumen-best-v1';

// A warm, sun-soaked palette: sand, terracotta roofs, teal sea, green parks.
export const PALETTE = {
  grass: '#7fae62',
  park: '#69a854',
  road: '#4a4a52',
  roadLine: '#e8d44f',
  sidewalk: '#b9b3a4',
  sand: '#ecd9a0',
  sea: '#2e7f9e',
  seaDeep: '#256b87',
  buildingRoof: ['#c96f4a', '#b85c5c', '#d9a05b', '#7d8aa5', '#a5714f', '#8fae7a'],
  buildingWall: '#e8ddc9',
  carColors: ['#d94f3d', '#3d7bd9', '#e8c33d', '#7a4fd9', '#3da67a', '#e8e8e8', '#2b2b33', '#d97b2f'],
  police: '#1d4ed8',
  policeLight: ['#ff2d2d', '#2d7bff'],
};
