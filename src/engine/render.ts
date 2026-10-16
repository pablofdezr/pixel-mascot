import { SIZE, headphoneReach, type Anchors, type Outfit } from "./accessories.ts";
import { BALLOON_OVERLAP, CANVAS_H, CANVAS_W, ORIGIN } from "./canvas.ts";
import type { Ground } from "./ground.ts";
import { hex, type Vec } from "./pixels.ts";
import type { Pose } from "./pose.ts";

/**
 * A character's drawing. `sample` colours one point of its 48×72 model space
 * (0 = empty); the renderer maps every canvas pixel back into that space,
 * undoing hop, lean, tilt and squash, so each pose stays crisp pixel art.
 */
export interface Art {
  /** Hop, tilt and squash pivot around this point, usually the base. */
  pivot: Vec;
  /** Draws the model bigger (> 1) or smaller around its pivot; default 1. */
  scale?: number;
  /** Between the eyes, for following the pointer. */
  gaze: Vec;
  ground: Ground;
  anchors(pose: Pose): Anchors;
  sample(p: Vec, pose: Pose, outfit: Outfit): number;
}

/** A model-space point on the canvas, at rest. */
export function toCanvas(art: Art, v: Vec): Vec {
  const scale = art.scale ?? 1;
  return {
    x: ORIGIN.x + art.pivot.x + (v.x - art.pivot.x) * scale,
    y: ORIGIN.y + art.pivot.y + (v.y - art.pivot.y) * scale,
  };
}

// The shadow falls down and to the right, and stays on the ground during hops.
const SHADOW = { x: 4, y: 2 };

// A vivid sleepy blue.
const Z_COLOR = hex("#2f6bff");

// Bold, thick-stroked symbols, drawn big enough to stand out at 1:1.
const MARK_SCALE = 3;

// An eighth note, for music leaking out of headphones.
const NOTE = ["..##.", "..#.#", "..#..", "###..", "###.."];
const NOTE_COLOR = hex("#1b1b22");
const NOTE_RISE = 14;
const MARKS: Record<Exclude<Pose["mark"] & string, "thought">, { color: number; glyph: string[] }> = {
  question: {
    color: hex("#2b6cd4"),
    glyph: [".#####.", "##...##", "##...##", "....##.", "...##..", "..##...", "..##...", ".......", "..##...", "..##..."],
  },
  exclaim: {
    color: hex("#e0a91b"),
    glyph: ["###", "###", "###", "###", "###", ".#.", ".#.", "...", "###", "###"],
  },
  heart: {
    color: hex("#e0245e"),
    glyph: [".##...##.", "####.####", "#########", "#########", ".#######.", "..#####..", "...###...", "....#...."],
  },
  anger: {
    color: hex("#d83030"),
    glyph: [".##...##.", "###...###", "##.....##", ".........", "##.....##", "###...###", ".##...##."],
  },
};
const Z_BIG = ["#####", "...#.", "..#..", ".#...", "#####"];
const Z_SMALL = ["####", "..#.", ".#..", "####"];

const OUTLINE = hex("#ffffff");

/**
 * Draws a pixel glyph; each glyph pixel becomes a `scale`×`scale` block. With
 * `outline`, a 1px white rim keeps it readable over the character.
 */
function drawGlyph(pixels: Uint32Array, glyph: string[], x0: number, y0: number, color = Z_COLOR, scale = 1, outline = false) {
  const put = (x: number, y: number, c: number) => {
    if (x >= 0 && y >= 0 && x < CANVAS_W && y < CANVAS_H) pixels[y * CANVAS_W + x] = c;
  };
  const filled = (gx: number, gy: number) => glyph[gy]?.[gx] === "#";
  const left = Math.round(x0);
  const top = Math.round(y0);
  const rows = glyph.length * scale;
  const cols = glyph[0].length * scale;

  for (let y = -1; y <= rows; y++) {
    for (let x = -1; x <= cols; x++) {
      const on = filled(Math.floor(x / scale), Math.floor(y / scale)) && x >= 0 && y >= 0;
      if (on) {
        put(left + x, top + y, color);
        continue;
      }
      if (!outline) continue;
      const near = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(
        ([dx, dy]) => x + dx >= 0 && y + dy >= 0 && filled(Math.floor((x + dx) / scale), Math.floor((y + dy) / scale)),
      );
      if (near) put(left + x, top + y, OUTLINE);
    }
  }
}

