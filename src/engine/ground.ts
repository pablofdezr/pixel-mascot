import { CANVAS_H, CANVAS_W, ORIGIN } from "./canvas.ts";
import { hex, type Vec } from "./pixels.ts";

/**
 * What a character stands on. Rasterised once: it never moves. On a sheet the
 * character's silhouette is cast where `mask` is set; on a bare floor a round
 * `blob` shadow sits under it instead and shrinks as it rises.
 */
export interface Ground {
  pixels: Uint32Array;
  mask: Uint8Array;
  shadow: number;
  blob?: { x: number; y: number; rx: number; ry: number };
}

function blank(): Ground {
  return {
    pixels: new Uint32Array(CANVAS_W * CANVAS_H),
    mask: new Uint8Array(CANVAS_W * CANVAS_H),
    shadow: 0,
  };
}

function plot(ground: Ground, p: Vec, color: number) {
  const x = Math.floor(p.x);
  const y = Math.floor(p.y);
  if (x < 0 || y < 0 || x >= CANVAS_W || y >= CANVAS_H) return;
  ground.pixels[y * CANVAS_W + x] = color;
  ground.mask[y * CANVAS_W + x] = 1;
}

export interface SheetSpec {
  /** Corners in model space, clockwise from top-left. */
  corners: [Vec, Vec, Vec, Vec];
  paper: string;
  paperShade: string;
  edge: string;
  shadow: string;
  rules: { count: number; color: string; from?: number; to?: number; inset?: number };
  margin?: { u: number; color: string };
  /** Extra marks drawn in (u, v) sheet space, e.g. a stamp imprint. */
  marks?: (draw: (u: number, v: number, color: number) => void) => void;
}

/** A sheet of paper lying in perspective, with a gentle curl across its width. */
export function sheet(spec: SheetSpec): Ground {
  const ground = blank();
  const [a, b, c, d] = spec.corners.map((p) => ({ x: p.x + ORIGIN.x, y: p.y + ORIGIN.y }));

  const point = (u: number, v: number): Vec => {
    const top = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    const bottom = { x: d.x + (c.x - d.x) * u, y: d.y + (c.y - d.y) * u };
    const curl = Math.sin(u * Math.PI * 1.8 + 0.4) * 1.6;
    return { x: top.x + (bottom.x - top.x) * v, y: top.y + (bottom.y - top.y) * v + curl };
  };

  // Fill by densely sampling the surface; the curl's slope picks light or shade.
  const steps = 600;
  const paper = hex(spec.paper);
  const paperShade = hex(spec.paperShade);
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const color = Math.cos(u * Math.PI * 1.8 + 0.4) > 0.35 ? paperShade : paper;
    for (let j = 0; j <= steps; j++) plot(ground, point(u, j / steps), color);
  }

  const { count, from = 0.04, to = 0.96, inset = 0 } = spec.rules;
  const rule = hex(spec.rules.color);
  for (let k = 1; k <= count; k++) {
    const v = from + (k / count) * (to - from);
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      if (u >= inset && u <= 1 - inset) plot(ground, point(u, v), rule);
    }
  }

  if (spec.margin) {
    const margin = hex(spec.margin.color);
    for (let j = 0; j <= steps; j++) plot(ground, point(spec.margin.u, j / steps), margin);
  }

  spec.marks?.((u, v, color) => plot(ground, point(u, v), color));

  // A 1px darker rim wherever the sheet meets empty space.
  const edge = hex(spec.edge);
  const filled = ground.mask.slice();
  for (let y = 0; y < CANVAS_H; y++) {
    for (let x = 0; x < CANVAS_W; x++) {
      const i = y * CANVAS_W + x;
      if (!filled[i]) continue;
      const rim =
        x === 0 || y === 0 || x === CANVAS_W - 1 || y === CANVAS_H - 1 ||
        !filled[i - 1] || !filled[i + 1] || !filled[i - CANVAS_W] || !filled[i + CANVAS_W];
      if (rim) ground.pixels[i] = edge;
    }
  }

  ground.shadow = hex(spec.shadow);
  return ground;
}

/** A bare floor: nothing drawn, just a soft round shadow under the character. */
export function floor(center: Vec, rx: number, ry: number): Ground {
  const ground = blank();
  ground.blob = { x: center.x + ORIGIN.x, y: center.y + ORIGIN.y, rx, ry };
  ground.shadow = hex("#000000", 40);
  return ground;
}
