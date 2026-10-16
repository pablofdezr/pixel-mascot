/** Geometry, colour and shading helpers shared by every character. */

export type Vec = { x: number; y: number };

export const TAU = Math.PI * 2;

/** Light comes from the upper left, like the old Office assistants. */
export const LIGHT = normalize({ x: -1, y: -0.6 });

export function normalize(v: Vec): Vec {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

/** Packs a #rrggbb colour (plus alpha) for a little-endian Uint32 view of ImageData. */
export function hex(color: string, alpha = 255): number {
  const n = parseInt(color.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return ((alpha << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

/** Outline plus four tones from shadow to highlight. */
export interface Palette {
  line: number;
  dark: number;
  mid: number;
  light: number;
  shine: number;
}

export function palette(line: string, dark: string, mid: string, light: string, shine: string): Palette {
  return { line: hex(line), dark: hex(dark), mid: hex(mid), light: hex(light), shine: hex(shine) };
}

/** Picks a tone from how much a surface faces the light (-1..1). */
export function tone(pal: Palette, facing: number): number {
  if (facing > 0.5) return pal.shine;
  if (facing > 0.12) return pal.light;
  if (facing > -0.45) return pal.mid;
  return pal.dark;
}

export function rotate(p: Vec, around: Vec, angle: number): Vec {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - around.x;
  const dy = p.y - around.y;
  return { x: around.x + dx * cos - dy * sin, y: around.y + dx * sin + dy * cos };
}

export function nearestOnSegment(p: Vec, a: Vec, b: Vec): Vec {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby || 1)));
  return { x: a.x + abx * t, y: a.y + aby * t };
}

export function distanceToSegment(p: Vec, a: Vec, b: Vec): number {
  const q = nearestOnSegment(p, a, b);
  return Math.hypot(p.x - q.x, p.y - q.y);
}

export function distanceToPolyline(p: Vec, points: Vec[], dx = 0, dy = 0): number {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = { x: points[i].x + dx, y: points[i].y + dy };
    const b = { x: points[i + 1].x + dx, y: points[i + 1].y + dy };
    best = Math.min(best, distanceToSegment(p, a, b));
  }
  return best;
}

/** Signed distance to a rounded rectangle: negative inside, positive outside. */
export function sdRoundRect(p: Vec, x0: number, y0: number, x1: number, y1: number, r: number): number {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const qx = Math.abs(p.x - cx) - (x1 - x0) / 2 + r;
  const qy = Math.abs(p.y - cy) - (y1 - y0) / 2 + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

export function sdCircle(p: Vec, c: Vec, r: number): number {
  return Math.hypot(p.x - c.x, p.y - c.y) - r;
}

/** Signed distance to a triangle (any winding). */
export function sdTriangle(p: Vec, a: Vec, b: Vec, c: Vec): number {
  const d = Math.min(distanceToSegment(p, a, b), distanceToSegment(p, b, c), distanceToSegment(p, c, a));
  const cross = (u: Vec, v: Vec, w: Vec) => (v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x);
  const s1 = cross(a, b, p);
  const s2 = cross(b, c, p);
  const s3 = cross(c, a, p);
  const inside = (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
  return inside ? -d : d;
}

/**
 * Colours a box-like body: 1px outline, a bevel that is lit on the top-left and
 * shaded on the bottom-right, and a flat face in between.
 */
export function boxShade(p: Vec, sd: number, x0: number, y0: number, x1: number, y1: number, pal: Palette): number {
  if (sd > 1) return 0;
  if (sd > 0) return pal.line;
  const u = (p.x - (x0 + x1) / 2) / ((x1 - x0) / 2);
  const v = (p.y - (y0 + y1) / 2) / ((y1 - y0) / 2);
  if (sd > -1.3) return u + v * 1.2 < 0 ? pal.light : pal.dark;
  if (u < -0.82) return pal.light;
  if (u > 0.82) return pal.dark;
  return pal.mid;
}

/** Colours a ball: outline, then tones from its surface normal. */
export function ballShade(p: Vec, c: Vec, r: number, pal: Palette): number {
  const d = Math.hypot(p.x - c.x, p.y - c.y);
  if (d > r + 1) return 0;
  if (d > r) return pal.line;
  const facing = ((p.x - c.x) * LIGHT.x + (p.y - c.y) * LIGHT.y) / r;
  return tone(pal, facing);
}
