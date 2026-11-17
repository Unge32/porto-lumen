[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![make.fun · gta6-01 rank](https://make.fun/badge/gta6-01/Unge32/porto-lumen/rank.svg)](https://make.fun/bounty/gta6-01)
[![make.fun · gta6-01 reward](https://make.fun/badge/gta6-01/Unge32/porto-lumen/reward.svg)](https://make.fun/bounty/gta6-01)

Entry for [make.fun's "Make GTA 6" bounty](https://make.fun/bounty/gta6-01) ($1666 in USDC).

# Porto Lumen — an open-world crime story

Dario Venn is broke in a sun-soaked coastal city. Mara Solis runs the
garage on the north side and she has work — if he can stay alive to do it.

A complete open-world crime game that plays offline in a desktop browser
from static files, with keyboard and mouse:

- A city to explore on foot and by car: avenues, blocks, a park, a
  beachfront and the sea, filled with traffic and pedestrians
- Cars to steal and drive, with arcade handling and a handbrake
- A wanted level (0–5 stars) with police cars and foot officers who
  chase, ram and bust the player
- Five story missions: steal a car, run a pickup at the docks, clear the
  plaza of the Viper gang, drive Mara to the safehouse under a 3-star
  wanted level, and wreck the boss car at the docks
- Combat with a pistol, ammo to buy or pick up, and a health system
- A HUD with health, money, ammo, wanted stars, the mission line and a
  live minimap
- Save and continue (Q to save, progress kept in localStorage)
- Synthesized sound: engine hum, siren, gunshots, pickups and jingles —
  no audio files, no network requests

## Play

Serve `game/` with any static server and open `index.html`, or run
`node serve.ts` and open http://localhost:8080.

- WASD / arrows — move or drive
- Mouse — aim, click — shoot
- E — steal a car / get out / buy ammo at Lumen Arms
- Shift — sprint, Space — handbrake
- Q — save, Esc / P — pause, M — mute

## Originality

Everything is original: the city of Porto Lumen, Dario Venn, Mara Solis,
the Viper gang, the vehicles, the story, the art and the sounds. Nothing
from Rockstar Games or any other commercial game.

## Entry

Built for make.fun's gta6-01 bounty. `main.ts` (Node 22, standard library
only) copies `game/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with the kit's vendored `vendor/makefun-game.ts`.
