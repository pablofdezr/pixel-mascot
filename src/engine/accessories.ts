import { MOUTH_SCALE, type Face } from "./face.ts";
import { hex, sdCircle, sdRoundRect, sdTriangle, distanceToSegment, type Vec } from "./pixels.ts";

/** Where a character wears things, in its own model space. */
export interface Anchors {
  /** Top-centre of the head: hats sit here. */
  headTop: Vec;
  headWidth: number;
  eyes: [Vec, Vec];
  eyeRx: number;
  eyeRy: number;
  /** Centre and half-width of the mouth, if the character has one. */
  mouth?: { x: number; y: number; w: number };
  /** Below the face: bow ties and ties hang here. */
  neck: Vec;
}

export type Slot = "head" | "face" | "neck";

// Lowest point of the face below its centre line: a mouth opened to talk
// reaches 5.2px under its centre; without a mouth, the bottom of the eyes.
const MOUTH_DROP = 5.2 * MOUTH_SCALE;
// The bow tie's wings reach 4.5px above the neck point at base size.
const BOW_REACH = 4.5;

/**
 * How much bigger each slot is drawn than its base design, growing out from
 * where it rests (top of the head, between the eyes, the neck) so it stays put.
 */
export const SIZE: Record<Slot, number> = { head: 1.5, face: 1.25, neck: 1.5 };

/** Anchors for a character wearing the standard face; neck items go just under it. */
export function faceAnchors(face: Face, head: { top: Vec; width: number }, neckX?: number): Anchors {
  return {
    headTop: head.top,
    headWidth: head.width,
    eyes: face.eyes,
    eyeRx: face.rx,
    eyeRy: face.ry,
    mouth: face.mouth,
    neck: neckUnder(face, neckX),
  };
}

/**
 * Where neck items hang so they never cover the mouth: just under the lowest
 * point of the face, with room for the bow tie's wings. `x` defaults to the
 * middle of the face.
 */
export function neckUnder(face: Face, x?: number): Vec {
  const [l, r] = face.eyes;
  const bottom = face.mouth ? face.mouth.y + MOUTH_DROP : Math.max(l.y, r.y) + face.ry;
  return { x: x ?? (l.x + r.x) / 2, y: bottom + BOW_REACH * SIZE.neck + 0.5 };
}

export type Outfit = Record<Slot, string>;

export const NO_OUTFIT: Outfit = { head: "none", face: "none", neck: "none" };

interface Accessory {
  id: string;
  label: string;
  draw(p: Vec, a: Anchors): number;
}

const fill = (sd: number, line: number, color: number) => (sd > 1 ? 0 : sd > 0 ? line : color);

const C = {
  ink: hex("#141418"),
  hatBlack: hex("#25252c"),
  hatShine: hex("#50505e"),
  hatBand: hex("#c8343a"),
  visorLine: hex("#174226"),
  visorBand: hex("#25633a"),
  visor: hex("#5dbb72"),
  visorShine: hex("#a6e3b1"),
  partyLine: hex("#5a2340"),
  partyPink: hex("#ff6f91"),
  partyYellow: hex("#ffd447"),
  pompom: hex("#ffffff"),
  capLine: hex("#122a5c"),
  capDark: hex("#1f4aa8"),
  cap: hex("#3474e0"),
  capShine: hex("#7aa8f5"),
  frame: hex("#2b2b33"),
  shades: hex("#101014"),
  glint: hex("#e8eefc"),
  gold: hex("#d4a72c"),
  handle: hex("#5a3a22"),
  goldLine: hex("#6e5410"),
  bowLine: hex("#5a1010"),
  bow: hex("#d43a3a"),
  bowShine: hex("#f27a72"),
  tieLine: hex("#101f45"),
  tie: hex("#2c4fa3"),
  tieStripe: hex("#f2c94c"),
  crownLine: hex("#6e5410"),
  crown: hex("#e8b923"),
  crownShine: hex("#fff0a0"),
  ruby: hex("#d0233c"),
  sapphire: hex("#2860d0"),
  beret: hex("#2b2f5c"),
  beretShine: hex("#4a5090"),
  beretLine: hex("#11132a"),
  leatherLine: hex("#3b2210"),
  leather: hex("#9a6534"),
  leatherShine: hex("#c48a52"),
  leatherBand: hex("#5a3518"),
  santaLine: hex("#5a1010"),
  santa: hex("#d83a3a"),
  fur: hex("#ffffff"),
  furShade: hex("#dcdce4"),
  hardLine: hex("#6e5310"),
  hard: hex("#f2c230"),
  hardShine: hex("#ffe58a"),
  phonesLine: hex("#000000"),
  phonesBand: hex("#2a2a30"),
  phonesCup: hex("#1b1b20"),
  phonesShine: hex("#55555f"),
  hairLine: hex("#6b3d12"),
  hair: hex("#e0a43c"),
  hairShade: hex("#b97a22"),
  hairShine: hex("#f7d27a"),
  hairBow: hex("#ff6f9a"),
  hairBowShine: hex("#ffb3c9"),
  hairBowLine: hex("#8a2048"),
  muffLine: hex("#5a1a05"),
  muff: hex("#ff5a1f"),
  muffShine: hex("#ff9a6a"),
  muffShade: hex("#d8400f"),
  pad: hex("#18181c"),
  padTop: hex("#3a3a42"),
  frame3d: hex("#f4f4f4"),
  lensRed: hex("#e23b3b"),
  lensCyan: hex("#36c3df"),
  mask: hex("#4b2a7a"),
  maskShine: hex("#7b54b0"),
  maskLine: hex("#1e0f36"),
  mustache: hex("#4a2c17"),
  mustacheLine: hex("#24130a"),
  blush: hex("#ff6f92"),
  blushEdge: hex("#ff9ab3"),
  blushShine: hex("#ffd6e2"),
  scarfLine: hex("#5a1010"),
  scarf: hex("#d23c3c"),
  scarfStripe: hex("#f2f2f2"),
  ribbon: hex("#2c4fa3"),
  ribbonRed: hex("#d23c3c"),
  pearl: hex("#f8f4ec"),
  pearlLine: hex("#9a9488"),
  bandana: hex("#c8343a"),
  bandanaDot: hex("#ffffff"),
  lanyard: hex("#2c6fd6"),
  card: hex("#ffffff"),
  cardLine: hex("#6d7380"),
  cardPhoto: hex("#9db4dc"),
  cardText: hex("#b8bcc6"),
};

