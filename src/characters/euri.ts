import { accessoryColor, faceAnchors, type Outfit } from "../engine/accessories.ts";
import { faceColor, standardFace } from "../engine/face.ts";
import { floor } from "../engine/ground.ts";
import { inkAt } from "../engine/pixelfont.ts";
import { LIGHT, hex, palette, tone, type Vec } from "../engine/pixels.ts";
import type { Pose } from "../engine/pose.ts";
import type { CharacterDef } from "./types.ts";

// A big euro coin standing on its edge.
const GOLD = palette("#5e4508", "#b8901e", "#e0b63a", "#f5d76e", "#fff5c4");
const RIM = palette("#5e4508", "#9a7414", "#c49a22", "#ddb748", "#f5dc8a");
const EDGE = hex("#a37d18");
const EDGE_RIDGE = hex("#7a5c10");
// Embossed value, barely darker than the face: it reads as minted, not printed.
const EMBOSS = hex("#d2a632");
const EMBOSS_SHINE = hex("#f2d06a");

const COIN = { x: 24, y: 40, r: 22 };

const FACE = standardFace({ x: 24, y: 37 }, { lid: GOLD.light, mouth: { x: 24, y: 49, w: 3 } });
const ANCHORS = faceAnchors(FACE, { top: { x: 24, y: 18 }, width: 18 });

/** How wide the coin looks while it spins: 1 face-on, 0 edge-on. */
const facing = (pose: Pose) => Math.abs(Math.cos(pose.action * Math.PI * 0.5));

function coin(p: Vec): number {
  const dx = p.x - COIN.x;
  const dy = p.y - COIN.y;
  const d = Math.hypot(dx, dy);
  if (d > COIN.r + 1) return 0;
  if (d > COIN.r) return GOLD.line;
  const light = (dx * LIGHT.x + dy * LIGHT.y) / COIN.r;
  // A raised rim with notches, around a smooth face.
  if (d > COIN.r - 3) {
    const notch = Math.floor((Math.atan2(dy, dx) / (Math.PI * 2)) * 48) % 2 === 0;
    return notch ? tone(RIM, light) : RIM.dark;
  }
  if (d > COIN.r - 3.8) return RIM.line;
  // A big "1" on one side and "€" on the other, at double size, with a lit edge.
  const big = (text: string, origin: Vec, q: Vec) =>
    inkAt({ x: origin.x + (q.x - origin.x) / 2, y: origin.y + (q.y - origin.y) / 2 }, text, origin);
  for (const [text, origin] of [["1", { x: 7, y: 44 }], ["€", { x: 35, y: 44 }]] as const) {
    if (big(text, origin, p)) return EMBOSS;
    if (big(text, origin, { x: p.x + 1, y: p.y + 1 })) return EMBOSS_SHINE;
  }
  return tone(GOLD, light * 0.8);
}

function sample(screen: Vec, pose: Pose, outfit: Outfit): number {
  const width = facing(pose);
  // Nearly edge-on: just the ridged edge, the face is out of sight.
  if (width < 0.2) {
    const inEdge = Math.abs(screen.x - COIN.x) < 2.5 && Math.abs(screen.y - COIN.y) < COIN.r;
    if (!inEdge) return 0;
    return Math.floor(screen.y) % 2 === 0 ? EDGE_RIDGE : EDGE;
  }
  // Otherwise everything (face and outfit too) is squeezed sideways.
  const p = { x: COIN.x + (screen.x - COIN.x) / width, y: screen.y };
  return accessoryColor(p, outfit, ANCHORS) || faceColor(p, FACE, pose) || coin(p);
}

export const euri: CharacterDef = {
  id: "euri",
  name: "Euri",
  kind: "Euro coin",
  actionLabel: "Spin",
  art: {
    pivot: { x: 24, y: 62 },
    gaze: { x: 24, y: 37 },
    ground: floor({ x: 24, y: 62.5 }, 14, 2.5),
    anchors: () => ANCHORS,
    sample,
  },
  greeting: "Hi, I'm Euri. Heads or tails, today we invoice. What are we charging for?",
};
