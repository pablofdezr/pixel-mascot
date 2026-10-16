// Renders docs/characters.png: every built-in character at rest, plus the
// mug from docs/creating-characters.md, at 2x.
//
//   npx tsx scripts/lineup.ts

import { writeFileSync } from "node:fs";

import { mug } from "../examples/characters/mug";
import { CANVAS_H, CANVAS_W, CHARACTERS, NO_OUTFIT, renderFrame, restPose } from "../src";
import { png } from "./png";

const defs = [...CHARACTERS, mug];
const CROP = { x: 28, y: 20, w: 88, h: 100 };
const SCALE = 2;
const COLUMNS = 6;

const width = CROP.w * COLUMNS * SCALE;
const height = CROP.h * Math.ceil(defs.length / COLUMNS) * SCALE;
const out = new Uint32Array(width * height);
const pixels = new Uint32Array(CANVAS_W * CANVAS_H);
const layer = new Uint32Array(CANVAS_W * CANVAS_H);

defs.forEach((def, i) => {
  const pose = restPose(0);
  pose.look = { x: 0.3, y: 0.2 };
  if (def.floats) pose.lift += 3;
  renderFrame(pixels, layer, def.art, pose, NO_OUTFIT);
  const left = (i % COLUMNS) * CROP.w * SCALE;
  const top = Math.floor(i / COLUMNS) * CROP.h * SCALE;
  for (let y = 0; y < CROP.h * SCALE; y++) {
    for (let x = 0; x < CROP.w * SCALE; x++) {
      out[(top + y) * width + left + x] = pixels[(CROP.y + Math.floor(y / SCALE)) * CANVAS_W + CROP.x + Math.floor(x / SCALE)];
    }
  }
});

writeFileSync("docs/characters.png", png(new Uint8Array(out.buffer), width, height));
console.log(`docs/characters.png: ${defs.length} characters, ${width}×${height}px`);