// ---------- Head ----------

function visor(p: Vec, a: Anchors): number {
  const t = a.headTop;
  const w = a.headWidth / 2;
  const band = sdRoundRect(p, t.x - w - 1, t.y - 2, t.x + w + 1, t.y + 1, 0.8);
  if (band <= 0) return C.visorBand;
  // The green celluloid brim flares out above the eyes, like an old accountant's eyeshade.
  const depth = p.y - (t.y + 1);
  if (depth >= 0 && depth <= 3.2) {
    const half = w + 2 + depth * 1.6;
    const edge = half - Math.abs(p.x - t.x);
    if (edge >= 0) {
      if (edge < 1 || depth > 2.4) return C.visorLine;
      return depth < 1.2 ? C.visorShine : C.visor;
    }
  }
  return band <= 1 ? C.visorLine : 0;
}

function topHat(p: Vec, a: Anchors): number {
  const t = a.headTop;
  const w = a.headWidth / 2;
  const crownHalf = Math.max(5, w - 0.5);
  const brim = sdRoundRect(p, t.x - w - 4.5, t.y - 1.5, t.x + w + 4.5, t.y + 1.8, 1.5);
  if (brim <= 0) return C.hatBlack;
  const crown = sdRoundRect(p, t.x - crownHalf, t.y - 17, t.x + crownHalf, t.y - 0.5, 1);
  if (crown <= 0) {
    if (p.y > t.y - 5) return C.hatBand;
    return p.x < t.x - crownHalf + 2 ? C.hatShine : C.hatBlack;
  }
  return brim <= 1 || crown <= 1 ? C.ink : 0;
}

function partyHat(p: Vec, a: Anchors): number {
  const t = a.headTop;
  const w = Math.max(6.5, a.headWidth * 0.48);
  const apex = { x: t.x + 1, y: t.y - 18 };
  const pompom = sdCircle(p, apex, 2.8);
  if (pompom <= 0) return C.pompom;
  if (pompom <= 1) return C.partyLine;
  const cone = sdTriangle(p, { x: t.x - w, y: t.y + 1.5 }, { x: t.x + w, y: t.y + 1.5 }, apex);
  if (cone > 1) return 0;
  if (cone > 0) return C.partyLine;
  return Math.floor((p.y + p.x * 0.6) / 3) % 2 === 0 ? C.partyPink : C.partyYellow;
}

function cap(p: Vec, a: Anchors): number {
  const t = a.headTop;
  const w = a.headWidth / 2 + 1.5;
  const base = t.y + 1.5;
  // The peak: a wide, flat bill sticking out in front, longer to the right.
  const billX = t.x + w * 0.4;
  const bill = ((p.x - billX) / (w + 6)) ** 2 + ((p.y - (base + 0.8)) / 3.4) ** 2;
  if (bill <= 1 && p.y >= base - 0.6) {
    if (bill > 0.75 || p.y > base + 3) return C.capLine;
    return p.y < base + 1 ? C.cap : C.capDark;
  }
  const dome = ((p.x - t.x) / w) ** 2 + ((p.y - base) / 8.5) ** 2;
  if (p.y > base || dome > 1.2) return 0;
  if (dome > 1) return C.capLine;
  if (Math.hypot(p.x - t.x, p.y - (base - 8.2)) < 1.4) return C.capDark;
  // Seams of the crown panels.
  if (Math.abs(p.x - t.x) < 0.5 && p.y < base - 1) return C.capDark;
  return p.x - t.x < -w * 0.35 && p.y < base - 2.5 ? C.capShine : C.cap;
}

