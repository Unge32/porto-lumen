// Porto Lumen — gambar: kota, orang, mobil, efek, HUD, minimap, dan menu.
// Semua digambar dengan canvas 2D; kamera mengikuti pemain. Tidak ada aset
// luar: gedung, pohon, mobil, dan orang semuanya bentuk dan warna kode.

import { VIEW_W, VIEW_H, WORLD, TILE, ROAD, PITCH, BLOCKS, SEA_TOP, SAND_TOP, COLORS, DISTRICTS, LANDMARKS } from './config.js';
import { blockRect, isRoadAt } from './city.js';

function drawBuilding(ctx, b) {
  ctx.fillStyle = b.color;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(b.x, b.y, b.w, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(b.x, b.y + b.h - 5, b.w, 5);
  // Jendela: titik-titik gelap mengikuti jumlah lantai.
  ctx.fillStyle = 'rgba(20,30,50,0.55)';
  const cols = Math.max(1, Math.floor(b.w / 26));
  const rows = Math.max(1, Math.floor(b.h / 26));
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      ctx.fillRect(b.x + 8 + i * 26, b.y + 10 + j * 26, 12, 14);
    }
  }
}

function drawTree(ctx, t) {
  ctx.fillStyle = '#3d6b35';
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5da85c';
  ctx.beginPath();
  ctx.arc(t.x - 2, t.y - 2, t.r * 0.7, 0, Math.PI * 2);
  ctx.fill();
}

function drawCarShape(ctx, x, y, angle, color, kind) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Bayangan.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-25, -11, 50, 26);
  // Badan.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-24, -12, 48, 24, 6);
  ctx.fill();
  // Kabin + kaca.
  ctx.fillStyle = 'rgba(20,30,50,0.75)';
  ctx.beginPath();
  ctx.roundRect(-8, -10, 18, 20, 4);
  ctx.fill();
  // Lampu depan.
  ctx.fillStyle = '#ffe9a0';
  ctx.fillRect(22, -10, 3, 5);
  ctx.fillRect(22, 5, 3, 5);
  if (kind === 'police') {
    // Batang lampu polisi merah-biru.
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(-4, -11, 8, 5);
    ctx.fillStyle = '#2266ff';
    ctx.fillRect(-4, 6, 8, 5);
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 4);
  }
  if (kind === 'boss') {
    ctx.fillStyle = '#ff3333';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS', 0, 4);
  }
  ctx.restore();
}

function drawPedShape(ctx, ped) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  // Bayangan.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Badan.
  ctx.fillStyle = ped.color;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  // Kepala.
  ctx.fillStyle = '#e8b88a';
  ctx.beginPath();
  ctx.arc(Math.cos(ped.angle) * 3, Math.sin(ped.angle) * 3 - 2, 6, 0, Math.PI * 2);
  ctx.fill();
  // Tanda musuh: cincin merah untuk Viper, biru untuk polisi.
  if (ped.kind === 'viper') {
    ctx.strokeStyle = '#ff2222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();
  } else if (ped.kind === 'cop') {
    ctx.strokeStyle = '#2266ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayerShape(ctx, S) {
  const p = S.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 7, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Jaket Dario: oranye terang supaya mudah dikenali.
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b88a';
  ctx.beginPath();
  ctx.arc(Math.cos(p.angle) * 3, Math.sin(p.angle) * 3 - 2, 6.5, 0, Math.PI * 2);
  ctx.fill();
  // Arah hadap: garis bidik pendek.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Math.cos(p.angle) * 12, Math.sin(p.angle) * 12);
  ctx.lineTo(Math.cos(p.angle) * 22, Math.sin(p.angle) * 22);
  ctx.stroke();
  ctx.restore();
}