const CLOUD_FILL = hex("#ffffff");
const CLOUD_LINE = hex("#3b3b48");

/**
 * A comic thought bubble: a white cloud made of overlapping circles, two small
 * bubbles trailing down to the head, and three dots that fill in one by one.
 */
function drawThought(pixels: Uint32Array, headX: number, headY: number, time: number) {
  const W = 34;
  // Beside the head on the right, clear of the balloon above and its tail in the middle.
  const cx = Math.min(Math.max(headX + W / 2 + 9, CANVAS_W / 2 + 34), CANVAS_W - W / 2 - 1);
  const cy = Math.max(BALLOON_OVERLAP + 12, headY - 8) + Math.round(Math.sin(time * 3));
  const cloud = [
    { x: cx - 9, y: cy + 1, r: 6 },
    { x: cx - 3, y: cy - 4, r: 7 },
    { x: cx + 5, y: cy - 3, r: 6.5 },
    { x: cx + 10, y: cy + 2, r: 5.5 },
    { x: cx, y: cy + 4, r: 6.5 },
  ];
  const trail = [
    { x: cx - 13, y: cy + 11, r: 2.6 },
    { x: cx - 17, y: cy + 16, r: 1.7 },
  ];
  const dots = Math.floor(time * 2.5) % 4;

  for (let y = 0; y < CANVAS_H; y++) {
    for (let x = 0; x < CANVAS_W; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let d = Infinity;
      for (const c of [...cloud, ...trail]) d = Math.min(d, Math.hypot(px - c.x, py - c.y) - c.r);
      if (d > 1.2) continue;
      if (d > 0) {
        pixels[y * CANVAS_W + x] = CLOUD_LINE;
        continue;
      }
      // "·", "··", "···", then a pause.
      const dot = [-6, 0, 6].findIndex((dx, i) => i < dots && Math.hypot(px - (cx + dx), py - (cy + 0.5)) < 1.9);
      pixels[y * CANVAS_W + x] = dot >= 0 ? CLOUD_LINE : CLOUD_FILL;
    }
  }
}

/** Notes drift up and outwards from each earcup in turn, then start again. */
function drawMusic(pixels: Uint32Array, art: Art, pose: Pose) {
  const anchors = art.anchors(pose);
  const top = toCanvas(art, anchors.headTop);
  const reach = headphoneReach(anchors) * SIZE.head * (art.scale ?? 1);
  [-1, 1].forEach((side, i) => {
    const phase = (pose.time * 0.8 + i * 0.5) % 1;
    const x = top.x + side * (reach + 3 + phase * 5) - (side < 0 ? 10 : 0);
    const y = top.y - pose.lift + 2 - phase * NOTE_RISE;
    drawGlyph(pixels, NOTE, x, y, NOTE_COLOR, 2, true);
  });
}

// ---------- Door ----------

// A full-size door: as tall as fits under the chat balloon.
const DOOR = { w: 40, h: 74, frame: 4 };
const DOOR_C = {
  line: hex("#2e1a0c"),
  frame: hex("#7a4a22"),
  frameLight: hex("#a5682f"),
  // The doorway is dark: you cannot see what is on the other side.
  dark: hex("#140f0b"),
  darkLow: hex("#070504"),
  panel: hex("#b07a3e"),
  plank: hex("#8b5a2b"),
  panelShade: hex("#6b4220"),
  knob: hex("#f0cf63"),
};