function crown(p: Vec, a: Anchors): number {
  const t = a.headTop;
  const w = Math.max(5, a.headWidth * 0.42);
  // Three spikes on a band, each tipped with a little ball.
  for (const dx of [-w * 0.75, 0, w * 0.75]) {
    const tip = { x: t.x + dx, y: t.y - 8 };
    const ball = sdCircle(p, tip, 1.2);
    if (ball <= 1) return ball > 0 ? C.crownLine : C.crownShine;
  }
  const spikes = Math.min(
    ...[-w * 0.75, 0, w * 0.75].map((dx) =>
      sdTriangle(p, { x: t.x + dx - 3, y: t.y - 2 }, { x: t.x + dx + 3, y: t.y - 2 }, { x: t.x + dx, y: t.y - 8 }),
    ),
  );
  const band = sdRoundRect(p, t.x - w, t.y - 3, t.x + w, t.y + 0.8, 0.6);
  if (band <= 0) {
    if (Math.hypot(p.x - t.x, p.y - (t.y - 1.1)) < 1.2) return C.ruby;
    if (Math.hypot(Math.abs(p.x - t.x) - w * 0.6, p.y - (t.y - 1.1)) < 0.9) return C.sapphire;
    return C.crown;
  }
  if (spikes <= 0) return p.x < t.x - w * 0.5 ? C.crownShine : C.crown;
  return Math.min(band, spikes) <= 1 ? C.crownLine : 0;
}

function beret(p: Vec, a: Anchors): number {
  const t = a.headTop;
  const c = { x: t.x + 1.5, y: t.y - 1.5 };
  const rx = a.headWidth / 2 + 3;
  if (Math.hypot(p.x - (c.x + 1), p.y - (c.y - 3.6)) < 1) return C.beretLine;
  const e = ((p.x - c.x) / rx) ** 2 + ((p.y - c.y) / 3.2) ** 2;
  if (e > 1.25) return 0;
  if (e > 1) return C.beretLine;
  return p.y < c.y - 1 && p.x < c.x ? C.beretShine : C.beret;
}

function cowboy(p: Vec, a: Anchors): number {
  const t = a.headTop;
  const w = a.headWidth / 2;
  // A wide brim that curls up at both ends.
  const curl = ((p.x - t.x) / (w + 7)) ** 2 * 2.2;
  const brim = ((p.x - t.x) / (w + 7)) ** 2 + ((p.y - (t.y + 0.3 - curl)) / 1.7) ** 2;
  if (brim <= 1) return brim > 0.55 ? C.leatherLine : C.leather;
  const crownHalf = w * 0.6 + 1;
  // A dent in the middle of the crown.
  const top = t.y - 8 + (Math.abs(p.x - t.x) < 1.6 ? 1.6 : 0);
  if (Math.abs(p.x - t.x) <= crownHalf && p.y >= top && p.y <= t.y) {
    if (Math.abs(p.x - t.x) > crownHalf - 1 || p.y < top + 1) return C.leatherLine;
    if (p.y > t.y - 2.5) return C.leatherBand;
    return p.x < t.x - crownHalf * 0.4 ? C.leatherShine : C.leather;
  }
  return 0;
}

function santaHat(p: Vec, a: Anchors): number {
  const t = a.headTop;
  const w = a.headWidth / 2;
  const tip = { x: t.x + w + 3, y: t.y - 10 };
  const pompom = sdCircle(p, tip, 2.2);
  if (pompom <= 0) return C.fur;
  if (pompom <= 1) return C.furShade;
  const fur = sdRoundRect(p, t.x - w - 1, t.y - 1, t.x + w + 1, t.y + 2.2, 1.5);
  if (fur <= 0) return p.y > t.y + 1 ? C.furShade : C.fur;
  const cone = sdTriangle(p, { x: t.x - w, y: t.y - 0.5 }, { x: t.x + w, y: t.y - 0.5 }, tip);
  if (cone <= 0) return C.santa;
  return Math.min(cone, fur) <= 1 ? C.santaLine : 0;
}

function hardHat(p: Vec, a: Anchors): number {
  const t = a.headTop;
  const w = a.headWidth / 2 + 2;
  const brim = sdRoundRect(p, t.x - w - 2.5, t.y - 0.5, t.x + w + 2.5, t.y + 1.3, 0.8);
  if (brim <= 0) return C.hard;
  const dome = ((p.x - t.x) / w) ** 2 + ((p.y - t.y) / 7.5) ** 2;
  if (p.y <= t.y && dome <= 1) {
    if (dome > 0.82) return C.hardLine;
    // The ridge down the middle catches the light.
    if (Math.abs(p.x - t.x) < 1.1) return C.hardShine;
    return p.x < t.x - w * 0.4 && p.y < t.y - 3 ? C.hardShine : C.hard;
  }
  return brim <= 1 ? C.hardLine : 0;
}

