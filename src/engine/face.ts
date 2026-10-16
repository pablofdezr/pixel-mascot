import { distanceToPolyline, hex, sdCircle, sdTriangle, type Vec } from "./pixels.ts";
import type { Pose } from "./pose.ts";

export interface Face {
  /** Left and right eye centres. */
  eyes: [Vec, Vec];
  rx: number;
  ry: number;
  pupil: number;
  brows: [Vec[], Vec[]];
  browWidth: number;
  /** Centre and half-width of the mouth; characters without one omit it. */
  mouth?: { x: number; y: number; w: number };
  /** Colour of the eyelid sliding down, usually a light tone of the body. */
  lid: number;
}

/**
 * Every character wears the same face: big round eyes and arched
 * brows, centred between the eyes at `at`. `size` shrinks it for characters
 * drawn bigger than 1:1, so on screen all eyes measure the same.
 */
export function standardFace(
  at: Vec,
  { lid, mouth, size = 1 }: { lid: number; mouth?: Face["mouth"]; size?: number },
): Face {
  const k = size;
  const point = (dx: number, dy: number) => ({ x: at.x + dx * k, y: at.y + dy * k });
  return {
    eyes: [point(-6.4, 0), point(6.4, 0)],
    rx: 6.4 * k,
    ry: 7.4 * k,
    pupil: 2.7 * k,
    brows: [
      [point(-14.7, -9.5), point(-10.2, -13.1), point(-3.2, -12.5)],
      [point(2.8, -12.5), point(9.8, -13.1), point(14.3, -9.5)],
    ],
    browWidth: 1.15 * k,
    mouth,
    lid,
  };
}

const INK = hex("#1b1b22");
const WHITE = hex("#ffffff");
const EYE_SHADE = hex("#d5d6e4");
const PUPIL = hex("#121216");
const MOUTH_INSIDE = hex("#4a1418");
const TONGUE = hex("#e2676a");
const HEART = hex("#e0245e");

/** A heart centred on c, about 2s wide. */
function inHeart(p: Vec, c: Vec, s: number): boolean {
  return (
    sdCircle(p, { x: c.x - s * 0.5, y: c.y - s * 0.25 }, s * 0.55) <= 0 ||
    sdCircle(p, { x: c.x + s * 0.5, y: c.y - s * 0.25 }, s * 0.55) <= 0 ||
    sdTriangle(p, { x: c.x - s * 1.05, y: c.y - s * 0.05 }, { x: c.x + s * 1.05, y: c.y - s * 0.05 }, { x: c.x, y: c.y + s * 1.05 }) <= 0
  );
}

function eyeColor(p: Vec, eye: Vec, side: 0 | 1, face: Face, pose: Pose): number {
  const rx = face.rx * pose.eyeScale;
  const ry = face.ry * pose.eyeScale;
  const dx = p.x - eye.x;
  const dy = p.y - eye.y;
  const outer = (dx / rx) ** 2 + (dy / ry) ** 2;
  if (outer > 1) return 0;
  const inner = (dx / (rx - 1)) ** 2 + (dy / (ry - 1)) ** 2;

  // Happy: only the top arc of the eye, like ^ ^.
  if (pose.happy) {
    const arc = (dx / (rx - 1.7)) ** 2 + (dy / (ry - 1.7)) ** 2;
    return dy < 0.5 && arc > 1 ? INK : 0;
  }

  if (inner > 1) return INK;

  // The lid slides down from the top and covers whatever is behind it.
  const blink = side === 0 ? pose.blinkLeft : pose.blinkRight;
  const lidEdge = eye.y - ry + 2 * ry * blink;
  if (blink > 0) {
    if (Math.abs(p.y - lidEdge) < 0.6) return INK;
    if (p.y < lidEdge) return face.lid;
  }

  const pupil = {
    x: eye.x + pose.look.x * (rx - face.pupil - 0.5),
    y: eye.y + pose.look.y * (ry - face.pupil - 0.7),
  };
  if (pose.hearts) {
    if (inHeart(p, pupil, face.pupil * 1.35)) return HEART;
  } else {
    const r = face.pupil * pose.pupilScale;
    if (Math.hypot(p.x - pupil.x, p.y - pupil.y) < r) {
      const glint = Math.hypot(p.x - (pupil.x - r * 0.38), p.y - (pupil.y - r * 0.38));
      return glint < 0.75 ? WHITE : PUPIL;
    }
  }
  return (dx / rx) * 0.6 + dy / ry > 0.72 ? EYE_SHADE : WHITE;
}

