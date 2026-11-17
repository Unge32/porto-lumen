// Every car in Porto Lumen: the player's ride, the traffic that fills the
// avenues, and the police cars that chase the player. Traffic follows the
// road grid in its own lane and turns at intersections; police steer
// straight at the player. All cars share one arcade driving model.
import { CAR, PALETTE, SEA, WORLD } from './config.js';

const LANE = 23;

export function makeCar(x, y, angle, color, kind) {
  return {
    x, y, angle, speed: 0, color, kind,
    health: CAR.health, alive: true,
    cruise: 0, lane: null, nextCross: 0,
    siren: 0, stuck: 0,
  };
}

function laneOffset(axis, dir) {
  // Right-hand traffic: the lane sits on the right of the direction of travel.
  if (axis === 'x') return dir * LANE;
  return -dir * LANE;
}

function pickLane(random, roads, x, y) {
  const vertical = random.chance(0.5);
  const road = random.pick(roads);
  const dir = random.chance(0.5) ? 1 : -1;
  if (vertical) return { axis: 'y', road, dir };
  return { axis: 'x', road, dir };
}

export function spawnTrafficCar(random, city, nearX, nearY) {
  const point = city.roadPoint(random);
  // Keep the spawn reasonably close to the action, not across the map.
  const dx = point.x - nearX;
  const dy = point.y - nearY;
  if (Math.abs(dx) > 1300 || Math.abs(dy) > 1300) {
    point.x = nearX + Math.max(-1200, Math.min(1200, dx * 0.4));
    point.y = nearY + Math.max(-1200, Math.min(1200, dy * 0.4));
  }
  const lane = pickLane(random, city.roads, point.x, point.y);
  const car = makeCar(point.x, point.y, lane.axis === 'x' ? (lane.dir > 0 ? 0 : Math.PI) : (lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2), random.pick(PALETTE.carColors), 'traffic');
  car.lane = lane;
  car.cruise = random.range(130, 210);
  car.speed = car.cruise * 0.6;
  // Place it on its lane, not on the road centre.
  if (lane.axis === 'x') car.y = lane.road + laneOffset('x', lane.dir);
  else car.x = lane.road + laneOffset('y', lane.dir);
  car.nextCross = nextIntersection(city, car);
  return car;
}

function nextIntersection(city, car) {
  const axis = car.lane.axis;
  const along = axis === 'x' ? car.x : car.y;
  const dir = car.lane.dir;
  let best = null;
  for (const road of city.roads) {
    if (dir > 0 && road > along + 10 && (best === null || road < best)) best = road;
    if (dir < 0 && road < along - 10 && (best === null || road > best)) best = road;
  }
  return best === null ? along + dir * 300 : best;
}

// At an intersection the car usually goes straight, sometimes turns.
// A cross beyond the last real road is a sentinel, not a road: going
// straight there lets the car drive off and get recycled.
function chooseTurn(random, car, cross, city) {
  const roll = random.next();
  const { axis, dir } = car.lane;
  if (roll < 0.68 || !city.roads.includes(cross)) return car.lane;
  if (axis === 'x') {
    // Heading east (+x): left is north (-y), right is south (+y).
    const turnLeft = roll < 0.84;
    const newDir = dir > 0 ? (turnLeft ? -1 : 1) : (turnLeft ? 1 : -1);
    return { axis: 'y', road: cross, dir: newDir };
  }
  // Heading south (+y): left is east (+x), right is west (-x).
  const turnLeft = roll < 0.84;
  const newDir = dir > 0 ? (turnLeft ? 1 : -1) : (turnLeft ? -1 : 1);
  return { axis: 'x', road: cross, dir: newDir };
}

function angleToward(from, to) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function steerToward(car, targetX, targetY, dt, turnRate) {
  const want = Math.atan2(targetY - car.y, targetX - car.x);
  const diff = angleToward(car.angle, want);
  const step = Math.max(-turnRate * dt, Math.min(turnRate * dt, diff));
  car.angle += step;
}

function speedAhead(car, others, lookAhead) {
  let target = car.cruise;
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  for (const other of others) {
    if (other === car || !other.alive) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const dist = Math.hypot(dx, dy);
    if (dist > lookAhead || dist < 1) continue;
    const ahead = (dx * fx + dy * fy) / dist;
    if (ahead < 0.6) continue;
    const gap = dist - 56;
    target = Math.min(target, Math.max(0, gap * 2.4));
  }
  return target;
}

function pushOutOfBuildings(car, city, killSpeed = true) {
  // Two circles, nose and tail, so a long car cannot clip a corner.
  for (const sign of [1, -1]) {
    const px = car.x + Math.cos(car.angle) * 20 * sign;
    const py = car.y + Math.sin(car.angle) * 20 * sign;
    const fixed = city.resolveCircle(px, py, 18);
    const dx = fixed.x - px;
    const dy = fixed.y - py;
    if (dx !== 0 || dy !== 0) {
      car.x += dx;
      car.y += dy;
      // Sliding along a wall beats a dead stop: killing the speed every
      // frame while a turning car clips a corner wedges it at 0 forever.
      if (killSpeed) car.speed *= 0.6;
    }
  }
  if (car.y > SEA.y - 22) {
    car.y = SEA.y - 22;
    if (killSpeed) car.speed *= 0.5;
  }
  car.x = Math.max(24, Math.min(WORLD.size - 24, car.x));
  car.y = Math.max(24, Math.min(WORLD.size - 24, car.y));
}