/** Radius of the headphone band; render.ts floats music notes from its ends. */
export const headphoneReach = (a: Anchors) => a.headWidth / 2 + 2.5;

function headphones(p: Vec, a: Anchors): number {
  const t = a.headTop;
  const r = headphoneReach(a);
  const c = { x: t.x, y: t.y + 4 };
  for (const side of [-1, 1]) {
    const x0 = c.x + side * r - 2.5;
    const cup = sdRoundRect(p, x0, c.y, x0 + 5, c.y + 7, 2);
    if (cup <= 0) return p.x < x0 + 1.8 && p.y < c.y + 3.5 ? C.phonesShine : C.phonesCup;
    if (cup <= 1) return C.phonesLine;
  }
  const d = Math.hypot(p.x - c.x, p.y - c.y);
  if (p.y <= c.y && Math.abs(d - r) < 1.3) return Math.abs(d - r) < 0.6 ? C.phonesBand : C.phonesLine;
  return 0;
}

/**
 * A long, wavy, honey-blonde wig: a full crown with a side-swept fringe, locks
 * that flare out as they fall and curl up at the ends, and a pink bow. It is
 * laid out around the face, not the top of the head, so `p` is mapped back
 * from this slot's enlarged drawing space to plain model space first.
 */
function longWig(p: Vec, a: Anchors): number {
  const t = a.headTop;
  const q = { x: t.x + (p.x - t.x) * SIZE.head, y: t.y + (p.y - t.y) * SIZE.head };
  const [l, r] = a.eyes;
  const mid = (l.x + r.x) / 2;
  const eyeY = (l.y + r.y) / 2;
  const half = 2 * a.eyeRx + 1.5;
  // The brows peak about 1.8 eye-heights above the eye centres; the hairline sits just over them.
  const top = eyeY - a.eyeRy * 1.8 - 1.5;
  const bottom = eyeY + a.eyeRy + 17;

  // Wavy strands, with a lighter streak down each side.
  const strands = (x: number, y: number, side: number) => {
    const wave = Math.floor(x + Math.sin(y * 0.45) * 1.5);
    if (wave % 4 === 0) return C.hairShade;
    if (side !== 0 && Math.abs(x - (mid + side * (half + 3))) < 1) return C.hairShine;
    return C.hair;
  };

  // A pink bow clipped on the right of the crown.
  const bow = { x: mid + half * 0.65, y: top - 4 };
  const knot = Math.hypot(q.x - bow.x, q.y - bow.y);
  if (knot < 1.3) return C.hairBowShine;
  const bowSd = Math.min(
    sdTriangle(q, bow, { x: bow.x - 4.5, y: bow.y - 3 }, { x: bow.x - 4.5, y: bow.y + 3 }),
    sdTriangle(q, bow, { x: bow.x + 4.5, y: bow.y - 3 }, { x: bow.x + 4.5, y: bow.y + 3 }),
  );
  if (bowSd <= 0) return C.hairBow;
  if (bowSd <= 1) return C.hairBowLine;

  for (const side of [-1, 1]) {
    // How far down the lock we are, 0 at the hairline → 1 at the ends.
    const k = (q.y - top) / (bottom - top);
    if (k >= 0 && k <= 1.15) {
      // Flares outwards as it falls; below the eyes it tucks in towards the cheeks.
      const inner = half - (q.y > eyeY + a.eyeRy ? (q.y - eyeY - a.eyeRy) * 0.25 : 0);
      const outer = half + 5 + k * 4;
      const dx = (q.x - mid) * side;
      const end = bottom + Math.sin(q.x * 1.1) * 1.4;
      if (dx >= inner && dx <= outer && q.y <= end) {
        if (dx - inner < 0.8 || outer - dx < 0.8 || end - q.y < 0.8) return C.hairLine;
        return strands(q.x, q.y, side);
      }
    }
    // Ends that curl up and outwards.
    const curl = { x: mid + side * (half + 8), y: bottom };
    const d = Math.hypot(q.x - curl.x, q.y - curl.y);
    if (d <= 3.4) return d > 2.6 ? C.hairLine : d < 1.2 ? C.hairShine : C.hair;
  }

  // A full crown with a side-swept fringe falling across the left of the forehead.
  const rx = half + 5;
  const ry = 10;
  const e = Math.sqrt(((q.x - mid) / rx) ** 2 + ((q.y - top) / ry) ** 2);
  const fringe = sdTriangle(q, { x: mid - half - 3, y: top - 1 }, { x: mid + half * 0.4, y: top - 1 }, { x: mid - half - 2, y: top + 6 });
  if (fringe <= 0) return strands(q.x + q.y, q.y, 0);
  if (fringe <= 1 && q.y > top) return C.hairLine;
  if (q.y > top + 0.5 || e > 1 + 1 / ry) return 0;
  if (e > 1) return C.hairLine;
  return q.y < top - ry * 0.55 && q.x < mid ? C.hairShine : strands(q.x, q.y, 0);
}

