// The world: one state object and one step function that advances it.
// The boot code reads input and paints; this module owns the rules —
// moving, driving, stealing, shooting, the wanted level, the missions,
// the pickups and the win/lose flags. The screenshot stager calls the
// same step with scripted input, so a shot is a real moment of play.
import { PLAYER, CAR, WANTED, MONEY, WORLD, BEACH } from './config.js';
import { createRandom } from './random.js';
import { createCity } from './city.js';
import { makeCar, spawnTrafficCar, spawnPoliceCar, updateTrafficCar, updatePoliceCar, drivePlayerCar, nearestCar, assignLane } from './vehicles.js';
import { makePlayer, updatePlayer, spawnPed, updatePed, makeEnemy, updateEnemy, makeFootPolice, updateFootPolice } from './people.js';
import { makeBullet, updateBullets, updateParticles, spawnBurst, spawnSmoke, explodeCar } from './combat.js';
import { createWanted, addCrime, updateWanted, clearWanted } from './wanted.js';
import { MISSIONS, stepMarker, stepText } from './missions.js';
import { PALETTE } from './config.js';

export function createWorld(seed) {
  const random = createRandom(seed);
  const city = createCity(random);
  const state = {
    city, random, time: 0,
    player: null, traffic: [], policeCars: [], footPolice: [],
    peds: [], enemies: [], bullets: [], particles: [], pickups: [],
    wanted: createWanted(), missionIndex: 0, stepIndex: 0, kills: 0,
    bossCar: null, bossCooldown: 0, pickupTimer: 24, holdProgress: 0,
    banner: null, bannerTimer: 0, shake: 0, wasted: false, busted: false,
    storyDone: false, threat: null, stealFlash: 0,
  };

  function showBanner(text, sub, seconds) {
    state.banner = { text, sub: sub || '', alpha: 1 };
    state.bannerTimer = seconds || 2.6;
  }

  function spawnInitial() {
    state.player = makePlayer(city.landmarks.garage.x, city.landmarks.garage.y + 60);
    state.traffic = [];
    for (let i = 0; i < 30; i += 1) {
      state.traffic.push(spawnTrafficCar(random, city, state.player.x, state.player.y));
    }
    state.peds = [];
    for (let i = 0; i < 42; i += 1) {
      state.peds.push(spawnPed(random, city));
    }
    state.policeCars = [];
    state.footPolice = [];
    state.enemies = [];
    state.bullets = [];
    state.particles = [];
    state.pickups = [];
    state.bossCar = null;
  }

  function currentMission() {
    return MISSIONS[state.missionIndex] || null;
  }

  function currentStep() {
    const mission = currentMission();
    if (!mission) return null;
    return mission.steps[state.stepIndex] || null;
  }

  function startStep() {
    const step = currentStep();
    if (!step) return;
    state.holdProgress = 0;
    if (step.spawn) {
      state.enemies = [];
      state.kills = 0;
      for (let i = 0; i < step.spawn; i += 1) {
        const angle = (i / step.spawn) * Math.PI * 2;
        state.enemies.push(makeEnemy(step.x + Math.cos(angle) * 170, step.y + Math.sin(angle) * 170));
      }
    }
    if (step.spawnBoss) {
      const boss = makeCar(step.x + 160, step.y - 60, 0, '#7a1f1f', 'boss');
      boss.health = 150;
      boss.cruise = 480;
      state.bossCar = boss;
      state.policeCars.push(boss);
    }
    if (step.wanted && step.kind !== 'pickup') {
      addCrime(state.wanted, step.wanted);
    }
  }

  function advanceStep() {
    const mission = currentMission();
    state.stepIndex += 1;
    if (state.stepIndex >= mission.steps.length) {
      state.player.money += mission.reward;
      showBanner(`${mission.title} — DONE`, `+$${mission.reward}`, 3);
      state.missionIndex += 1;
      state.stepIndex = 0;
      if (state.missionIndex >= MISSIONS.length) {
        state.storyDone = true;
      } else {
        startStep();
      }
    } else {
      startStep();
    }
  }

  function playerPos() {
    const p = state.player;
    if (p.onFoot) return { x: p.x, y: p.y, onFoot: true };
    return { x: p.car.x, y: p.car.y, onFoot: false };
  }

  function enterCar(car) {
    const p = state.player;
    // The car leaves the traffic flow (or the police fleet) while the
    // player drives it; it rejoins when the player gets out.
    const trafficIndex = state.traffic.indexOf(car);
    if (trafficIndex !== -1) state.traffic.splice(trafficIndex, 1);
    const policeIndex = state.policeCars.indexOf(car);
    if (policeIndex !== -1) state.policeCars.splice(policeIndex, 1);
    p.onFoot = false;
    p.car = car;
    const stolen = car.kind === 'traffic' || car.kind === 'police';
    car.kind = 'player';
    if (stolen) {
      addCrime(state.wanted, WANTED.steal);
      showBanner('CAR STOLEN', 'The law noticed that.', 2);
      // The driver bails out and runs.
      const driver = spawnPed(random, city);
      driver.x = car.x + 40;
      driver.y = car.y + 20;
      driver.state = 'flee';
      driver.panic = 4;
      state.peds.push(driver);
    }
  }

  function exitCar() {
    const p = state.player;
    if (!p.car) return;
    const car = p.car;
    p.x = car.x - Math.cos(car.angle) * 44;
    p.y = car.y - Math.sin(car.angle) * 44;
    const fixed = city.resolveCircle(p.x, p.y, 13);
    p.x = fixed.x;
    p.y = fixed.y;
    p.onFoot = true;
    p.car = null;
    car.kind = 'traffic';
    car.cruise = 150;
    car.speed = 0;
    assignLane(car, city);
    state.traffic.push(car);
  }

  function fireBullet(x, y, angle, speed, damage, friendly) {
    state.bullets.push(makeBullet(x, y, angle, speed, damage, friendly));
    state.threat = { x, y };
  }

  function playerShoot(aimWorld) {
    const p = state.player;
    if (p.ammo <= 0 || p.fireCooldown > 0) return;
    p.fireCooldown = PLAYER.fireInterval;
    p.ammo -= 1;
    const angle = Math.atan2(aimWorld.y - p.y, aimWorld.x - p.x);
    fireBullet(p.x + Math.cos(angle) * 18, p.y + Math.sin(angle) * 18, angle, PLAYER.bulletSpeed, PLAYER.bulletDamage, true);
    spawnBurst(state.particles, p.x + Math.cos(angle) * 22, p.y + Math.sin(angle) * 22, '#ffd23d', 3, 120, 0.12, 3);
  }

  function damagePlayer(amount) {
    const p = state.player;
    if (p.hurtTimer > 0) return;
    p.health -= amount;
    p.hurtTimer = 0.35;
    state.shake = Math.max(state.shake, 7);
    if (p.health <= 0) {
      p.health = 0;
      state.wasted = true;
    }
  }

  function respawnAfterWasted() {
    const p = state.player;
    p.health = PLAYER.health;
    p.ammo = Math.max(12, p.ammo);
    p.money = Math.max(0, p.money - MONEY.hospitalFee);
    const hospital = city.landmarks.hospital;
    p.x = hospital.x;
    p.y = hospital.y + 70;
    p.onFoot = true;
    p.car = null;
    state.wasted = false;
    state.bullets = [];
    clearWanted(state.wanted, state.policeCars, state.footPolice);
  }

  function respawnAfterBusted() {
    const p = state.player;
    p.money = Math.max(0, p.money - MONEY.bustFee);
    const hospital = city.landmarks.hospital;
    p.x = hospital.x;
    p.y = hospital.y + 70;
    p.onFoot = true;
    p.car = null;
    state.busted = false;
    state.bullets = [];
    clearWanted(state.wanted, state.policeCars, state.footPolice);
  }

  function checkMission() {
    const step = currentStep();
    if (!step) return;
    const pos = playerPos();
    if (step.kind === 'steal') {
      if (!state.player.onFoot) advanceStep();
    } else if (step.kind === 'goto') {
      const dist = Math.hypot(pos.x - step.x, pos.y - step.y);
      if (step.needCar && state.player.onFoot) return;
      if (dist < step.radius) advanceStep();
    } else if (step.kind === 'pickup') {
      const dist = Math.hypot(pos.x - step.x, pos.y - step.y);
      if (state.player.onFoot && dist < step.radius) {
        state.holdProgress += 1 / 60;
        if (state.holdProgress >= (step.hold || 1)) {
          state.holdProgress = 0;
          if (step.wanted) addCrime(state.wanted, step.wanted);
          advanceStep();
        }
      } else {
        state.holdProgress = 0;
      }
    } else if (step.kind === 'kill') {
      if (state.kills >= step.count) advanceStep();
    } else if (step.kind === 'destroy') {
      if (!state.bossCar || state.bossCar.health <= 0) advanceStep();
    }
  }

  function step(dt, input, audio) {
    state.time += dt;
    const p = state.player;
    // --- The player, on foot or behind the wheel.
    if (p.onFoot) {
      updatePlayer(p, input.move, input.sprint, Math.atan2(input.aim.y - p.y, input.aim.x - p.x), dt, city, state.traffic.concat(state.policeCars));
      if (input.fire) playerShoot(input.aim);
      if (input.use) {
        const near = nearestCar(state.traffic.concat(state.policeCars), p.x, p.y, 78);
        const gun = city.landmarks.gunShop;
        if (near) {
          enterCar(near);
          if (audio) audio.pickup();
        } else if (Math.hypot(p.x - gun.x, p.y - gun.y) < 80 && p.money >= MONEY.ammoPrice && p.ammo < PLAYER.maxAmmo) {
          p.money -= MONEY.ammoPrice;
          p.ammo = Math.min(PLAYER.maxAmmo, p.ammo + MONEY.ammoPack);
          if (audio) audio.pickup();
          showBanner('AMMO BOUGHT', `+$${MONEY.ammoPack} rounds`, 1.6);
        }
      }
    } else if (p.car) {
      drivePlayerCar(p.car, input.drive, dt, city);
      if (input.use) exitCar();
      if (p.car && p.car.health <= 0) {
        const wreck = p.car;
        explodeCar(state.particles, wreck);
        if (audio) audio.explosion();
        state.shake = 14;
        wreck.alive = false;
        p.car = null;
        p.onFoot = true;
        p.x = wreck.x + 44;
        p.y = wreck.y + 44;
        const fixed = city.resolveCircle(p.x, p.y, 13);
        p.x = fixed.x;
        p.y = fixed.y;
        damagePlayer(25);
      }
    }
    // --- Traffic, police, pedestrians.
    for (const car of state.traffic) {
      updateTrafficCar(car, dt, city, random, state.traffic.concat(state.policeCars), playerPos());
      if (car.health <= 0 && car.alive) {
        car.alive = false;
        explodeCar(state.particles, car);
        if (audio) audio.explosion();
      }
    }
    const policeTarget = playerPos();
    for (const car of state.policeCars) {
      if (!car.alive) continue;
      if (car.kind === 'boss') {
        // The boss rams the player's car and runs the player down.
        const dx = policeTarget.x - car.x;
        const dy = policeTarget.y - car.y;
        const dist = Math.hypot(dx, dy);
        const want = Math.atan2(dy, dx);
        let diff = want - car.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
        car.speed += Math.max(-300 * dt, Math.min(320 * dt, 500 - car.speed));
        car.x += Math.cos(car.angle) * car.speed * dt;
        car.y += Math.sin(car.angle) * car.speed * dt;
        if (dist < 56 && state.bossCooldown <= 0) {
          state.bossCooldown = 0.9;
          if (p.car) {
            p.car.health -= 14;
            if (audio) audio.crash();
            state.shake = 9;
          } else {
            damagePlayer(18);
          }
        }
        continue;
      }
      updatePoliceCar(car, dt, city, policeTarget, state.traffic.concat(state.policeCars));
    }
    state.bossCooldown -= dt;
    // Remove dead police cars that drifted off; keep the list short.
    state.policeCars = state.policeCars.filter((c) => c.alive || c.kind === 'boss');
    for (const officer of state.footPolice) {
      const bust = updateFootPolice(officer, dt, p, city);
      if (bust >= WANTED.bustSeconds && p.onFoot) {
        state.busted = true;
      }
    }
    for (const ped of state.peds) {
      updatePed(ped, dt, city, random, state.threat);
    }
    state.threat = null;
    // --- Enemies.
    for (const enemy of state.enemies) {
      updateEnemy(enemy, dt, p, city, (x, y, angle, speed, damage, friendly) => fireBullet(x, y, angle, speed, damage, friendly));
    }
    // --- Bullets and what they hit.
    const targets = [];
    for (const ped of state.peds) {
      if (!ped.down) targets.push({ x: ped.x, y: ped.y, radius: 11, kind: 'ped', target: ped });
    }
    for (const enemy of state.enemies) {
      if (enemy.health > 0) targets.push({ x: enemy.x, y: enemy.y, radius: 12, kind: 'enemy', target: enemy });
    }
    for (const officer of state.footPolice) {
      targets.push({ x: officer.x, y: officer.y, radius: 12, kind: 'officer', target: officer });
    }
    if (p.onFoot) targets.push({ x: p.x, y: p.y, radius: 13, kind: 'player', target: p });
    for (const car of state.traffic.concat(state.policeCars)) {
      if (car.alive) targets.push({ x: car.x, y: car.y, radius: 30, kind: 'car', target: car });
    }
    const hits = updateBullets(state.bullets, dt, city, targets);
    for (const hit of hits) {
      const b = hit.bullet;
      if (hit.kind === 'wall') {
        spawnBurst(state.particles, b.x, b.y, '#c8c8d0', 4, 130, 0.2, 2);
        continue;
      }
      const t = hit.target;
      if (hit.kind === 'ped' && b.friendly) {
        t.down = true;
        addCrime(state.wanted, WANTED.kill);
        spawnBurst(state.particles, t.x, t.y, '#c0392b', 10, 160, 0.5, 4);
      } else if (hit.kind === 'enemy' && b.friendly) {
        t.health -= b.damage;
        spawnBurst(state.particles, t.x, t.y, '#c0392b', 8, 150, 0.4, 4);
        if (t.health <= 0) {
          state.kills += 1;
          addCrime(state.wanted, 0);
          if (audio) audio.hit();
        }
      } else if (hit.kind === 'officer' && b.friendly) {
        t.health = 0;
        addCrime(state.wanted, WANTED.kill);
        spawnBurst(state.particles, t.x, t.y, '#c0392b', 8, 150, 0.4, 4);
      } else if (hit.kind === 'player' && !b.friendly) {
        damagePlayer(b.damage);
        spawnBurst(state.particles, t.x, t.y, '#c0392b', 6, 140, 0.4, 3);
      } else if (hit.kind === 'car') {
        t.health -= b.damage;
        spawnBurst(state.particles, b.x, b.y, '#ffd23d', 5, 160, 0.25, 3);
        if (t.health <= 0 && t.alive) {
          t.alive = false;
          explodeCar(state.particles, t);
          if (audio) audio.explosion();
          state.shake = 14;
          if (t === state.bossCar) {
            showBanner('BOSS CAR WRECKED', 'Now vanish.', 2.5);
          }
          if (t === p.car) {
            const wreck = p.car;
            p.car = null;
            p.onFoot = true;
            p.x = wreck.x + 44;
            p.y = wreck.y + 44;
            const fixed = city.resolveCircle(p.x, p.y, 13);
            p.x = fixed.x;
            p.y = fixed.y;
            damagePlayer(25);
          }
        }
      }
    }
    // Foot police shot down stay down: drop them from the list.
    state.footPolice = state.footPolice.filter((o) => o.health !== 0);
    // --- Running over pedestrians in a car.
    if (!p.onFoot && p.car && Math.abs(p.car.speed) > 150) {
      for (const ped of state.peds) {
        if (ped.down) continue;
        const dist = Math.hypot(ped.x - p.car.x, ped.y - p.car.y);
        if (dist < 34) {
          ped.down = true;
          addCrime(state.wanted, WANTED.runOver);
          spawnBurst(state.particles, ped.x, ped.y, '#c0392b', 10, 170, 0.5, 4);
          if (audio) audio.crash();
        }
      }
    }
    updateParticles(state.particles, dt);
    // --- Wanted level and dispatch.
    const policeNear = state.policeCars.some((c) => c.alive && Math.hypot(c.x - p.x, c.y - p.y) < 500) || state.footPolice.length > 0;
    updateWanted(state.wanted, dt, policeNear, state.policeCars, state.footPolice,
      (rnd, cty, x, y) => spawnPoliceCar(rnd, cty, x, y),
      (x, y) => makeFootPolice(x, y), playerPos(), random, city);
    // --- Ammo pickups.
    state.pickupTimer -= dt;
    if (state.pickupTimer <= 0) {
      state.pickupTimer = 26;
      const point = city.roadPoint(random);
      state.pickups.push({ x: point.x, y: point.y });
      if (state.pickups.length > 3) state.pickups.shift();
    }
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = state.pickups[i];
      if (p.onFoot && Math.hypot(p.x - pickup.x, p.y - pickup.y) < 30) {
        p.ammo = Math.min(PLAYER.maxAmmo, p.ammo + 12);
        state.pickups.splice(i, 1);
        if (audio) audio.pickup();
        showBanner('AMMO +12', '', 1.4);
      }
    }
    // --- The mission.
    checkMission();
    // --- Banner and shake decay.
    if (state.bannerTimer > 0) {
      state.bannerTimer -= dt;
      if (state.banner) state.banner.alpha = Math.min(1, state.bannerTimer / 0.6);
      if (state.bannerTimer <= 0) state.banner = null;
    }
    state.shake = Math.max(0, state.shake - dt * 26);
    if (state.stealFlash > 0) state.stealFlash -= dt;
  }

  function reset() {
    state.time = 0;
    state.wanted = createWanted();
    state.missionIndex = 0;
    state.stepIndex = 0;
    state.kills = 0;
    state.bossCar = null;
    state.pickupTimer = 24;
    state.holdProgress = 0;
    state.banner = null;
    state.bannerTimer = 0;
    state.shake = 0;
    state.wasted = false;
    state.busted = false;
    state.storyDone = false;
    state.threat = null;
    spawnInitial();
    startStep();
  }

  function prompt() {
    const p = state.player;
    const gun = city.landmarks.gunShop;
    if (p.onFoot) {
      const near = nearestCar(state.traffic.concat(state.policeCars), p.x, p.y, 78);
      if (near) return 'E — Steal car';
      if (Math.hypot(p.x - gun.x, p.y - gun.y) < 80 && p.money >= MONEY.ammoPrice) return `E — Buy ammo $${MONEY.ammoPrice}`;
      const step = currentStep();
      if (step && step.kind === 'pickup') return 'Stand in the circle to grab it';
      return 'WASD move · Shift sprint · Click shoot';
    }
    return 'WASD drive · Space handbrake · E get out · Q save';
  }

  function marker() {
    const step = currentStep();
    if (!step) return null;
    return stepMarker(step);
  }

  function objective() {
    const mission = currentMission();
    const step = currentStep();
    if (!mission || !step) return '';
    return stepText(step, state);
  }

  function missionTitle() {
    const mission = currentMission();
    return mission ? mission.title : 'Free Roam';
  }

  function applySave(data) {
    reset();
    state.player.money = data.money;
    state.player.ammo = data.ammo;
    state.player.health = data.health;
    state.player.x = data.x;
    state.player.y = data.y;
    state.missionIndex = data.missionIndex;
    state.stepIndex = 0;
    state.kills = 0;
    startStep();
  }

  reset();

  return {
    state, city, step, reset, prompt, marker, objective, missionTitle,
    currentMission, currentStep, playerPos, showBanner, applySave,
    respawnAfterWasted, respawnAfterBusted,
    debugSetWanted(n) {
      state.wanted.stars = n;
      state.wanted.decayTimer = 999;
    },
    debugStartMission(i) {
      state.missionIndex = i;
      state.stepIndex = 0;
      state.kills = 0;
      startStep();
    },
  };
}