interface DoorBox {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** The doorway itself, inside the frame. */
  ox0: number;
  ox1: number;
  oy0: number;
  open: number;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** The door rises out of the floor as it appears. */
function doorBox(pose: Pose, floorY: number): DoorBox | null {
  if (!pose.door) return null;
  const h = Math.round(DOOR.h * easeOut(pose.door.appear));
  if (h < 2) return null;
  const x0 = Math.round(pose.door.x - DOOR.w / 2);
  const x1 = x0 + DOOR.w;
  const y0 = Math.max(BALLOON_OVERLAP + 1, floorY - h);
  return { x0, x1, y0, y1: floorY, ox0: x0 + DOOR.frame, ox1: x1 - DOOR.frame, oy0: y0 + DOOR.frame, open: pose.door.open };
}

const inBox = (x: number, y: number, x0: number, x1: number, y0: number, y1: number) => x >= x0 && x < x1 && y >= y0 && y < y1;

/** Frame and the dark doorway. */
function doorBack(x: number, y: number, d: DoorBox): number {
  if (!inBox(x, y, d.x0, d.x1, d.y0, d.y1)) return 0;
  if (inBox(x, y, d.ox0, d.ox1, d.oy0, d.y1)) return y - d.oy0 < (d.y1 - d.oy0) * 0.3 ? DOOR_C.dark : DOOR_C.darkLow;
  if (x === d.x0 || x === d.x1 - 1 || y === d.y0) return DOOR_C.line;
  return x < d.x0 + 2 || y < d.y0 + 2 ? DOOR_C.frameLight : DOOR_C.frame;
}

/** The door leaf, hinged on the right; it narrows as it swings open. */
function doorPanel(x: number, y: number, d: DoorBox): number {
  const width = Math.round((d.ox1 - d.ox0) * (1 - d.open * 0.85));
  const left = d.ox1 - width;
  if (width <= 0 || !inBox(x, y, left, d.ox1, d.oy0, d.y1)) return 0;
  if (x === left) return DOOR_C.line;
  // Seen at an angle it darkens.
  if (d.open > 0.4) return (x - left) % 3 === 0 ? DOOR_C.line : DOOR_C.panelShade;
  if (Math.hypot(x + 0.5 - (left + 3.5), y + 0.5 - (d.oy0 + (d.y1 - d.oy0) * 0.55)) < 1.6) return DOOR_C.knob;
  return (x - left) % 5 === 0 ? DOOR_C.plank : DOOR_C.panel;
}

// ---------- Disco ----------

const DISCO_COLORS = ["#ff4fd8", "#4fe3ff", "#ffe14f", "#7dff6a", "#ff9a3c", "#a06bff"].map((c) => hex(c));
const BEAMS = DISCO_COLORS.map((c) => (c & 0x00ffffff) | (70 << 24));
const SPOTS = DISCO_COLORS.map((c) => (c & 0x00ffffff) | (110 << 24));
const BALL = { x: 26, r: 10 };
const HALO = hex("#ffffff", 70);
const BALL_LINE = hex("#4a4e5c");
const BALL_DARK = hex("#8c92a4");
const BALL_LIGHT = hex("#cdd2de");
const BALL_SHINE = hex("#ffffff");
const STRING = hex("#b9bdc8");

/** Hangs below the chat balloon, which covers the top of the canvas. */
const ballY = (disco: number) => Math.round(-BALL.r - 4 + disco * (BALLOON_OVERLAP + 14 + BALL.r + 4));

const hash = (a: number, b: number, c: number) => Math.abs(Math.imul(a * 73856093 ^ b * 19349663 ^ c * 83492791, 2654435761)) % 97;

/** Coloured light thrown off the ball: rotating beams and drifting spots, on the background. */
function discoLight(x: number, y: number, pose: Pose): number {
  if (pose.disco < 0.6) return 0;
  const t = pose.time;
  for (let k = 0; k < SPOTS.length; k++) {
    const sx = CANVAS_W / 2 + Math.sin(t * (0.9 + k * 0.17) + k * 2.1) * CANVAS_W * 0.42;
    const sy = CANVAS_H * 0.55 + Math.cos(t * (0.7 + k * 0.13) + k) * CANVAS_H * 0.3;
    if (Math.hypot(x - sx, y - sy) < 5.5) return SPOTS[k];
  }
  const by = ballY(pose.disco);
  const dx = x - BALL.x;
  const dy = y - by;
  const dist = Math.hypot(dx, dy);
  if (dist < BALL.r + 2) return 0;
  const angle = Math.atan2(dy, dx);
  for (let k = 0; k < BEAMS.length; k++) {
    const beam = t * 0.8 + (k * Math.PI * 2) / BEAMS.length;
    const diff = Math.abs(((angle - beam + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    // Beams thin out with distance, like real light cones.
    if (diff < 0.05 + 2 / dist) return BEAMS[k];
  }
  return 0;
}

/** The mirror ball: spinning facets lit from the front, glints flashing in colour, a few twinkles. */
function drawDiscoBall(pixels: Uint32Array, pose: Pose) {
  const by = ballY(pose.disco);
  const t = pose.time;
  const put = (x: number, y: number, c: number) => {
    if (x >= 0 && y >= 0 && x < CANVAS_W && y < CANVAS_H) pixels[y * CANVAS_W + x] = c;
  };
  for (let y = 0; y < by - BALL.r; y++) put(BALL.x, y, STRING);

  // A soft halo so it glows against the page.
  if (pose.disco > 0.6) {
    for (let y = by - BALL.r - 4; y <= by + BALL.r + 4; y++) {
      for (let x = BALL.x - BALL.r - 4; x <= BALL.x + BALL.r + 4; x++) {
        const d = Math.hypot(x + 0.5 - BALL.x, y + 0.5 - by);
        const pulse = 2.5 + Math.sin(t * 6) * 0.8;
        if (d > BALL.r && d < BALL.r + pulse && x >= 0 && y >= 0 && x < CANVAS_W && y < CANVAS_H && !pixels[y * CANVAS_W + x]) {
          put(x, y, HALO);
        }
      }
    }
  }

  for (let y = by - BALL.r - 1; y <= by + BALL.r + 1; y++) {
    for (let x = BALL.x - BALL.r - 1; x <= BALL.x + BALL.r + 1; x++) {
      const nx = (x + 0.5 - BALL.x) / BALL.r;
      const ny = (y + 0.5 - by) / BALL.r;
      const d = Math.hypot(nx, ny);
      if (d > 1.08) continue;
      if (d > 0.94) {
        put(x, y, BALL_LINE);
        continue;
      }
      // Longitude spins with time; latitude stays: a turning grid of mirror tiles.
      const nz = Math.sqrt(Math.max(0, 1 - d * d));
      const lon = Math.atan2(nx, nz) + t * 2.4;
      const lat = Math.asin(ny);
      const i = Math.floor(lon / (Math.PI / 7));
      const j = Math.floor(lat / (Math.PI / 9));
      const glint = hash(i, j, Math.floor(t * 9));
      if (glint < 6) {
        put(x, y, glint < 3 ? BALL_SHINE : DISCO_COLORS[glint % DISCO_COLORS.length]);
        continue;
      }
      const lit = nz * 0.8 - nx * 0.3 - ny * 0.4;
      const base = (i + j) % 2 === 0 ? BALL_LIGHT : BALL_DARK;
      put(x, y, lit > 0.75 ? BALL_SHINE : lit < 0.15 ? BALL_DARK : base);
    }
  }

  // Twinkles: little four-point stars popping around the ball.
  if (pose.disco > 0.6) {
    for (let k = 0; k < 3; k++) {
      if (hash(k, 7, Math.floor(t * 4)) > 50) continue;
      const a = k * 2.1 + Math.floor(t * 4) * 0.7;
      const cx = Math.round(BALL.x + Math.cos(a) * (BALL.r + 5));
      const cy = Math.round(by + Math.sin(a) * (BALL.r + 5));
      for (const [ox, oy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) put(cx + ox, cy + oy, BALL_SHINE);
    }
  }
}

export function renderFrame(pixels: Uint32Array, layer: Uint32Array, art: Art, pose: Pose, outfit: Outfit) {
  const cos = Math.cos(-pose.tilt);
  const sin = Math.sin(-pose.tilt);
  // Keep the volume roughly constant: squashing widens, stretching narrows.
  const sx = 1 + (1 - pose.squash) * 0.8;
  const scale = (art.scale ?? 1) * pose.depth;
  // Spinning: never quite edge-on, so it stays one pixel wide at least.
  const turn = Math.sign(pose.turn || 1) * Math.max(0.12, Math.abs(pose.turn));
  const pivotX = ORIGIN.x + art.pivot.x + pose.shiftX;
  const pivotY = ORIGIN.y + art.pivot.y;

  for (let y = 0; y < CANVAS_H; y++) {
    for (let x = 0; x < CANVAS_W; x++) {
      if (pose.hidden) {
        layer[y * CANVAS_W + x] = 0;
        continue;
      }
      const dx = x + 0.5 - pivotX;
      const dy = y + 0.5 + pose.lift - pivotY;
      const p = {
        x: art.pivot.x + (dx * cos - dy * sin) / sx / scale / turn,
        y: art.pivot.y + (dx * sin + dy * cos) / pose.squash / scale,
      };
      layer[y * CANVAS_W + x] = art.sample(p, pose, outfit);
    }
  }

  const { pixels: ground, mask, shadow, blob } = art.ground;
  const shadowY = SHADOW.y + pose.lift;
  // The blob shrinks as the character rises off the floor.
  const blobScale = blob ? Math.max(0.45, 1 - pose.lift * 0.05) : 0;
  const door = doorBox(pose, ORIGIN.y + Math.round(art.pivot.y) + 1);
  for (let y = 0; y < CANVAS_H; y++) {
    for (let x = 0; x < CANVAS_W; x++) {
      const i = y * CANVAS_W + x;
      let color = 0;
      if (!pose.hidden) {
        const fx = x - SHADOW.x;
        const fy = y - shadowY;
        const casts = mask[i] && fx >= 0 && fy >= 0 && fx < CANVAS_W && fy < CANVAS_H && layer[fy * CANVAS_W + fx];
        // Its floor shadow is hidden by the wall past the doorway, like the character.
        const underBlob =
          blob &&
          !(door && x >= door.ox1) &&
          ((x + 0.5 - blob.x - pose.shiftX) / (blob.rx * blobScale)) ** 2 + ((y + 0.5 - blob.y) / (blob.ry * blobScale)) ** 2 <= 1;
        color = casts || underBlob ? shadow : ground[i];
      }
      if (!color && pose.disco) color = discoLight(x, y, pose);
      if (door) color = doorBack(x, y, door) || color;
      // The door stands in an unseen wall: whatever walks into the doorway shows against
      // the dark, but nothing ever shows past its right jamb.
      const visible = !door || x < door.ox1;
      if (layer[i] && visible) color = layer[i];
      if (door) color = doorPanel(x, y, door) || color;
      pixels[i] = color;
    }
  }

  if (pose.disco) drawDiscoBall(pixels, pose);
  if (pose.hidden) return;
  if (outfit.head === "headphones") drawMusic(pixels, art, pose);
  if (pose.sleep === null && !pose.mark) return;

  // Symbols float just off the top-right of the head.
  const { headTop, headWidth } = art.anchors(pose);
  const top = toCanvas(art, headTop);
  const x = top.x + (headWidth / 2) * (art.scale ?? 1) + 2;
  const y = top.y - pose.lift;
  if (pose.sleep !== null) {
    // A small z and a big Z drifting up in turn, at 2× and 3× with a white rim, clear of the balloon.
    const rise = (phase: number, height: number, start: number) =>
      Math.max(BALLOON_OVERLAP + 1, Math.round(y + start - height - phase * 10));
    const small = { x: Math.min(x + 2, CANVAS_W - 4 * 2 - 2), h: 4 * 2 };
    const big = { x: Math.min(x + 12, CANVAS_W - 5 * 3 - 2), h: 5 * 3 };
    drawGlyph(pixels, Z_SMALL, small.x, rise(pose.sleep, small.h, 6), Z_COLOR, 2, true);
    drawGlyph(pixels, Z_BIG, big.x, rise((pose.sleep + 0.5) % 1, big.h, -2), Z_COLOR, 3, true);
  }
  if (pose.mark === "thought") {
    drawThought(pixels, x, y, pose.time);
  } else if (pose.mark) {
    const { glyph, color } = MARKS[pose.mark];
    // Three times the pixel size with a white rim, so it reads at a glance.
    const height = glyph.length * MARK_SCALE;
    const width = glyph[0].length * MARK_SCALE;
    const left = Math.min(x + 5, CANVAS_W - width - 2);
    const top = Math.max(BALLOON_OVERLAP + 1, y - height + 10) + Math.round(Math.sin(pose.time * 8));
    drawGlyph(pixels, glyph, left, top, color, MARK_SCALE, true);
  }
}
