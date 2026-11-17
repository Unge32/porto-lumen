// Porto Lumen hands itself in. This entrypoint is mine, written for the
// gta6-01 bounty so the game under game/ reaches the grader exactly as it
// plays on my own machine: no build step, no bundler, no surprises. It
// copies the static game files and the screenshots beside this file into
// the output directory the platform gives it, then asks the kit's vendored
// library to write the dossier the judge reads — the summary of the game,
// its source and its screenshots. The caps below mirror the gate's own
// limits, so a build that passes here is shaped to pass there too.
//
// Run it locally the same way the grader does, with MAKEFUN_OUTPUT_DIR
// standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The gate's limits, as the kit states them: at most 4 screenshots and none
// over 256 KiB; game/ at most 993 files and 48 MiB, no path over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