function separateCars(car, others) {
  for (const other of others) {
    if (other === car || !other.alive) continue;
    const dx = car.x - other.x;
    const dy = car.y - other.y;
    const dist = Math.hypot(dx, dy);
    const min = 52;
    if (dist > 0.01 && dist < min) {
      const push = (min - dist) / 2;
      const nx = dx / dist;
      const ny = dy / dist;
      car.x += nx * push;
      car.y += ny * push;
      other.x -= nx * push;
      other.y -= ny * push;
      if (Math.abs(car.speed - other.speed) > 120) {
        car.health -= 2;
        other.health -= 2;
      }
    }
  }
}

export function updateTrafficCar(car, dt, city, random, allCars, playerPos) {
  if (!car.alive) return;
  const along = car.lane.axis === 'x' ? car.x : car.y;
  const crossed = car.lane.dir > 0 ? along >= car.nextCross : along <= car.nextCross;
  if (crossed) {
    car.lane = chooseTurn(random, car, car.nextCross, city);
    car.nextCross = nextIntersection(city, car);
  }
  const off = laneOffset(car.lane.axis, car.lane.dir);
  let targetX;
  let targetY;
  if (car.lane.axis === 'x') {
    targetX = car.x + car.lane.dir * 140;
    targetY = car.lane.road + off;
  } else {
    targetX = car.lane.road + off;
    targetY = car.y + car.lane.dir * 140;
  }
  steerToward(car, targetX, targetY, dt, 2.2);
  const wantSpeed = speedAhead(car, allCars, 120);
  car.speed += Math.max(-260 * dt, Math.min(200 * dt, wantSpeed - car.speed));
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  pushOutOfBuildings(car, city, false);
  separateCars(car, allCars);
  // Safety net: a car wedged below a crawl for seconds gets recycled
  // near the player instead of sitting dead on the road forever.
  if (car.speed < 10) car.stuck += dt;
  else car.stuck = 0;
  // Far from the action, recycle the car near the player instead.
  const dx = car.x - playerPos.x;
  const dy = car.y - playerPos.y;
  if (Math.abs(dx) > 1700 || Math.abs(dy) > 1700 || car.stuck > 3) {
    const fresh = spawnTrafficCar(random, city, playerPos.x, playerPos.y);
    car.x = fresh.x;
    car.y = fresh.y;
    car.angle = fresh.angle;
    car.lane = fresh.lane;
    car.nextCross = fresh.nextCross;
    car.cruise = fresh.cruise;
    car.speed = fresh.cruise * 0.6;
    car.color = fresh.color;
    car.health = CAR.health;
    car.stuck = 0;
  }
}

export function updatePoliceCar(car, dt, city, target, allCars) {
  if (!car.alive) return;
  car.siren += dt;
  const dist = Math.hypot(target.x - car.x, target.y - car.y);
  if (dist < 70) {
    // Bumper to bumper: push the target, do not drive through it.
    car.speed = Math.max(0, car.speed - 500 * dt);
  } else {
    steerToward(car, target.x, target.y, dt, 3.1);
    car.speed += Math.max(-300 * dt, Math.min(320 * dt, 520 - car.speed));
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  pushOutOfBuildings(car, city, false);
  separateCars(car, allCars);
  if (dist > 1900) car.alive = false;
}

// The player's own driving: throttle, brake/reverse, steering that only
// bites while moving, and a handbrake that lets the tail step out.
export function drivePlayerCar(car, drive, dt, city) {
  if (!car.alive) return;
  if (drive.throttle) car.speed += CAR.accel * dt;
  if (drive.brake) {
    if (car.speed > 20) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.reverseAccel * dt;
  }
  if (!drive.throttle && !drive.brake) {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 160 * dt);
  }
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  const turnAuthority = Math.max(0, Math.min(1, Math.abs(car.speed) / 160));
  const turnRate = CAR.steer * turnAuthority * (drive.handbrake ? 1.5 : 1);
  car.angle += drive.steer * turnRate * Math.sign(car.speed || 1) * dt;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  pushOutOfBuildings(car, city, false);
}

export function spawnPoliceCar(random, city, nearX, nearY) {
  const angle = random.range(0, Math.PI * 2);
  const dist = random.range(650, 950);
  const point = city.roadPoint(random);
  const car = makeCar(point.x, point.y, angle, PALETTE.police, 'police');
  car.cruise = 520;
  car.speed = 300;
  // Nudge the spawn onto a road near the player, not across the map.
  car.x = nearX + Math.cos(angle) * dist;
  car.y = nearY + Math.sin(angle) * dist;
  const fixed = city.resolveCircle(car.x, car.y, 30);
  car.x = fixed.x;
  car.y = fixed.y;
  return car;
}

export function nearestCar(cars, x, y, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const car of cars) {
    if (!car.alive) continue;
    const dist = Math.hypot(car.x - x, car.y - y);
    if (dist < bestDist) {
      bestDist = dist;
      best = car;
    }
  }
  return best;
}

// Give a car a fresh lane from where it stands, so a car the player
// abandons rejoins the traffic instead of driving off the grid.
export function assignLane(car, city) {
  const distX = Math.abs(car.x - city.nearestRoad(car.x));
  const distY = Math.abs(car.y - city.nearestRoad(car.y));
  if (distX < distY) {
    const dir = Math.cos(car.angle) >= 0 ? 1 : -1;
    car.lane = { axis: 'y', road: city.nearestRoad(car.x), dir };
  } else {
    const dir = Math.sin(car.angle) >= 0 ? 1 : -1;
    car.lane = { axis: 'x', road: city.nearestRoad(car.y), dir };
  }
  car.nextCross = nextIntersection(city, car);
}
