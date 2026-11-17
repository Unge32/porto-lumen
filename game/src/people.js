// Everyone on foot: the player, the pedestrians filling the sidewalks,
// the foot police who chase a wanted player, and the rival gang members
// who only show up when a mission calls them.
import { PLAYER, PED, WORLD, BEACH } from './config.js';

const SHIRT_COLORS = ['#e8e8e8', '#d94f3d', '#3d7bd9', '#e8c33d', '#3da67a', '#7a4fd9', '#2b2b33', '#d97b2f', '#e8a0b4'];
const SKIN_COLORS = ['#f0c8a0', '#c98d5f', '#8d5a3b', '#e8b88a'];

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, health: PLAYER.health, ammo: PLAYER.startAmmo,
    money: 150, onFoot: true, car: null, fireCooldown: 0, hurtTimer: 0,
    walkCycle: 0, moving: false,
  };
}

export function updatePlayer(player, move, sprint, aimAngle, dt, city, cars) {
  const speed = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  player.moving = move.x !== 0 || move.y !== 0;
  if (player.moving) {
    player.x += move.x * speed * dt;
    player.y += move.y * speed * dt;
    player.walkCycle += dt * (sprint ? 11 : 8);
  }
  player.angle = aimAngle;
  if (player.fireCooldown > 0) player.fireCooldown -= dt;
  if (player.hurtTimer > 0) player.hurtTimer -= dt;
  const fixed = city.resolveCircle(player.x, player.y, PLAYER.radius);
  player.x = fixed.x;
  player.y = fixed.y;
  // Cars are solid to a pedestrian: get pushed out of their circle.
  for (const car of cars) {
    if (!car.alive) continue;
    const dx = player.x - car.x;
    const dy = player.y - car.y;
    const dist = Math.hypot(dx, dy);
    const min = PLAYER.radius + 26;
    if (dist > 0.01 && dist < min) {
      player.x = car.x + (dx / dist) * min;
      player.y = car.y + (dy / dist) * min;
    }
  }
}

export function spawnPed(random, city) {
  const point = city.sidewalkPoint(random);
  const vertical = random.chance(0.5);
  const ped = {
    x: point.x, y: point.y, angle: 0,
    speed: random.range(PED.walkSpeed * 0.7, PED.walkSpeed * 1.3),
    state: 'walk', panic: 0, down: false,
    shirt: random.pick(SHIRT_COLORS), skin: random.pick(SKIN_COLORS),
    axis: vertical ? 'y' : 'x', road: vertical ? point.x : point.y,
    side: 1, dir: random.chance(0.5) ? 1 : -1,
    walkCycle: random.range(0, 6),
  };
  // The sidewalk point already fixed the road and side for us.
  if (vertical) {
    ped.road = city.nearestRoad(point.x);
    ped.side = point.x > ped.road ? 1 : -1;
  } else {
    ped.road = city.nearestRoad(point.y);
    ped.side = point.y > ped.road ? 1 : -1;
  }
  return ped;
}

function pedLanePos(ped) {
  const offset = 92 / 2 + 8;
  if (ped.axis === 'x') return { x: ped.x, y: ped.road + ped.side * offset };
  return { x: ped.road + ped.side * offset, y: ped.y };
}

export function updatePed(ped, dt, city, random, threat) {
  if (ped.down) return;
  if (threat) {
    const dist = Math.hypot(ped.x - threat.x, ped.y - threat.y);
    if (dist < 420) {
      ped.panic = 2.5;
      ped.state = 'flee';
    }
  }
  if (ped.panic > 0) {
    ped.panic -= dt;
    if (ped.panic <= 0) ped.state = 'walk';
  }
  if (ped.state === 'flee' && threat) {
    const away = Math.atan2(ped.y - threat.y, ped.x - threat.x);
    ped.angle = away;
    ped.x += Math.cos(away) * PED.fleeSpeed * dt;
    ped.y += Math.sin(away) * PED.fleeSpeed * dt;
    ped.walkCycle += dt * 11;
  } else {
    const speed = ped.speed;
    if (ped.axis === 'x') {
      ped.x += ped.dir * speed * dt;
      ped.angle = ped.dir > 0 ? 0 : Math.PI;
    } else {
      ped.y += ped.dir * speed * dt;
      ped.angle = ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    ped.walkCycle += dt * 7;
    // At an intersection, sometimes turn onto the crossing avenue.
    const along = ped.axis === 'x' ? ped.x : ped.y;
    const nearest = city.nearestRoad(along);
    if (Math.abs(along - nearest) < speed * dt + 1 && random.chance(0.35)) {
      if (ped.axis === 'x') {
        ped.axis = 'y';
        ped.road = nearest;
        ped.side = ped.y > nearest ? 1 : -1;
        ped.dir = random.chance(0.5) ? 1 : -1;
      } else {
        ped.axis = 'x';
        ped.road = nearest;
        ped.side = ped.x > nearest ? 1 : -1;
        ped.dir = random.chance(0.5) ? 1 : -1;
      }
    }
    // Turn around at the world's edge or the beach.
    if (ped.x < 100 || ped.x > WORLD.size - 100 || ped.y < 100 || ped.y > BEACH.y - 60) {
      ped.dir *= -1;
    }
  }
  const fixed = city.resolveCircle(ped.x, ped.y, PED.radius);
  ped.x = fixed.x;
  ped.y = fixed.y;
}

export function makeEnemy(x, y) {
  return {
    x, y, angle: 0, health: 68, speed: 132, fireCooldown: 1.2,
    shirt: '#3a3a44', skin: '#c98d5f', state: 'hunt', walkCycle: 0,
  };
}

export function updateEnemy(enemy, dt, player, city, shoot) {
  if (enemy.health <= 0) return;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);
  enemy.angle = Math.atan2(dy, dx);
  if (dist > 260) {
    enemy.x += (dx / dist) * enemy.speed * dt;
    enemy.y += (dy / dist) * enemy.speed * dt;
    enemy.walkCycle += dt * 9;
  } else if (dist < 120) {
    enemy.x -= (dx / dist) * enemy.speed * 0.5 * dt;
    enemy.y -= (dy / dist) * enemy.speed * 0.5 * dt;
  }
  enemy.fireCooldown -= dt;
  if (enemy.fireCooldown <= 0 && dist < 460 && player.onFoot) {
    enemy.fireCooldown = 0.95 + Math.random() * 0.5;
    shoot(enemy.x, enemy.y, enemy.angle + (Math.random() - 0.5) * 0.24, 520, 8, false);
  }
  const fixed = city.resolveCircle(enemy.x, enemy.y, PED.radius);
  enemy.x = fixed.x;
  enemy.y = fixed.y;
}

export function makeFootPolice(x, y) {
  return {
    x, y, angle: 0, speed: 235, bust: 0,
    shirt: '#1d4ed8', skin: '#f0c8a0', walkCycle: 0,
  };
}

export function updateFootPolice(officer, dt, player, city) {
  const dx = player.x - officer.x;
  const dy = player.y - officer.y;
  const dist = Math.hypot(dx, dy);
  officer.angle = Math.atan2(dy, dx);
  if (dist > 34) {
    officer.x += (dx / dist) * officer.speed * dt;
    officer.y += (dy / dist) * officer.speed * dt;
    officer.walkCycle += dt * 10;
    officer.bust = Math.max(0, officer.bust - dt);
  } else {
    officer.bust += dt;
  }
  const fixed = city.resolveCircle(officer.x, officer.y, PED.radius);
  officer.x = fixed.x;
  officer.y = fixed.y;
  return officer.bust;
}
