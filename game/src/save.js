// Saving: one localStorage slot holds the whole career — money, ammo,
// health, the mission reached, the player's spot and the best take.
// A save never blocks the game: storage can be off and play goes on.
import { SAVE_KEY, BEST_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      version: 1,
      money: state.player.money,
      ammo: state.player.ammo,
      health: state.player.health,
      missionIndex: state.missionIndex,
      x: state.player.x,
      y: state.player.y,
      kills: state.kills,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function readBestTake() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBestTake(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Best take is a nicety; a failed write changes nothing in play.
  }
}