/** Construction ear defenders: padded black headband, wire arms, big orange cups. */
function earDefenders(p: Vec, a: Anchors): number {
  const t = a.headTop;
  const r = a.headWidth / 2 + 3.5;
  const c = { x: t.x, y: t.y + 4 };
  for (const side of [-1, 1]) {
    const cup = { x: c.x + side * r, y: c.y + 6 };
    const e = ((p.x - cup.x) / 3.6) ** 2 + ((p.y - cup.y) / 5.2) ** 2;
    if (e <= 1.25) {
      if (e > 1) return C.muffLine;
      // The black cushion faces the head.
      if ((p.x - cup.x) * side < -1.5) return C.pad;
      if (p.y < cup.y - 2.5 && (p.x - cup.x) * side > 0) return C.muffShine;
      return p.y > cup.y + 2.5 ? C.muffShade : C.muff;
    }
    // Thin wire arm from the band down to the cup.
    if (distanceToSegment(p, { x: c.x + side * (r - 1.5), y: c.y - 1 }, { x: cup.x, y: cup.y - 5 }) < 0.6) return C.pad;
  }
  // A thick padded band arching over the head.
  const d = Math.hypot(p.x - c.x, p.y - c.y);
  if (p.y <= c.y && d >= r - 3 && d <= r + 0.8) return d > r - 0.4 ? C.phonesLine : d > r - 1.4 ? C.padTop : C.pad;
  return 0;
}

// ---------- Face ----------

/** Arms running from the outer rim of each lens back towards the ears. */
function temples(p: Vec, a: Anchors, rimX: number, y: number, color: number): number {
  const [l, r] = a.eyes;
  const left = distanceToSegment(p, { x: l.x - rimX, y }, { x: l.x - rimX - 5, y: y - 2 });
  const right = distanceToSegment(p, { x: r.x + rimX, y }, { x: r.x + rimX + 5, y: y - 2 });
  return Math.min(left, right) < 0.85 ? color : 0;
}

function glasses(p: Vec, a: Anchors): number {
  const [l, r] = a.eyes;
  const rx = a.eyeRx + 1.8;
  const ry = a.eyeRy + 1.5;
  const ring = (eye: Vec) => Math.sqrt(((p.x - eye.x) / rx) ** 2 + ((p.y - eye.y) / ry) ** 2);
  const onRim = (d: number) => Math.abs(d - 1) * Math.min(rx, ry) < 1;
  // The lenses are wider than the gap between the eyes, so the rims overlap. The right
  // lens sits in front: inside it, the left rim and the bridge are hidden behind its glass.
  const front = ring(r);
  if (onRim(front)) return C.frame;
  if (front < 1) return 0;
  if (onRim(ring(l))) return C.frame;
  const bridge = distanceToSegment(p, { x: l.x + rx - 0.5, y: l.y - 1 }, { x: r.x - rx + 0.5, y: r.y - 1 });
  if (bridge < 0.9) return C.frame;
  return temples(p, a, rx - 0.3, l.y - 1.5, C.frame);
}

function sunglasses(p: Vec, a: Anchors): number {
  const [l, r] = a.eyes;
  for (const eye of a.eyes) {
    const x0 = eye.x - a.eyeRx - 2;
    const y0 = eye.y - a.eyeRy * 0.6;
    const lens = sdRoundRect(p, x0, y0, eye.x + a.eyeRx + 2, eye.y + a.eyeRy * 0.75, 1.6);
    if (lens <= 0) {
      const diagonal = p.x - x0 - (p.y - y0);
      return diagonal > 1.5 && diagonal < 2.7 && p.y < eye.y ? C.glint : C.shades;
    }
    if (lens <= 1) return C.ink;
  }
  const top = Math.min(l.y, r.y) - a.eyeRy * 0.6;
  const bridge = distanceToSegment(p, { x: l.x, y: top + 0.6 }, { x: r.x, y: top + 0.6 });
  if (bridge < 1.1) return C.ink;
  return temples(p, a, a.eyeRx + 1.8, top + 1.2, C.ink);
}

