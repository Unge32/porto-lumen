// Porto Lumen — simpan / muat lewat localStorage (tombol Q saat bermain).
// Yang disimpan hanya progres: misi, uang, darah, amunisi, posisi, wanted.
// Mobil dan lalu lintas dibangun ulang saat muat; itu disengaja supaya save
// selalu konsisten.

import { SAVE_KEY } from './config.js';

export function saveGame(S) {
  try {
    const data = {
      mission: S.mission.index,
      money: S.money,
      health: S.health,
      ammo: S.ammo,
      x: S.player.x,
      y: S.player.y,
      wanted: S.wanted,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    S.message = 'Game saved';
    S.messageAt = S.time;
    return true;
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.mission !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadSave() !== null;
}

export function applySave(S, data, startMission) {
  S.money = data.money ?? 50;
  S.health = data.health ?? 100;
  S.ammo = data.ammo ?? 24;
  S.player.x = data.x;
  S.player.y = data.y;
  S.player.onFoot = true;
  S.player.car = null;
  S.wanted = 0;
  S.cam.x = data.x;
  S.cam.y = data.y;
  startMission(S, Math.min(data.mission, 4), null);
  S.wanted = data.wanted ?? 0;
}