/** Every mouth is drawn this much bigger than its base design (lines included). */
export const MOUTH_SCALE = 1.4;

function mouthColor(p: Vec, face: Face, pose: Pose): number {
  const m = face.mouth;
  if (!m) return 0;
  const dx = (p.x - m.x) / MOUTH_SCALE;
  const dy = (p.y - m.y) / MOUTH_SCALE;

  const open = pose.mouth === "o" ? 1 : pose.mouthOpen;
  if (pose.mouth === "o" || open > 0.15) {
    const rx = pose.mouth === "o" ? 1.9 : m.w * 0.8;
    const ry = pose.mouth === "o" ? 2.3 : 0.9 + open * 2.2;
    const cy = ry - 1;
    const e = (dx / rx) ** 2 + ((dy - cy) / ry) ** 2;
    if (e > 1) return 0;
    if ((dx / (rx - 0.9)) ** 2 + ((dy - cy) / (ry - 0.9)) ** 2 > 1) return INK;
    return dy - cy > ry * 0.25 && ry > 1.8 ? TONGUE : MOUTH_INSIDE;
  }

  if (pose.mouth === "grin") {
    // A wide open half-moon.
    if (dy < -0.6 || (dx / (m.w + 0.6)) ** 2 + (dy / 3) ** 2 > 1) return 0;
    if (dy < 0.4 || (dx / (m.w - 0.4)) ** 2 + (dy / 2.1) ** 2 > 1) return INK;
    return dy > 1.2 ? TONGUE : MOUTH_INSIDE;
  }

  const curve =
    pose.mouth === "flat"
      ? [{ x: -m.w * 0.7, y: 0.4 }, { x: m.w * 0.7, y: 0.4 }]
      : pose.mouth === "sad"
        ? [{ x: -m.w, y: 1.2 }, { x: -m.w * 0.4, y: -0.3 }, { x: m.w * 0.4, y: -0.3 }, { x: m.w, y: 1.2 }]
        : [{ x: -m.w, y: -0.8 }, { x: -m.w * 0.4, y: 0.7 }, { x: m.w * 0.4, y: 0.7 }, { x: m.w, y: -0.8 }];
  return distanceToPolyline({ x: dx, y: dy }, curve) < 0.75 ? INK : 0;
}

/**
 * Lifts a brow and angles it: with frown > 0 the inner end (towards the nose)
 * drops and the outer end rises; with frown < 0 the reverse, a worried look.
 */
function shapeBrow(points: Vec[], lift: number, frown: number, innerFirst: boolean): Vec[] {
  const last = points.length - 1;
  return points.map((pt, i) => {
    const towardInner = innerFirst ? 1 - i / last : i / last;
    return { x: pt.x, y: pt.y - lift + frown * (towardInner * 3.2 - 1.2) };
  });
}

// Brows only change once per frame, so they are shaped once and reused for every pixel.
let browCache: { face: Face; pose: Pose; brows: [Vec[], Vec[]] } | null = null;

function browsFor(face: Face, pose: Pose): [Vec[], Vec[]] {
  if (browCache?.face !== face || browCache.pose !== pose) {
    browCache = {
      face,
      pose,
      brows: [shapeBrow(face.brows[0], pose.browLeft, pose.frown, false), shapeBrow(face.brows[1], pose.browRight, pose.frown, true)],
    };
  }
  return browCache.brows;
}

/** Brows, then eyes, then mouth. Returns 0 where the face is empty. */
export function faceColor(p: Vec, face: Face, pose: Pose): number {
  const [left, right] = browsFor(face, pose);
  if (distanceToPolyline(p, left) < face.browWidth) return INK;
  if (distanceToPolyline(p, right) < face.browWidth) return INK;
  return eyeColor(p, face.eyes[0], 0, face, pose) || eyeColor(p, face.eyes[1], 1, face, pose) || mouthColor(p, face, pose);
}