function monocle(p: Vec, a: Anchors): number {
  const eye = a.eyes[1];
  const rx = a.eyeRx + 1.9;
  const ry = a.eyeRy + 1.6;
  const ring = Math.sqrt(((p.x - eye.x) / rx) ** 2 + ((p.y - eye.y) / ry) ** 2);
  if (Math.abs(ring - 1) * Math.min(rx, ry) < 1) return C.gold;
  if (Math.abs(ring - 1) * Math.min(rx, ry) < 1.7) return ring > 1 ? C.goldLine : 0;
  // A dotted chain hanging from the rim.
  const from = { x: eye.x + rx * 0.7, y: eye.y + ry * 0.7 };
  const to = { x: from.x + 3.5, y: from.y + 11 };
  if (distanceToSegment(p, from, to) < 0.8 && Math.floor(p.y) % 2 === 0) return C.gold;
  return 0;
}

/** A magnifying glass held up to the right eye, handle pointing down-right. */
function magnifier(p: Vec, a: Anchors): number {
  const eye = a.eyes[1];
  const c = { x: eye.x + 1, y: eye.y };
  const r = Math.max(a.eyeRx, a.eyeRy) + 2.6;
  const d = Math.hypot(p.x - c.x, p.y - c.y);
  // Thick rim with a dark outline either side.
  if (d > r - 1.6 && d <= r + 0.9) return d > r - 0.5 && d <= r + 0.2 ? C.gold : C.goldLine;
  // A glint on the glass; the rest of the lens stays clear so the eye shows.
  if (d < r - 1.6) {
    const glint = Math.hypot(p.x - (c.x - r * 0.45), p.y - (c.y - r * 0.45));
    return glint < 1.1 ? C.glint : 0;
  }
  const from = { x: c.x + r * 0.72, y: c.y + r * 0.72 };
  const to = { x: from.x + 9, y: from.y + 9 };
  const handle = distanceToSegment(p, from, to);
  if (handle < 1.3) return C.handle;
  if (handle < 2.1) return C.ink;
  return 0;
}

function glasses3d(p: Vec, a: Anchors): number {
  const [l, r] = a.eyes;
  for (const [eye, lensColor] of [[l, C.lensRed], [r, C.lensCyan]] as const) {
    const lens = sdRoundRect(p, eye.x - a.eyeRx - 1.5, eye.y - a.eyeRy * 0.6, eye.x + a.eyeRx + 1.5, eye.y + a.eyeRy * 0.7, 1);
    if (lens <= 0) return lensColor;
    if (lens <= 1.6) return lens <= 0.8 ? C.frame3d : C.ink;
  }
  const top = Math.min(l.y, r.y) - a.eyeRy * 0.6;
  const bridge = distanceToSegment(p, { x: l.x, y: top + 0.8 }, { x: r.x, y: top + 0.8 });
  if (bridge < 1.2) return bridge < 0.6 ? C.frame3d : C.ink;
  return temples(p, a, a.eyeRx + 3, top + 1.2, C.ink);
}

function eyeMask(p: Vec, a: Anchors): number {
  const [l, r] = a.eyes;
  // Holes around the eyes so they still show through.
  for (const eye of a.eyes) {
    if (((p.x - eye.x) / (a.eyeRx + 0.3)) ** 2 + ((p.y - eye.y) / (a.eyeRy * 0.75)) ** 2 <= 1) return 0;
  }
  const sd = sdRoundRect(p, l.x - a.eyeRx - 3, l.y - a.eyeRy * 0.8, r.x + a.eyeRx + 3, r.y + a.eyeRy * 0.8, 3.5);
  if (sd > 1) return 0;
  if (sd > 0) return C.maskLine;
  return p.y < l.y - a.eyeRy * 0.35 ? C.maskShine : C.mask;
}

function mustache(p: Vec, a: Anchors): number {
  const [l, r] = a.eyes;
  const mid = (l.x + r.x) / 2;
  const eyesY = (l.y + r.y) / 2;
  // Face items are drawn SIZE.face times bigger around the eyes, so the mouth
  // sits closer to them in this drawing space than on screen.
  const toDrawing = (y: number) => eyesY + (y - eyesY) / SIZE.face;
  // Resting right on top of the mouth (or just under the eyes without one).
  const y = a.mouth ? toDrawing(a.mouth.y - 0.8 * MOUTH_SCALE) - 1.8 : toDrawing(Math.max(l.y, r.y) + a.eyeRy) + 1.5;
  for (const side of [-1, 1]) {
    const c = { x: mid + side * 3.4, y };
    // Each half sweeps down and out past the corners of the mouth.
    const droop = Math.max(0, (p.x - mid) * side - 3) * 0.45;
    const e = ((p.x - c.x) / 3.8) ** 2 + ((p.y - c.y - droop) / 1.5) ** 2;
    if (e <= 0.7) return C.mustache;
    if (e <= 1) return C.mustacheLine;
  }
  return 0;
}