function drawMarker(ctx, S) {
  const m = S.mission;
  let pt = null;
  let label = '';
  let color = '#ffe14d';
  if (m.index === 0 && m.step === 1) {
    pt = S.markers.garage;
    label = 'GARAGE';
  } else if (m.index === 1 && m.step === 0) {
    pt = S.markers.docks;
    label = 'PACKAGE';
  } else if (m.index === 1 && m.step === 1) {
    pt = [S.mara.x, S.mara.y];
    label = 'MARA';
  } else if (m.index === 3 && m.step === 1) {
    pt = S.markers.safehouse;
    label = 'SAFEHOUSE';
  } else if (m.index === 4 && m.step === 1) {
    pt = S.markers.pier;
    label = 'SOUTH PIER';
  }
  if (!pt) return;
  const pulse = 26 + Math.sin(S.time * 4) * 5;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(pt[0], pt[1], pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pt[0], pt[1], 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText(label, pt[0] + 1, pt[1] - pulse - 9);
  ctx.fillStyle = color;
  ctx.fillText(label, pt[0], pt[1] - pulse - 10);
  ctx.restore();
}

function drawMinimap(ctx, S) {
  const size = 168;
  const x0 = VIEW_W - size - 14;
  const y0 = VIEW_H - size - 14;
  const k = size / WORLD;
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,20,0.78)';
  ctx.fillRect(x0 - 4, y0 - 4, size + 8, size + 8);
  ctx.strokeStyle = '#ffffff88';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 - 4, y0 - 4, size + 8, size + 8);
  // Laut + pasir.
  ctx.fillStyle = COLORS.sea;
  ctx.fillRect(x0, y0 + SEA_TOP * k, size, size - SEA_TOP * k);
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(x0, y0 + SAND_TOP * k, size, (SEA_TOP - SAND_TOP) * k);
  // Jalan.
  ctx.fillStyle = '#565b64';
  for (let i = 0; i <= BLOCKS; i++) {
    ctx.fillRect(x0, y0 + (i * PITCH) * k, size, ROAD * k);
    ctx.fillRect(x0 + (i * PITCH) * k, y0, ROAD * k, size);
  }
  // Gedung.
  ctx.fillStyle = '#9a8a76';
  for (const b of S.city.buildings) {
    ctx.fillRect(x0 + b.x * k, y0 + b.y * k, Math.max(1, b.w * k), Math.max(1, b.h * k));
  }
  // Penanda misi.
  const m = S.mission;
  let pt = null;
  if (m.index === 0 && m.step === 1) pt = S.markers.garage;
  else if (m.index === 1 && m.step === 0) pt = S.markers.docks;
  else if (m.index === 1 && m.step === 1) pt = [S.mara.x, S.mara.y];
  else if (m.index === 3 && m.step === 1) pt = S.markers.safehouse;
  else if (m.index === 4 && m.step === 1) pt = S.markers.pier;
  if (pt) {
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.arc(x0 + pt[0] * k, y0 + pt[1] * k, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pemain (titik putih) + utara.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x0 + S.player.x * k, y0 + S.player.y * k, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('N', x0 + 4, y0 + 12);
  ctx.restore();
}

function drawHUD(ctx, S) {
  ctx.save();
  // Panel kiri atas: uang, darah, amunisi.
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  ctx.beginPath();
  ctx.roundRect(12, 12, 250, 84, 10);
  ctx.fill();
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${S.money}`, 26, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Health ${Math.ceil(S.health)}`, 26, 62);
  ctx.fillStyle = '#333333';
  ctx.fillRect(26, 68, 140, 10);
  ctx.fillStyle = S.health > 30 ? '#37d67a' : '#e5484d';
  ctx.fillRect(26, 68, 140 * Math.max(0, S.health / 100), 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Ammo ${S.ammo}   |   Mission ${S.mission.index + 1}/5`, 26, 90);
  // Bintang wanted kanan atas.
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  ctx.beginPath();
  ctx.roundRect(VIEW_W - 212, 12, 200, 44, 10);
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < S.wanted ? '#ffd21f' : '#555c66';
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', VIEW_W - 188 + i * 38, 44);
  }
  // Tujuan misi di tengah atas.
  ctx.fillStyle = 'rgba(10,14,20,0.72)';
  const obj = S.mission.objective || '';
  ctx.font = '15px sans-serif';
  const w = Math.min(640, ctx.measureText(obj).width + 32);
  ctx.beginPath();
  ctx.roundRect((VIEW_W - w) / 2, 12, w, 34, 10);
  ctx.fill();
  ctx.fillStyle = '#ffe14d';
  ctx.textAlign = 'center';
  ctx.fillText(obj, VIEW_W / 2, 34);
  // Banner misi (muncul beberapa detik).
  if (S.time - S.mission.bannerAt < 4 && S.mission.banner) {
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(S.mission.banner, VIEW_W / 2 + 2, 122);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(S.mission.banner, VIEW_W / 2, 120);
  }
  // Pesan kecil (save, pickup).
  if (S.time - S.messageAt < 2.5 && S.message) {
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(S.message, VIEW_W / 2, VIEW_H - 200);
  }
  // Petunjuk kontrol bawah kiri.
  ctx.fillStyle = 'rgba(10,14,20,0.55)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WASD move/drive  •  E enter car  •  Click shoot  •  Space brake  •  Q save  •  P pause  •  M mute', 14, VIEW_H - 12);
  drawMinimap(ctx, S);
  ctx.restore();
}

function drawTitle(ctx, S, hasSaveGame) {
  ctx.save();
  // Langit senja di atas kota (gradasi).
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#ff9a3d');
  g.addColorStop(0.55, '#e85d75');
  g.addColorStop(1, '#3d2b63');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Siluet kota.
  ctx.fillStyle = 'rgba(20,16,40,0.85)';
  const rngBuildings = [90, 150, 110, 190, 130, 170, 100, 160, 120, 180, 140, 105, 175, 125, 155];
  let x = 0;
  for (const h of rngBuildings) {
    ctx.fillRect(x, VIEW_H - 180 - h, 82, 180 + h);
    x += 86;
  }
  // Matahari.
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(VIEW_W - 220, 150, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(VIEW_W - 220, 150, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('PORTO LUMEN', VIEW_W / 2, 210);
  ctx.font = '22px sans-serif';
  ctx.fillStyle = '#ffe14d';
  ctx.fillText('An open-world crime story — five missions across a sun-soaked port city', VIEW_W / 2, 252);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.fillText('Dario Venn is broke. Mara Solis has work. Steal a car. Run the city. Become King of the Bay.', VIEW_W / 2, 300);
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#7dff8a';
  ctx.fillText('CLICK TO START', VIEW_W / 2, 400);
  if (hasSaveGame) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.fillText('Press C to Continue your saved game', VIEW_W / 2, 436);
  }
  ctx.fillStyle = '#ffffffcc';
  ctx.font = '15px sans-serif';
  ctx.fillText('WASD move / drive  •  E enter & exit cars  •  Mouse aim, click to shoot  •  Q save  •  P pause  •  M mute', VIEW_W / 2, 500);
  ctx.fillText('Free the city, one mission at a time. No network needed — everything runs from these files.', VIEW_W / 2, 528);
  ctx.restore();
}

function drawCenter(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,10,16,0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 60);
  ctx.fillStyle = '#ffffff';
  ctx.font = '21px sans-serif';
  lines.forEach((l, i) => ctx.fillText(l, VIEW_W / 2, VIEW_H / 2 - 6 + i * 32));
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Click to play again', VIEW_W / 2, VIEW_H / 2 + 130);
  ctx.restore();
}

export function render(ctx, S, hasSaveGame) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (S.mode === 'title') {
    drawTitle(ctx, S, hasSaveGame);
    return;
  }
  const cam = S.cam;
  ctx.save();
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
  // Latar: pasir di selatan, laut di ujung, blok tanah di sisanya.
  ctx.fillStyle = '#c9b8a3';
  ctx.fillRect(cam.x - 40, cam.y - 40, VIEW_W + 80, VIEW_H + 80);
  // Laut + pantai.
  ctx.fillStyle = COLORS.sea;
  ctx.fillRect(cam.x - 40, SEA_TOP, VIEW_W + 80, VIEW_H);
  ctx.fillStyle = COLORS.seaDeep;
  for (let i = 0; i < 8; i++) {
    const wy = SEA_TOP + 18 + i * 16;
    ctx.fillRect(cam.x - 40 + ((i * 173) % 200), wy, 90, 3);
  }
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(cam.x - 40, SAND_TOP, VIEW_W + 80, SEA_TOP - SAND_TOP);
  // Blok dan jalan (hanya yang terlihat).
  const x0 = Math.max(0, Math.floor(cam.x / PITCH) - 1);
  const x1 = Math.min(BLOCKS - 1, Math.ceil((cam.x + VIEW_W) / PITCH) + 1);
  const y0 = Math.max(0, Math.floor(cam.y / PITCH) - 1);
  const y1 = Math.min(BLOCKS - 1, Math.ceil((cam.y + VIEW_H) / PITCH) + 1);
  for (let row = y0; row <= y1; row++) {
    for (let col = x0; col <= x1; col++) {
      const [bx, by, bx1, by1] = blockRect(col, row);
      if (col === LANDMARKS.park.col && row === LANDMARKS.park.row) {
        ctx.fillStyle = COLORS.park;
        ctx.fillRect(bx, by, TILE, TILE);
        ctx.fillStyle = COLORS.parkDark;
        ctx.fillRect(bx + 20, by + 20, TILE - 40, TILE - 40);
      } else if (row === BLOCKS - 1) {
        ctx.fillStyle = COLORS.sand;
        ctx.fillRect(bx, by, TILE, TILE);
      } else {
        ctx.fillStyle = COLORS.block;
        ctx.fillRect(bx, by, TILE, TILE);
      }
    }
  }
  // Jalan: aspal + garis tengah + trotoar.
  ctx.fillStyle = COLORS.road;
  for (let i = 0; i <= BLOCKS; i++) {
    ctx.fillRect(cam.x - 40, i * PITCH, VIEW_W + 80, ROAD);
    ctx.fillRect(i * PITCH, cam.y - 40, ROAD, VIEW_H + 80);
  }
  ctx.fillStyle = COLORS.lane;
  for (let i = 0; i <= BLOCKS; i++) {
    const cy = i * PITCH + ROAD / 2;
    for (let x = Math.floor((cam.x - 40) / 48) * 48; x < cam.x + VIEW_W + 40; x += 48) {
      ctx.fillRect(x, cy - 1, 24, 2);
    }
    const cx = i * PITCH + ROAD / 2;
    for (let y = Math.floor((cam.y - 40) / 48) * 48; y < cam.y + VIEW_H + 40; y += 48) {
      ctx.fillRect(cx - 1, y, 2, 24);
    }
  }
  // Nama distrik di tengah bloknya.
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  for (const d of DISTRICTS) {
    const cx = (d.col + d.w / 2) * PITCH;
    const cy = (d.row + d.h / 2) * PITCH;
    if (cx < cam.x - 100 || cx > cam.x + VIEW_W + 100 || cy < cam.y - 40 || cy > cam.y + VIEW_H + 40) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(d.name.toUpperCase(), cx, cy);
  }
  // Gedung + pohon yang terlihat.
  for (const b of S.city.buildings) {
    if (b.x + b.w < cam.x - 20 || b.x > cam.x + VIEW_W + 20 || b.y + b.h < cam.y - 20 || b.y > cam.y + VIEW_H + 20) continue;
    drawBuilding(ctx, b);
  }
  for (const t of S.city.trees) {
    if (t.x < cam.x - 20 || t.x > cam.x + VIEW_W + 20 || t.y < cam.y - 20 || t.y > cam.y + VIEW_H + 20) continue;
    drawTree(ctx, t);
  }
  // Peti.
  for (const c of S.crates) {
    if (c.taken) continue;
    ctx.fillStyle = c.kind === 'ammo' ? '#ffd21f' : '#37d67a';
    ctx.fillRect(c.x - 10, c.y - 10, 20, 20);
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.kind === 'ammo' ? 'AMMO' : 'HP', c.x, c.y + 4);
  }
  // Penanda misi (di bawah entitas, di atas jalan).
  drawMarker(ctx, S);
  // Mara.
  if (S.mara.visible) {
    ctx.fillStyle = '#c94a8f';
    ctx.beginPath();
    ctx.arc(S.mara.x, S.mara.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MARA', S.mara.x, S.mara.y - 18);
  }
  // Pejalan kaki, mobil, pemain.
  for (const ped of S.peds) drawPedShape(ctx, ped);
  for (const car of S.cars) drawCarShape(ctx, car.x, car.y, car.angle, car.color, car.kind);
  if (!S.player.dead) {
    if (S.player.onFoot) drawPlayerShape(ctx, S);
    else if (S.player.car) drawCarShape(ctx, S.player.car.x, S.player.car.y, S.player.car.angle, S.player.car.color, 'player');
  }
  // Peluru.
  ctx.fillStyle = '#ffe08a';
  for (const b of S.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Partikel.
  for (const p of S.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  drawHUD(ctx, S);

  if (S.mode === 'paused') {
    ctx.fillStyle = 'rgba(8,10,16,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2);
    ctx.font = '19px sans-serif';
    ctx.fillText('Press P to resume', VIEW_W / 2, VIEW_H / 2 + 40);
  }
  if (S.mode === 'over') {
    drawCenter(ctx, 'BUSTED', [`Dario went down in Porto Lumen.`, `Missions done: ${S.mission.index}  •  Money: $${S.money}  •  Kills: ${S.stats.kills}`], '#e5484d');
  }
  if (S.mode === 'win') {
    drawCenter(ctx, 'KING OF THE BAY', [`Dario Venn owns Porto Lumen. All five missions complete.`, `Money: $${S.money}  •  Cars stolen: ${S.stats.carsStolen}  •  Kills: ${S.stats.kills}`], '#ffd21f');
  }
}
