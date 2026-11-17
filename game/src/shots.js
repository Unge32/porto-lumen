// The screenshot scenes behind ?shot=title|drive|chase|mission. Each one
// plays the real game forward from a fresh world for a fixed number of
// steps, steered by a scripted driver, so the frame is what a short game
// really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

const SAMPLE = STEP;

function idleInput(aim) {
  return {
    move: { x: 0, y: 0 }, sprint: false,
    aim: aim || { x: 0, y: 0 }, fire: false, use: false,
    drive: { throttle: 0, brake: 0, steer: 0, handbrake: false },
  };
}

// Steer a car toward a point far ahead on its own lane, the way traffic
// does: the car arcs through the turn instead of snapping to it.
function driveAlongLane(car) {
  const lane = car.lane;
  if (!lane) return { throttle: 1, brake: 0, steer: 0, handbrake: false };
  const off = lane.axis === 'x' ? lane.dir * 23 : -lane.dir * 23;
  let tx;
  let ty;
  if (lane.axis === 'x') {
    tx = car.x + lane.dir * 260;
    ty = lane.road + off;
  } else {
    tx = lane.road + off;
    ty = car.y + lane.dir * 260;
  }
  const want = Math.atan2(ty - car.y, tx - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return { throttle: 1, brake: 0, steer: Math.max(-1, Math.min(1, diff * 2.2)), handbrake: false };
}

function simulate(world, seconds, inputFn) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    world.step(SAMPLE, inputFn(i), null);
  }
}

function nearestRoad(roads, value) {
  let best = roads[0];
  for (const road of roads) {
    if (Math.abs(road - value) < Math.abs(best - value)) best = road;
  }
  return best;
}

// Like driveAlongLane, but when the car is about to run out of road it
// turns onto the nearest cross street, so a long scripted drive keeps
// moving around the city instead of wedging at the map edge.
function driveWithTurns(car, city) {
  const lane = car.lane;
  if (lane && city) {
    const along = lane.axis === 'x' ? car.x : car.y;
    const ahead = lane.dir > 0 ? 3150 - along : along - 150;
    if (ahead < 300) {
      if (lane.axis === 'x') {
        const cross = nearestRoad(city.roads, car.x);
        car.lane = { axis: 'y', road: cross, dir: car.y > 1650 ? -1 : 1 };
      } else {
        const cross = nearestRoad(city.roads, car.y);
        car.lane = { axis: 'x', road: cross, dir: car.x > 1650 ? -1 : 1 };
      }
    }
  }
  return driveAlongLane(car);
}

// Put the player in a traffic car with a long straight run ahead of it
// and drive it down the avenue.
function stealAndDrive(world, seconds) {
  const player = world.state.player;
  const cars = world.state.traffic.filter((c) => c.lane && c.lane.axis === 'x');
  let car = world.state.traffic[0];
  let bestRun = 0;
  for (const candidate of cars) {
    const runway = candidate.lane.dir > 0 ? 3150 - candidate.x : candidate.x - 150;
    if (runway > bestRun && runway > 1400) { car = candidate; bestRun = runway; }
  }
  player.x = car.x - 40;
  player.y = car.y;
  world.step(SAMPLE, { ...idleInput({ x: car.x, y: car.y }), use: true }, null);
  const aim = { x: player.x + 100, y: player.y };
  simulate(world, seconds, () => {
    const p = world.state.player;
    if (p.onFoot || !p.car) return idleInput(aim);
    return { ...idleInput(aim), drive: driveWithTurns(p.car, world.city) };
  });
}

export function stageShot(name, world) {
  world.reset();
  const player = world.state.player;
  if (name === 'drive') {
    stealAndDrive(world, 3);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    stealAndDrive(world, 1.5);
    world.debugSetWanted(3);
    // Let the dispatch bring the police in, then run from them.
    simulate(world, 5, (i) => {
      const p = world.state.player;
      if (p.onFoot || !p.car) return idleInput({ x: p.x + 100, y: p.y });
      return { ...idleInput({ x: p.x + 100, y: p.y }), drive: driveWithTurns(p.car, world.city) };
    });
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    world.debugStartMission(2);
    player.x = 1738;
    player.y = 1850;
    // Let the Vipers close in, then fire twice at the nearest one so the
    // frame catches a kill (1 / 5) plus a bullet still in flight.
    simulate(world, 2, (i) => {
      const enemies = world.state.enemies.filter((e) => e.health > 0);
      const foe = enemies[0];
      const aim = foe ? { x: foe.x, y: foe.y } : { x: player.x + 100, y: player.y };
      return { ...idleInput(aim), fire: i === 100 || i === 113 };
    });
    return { screen: SCREEN_PLAY };
  }
  // Title: a busy corner, traffic and pedestrians drifting past.
  player.x = 1500;
  player.y = 1420;
  simulate(world, 4, () => idleInput({ x: player.x + 120, y: player.y - 60 }));
  return { screen: SCREEN_TITLE };
}
