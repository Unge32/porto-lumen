// Bullets, explosions and particles. Bullets fly straight, die on walls
// and on whatever they hit; explosions are pure particles and a shake.
import { PLAYER } from './config.js';

export function makeBullet(x, y, angle, speed, damage, friendly) {
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: PLAYER.bulletRange / speed,
    damage, friendly, dead: false,
  };
}

export function spawnBurst(particles, x, y, color, count, speed, life, size) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const power = speed * (0.4 + Math.random() * 0.6);
    particles.push({
      x, y,
      vx: Math.cos(angle) * power,
      vy: Math.sin(angle) * power,
      life: life * (0.6 + Math.random() * 0.4),
      maxLife: life,
      color, size: size * (0.7 + Math.random() * 0.6),
      kind: 'spark',
    });
  }
}

export function spawnSmoke(particles, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 24,
      vy: -20 - Math.random() * 26,
      life: 0.9 + Math.random() * 0.7,
      maxLife: 1.6,
      color: '#5a5a62',
      size: 10 + Math.random() * 12,
      kind: 'smoke',
    });
  }
}

export function updateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
  }
}

// Move every bullet one step. Returns a list of hits so the caller can
// apply damage, wanted and sound: { bullet, kind, target }.
export function updateBullets(bullets, dt, city, targets) {
  const hits = [];
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const b = bullets[i];
    b.life -= dt;
    if (b.life <= 0) {
      bullets.splice(i, 1);
      continue;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (city.buildingAt(b.x, b.y, 0) || b.y >= 3400 || b.x < 0 || b.x > 3600 || b.y < 0) {
      hits.push({ bullet: b, kind: 'wall', target: null });
      bullets.splice(i, 1);
      continue;
    }
    let hit = false;
    for (const t of targets) {
      const ent = t.target;
      if (!ent || ent.dead) continue;
      if (ent.health !== undefined && ent.health <= 0) continue;
      const radius = t.radius || 13;
      const dx = b.x - t.x;
      const dy = b.y - t.y;
      if (dx * dx + dy * dy < radius * radius) {
        hits.push({ bullet: b, kind: t.kind, target: ent });
        bullets.splice(i, 1);
        hit = true;
        break;
      }
    }
    if (hit) continue;
  }
  return hits;
}

export function explodeCar(particles, car) {
  spawnBurst(particles, car.x, car.y, '#ff7a2f', 26, 340, 0.7, 5);
  spawnBurst(particles, car.x, car.y, '#ffd23d', 18, 260, 0.5, 4);
  spawnSmoke(particles, car.x, car.y, 10);
}