function blush(p: Vec, a: Anchors): number {
  for (const [i, eye] of a.eyes.entries()) {
    const side = i === 0 ? -1 : 1;
    const c = { x: eye.x + side * a.eyeRx * 0.6, y: eye.y + a.eyeRy + 1.2 };
    // A solid rosy oval with a soft edge and a little highlight.
    const e = ((p.x - c.x) / 3.8) ** 2 + ((p.y - c.y) / 2.1) ** 2;
    if (e > 1) continue;
    if (Math.hypot(p.x - (c.x - 1.2), p.y - (c.y - 0.6)) < 0.8) return C.blushShine;
    return e > 0.65 ? C.blushEdge : C.blush;
  }
  return 0;
}

function eyePatch(p: Vec, a: Anchors): number {
  const [l, r] = a.eyes;
  const e = ((p.x - l.x) / (a.eyeRx + 0.8)) ** 2 + ((p.y - l.y) / (a.eyeRy + 0.6)) ** 2;
  if (e <= 1) return e > 0.82 ? C.ink : C.shades;
  // The strap runs diagonally across the head.
  const strap = distanceToSegment(p, { x: l.x - a.eyeRx - 4, y: l.y + 2 }, { x: r.x + a.eyeRx + 3, y: r.y - a.eyeRy - 2 });
  return strap < 0.8 ? C.ink : 0;
}

// ---------- Neck ----------

function bowTie(p: Vec, a: Anchors): number {
  const n = a.neck;
  const knot = sdRoundRect(p, n.x - 2, n.y - 2, n.x + 2, n.y + 2, 0.8);
  if (knot <= 0) return C.bowShine;
  const h = BOW_REACH;
  const left = sdTriangle(p, { x: n.x - 0.5, y: n.y }, { x: n.x - 8.5, y: n.y - h }, { x: n.x - 8.5, y: n.y + h });
  const right = sdTriangle(p, { x: n.x + 0.5, y: n.y }, { x: n.x + 8.5, y: n.y - h }, { x: n.x + 8.5, y: n.y + h });
  return fill(Math.min(left, right, knot), C.bowLine, C.bow);
}

function tie(p: Vec, a: Anchors): number {
  const n = a.neck;
  const knot = sdTriangle(p, { x: n.x - 3, y: n.y - 1.5 }, { x: n.x + 3, y: n.y - 1.5 }, { x: n.x, y: n.y + 3 });
  const blade = Math.min(
    sdTriangle(p, { x: n.x - 1.8, y: n.y + 2 }, { x: n.x + 1.8, y: n.y + 2 }, { x: n.x - 4, y: n.y + 14 }),
    sdTriangle(p, { x: n.x + 1.8, y: n.y + 2 }, { x: n.x + 4, y: n.y + 14 }, { x: n.x - 4, y: n.y + 14 }),
    sdTriangle(p, { x: n.x - 4, y: n.y + 14 }, { x: n.x + 4, y: n.y + 14 }, { x: n.x, y: n.y + 18 }),
  );
  const sd = Math.min(knot, blade);
  if (sd > 1) return 0;
  if (sd > 0) return C.tieLine;
  return blade <= 0 && Math.floor((p.y - p.x) / 2.5) % 2 === 0 ? C.tieStripe : C.tie;
}

function scarf(p: Vec, a: Anchors): number {
  const n = a.neck;
  const stripe = (q: Vec) => (Math.floor((q.x + q.y) / 2) % 2 === 0 ? C.scarf : C.scarfStripe);
  const wrap = sdRoundRect(p, n.x - 8, n.y - 2.5, n.x + 8, n.y + 1.8, 2);
  if (wrap <= 0) return stripe(p);
  // The loose end hangs down on one side, with a fringe.
  const end = sdRoundRect(p, n.x + 2.5, n.y, n.x + 6.5, n.y + 10, 1);
  if (end <= 0) return p.y > n.y + 9 && Math.floor(p.x) % 2 === 0 ? C.scarfLine : stripe(p);
  return Math.min(wrap, end) <= 1 ? C.scarfLine : 0;
}

function medal(p: Vec, a: Anchors): number {
  const n = a.neck;
  const disc = { x: n.x, y: n.y + 7 };
  const d = Math.hypot(p.x - disc.x, p.y - disc.y);
  if (d <= 3.3) {
    if (d > 2.5) return C.goldLine;
    // A little star stamped in the middle.
    if (Math.abs(p.x - disc.x) + Math.abs(p.y - disc.y) < 1.4) return C.crownShine;
    return C.gold;
  }
  const left = distanceToSegment(p, { x: n.x - 5, y: n.y - 3 }, { x: n.x - 0.5, y: n.y + 4 });
  const right = distanceToSegment(p, { x: n.x + 5, y: n.y - 3 }, { x: n.x + 0.5, y: n.y + 4 });
  if (left < 1.3) return C.ribbon;
  if (right < 1.3) return C.ribbonRed;
  return 0;
}

