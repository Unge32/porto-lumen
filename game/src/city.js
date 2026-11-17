// Porto Lumen, the city itself: a grid of avenues, blocks of buildings,
// a park, a beachfront and the sea. The layout is fixed by the seeded
// random stream, so every run of the same seed builds the same city.
// Everything else in the game asks the city where things are and what
// blocks movement; nothing else lays a brick.
import { WORLD, BEACH, SEA, PALETTE } from './config.js';

const ROAD_COUNT = 11;
const FIRST_ROAD = 150;

export function createCity(random) {
  const roads = [];
  for (let i = 0; i < ROAD_COUNT; i += 1) roads.push(FIRST_ROAD + i * WORLD.roadGap);

  const buildings = [];
  const parks = [];
  const trees = [];
  const lots = [];

  // The park takes one whole block near the centre, with trees inside it.
  const parkRect = { x: 1650, y: 1650, w: 176, h: 176 };
  parks.push(parkRect);

  // Named places the missions and the shops use. Each sits on a road, so
  // a marker on it is always reachable by car and on foot.
  const landmarks = {
    garage: { x: 450, y: 450, name: "Mara's Garage" },
    gunShop: { x: 1350, y: 750, name: 'Lumen Arms' },
    hospital: { x: 2250, y: 1350, name: 'St. Clara Hospital' },
    docks: { x: 3150, y: 2850, name: 'Porto Lumen Docks' },
    safehouse: { x: 2850, y: 2850, name: 'Marina Safehouse' },
    park: { x: 1738, y: 1738, name: 'Plaza del Sol' },
    pier: { x: 3150, y: 3150, name: 'South Pier' },
  };

  function blockRect(i, j) {
    const x0 = roads[i] + WORLD.roadWidth / 2 + WORLD.sidewalk;
    const y0 = roads[j] + WORLD.roadWidth / 2 + WORLD.sidewalk;
    const x1 = roads[i + 1] - WORLD.roadWidth / 2 - WORLD.sidewalk;
    const y1 = roads[j + 1] - WORLD.roadWidth / 2 - WORLD.sidewalk;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  function insideLandmark(rect) {
    for (const key of Object.keys(landmarks)) {
      const spot = landmarks[key];
      if (spot.x > rect.x - 40 && spot.x < rect.x + rect.w + 40 && spot.y > rect.y - 40 && spot.y < rect.y + rect.h + 40) return true;
    }
    return false;
  }

  // Fill the blocks: most get one or two buildings, a few get a parking
  // lot, one is the park. The beachfront row gets low hotels.
  for (let i = 0; i < ROAD_COUNT - 1; i += 1) {
    for (let j = 0; j < ROAD_COUNT - 1; j += 1) {
      const rect = blockRect(i, j);
      if (rect.x > parkRect.x - 10 && rect.x < parkRect.x + parkRect.w + 10 && rect.y > parkRect.y - 10 && rect.y < parkRect.y + parkRect.h + 10) continue;
      if (insideLandmark(rect)) continue;
      const roll = random.next();
      if (roll < 0.12) {
        lots.push(rect);
        continue;
      }
      if (roll < 0.2) {
        parks.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h });
        for (let t = 0; t < 7; t += 1) {
          trees.push({ x: rect.x + random.range(14, rect.w - 14), y: rect.y + random.range(14, rect.h - 14), r: random.range(7, 11) });
        }
        continue;
      }
      const beachfront = j === ROAD_COUNT - 2;
      const roof = random.pick(PALETTE.buildingRoof);
      if (random.chance(0.55)) {
        const w = random.range(64, rect.w - 20);
        const h = random.range(56, rect.h - 20);
        buildings.push({
          x: rect.x + (rect.w - w) / 2, y: rect.y + (rect.h - h) / 2, w, h,
          roof, wall: PALETTE.buildingWall, tall: beachfront && random.chance(0.6),
        });
      } else {
        const w1 = random.range(52, rect.w / 2 - 8);
        const h1 = random.range(48, rect.h - 20);
        const w2 = random.range(52, rect.w / 2 - 8);
        const h2 = random.range(48, rect.h - 20);
        buildings.push({ x: rect.x + 6, y: rect.y + (rect.h - h1) / 2, w: w1, h: h1, roof, wall: PALETTE.buildingWall, tall: false });
        buildings.push({ x: rect.x + rect.w - w2 - 6, y: rect.y + (rect.h - h2) / 2, w: w2, h: h2, roof: random.pick(PALETTE.buildingRoof), wall: PALETTE.buildingWall, tall: false });
      }
    }
  }

  // Palms along the beachfront avenue and a few shade trees in the park.
  for (let x = 200; x < WORLD.size - 100; x += 130) {
    trees.push({ x: x + random.range(-20, 20), y: BEACH.y - 26 + random.range(-6, 6), r: 10, palm: true });
  }
  for (let t = 0; t < 12; t += 1) {
    trees.push({ x: parkRect.x + random.range(16, parkRect.w - 16), y: parkRect.y + random.range(16, parkRect.h - 16), r: random.range(8, 12) });
  }

  function nearestRoad(value) {
    let best = roads[0];
    let bestDist = Math.abs(value - best);
    for (const road of roads) {
      const dist = Math.abs(value - road);
      if (dist < bestDist) {
        bestDist = dist;
        best = road;
      }
    }
    return best;
  }

  function isRoad(x, y) {
    if (x < 0 || x > WORLD.size || y < 0 || y > BEACH.y) return false;
    const half = WORLD.roadWidth / 2;
    return Math.abs(x - nearestRoad(x)) <= half || Math.abs(y - nearestRoad(y)) <= half;
  }

  function isWater(x, y) {
    return y >= SEA.y || x < 0 || x > WORLD.size || y < 0 || y > WORLD.size;
  }

  function buildingAt(x, y, pad) {
    const p = pad || 0;
    for (const b of buildings) {
      if (x > b.x - p && x < b.x + b.w + p && y > b.y - p && y < b.y + b.h + p) return b;
    }
    return null;
  }

  // Push a circle out of every building and out of the water, then clamp
  // it inside the world. Returns the corrected position.
  function resolveCircle(x, y, radius) {
    let px = x;
    let py = y;
    for (const b of buildings) {
      const nearestX = Math.max(b.x, Math.min(px, b.x + b.w));
      const nearestY = Math.max(b.y, Math.min(py, b.y + b.h));
      const dx = px - nearestX;
      const dy = py - nearestY;
      const distSq = dx * dx + dy * dy;
      if (distSq < radius * radius) {
        if (distSq === 0) {
          py = b.y - radius;
        } else {
          const dist = Math.sqrt(distSq);
          px = nearestX + (dx / dist) * radius;
          py = nearestY + (dy / dist) * radius;
        }
      }
    }
    if (py + radius > SEA.y) py = SEA.y - radius;
    px = Math.max(radius, Math.min(WORLD.size - radius, px));
    py = Math.max(radius, Math.min(WORLD.size - radius, py));
    return { x: px, y: py };
  }

  // A point on the nearest road, for spawning traffic and pedestrians.
  function roadPoint(randomStream) {
    const vertical = randomStream.chance(0.5);
    const road = randomStream.pick(roads);
    const along = randomStream.range(120, BEACH.y - 80);
    return vertical ? { x: road, y: along } : { x: along, y: road };
  }

  // A free point on a sidewalk, for spawning a pedestrian.
  function sidewalkPoint(randomStream) {
    const vertical = randomStream.chance(0.5);
    const road = randomStream.pick(roads);
    const side = randomStream.chance(0.5) ? 1 : -1;
    const offset = WORLD.roadWidth / 2 + WORLD.sidewalk / 2;
    const along = randomStream.range(120, WORLD.size - 120);
    const point = vertical ? { x: road + side * offset, y: along } : { x: along, y: road + side * offset };
    if (point.y > BEACH.y - 30) point.y = BEACH.y - 30;
    return point;
  }

  return {
    roads, buildings, parks, trees, lots, landmarks,
    nearestRoad, isRoad, isWater, buildingAt, resolveCircle,
    roadPoint, sidewalkPoint,
  };
}
