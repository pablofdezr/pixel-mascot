// Renders a character's sprite sheet to a PNG: one row per mood and gesture,
// six frames each. No browser and no dependencies beyond Node's zlib.
//
//   npx tsx scripts/sheet.ts pum                     a built-in character
//   npx tsx scripts/sheet.ts examples/characters/mug.ts   your own module
//
// Options: --out file.png, --scale 2, --outfit head:top-hat,face:glasses

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  CANVAS_H,
  CANVAS_W,
  CHARACTERS,
  GESTURE_MS,
  GESTURE_NAMES,
  gestureFrame,
  moodFrame,
  NO_OUTFIT,
  renderFrame,
  type CharacterDef,
  type Mood,
  type Outfit,
  type Pose,
} from "../src/index.ts";
import { png } from "./png.ts";

const FRAMES = 6;
/** Moods hold; each is sampled over this many seconds. */
const MOOD_SPANS: [Mood, number][] = [
  ["idle", 2.5],
  ["attentive", 1],
  ["thinking", 2.6],
  ["talking", 0.8],
  ["sleeping", 2.2],
  ["eager", 1],
  ["hungry", 0.7],
];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function loadCharacter(which: string): Promise<CharacterDef> {
  const builtIn = CHARACTERS.find((c) => c.id === which);
  if (builtIn) return builtIn;
  const mod = await import(pathToFileURL(resolve(which)).href);
  const def = Object.values(mod).find((v): v is CharacterDef => !!v && typeof v === "object" && "art" in v);
  if (!def) throw new Error(`${which} exports no CharacterDef`);
  return def;
}

function parseOutfit(spec: string | undefined): Outfit {
  const outfit = { ...NO_OUTFIT };
  for (const part of spec?.split(",") ?? []) {
    const [slot, id] = part.split(":");
    if (slot in outfit && id) outfit[slot as keyof Outfit] = id;
  }
  return outfit;
}

// ---------- Sheet ----------

const which = process.argv[2];
if (!which || which.startsWith("--")) {
  console.error("usage: tsx scripts/sheet.ts <character id | path to module> [--out sheet.png] [--scale 2] [--outfit head:crown]");
  process.exit(1);
}
const def = await loadCharacter(which);
const outfit = parseOutfit(arg("outfit"));
const scale = Math.max(1, Number(arg("scale") ?? 2));
const out = arg("out") ?? `${def.id}-sheet.png`;

const rows: Pose[][] = [
  ...MOOD_SPANS.map(([mood, span]) => Array.from({ length: FRAMES }, (_, f) => moodFrame(def, mood, (f / FRAMES) * span))),
  ...GESTURE_NAMES.map((g) => Array.from({ length: FRAMES }, (_, f) => gestureFrame(def, g, f / FRAMES))),
];

const width = CANVAS_W * FRAMES * scale;
const height = CANVAS_H * rows.length * scale;
const sheetPixels = new Uint32Array(width * height);
const pixels = new Uint32Array(CANVAS_W * CANVAS_H);
const layer = new Uint32Array(CANVAS_W * CANVAS_H);
const BACKGROUND = 0xfff4f4f4; // light gray, so white parts still show

rows.forEach((poses, r) => {
  poses.forEach((pose, f) => {
    renderFrame(pixels, layer, def.art, pose, outfit);
    for (let y = 0; y < CANVAS_H * scale; y++) {
      for (let x = 0; x < CANVAS_W * scale; x++) {
        const color = pixels[Math.floor(y / scale) * CANVAS_W + Math.floor(x / scale)];
        const alpha = color >>> 24;
        sheetPixels[(r * CANVAS_H * scale + y) * width + f * CANVAS_W * scale + x] = alpha === 255 ? color : alpha === 0 ? BACKGROUND : blend(color, BACKGROUND);
      }
    }
  });
});

/** Mixes a translucent pixel (shadows, disco light) over the background. */
function blend(color: number, under: number): number {
  const a = (color >>> 24) / 255;
  let out = 0xff000000;
  for (const shift of [0, 8, 16]) {
    const c = (color >>> shift) & 255;
    const u = (under >>> shift) & 255;
    out |= Math.round(c * a + u * (1 - a)) << shift;
  }
  return out >>> 0;
}

writeFileSync(out, png(new Uint8Array(sheetPixels.buffer), width, height));
console.log(`${out}: ${def.name}, ${rows.length} rows (${MOOD_SPANS.length} moods, ${GESTURE_NAMES.length} gestures) × ${FRAMES} frames, ${width}×${height}px`);
console.log(`gestures: ${GESTURE_NAMES.map((g) => `${g} ${GESTURE_MS(g)}ms`).join(", ")}`);
