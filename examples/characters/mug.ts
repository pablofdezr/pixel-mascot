import {
  accessoryColor,
  boxShade,
  faceAnchors,
  faceColor,
  floor,
  hex,
  LIGHT,
  palette,
  sdRoundRect,
  standardFace,
  tone,
  type Anchors,
  type CharacterDef,
  type Outfit,
  type Pose,
  type Vec,
} from "../../src";

// The character from docs/creating-characters.md: a coffee mug whose
// signature move is a puff of steam.

const BODY = palette("#1d4e57", "#2f7f8c", "#45a3b1", "#7fcbd5", "#c8eef2");
const COFFEE = hex("#4a2a17");
const COFFEE_RIM = hex("#2a160b");
const STEAM = hex("#aab3bf");

// The cup, in the 48×72 model space: x grows right, y grows down.
const CUP = { x0: 10, y0: 30, x1: 36, y1: 64 };
const HANDLE = { x: 37, y: 46, r: 6, width: 2.2 };

const FACE = standardFace({ x: 23, y: 44 }, { lid: BODY.light, mouth: { x: 23, y: 55, w: 3 } });
const ANCHORS: Anchors = faceAnchors(FACE, { top: { x: 23, y: 30 }, width: 26 });

function handle(p: Vec): number {
  const d = Math.hypot(p.x - HANDLE.x, p.y - HANDLE.y);
  // Only the half ring sticking out to the right of the cup.
  if (p.x < CUP.x1 - 1) return 0;
  const off = Math.abs(d - HANDLE.r);
  if (off > HANDLE.width + 1) return 0;
  if (off > HANDLE.width) return BODY.line;
  // Shade the round handle by how much its surface faces the light.
  const facing = ((p.x - HANDLE.x) * LIGHT.x + (p.y - HANDLE.y) * LIGHT.y) / d;
  return tone(BODY, facing * Math.sign(d - HANDLE.r || 1));
}

function coffee(p: Vec): number {
  const e = ((p.x - 23) / 11.5) ** 2 + ((p.y - (CUP.y0 + 2.5)) / 1.8) ** 2;
  if (e > 1) return 0;
  return e > 0.7 ? COFFEE_RIM : COFFEE;
}

/** Three wisps that rise while it puffs (pose.action) or talks. */
function steam(p: Vec, pose: Pose): number {
  const amount = Math.max(pose.action, pose.mouthOpen * 0.4);
  if (amount <= 0) return 0;
  const top = CUP.y0 - 2 - amount * 20;
  if (p.y < top || p.y > CUP.y0 - 1) return 0;
  for (const k of [-1, 0, 1]) {
    const x = 23 + k * 6 + Math.sin((p.y + pose.time * 18 + k * 5) * 0.45) * 1.6;
    if (Math.abs(p.x - x) < 0.9) return STEAM;
  }
  return 0;
}

function sample(p: Vec, pose: Pose, outfit: Outfit): number {
  const front = accessoryColor(p, outfit, ANCHORS) || faceColor(p, FACE, pose);
  if (front) return front;
  const cup = sdRoundRect(p, CUP.x0, CUP.y0, CUP.x1, CUP.y1, 3);
  if (cup <= 1) return coffee(p) || boxShade(p, cup, CUP.x0, CUP.y0, CUP.x1, CUP.y1, BODY);
  return handle(p) || steam(p, pose);
}

export const mug: CharacterDef = {
  id: "mug",
  name: "Mugsy",
  kind: "Coffee mug",
  actionLabel: "Steam",
  greeting: "Hi, I'm Mugsy. Ask me anything, I'm fully caffeinated.",
  art: {
    pivot: { x: 24, y: 64 },
    gaze: { x: 23, y: 44 },
    ground: floor({ x: 24, y: 64.5 }, 20, 3),
    anchors: () => ANCHORS,
    sample,
  },
};
