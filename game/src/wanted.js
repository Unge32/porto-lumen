// The wanted level: stars the player earns by committing crimes in the
// open, and the police response they buy. Heat fades when the player
// keeps quiet and out of sight; the law never forgets a fresh crime.
import { WANTED } from './config.js';

export function createWanted() {
  return {
    stars: 0,
    decayTimer: 0,
    dispatchTimer: 0,
    bustTimer: 0,
  };
}

export function addCrime(wanted, stars) {
  if (stars <= 0) return;
  wanted.stars = Math.min(WANTED.maxStars, wanted.stars + stars);
  wanted.decayTimer = WANTED.decayDelay;
}

export function updateWanted(wanted, dt, policeNear, policeCars, footPolice, spawnPoliceCar, spawnFootPolice, playerPos, random, city) {
  // No crime for a while and no police in sight: the heat cools, one star
  // at a time, faster at one star than at five.
  if (wanted.stars > 0) {
    wanted.decayTimer -= dt;
    if (wanted.decayTimer <= 0 && !policeNear) {
      wanted.stars -= 1;
      wanted.decayTimer = WANTED.decayInterval;
      if (wanted.stars === 0) {
        for (const car of policeCars) car.alive = false;
        footPolice.length = 0;
      }
    }
  }
  if (wanted.stars === 0) return;
  // Keep the right number of police cars hunting.
  wanted.dispatchTimer -= dt;
  const wantCars = WANTED.policeCars[wanted.stars] || 0;
  const aliveCars = policeCars.filter((c) => c.alive).length;
  if (wanted.dispatchTimer <= 0 && aliveCars < wantCars) {
    policeCars.push(spawnPoliceCar(random, city, playerPos.x, playerPos.y));
    wanted.dispatchTimer = 2.5;
  }
  // Foot officers only matter when the player is walking.
  const wantFoot = WANTED.policeFoot[wanted.stars] || 0;
  if (wanted.dispatchTimer <= 0 && footPolice.length < wantFoot && playerPos.onFoot) {
    const angle = random.range(0, Math.PI * 2);
    footPolice.push(spawnFootPolice(playerPos.x + Math.cos(angle) * 420, playerPos.y + Math.sin(angle) * 420));
    wanted.dispatchTimer = 2.5;
  }
}

export function clearWanted(wanted, policeCars, footPolice) {
  wanted.stars = 0;
  wanted.decayTimer = 0;
  for (const car of policeCars) car.alive = false;
  footPolice.length = 0;
}
