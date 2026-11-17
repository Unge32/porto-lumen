// Boot and the one loop: input is read every frame, the world advances
// in fixed 1/60 s steps, and the renderer paints what is there. The game
// moves between six screens: title, play, paused, wasted, busted and
// the story-complete screen.
//
// ?seed=N fixes the city's random stream. ?shot=title|drive|chase|mission
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
// window.__game exposes the world for playtests and debugging.
import { STEP, WORLD } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, ACTION_SAVE, createInput } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_WASTED, SCREEN_BUSTED, SCREEN_COMPLETE } from './render.js';
import { createAudio } from './audio.js';
import { saveGame, loadGame, hasSave, readBestTake, saveBestTake } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput(canvas);

let screen = SCREEN_TITLE;
let time = 0;
let bestTake = readBestTake();
let completeShown = false;
let camera = { x: 0, y: 0 };
let zoom = 1;

window.__game = {
  world,
  get screen() {
    return screen;
  },
  get time() {
    return time;
  },
};

function announce(message) {
  status.textContent = message;
}

function cameraTarget() {
  const pos = world.playerPos();
  const targetZoom = world.state.player.onFoot ? 1 : 0.82;
  zoom += (targetZoom - zoom) * 0.06;
  const vw = canvas.clientWidth || 1280;
  const vh = canvas.clientHeight || 720;
  const tx = pos.x - vw / (2 * zoom);
  const ty = pos.y - vh / (2 * zoom);
  return {
    x: Math.max(0, Math.min(WORLD.size - vw / zoom, tx)),
    y: Math.max(0, Math.min(WORLD.size - vh / zoom, ty)),
  };
}

function buildView() {
  const state = world.state;
  const player = state.player;
  const cars = state.traffic.concat(state.policeCars);
  if (player.car) cars.push(player.car);
  const step = world.currentStep();
  return {
    city: state.city, camera, zoom, shake: state.shake, time,
    player, cars, peds: state.peds, enemies: state.enemies,
    footPolice: state.footPolice, bullets: state.bullets, particles: state.particles,
    wanted: state.wanted, marker: world.marker(),
    missionTitle: world.missionTitle(), objective: world.objective(),
    prompt: screen === SCREEN_PLAY ? world.prompt() : '',
    banner: state.banner, holdProgress: state.holdProgress,
    hasSave: hasSave(), bestTake,
  };
}

function startGame(fromSave) {
  if (fromSave) {
    const data = loadGame();
    if (data) world.applySave(data);
  }
  screen = SCREEN_PLAY;
  announce('Playing. Follow the gold marker.');
  audio.unlock();
}

function doSave() {
  if (saveGame(world.state)) {
    world.showBanner('GAME SAVED', '', 1.6);
  }
}

function frameInput() {
  const mouse = input.mouse();
  const aimWorld = renderer.worldFromScreen(mouse.x, mouse.y, { camera, zoom });
  return {
    move: input.move(),
    sprint: input.sprint(),
    aim: aimWorld,
    fire: mouse.down,
    use: false,
    drive: input.drive(),
  };
}

function runShot(name) {
  const scene = stageShot(name, world);
  const target = cameraTarget();
  camera = target;
  let painted = 0;
  function paint() {
    renderer.draw(buildView(), scene.screen, time);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let last = performance.now();
  let accumulator = 0;

  function stepWorld() {
    const base = frameInput();
    const newGameKey = input.pressedCode('KeyN');
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      world.showBanner(muted ? 'SOUND OFF' : 'SOUND ON', '', 1.2);
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) {
        startGame(hasSave());
      } else if (newGameKey) {
        startGame(false);
      } else {
        // The city lives behind the title.
        world.step(STEP, { ...base, aim: { x: world.state.player.x + 100, y: world.state.player.y } }, null);
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) screen = SCREEN_PLAY;
      if (actions & ACTION_SAVE) doSave();
      return;
    }
    if (screen === SCREEN_WASTED) {
      if (actions & ACTION_CONFIRM) {
        world.respawnAfterWasted();
        screen = SCREEN_PLAY;
      }
      return;
    }
    if (screen === SCREEN_BUSTED) {
      if (actions & ACTION_CONFIRM) {
        world.respawnAfterBusted();
        screen = SCREEN_PLAY;
      }
      return;
    }
    if (screen === SCREEN_COMPLETE) {
      if (actions & ACTION_CONFIRM) {
        screen = SCREEN_PLAY;
      }
      return;
    }
    // Playing.
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & ACTION_SAVE) doSave();
    base.use = Boolean(actions & 2);
    world.step(STEP, base, audio);
    time += STEP;
    if (world.state.wasted) {
      screen = SCREEN_WASTED;
      audio.busted();
      if (world.state.player.money > bestTake) {
        bestTake = world.state.player.money;
        saveBestTake(bestTake);
      }
      announce('Wasted.');
    } else if (world.state.busted) {
      screen = SCREEN_BUSTED;
      audio.busted();
      announce('Busted.');
    } else if (world.state.storyDone && !completeShown) {
      completeShown = true;
      screen = SCREEN_COMPLETE;
      audio.missionDone();
    }
    const speed01 = world.state.player.car ? Math.abs(world.state.player.car.speed) / 560 : 0;
    audio.engine(speed01, Boolean(world.state.player.car));
    audio.siren(world.state.wanted.stars > 0);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    while (accumulator >= STEP) {
      stepWorld();
      accumulator -= STEP;
    }
    const target = cameraTarget();
    camera.x += (target.x - camera.x) * 0.12;
    camera.y += (target.y - camera.y) * 0.12;
    renderer.draw(buildView(), screen, time);
  }

  announce('Porto Lumen. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
