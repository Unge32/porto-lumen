// Everything the player sees: the city from above, the people and cars
// in it, the bullets and smoke, and the HUD — health, money, wanted
// stars, the mission line and the minimap. The camera follows the player
// and the screens (title, pause, wasted, busted, complete) paint over it.
import { WORLD, BEACH, SEA, PALETTE, STEP } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_COMPLETE = 'complete';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let vw = 1280;
  let vh = 720;
  let dpr = 1;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = canvas.clientWidth || 1280;
    vh = canvas.clientHeight || 720;
    canvas.width = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function inView(cam, x, y, margin) {
    return x > cam.x - margin && x < cam.x + vw + margin && y > cam.y - margin && y < cam.y + vh + margin;
  }

  function drawCity(city, cam, zoom) {
    const view = { left: cam.x - 40, top: cam.y - 40, right: cam.x + vw / zoom + 40, bottom: cam.y + vh / zoom + 40 };
    // Ground.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(view.left, view.top, view.right - view.left, view.bottom - view.top);
    // Beach and sea along the south edge.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(view.left, BEACH.y, view.right - view.left, SEA.y - BEACH.y);
    ctx.fillStyle = PALETTE.sea;
    ctx.fillRect(view.left, SEA.y, view.right - view.left, WORLD.size - SEA.y);
    ctx.fillStyle = PALETTE.seaDeep;
    for (let y = SEA.y + 26; y < WORLD.size; y += 52) {
      ctx.fillRect(view.left, y, view.right - view.left, 5);
    }
    // Parks and parking lots.
    for (const park of city.parks) {
      if (!inView(cam, park.x + park.w / 2, park.y + park.h / 2, 200)) continue;
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(park.x, park.y, park.w, park.h);
    }
    for (const lot of city.lots) {
      if (!inView(cam, lot.x + lot.w / 2, lot.y + lot.h / 2, 200)) continue;
      ctx.fillStyle = '#55555e';
      ctx.fillRect(lot.x, lot.y, lot.w, lot.h);
      ctx.strokeStyle = '#e8d44f';
      ctx.lineWidth = 2;
      for (let x = lot.x + 16; x < lot.x + lot.w - 10; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, lot.y + 12);
        ctx.lineTo(x, lot.y + lot.h - 12);
        ctx.stroke();
      }
    }
    // Sidewalks, then roads, then their centre dashes.
    const half = WORLD.roadWidth / 2;
    const side = WORLD.sidewalk;
    ctx.fillStyle = PALETTE.sidewalk;
    for (const road of city.roads) {
      ctx.fillRect(0, road - half - side, WORLD.size, WORLD.roadWidth + side * 2);
      ctx.fillRect(road - half - side, 0, WORLD.roadWidth + side * 2, BEACH.y);
    }
    ctx.fillStyle = PALETTE.road;
    for (const road of city.roads) {
      ctx.fillRect(0, road - half, WORLD.size, WORLD.roadWidth);
      ctx.fillRect(road - half, 0, WORLD.roadWidth, BEACH.y);
    }
    ctx.strokeStyle = PALETTE.roadLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([22, 26]);
    for (const road of city.roads) {
      ctx.beginPath();
      ctx.moveTo(0, road);
      ctx.lineTo(WORLD.size, road);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(road, 0);
      ctx.lineTo(road, BEACH.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Buildings: a soft shadow, walls, then the roof with a lighter cap.
    for (const b of city.buildings) {
      if (!inView(cam, b.x + b.w / 2, b.y + b.h / 2, 120)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + 7, b.y + 9, b.w, b.h);
      ctx.fillStyle = b.wall;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, 7);
      if (b.tall) {
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(b.x + b.w / 2 - 12, b.y + b.h / 2 - 12, 24, 24);
      }
    }
    // Trees: round canopies; palms get a trunk and fronds.
    for (const tree of city.trees) {
      if (!inView(cam, tree.x, tree.y, 40)) continue;
      if (tree.palm) {
        ctx.strokeStyle = '#8a6b46';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(tree.x, tree.y + 8);
        ctx.lineTo(tree.x, tree.y - 4);
        ctx.stroke();
        ctx.strokeStyle = '#3f8f4f';
        ctx.lineWidth = 3;
        for (let a = 0; a < 6; a += 1) {
          const ang = (a / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(tree.x, tree.y - 4);
          ctx.lineTo(tree.x + Math.cos(ang) * 13, tree.y - 4 + Math.sin(ang) * 9);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#4c8a4a';
        ctx.beginPath();
        ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#66a854';
        ctx.beginPath();
        ctx.arc(tree.x - 3, tree.y - 3, tree.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawCar(car, time) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(-30, -14, 64, 32, 8);
    ctx.fill();
    ctx.fillStyle = car.color;
    roundRect(-32, -16, 64, 32, 9);
    ctx.fill();
    // Cabin and windshield.
    ctx.fillStyle = '#20242e';
    roundRect(-8, -13, 20, 26, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,220,255,0.75)';
    ctx.fillRect(10, -12, 5, 24);
    // Headlights and tail lights.
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(30, -13, 3, 6);
    ctx.fillRect(30, 7, 3, 6);
    ctx.fillStyle = '#ff2d2d';
    ctx.fillRect(-33, -13, 3, 6);
    ctx.fillRect(-33, 7, 3, 6);
    if (car.kind === 'police') {
      const on = Math.floor(time * 3) % 2 === 0;
      ctx.fillStyle = on ? '#ff2d2d' : '#2d7bff';
      ctx.fillRect(-4, -15, 8, 5);
      ctx.fillStyle = on ? '#2d7bff' : '#ff2d2d';
      ctx.fillRect(-4, 10, 8, 5);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POLICE', 0, 4);
    }
    ctx.restore();
  }

  function drawPerson(x, y, angle, shirt, skin, walkCycle, radius) {
    const bob = Math.sin(walkCycle) * 2;
    ctx.save();
    ctx.translate(x, y);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 3, radius, radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(angle);
    // Legs stepping.
    ctx.fillStyle = '#2b2b33';
    ctx.fillRect(-4 + bob, -4, 5, 9);
    ctx.fillRect(-1 - bob, -4, 5, 9);
    // Body and head.
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // The gun arm points where the person aims.
    ctx.strokeStyle = skin;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(15, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawMarker(marker, time) {
    if (!marker) return;
    const pulse = 1 + Math.sin(time * 4) * 0.12;
    ctx.save();
    ctx.translate(marker.x, marker.y);
    ctx.strokeStyle = '#ffd23d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath();
    ctx.moveTo(0, -34 - Math.sin(time * 4) * 5);
    ctx.lineTo(9, -20 - Math.sin(time * 4) * 5);
    ctx.lineTo(-9, -20 - Math.sin(time * 4) * 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawMinimap(view, cam) {
    const size = 178;
    const x0 = vw - size - 14;
    const y0 = 14;
    const scale = size / WORLD.size;
    ctx.save();
    ctx.fillStyle = 'rgba(10,14,20,0.78)';
    roundRect(x0 - 4, y0 - 4, size + 8, size + 8, 8);
    ctx.fill();
    ctx.beginPath();
    roundRect(x0, y0, size, size, 4);
    ctx.clip();
    ctx.fillStyle = '#5d8a4e';
    ctx.fillRect(x0, y0, size, size);
    ctx.fillStyle = '#2e7f9e';
    ctx.fillRect(x0, y0 + SEA.y * scale, size, size);
    ctx.fillStyle = '#ecd9a0';
    ctx.fillRect(x0, y0 + BEACH.y * scale, size, (SEA.y - BEACH.y) * scale);
    ctx.strokeStyle = '#3a3a42';
    ctx.lineWidth = 2;
    for (const road of view.city.roads) {
      ctx.beginPath();
      ctx.moveTo(x0, y0 + road * scale);
      ctx.lineTo(x0 + size, y0 + road * scale);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x0 + road * scale, y0);
      ctx.lineTo(x0 + road * scale, y0 + BEACH.y * scale);
      ctx.stroke();
    }
    // Mission marker, enemies, police, then the player on top.
    if (view.marker) {
      ctx.fillStyle = '#ffd23d';
      ctx.beginPath();
      ctx.arc(x0 + view.marker.x * scale, y0 + view.marker.y * scale, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const enemy of view.enemies) {
      if (enemy.health <= 0) continue;
      ctx.fillStyle = '#ff2d2d';
      ctx.fillRect(x0 + enemy.x * scale - 2, y0 + enemy.y * scale - 2, 4, 4);
    }
    for (const car of view.cars) {
      if (!car.alive || car.kind !== 'police') continue;
      ctx.fillStyle = '#4f9dff';
      ctx.beginPath();
      ctx.arc(x0 + car.x * scale, y0 + car.y * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.save();
    ctx.translate(x0 + view.player.x * scale, y0 + view.player.y * scale);
    ctx.rotate(view.player.angle);
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
    // Frame.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    roundRect(x0 - 4, y0 - 4, size + 8, size + 8, 8);
    ctx.stroke();
  }

  function drawHud(view) {
    const player = view.player;
    const wanted = view.wanted;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Health, money, ammo — top left.
    ctx.fillStyle = 'rgba(10,14,20,0.72)';
    roundRect(12, 12, 208, 78, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('DARIO VENN', 24, 32);
    ctx.fillStyle = '#22222a';
    roundRect(24, 40, 150, 12, 6);
    ctx.fill();
    ctx.fillStyle = player.health > 30 ? '#3da67a' : '#d94f3d';
    roundRect(24, 40, Math.max(0, 150 * (player.health / 100)), 12, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`$${player.money}`, 24, 74);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#ffd23d';
    ctx.fillText(`AMMO ${player.ammo}`, 120, 74);
    // Wanted stars — top centre.
    const starW = 30;
    const totalW = starW * 5;
    const sx = vw / 2 - totalW / 2;
    ctx.font = '26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i < wanted.stars ? '#ffd23d' : 'rgba(255,255,255,0.28)';
      ctx.fillText('★', sx + i * starW + starW / 2, 40);
    }
    ctx.textAlign = 'left';
    // Mission line under the stars.
    if (view.missionTitle) {
      ctx.fillStyle = 'rgba(10,14,20,0.72)';
      const label = `${view.missionTitle} — ${view.objective}`;
      ctx.font = 'bold 14px system-ui, sans-serif';
      const w = ctx.measureText(label).width + 24;
      roundRect(vw / 2 - w / 2, 50, w, 26, 8);
      ctx.fill();
      ctx.fillStyle = '#ffd23d';
      ctx.textAlign = 'center';
      ctx.fillText(label, vw / 2, 68);
      ctx.textAlign = 'left';
    }
    // Context prompt — bottom left.
    if (view.prompt) {
      ctx.fillStyle = 'rgba(10,14,20,0.72)';
      ctx.font = 'bold 14px system-ui, sans-serif';
      const w = ctx.measureText(view.prompt).width + 24;
      roundRect(12, vh - 44, w, 30, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(view.prompt, 24, vh - 24);
    }
    // Speed — bottom right, when driving.
    if (!player.onFoot && player.car) {
      const kmh = Math.round(Math.abs(player.car.speed) * 0.18);
      ctx.fillStyle = 'rgba(10,14,20,0.72)';
      roundRect(vw - 118, vh - 64, 106, 50, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(kmh), vw - 40, vh - 28);
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = '#ffd23d';
      ctx.fillText('km/h', vw - 24, vh - 44);
      ctx.textAlign = 'left';
    }
    // Centre banner (mission complete, save note, hints).
    if (view.banner && view.banner.alpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, view.banner.alpha);
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10,14,20,0.66)';
      const w = ctx.measureText(view.banner.text).width + 48;
      roundRect(vw / 2 - w / 2, vh * 0.3 - 26, w, 52, 10);
      ctx.fill();
      ctx.fillStyle = '#ffd23d';
      ctx.fillText(view.banner.text, vw / 2, vh * 0.3 + 8);
      if (view.banner.sub) {
        ctx.font = '15px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(view.banner.sub, vw / 2, vh * 0.3 + 34);
      }
      ctx.restore();
      ctx.textAlign = 'left';
    }
    drawMinimap(view);
  }

  function drawScreenOverlay(screen, view, time) {
    if (screen === SCREEN_PLAY) return;
    ctx.fillStyle = screen === SCREEN_TITLE ? 'rgba(8,12,22,0.55)' : 'rgba(8,12,22,0.72)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.textAlign = 'center';
    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = '#ffd23d';
      ctx.font = 'bold 64px system-ui, sans-serif';
      ctx.fillText('PORTO LUMEN', vw / 2, vh * 0.3);
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('An open-world crime story — steal, drive, survive.', vw / 2, vh * 0.3 + 36);
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillStyle = '#c8c8d0';
      ctx.fillText('Dario Venn is broke in a sun-soaked city. Mara Solis has work — if he can stay alive to do it.', vw / 2, vh * 0.3 + 64);
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      const first = view.hasSave ? 'ENTER — Continue' : 'ENTER — New Game';
      ctx.fillText(first, vw / 2, vh * 0.55);
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillStyle = '#c8c8d0';
      ctx.fillText('WASD move · Mouse aim · Click shoot · E steal / use · Shift sprint · Space handbrake · Q save · M mute', vw / 2, vh * 0.55 + 30);
      if (view.bestTake > 0) {
        ctx.fillText(`Best take so far: $${view.bestTake}`, vw / 2, vh * 0.55 + 58);
      }
      ctx.fillStyle = '#8a8a96';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText('A fully original game. No Rockstar names, maps or assets.', vw / 2, vh - 24);
    } else if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.fillText('PAUSED', vw / 2, vh * 0.42);
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillStyle = '#c8c8d0';
      ctx.fillText('Esc — keep playing · Q — save · M — mute', vw / 2, vh * 0.42 + 34);
    } else if (screen === SCREEN_WASTED) {
      ctx.fillStyle = '#ff5a4d';
      ctx.font = 'bold 56px system-ui, sans-serif';
      ctx.fillText('WASTED', vw / 2, vh * 0.42);
      ctx.fillStyle = '#ffffff';
      ctx.font = '17px system-ui, sans-serif';
      ctx.fillText('St. Clara patched you up. The hospital kept its fee.', vw / 2, vh * 0.42 + 36);
      ctx.fillStyle = '#c8c8d0';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText('ENTER — back to the streets', vw / 2, vh * 0.42 + 66);
    } else if (screen === SCREEN_BUSTED) {
      ctx.fillStyle = '#4f9dff';
      ctx.font = 'bold 56px system-ui, sans-serif';
      ctx.fillText('BUSTED', vw / 2, vh * 0.42);
      ctx.fillStyle = '#ffffff';
      ctx.font = '17px system-ui, sans-serif';
      ctx.fillText('The Lumen PD let you go — after the fine, of course.', vw / 2, vh * 0.42 + 36);
      ctx.fillStyle = '#c8c8d0';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText('ENTER — back to the streets', vw / 2, vh * 0.42 + 66);
    } else if (screen === SCREEN_COMPLETE) {
      ctx.fillStyle = '#ffd23d';
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.fillText('KING OF THE BAY', vw / 2, vh * 0.38);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText('The Vipers are finished. Porto Lumen is yours, Dario.', vw / 2, vh * 0.38 + 38);
      ctx.fillStyle = '#c8c8d0';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(`Final take: $${view.player.money} · ENTER — free roam`, vw / 2, vh * 0.38 + 68);
    }
    ctx.textAlign = 'left';
  }

  function draw(view, screen, time) {
    resize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b0e16';
    ctx.fillRect(0, 0, vw, vh);
    const cam = view.camera;
    const zoom = view.zoom || 1;
    const shakeX = view.shake ? (Math.random() - 0.5) * view.shake : 0;
    const shakeY = view.shake ? (Math.random() - 0.5) * view.shake : 0;
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-cam.x + shakeX, -cam.y + shakeY);
    drawCity(view.city, cam, zoom);
    drawMarker(view.marker, time);
    // Entities paint in depth order (north to south).
    const drawables = [];
    for (const ped of view.peds) {
      if (!ped.down) drawables.push({ y: ped.y, run: () => drawPerson(ped.x, ped.y, ped.angle, ped.shirt, ped.skin, ped.walkCycle, 10) });
    }
    for (const enemy of view.enemies) {
      if (enemy.health > 0) drawables.push({ y: enemy.y, run: () => drawPerson(enemy.x, enemy.y, enemy.angle, enemy.shirt, enemy.skin, enemy.walkCycle, 11) });
    }
    for (const officer of view.footPolice) {
      drawables.push({ y: officer.y, run: () => drawPerson(officer.x, officer.y, officer.angle, officer.shirt, officer.skin, officer.walkCycle, 11) });
    }
    for (const car of view.cars) {
      if (!car.alive) continue;
      drawables.push({ y: car.y, run: () => drawCar(car, time) });
    }
    const player = view.player;
    if (player.onFoot) {
      // A white ring so the player reads at a glance among peds and trees.
      drawables.push({ y: player.y, run: () => {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
        ctx.stroke();
        drawPerson(player.x, player.y, player.angle, '#e8c33d', '#f0c8a0', player.walkCycle, 13);
      } });
    }
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.run();
    // Bullets over everything, then particles.
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    for (const b of view.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (const p of view.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = p.kind === 'smoke' ? alpha * 0.5 : alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.kind === 'smoke' ? (1.6 - alpha * 0.6) : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Pickup hold ring, when the player stands in a pickup circle.
    if (view.holdProgress !== undefined && view.holdProgress > 0 && view.marker) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(view.marker.x, view.marker.y, 34, -Math.PI / 2, -Math.PI / 2 + view.holdProgress * Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(view);
    drawScreenOverlay(screen, view, time);
  }

  function worldFromScreen(sx, sy, view) {
    const zoom = view.zoom || 1;
    return {
      x: (sx / zoom) + view.camera.x,
      y: (sy / zoom) + view.camera.y,
    };
  }

  return { draw, resize, worldFromScreen };
}

