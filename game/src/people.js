// Porto Lumen — orang: pejalan kaki, polisi jalan kaki, dan geng Viper,
// plus gerakan pemain saat jalan kaki. Warga menghindar dari bahaya; polisi
// dan Viper mengejar dan menembak pemain.

import { PLAYER_R, PLAYER_SPEED, WORLD, BULLET_SPEED, ENEMY_BULLET_DAMAGE, PITCH, BLOCKS } from './config.js';
import { clamp, dist, angleTo, turnToward, rand } from './random.js';
import { collideBuildings, isRoadAt } from './city.js';
import { spawnParticles } from './world.js';

function hurtPlayer(S, amount) {
  if (S.mode !== 'playing' || S.player.dead) return;
  S.health -= amount;
  S.lastHurtAt = S.time;
  if (S.health <= 0) {
    S.health = 0;
    S.player.dead = true;
    S.mode = 'over';
  }
}

// Gerakan pemain jalan kaki: WASD, hadap ke arah mouse, tabrakan gedung.
export function updatePlayerOnFoot(S, dt, input, cam) {
  const p = S.player;
  let mx = 0;
  let my = 0;
  if (input.down('w', 'ArrowUp')) my -= 1;
  if (input.down('s', 'ArrowDown')) my += 1;
  if (input.down('a', 'ArrowLeft')) mx -= 1;
  if (input.down('d', 'ArrowRight')) mx += 1;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    p.x += (mx / len) * PLAYER_SPEED * dt;
    p.y += (my / len) * PLAYER_SPEED * dt;
  }
  p.x = clamp(p.x, PLAYER_R, WORLD - PLAYER_R);
  p.y = clamp(p.y, PLAYER_R, WORLD - PLAYER_R);
  const hit = collideBuildings(S.city.buildings, p.x, p.y, PLAYER_R);
  if (hit) {
    p.x = hit.x;
    p.y = hit.y;
  }
  // Arah hadap mengikuti mouse (posisi layar -> posisi dunia).
  const wx = cam.x + input.mouseX;
  const wy = cam.y + input.mouseY;
  p.angle = angleTo(p.x, p.y, wx, wy);
}

// Warga: jalan santai di trotoar, belok di persimpangan; lari saat ada
// tembakan atau mobil polisi melaju ke arahnya.
function civilianAI(S, ped, dt) {
  if (ped.fleeing) {
    ped.wanderCd -= dt;
    if (ped.wanderCd <= 0) ped.fleeing = false;
  }
  ped.wanderCd -= dt;
  if (ped.wanderCd <= 0) {
    ped.wanderCd = 2 + Math.random() * 3;
    ped.targetAngle = Math.floor(Math.random() * 4) * (Math.PI / 2);
  }
  const speed = ped.fleeing ? 150 : 55;
  ped.angle = turnToward(ped.angle, ped.targetAngle, 3 * dt);
  ped.x += Math.cos(ped.angle) * speed * dt;
  ped.y += Math.sin(ped.angle) * speed * dt;
  // Tetap di jalan: kalau masuk blok, putar balik.
  if (!isRoadAt(ped.x, ped.y)) {
    ped.angle += Math.PI;
    ped.x += Math.cos(ped.angle) * speed * dt * 2;
    ped.y += Math.sin(ped.angle) * speed * dt * 2;
  }
  ped.x = clamp(ped.x, 20, WORLD - 20);
  ped.y = clamp(ped.y, 20, WORLD - 20);
}

// Polisi jalan kaki dan Viper: kejar pemain, tembak saat cukup dekat.
function hunterAI(S, ped, dt, sfx) {
  const p = S.player;
  const d = dist(ped.x, ped.y, p.x, p.y);
  const target = angleTo(ped.x, ped.y, p.x, p.y);
  ped.angle = turnToward(ped.angle, target, 4 * dt);
  const speed = ped.kind === 'viper' ? 165 : 150;
  if (d > 240) {
    ped.x += Math.cos(ped.angle) * speed * dt;
    ped.y += Math.sin(ped.angle) * speed * dt;
  }
  const hit = collideBuildings(S.city.buildings, ped.x, ped.y, PLAYER_R);
  if (hit) {
    ped.x = hit.x;
    ped.y = hit.y;
  }
  ped.x = clamp(ped.x, 20, WORLD - 20);
  ped.y = clamp(ped.y, 20, WORLD - 20);
  // Tembak pemain saat dalam jangkauan dan terlihat.
  ped.shootCd -= dt;
  if (d < 340 && ped.shootCd <= 0 && S.mode === 'playing' && !p.dead) {
    ped.shootCd = 0.9 + Math.random() * 0.7;
    const spread = (Math.random() - 0.5) * 0.35;
    const a = target + spread;
    S.bullets.push({
      x: ped.x + Math.cos(a) * 20,
      y: ped.y + Math.sin(a) * 20,
      vx: Math.cos(a) * BULLET_SPEED * 0.8,
      vy: Math.sin(a) * BULLET_SPEED * 0.8,
      life: 1.1,
      from: 'enemy',
      damage: ENEMY_BULLET_DAMAGE,
    });
    sfx.enemyShot();
  }
  // Sentuhan langsung juga melukai (10 hp per detik selama menempel).
  if (d < 30) hurtPlayer(S, 10 * dt);
}

export function updatePeople(S, dt, input, cam, sfx) {
  const p = S.player;
  if (p.onFoot && !p.dead && S.mode === 'playing') updatePlayerOnFoot(S, dt, input, cam);
  for (const ped of S.peds) {
    if (ped.kind === 'civilian') civilianAI(S, ped, dt);
    else hunterAI(S, ped, dt, sfx);
  }
  // Warga yang melihat tembakan di dekatnya akan lari.
  for (const ped of S.peds) {
    if (ped.kind !== 'civilian') continue;
    for (const b of S.bullets) {
      if (dist(ped.x, ped.y, b.x, b.y) < 160) {
        ped.fleeing = true;
        ped.wanderCd = 2;
        ped.targetAngle = angleTo(b.x, b.y, ped.x, ped.y);
        break;
      }
    }
  }
}

// Semua warga/polisi/Viper yang mati dihapus; pemain dapat skornya.
export function reapDead(S, sfx) {
  for (const ped of [...S.peds]) {
    if (ped.hp > 0) continue;
    spawnParticles(S, ped.x, ped.y, '#ff4444', 12, 180);
    if (ped.kind === 'viper') {
      S.stats.kills++;
      S.money += 100;
      S.mission.vipersLeft = Math.max(0, S.mission.vipersLeft - 1);
    }
    if (ped.kind === 'cop') S.stats.kills++;
    S.peds = S.peds.filter((q) => q !== ped);
  }
}