function pearls(p: Vec, a: Anchors): number {
  const n = a.neck;
  for (let i = -4; i <= 4; i++) {
    // A necklace hangs lowest in the middle.
    const c = { x: n.x + i * 2.1, y: n.y + 1.5 - i * i * 0.2 };
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d <= 1.15) return d > 0.8 ? C.pearlLine : C.pearl;
  }
  return 0;
}

function bandana(p: Vec, a: Anchors): number {
  const n = a.neck;
  const cloth = sdTriangle(p, { x: n.x - 7.5, y: n.y - 2 }, { x: n.x + 7.5, y: n.y - 2 }, { x: n.x, y: n.y + 7 });
  if (cloth > 1) return 0;
  if (cloth > 0) return C.scarfLine;
  return (Math.floor(p.x) + Math.floor(p.y) * 3) % 5 === 0 ? C.bandanaDot : C.bandana;
}

function lanyard(p: Vec, a: Anchors): number {
  const n = a.neck;
  // An ID badge on a blue strap: photo square and two lines of text.
  const card = sdRoundRect(p, n.x - 4.5, n.y + 3, n.x + 4.5, n.y + 13, 1);
  if (card <= 0) {
    if (p.x < n.x - 0.5 && p.y > n.y + 5 && p.y < n.y + 9.5 && p.x > n.x - 3.5) return C.cardPhoto;
    if (p.x > n.x + 0.5 && p.x < n.x + 3.5 && (Math.floor(p.y - n.y) === 6 || Math.floor(p.y - n.y) === 8)) return C.cardText;
    return C.card;
  }
  if (card <= 1) return C.cardLine;
  const strap = Math.min(
    distanceToSegment(p, { x: n.x - 6, y: n.y - 4 }, { x: n.x - 0.5, y: n.y + 3 }),
    distanceToSegment(p, { x: n.x + 6, y: n.y - 4 }, { x: n.x + 0.5, y: n.y + 3 }),
  );
  return strap < 0.9 ? C.lanyard : 0;
}

export const WARDROBE: Record<Slot, Accessory[]> = {
  head: [
    { id: "visor", label: "Visor", draw: visor },
    { id: "top-hat", label: "Top hat", draw: topHat },
    { id: "party", label: "Party hat", draw: partyHat },
    { id: "cap", label: "Cap", draw: cap },
    { id: "crown", label: "Crown", draw: crown },
    { id: "beret", label: "Beret", draw: beret },
    { id: "cowboy", label: "Cowboy hat", draw: cowboy },
    { id: "santa", label: "Santa hat", draw: santaHat },
    { id: "hard-hat", label: "Hard hat", draw: hardHat },
    { id: "ear-defenders", label: "Ear defenders", draw: earDefenders },
    { id: "long-wig", label: "Long wig", draw: longWig },
    { id: "headphones", label: "Headphones", draw: headphones },
  ],
  face: [
    { id: "glasses", label: "Glasses", draw: glasses },
    { id: "sunglasses", label: "Sunglasses", draw: sunglasses },
    { id: "monocle", label: "Monocle", draw: monocle },
    { id: "magnifier", label: "Magnifier", draw: magnifier },
    { id: "3d", label: "3D glasses", draw: glasses3d },
    { id: "mask", label: "Eye mask", draw: eyeMask },
    { id: "mustache", label: "Moustache", draw: mustache },
    { id: "blush", label: "Blush", draw: blush },
    { id: "eye-patch", label: "Eye patch", draw: eyePatch },
  ],
  neck: [
    { id: "bow-tie", label: "Bow tie", draw: bowTie },
    { id: "tie", label: "Tie", draw: tie },
    { id: "scarf", label: "Scarf", draw: scarf },
    { id: "medal", label: "Medal", draw: medal },
    { id: "pearls", label: "Pearls", draw: pearls },
    { id: "bandana", label: "Bandana", draw: bandana },
    { id: "lanyard", label: "Lanyard", draw: lanyard },
  ],
};

const BY_ID = new Map(Object.values(WARDROBE).flat().map((item) => [item.id, item]));

const grow = (p: Vec, around: Vec, k: number): Vec => ({
  x: around.x + (p.x - around.x) / k,
  y: around.y + (p.y - around.y) / k,
});

/** Head, then face, then neck items, drawn in front of the character. */
export function accessoryColor(p: Vec, outfit: Outfit, anchors: Anchors): number {
  const [l, r] = anchors.eyes;
  const between = { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
  return (
    (BY_ID.get(outfit.head)?.draw(grow(p, anchors.headTop, SIZE.head), anchors) ?? 0) ||
    (BY_ID.get(outfit.face)?.draw(grow(p, between, SIZE.face), anchors) ?? 0) ||
    (BY_ID.get(outfit.neck)?.draw(grow(p, anchors.neck, SIZE.neck), anchors) ?? 0)
  );
}
