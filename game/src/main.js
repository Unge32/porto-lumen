// Porto Lumen — titik masuk game: loop utama, mode, kamera, dan wiring.
// Membaca input, menggerakkan dunia, lalu menggambar. Satu frame = satu
// langkah simulasi dengan dt yang dibatasi, supaya tabrakan tetap stabil.

import { VIEW_W, VIEW_H, WORLD, MISSIONS } from './config.js';
import { clamp } from './random.js';
import { createWorld, updateParticles, nearestCar } from './world.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { updateCars } from './vehicles.js';
import { updatePeople, reapDead } from './people.js';
import { playerShoot, updateBullets, updateCrates } from './combat.js';
import { updateWanted } from './wanted.js';
import { updateMissions, startMission, tryEnterExitCar } from './missions.js';
import { saveGame, loadSave, hasSave, applySave } from './save.js';
import { render } from './render.js';
import { setupShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const input = new Input(canvas);
const sfx = new Sfx();
const S = createWorld();
window.__porto = S;
window.__portoReady = false;

// Kamera mengikuti pemain (atau mobilnya), dijepit ke dalam dunia.
function updateCamera() {
  const tx = clamp(S.player.x - VIEW_W / 2, 0, WORLD - VIEW_W);
  const ty = clamp(S.player.y - VIEW_H / 2, 0, WORLD - VIEW_H);
  S.cam.x += (tx - S.cam.x) * 0.12;
  S.cam.y += (ty - S.cam.y) * 0.12;
}

function startPlaying(fromSave) {
  if (fromSave) {
    const data = loadSave();
    if (data) applySave(S, data, startMission);
    else startMission(S, 0, sfx);
  } else {
    startMission(S, 0, sfx);
  }
  S.mode = 'playing';
  sfx.ensure();
}

function restart() {
  const fresh = createWorld(S.seed);
  Object.keys(S).forEach((k) => delete S[k]);
  Object.assign(S, fresh);
  window.__porto = S;
  startMission(S, 0, sfx);
  S.mode = 'playing';
}

let last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05; // jepit: tab tidak aktif tidak melempar simulasi
  if (dt <= 0) return;

  // Tombol global yang bekerja di semua mode.
  if (input.wasPressed('m')) {
    S.muted = !S.muted;
    sfx.setMuted(S.muted);
  }

  if (S.mode === 'title') {
    if (input.wasClicked() || input.wasPressed('Enter') || input.wasPressed(' ')) {
      startPlaying(false);
    } else if (input.wasPressed('c') && hasSave()) {
      startPlaying(true);
    }
  } else if (S.mode === 'playing') {
    S.time += dt;
    if (input.wasPressed('p') || input.wasPressed('Escape')) {
      S.mode = 'paused';
    } else {
      if (input.wasPressed('e')) tryEnterExitCar(S, sfx);
      if (input.wasPressed('q')) saveGame(S);
      if (input.mouseDown || input.wasClicked()) playerShoot(S, input, S.cam, sfx);
      if (S.player.fireCd > 0) S.player.fireCd -= dt;
      updateCars(S, dt, input, sfx);
      updatePeople(S, dt, input, S.cam, sfx);
      updateBullets(S, dt, sfx);
      updateCrates(S, sfx);
      updateWanted(S, dt, sfx);
      updateMissions(S, dt, input, sfx);
      reapDead(S, sfx);
      updateParticles(S, dt);
      // Regenerasi darah perlahan saat tidak dikejar dan tidak terluka.
      if (S.wanted === 0 && S.time - S.lastHurtAt > 5 && S.health > 0 && S.health < 100) {
        S.health = Math.min(100, S.health + 2 * dt);
      }
      updateCamera();
    }
  } else if (S.mode === 'paused') {
    if (input.wasPressed('p') || input.wasPressed('Escape')) S.mode = 'playing';
  } else if (S.mode === 'over' || S.mode === 'win') {
    if (input.wasClicked() || input.wasPressed('Enter') || input.wasPressed(' ')) {
      restart();
    }
  }

  render(ctx, S, hasSave());
  window.__portoReady = true;
  input.endFrame();
}

// Adegan screenshot: ?shot=title|drive|chase|mission menata dunia lalu
// membiarkannya berjalan (tangkapan diambil setelah ~1 detik).
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  setupShot(S, shot, sfx);
  S.cam.x = clamp(S.player.x - VIEW_W / 2, 0, WORLD - VIEW_W);
  S.cam.y = clamp(S.player.y - VIEW_H / 2, 0, WORLD - VIEW_H);
}

requestAnimationFrame(frame);
