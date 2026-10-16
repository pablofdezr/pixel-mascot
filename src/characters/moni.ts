import { accessoryColor, faceAnchors, type Anchors, type Outfit } from "../engine/accessories";
import { faceColor, standardFace } from "../engine/face";
import { floor } from "../engine/ground";
import { LIGHT, ballShade, boxShade, distanceToSegment, hex, palette, sdRoundRect, sdTriangle, tone, type Vec } from "../engine/pixels";
import type { Pose } from "../engine/pose";
import type { CharacterDef } from "./types";

const PINK = palette("#6e2c43", "#d9779a", "#f4a3bf", "#fbc6d8", "#ffe6ef");
const SNOUT = palette("#6e2c43", "#d2668c", "#e88aab", "#f4aec7", "#ffd6e4");
const NOSTRIL = hex("#8a3b56");
const SLOT = hex("#3a1424");
const GOLD = palette("#6e5410", "#b8901e", "#d4a72c", "#f0cf63", "#fff3b8");

const BODY = { x: 24, y: 42, rx: 20, ry: 18 };
const SLOT_Y = 24.5;

const FACE = standardFace({ x: 24, y: 36 }, { lid: PINK.light, mouth: { x: 24, y: 54.5, w: 2.8 } });

const ANCHORS: Anchors = faceAnchors(FACE, { top: { x: 24, y: 23 }, width: 18 });

/** The round belly, shaded as an ellipse lit from the upper left. */
function belly(p: Vec): number {
  const nx = (p.x - BODY.x) / BODY.rx;
  const ny = (p.y - BODY.y) / BODY.ry;
  const e = nx * nx + ny * ny;
  if (e > (1 + 1 / BODY.ry) ** 2) return 0;
  if (e > 1) return PINK.line;
  return tone(PINK, (nx * LIGHT.x + ny * LIGHT.y) * 0.9);
}

/** Saving: a coin pops up out of the slot and drops back in. */
function coin(p: Vec, pose: Pose): number {
  if (pose.action <= 0.05) return 0;
  const c = { x: 24, y: SLOT_Y - 2 - pose.action * 10 };
  const sd = sdRoundRect(p, c.x - 3.5, c.y - 4, c.x + 3.5, c.y + 4, 3);
  if (sd > 1) return 0;
  if (sd > 0) return GOLD.line;
  if (Math.abs(p.x - c.x) < 0.6 && Math.abs(p.y - c.y) < 2.2) return GOLD.dark;
  return boxShade(p, sd, c.x - 3.5, c.y - 4, c.x + 3.5, c.y + 4, GOLD);
}

function sample(p: Vec, pose: Pose, outfit: Outfit): number {
  const extra = accessoryColor(p, outfit, ANCHORS) || faceColor(p, FACE, pose);
  if (extra) return extra;

  const money = coin(p, pose);
  if (money) return money;

  // Snout with two nostrils, between the eyes and the mouth.
  const snout = ballShade({ x: 24 + (p.x - 24) * 0.65, y: p.y }, { x: 24, y: 47.5 }, 4, SNOUT);
  if (snout) {
    if (Math.hypot(p.x - 21.6, p.y - 47.5) < 1.1 || Math.hypot(p.x - 26.4, p.y - 47.5) < 1.1) return NOSTRIL;
    return snout;
  }

  const slot = sdRoundRect(p, 19, SLOT_Y - 0.8, 29, SLOT_Y + 0.8, 0.6);
  if (slot <= 0) return SLOT;

  const body = belly(p);
  if (body) return body;

  // Ears on top, legs underneath, a curly tail on the right.
  const ears = Math.min(
    sdTriangle(p, { x: 8, y: 31 }, { x: 13, y: 19 }, { x: 19, y: 26 }),
    sdTriangle(p, { x: 40, y: 31 }, { x: 35, y: 19 }, { x: 29, y: 26 }),
  );
  if (ears <= 1) return ears > 0 ? PINK.line : ears > -1.2 ? PINK.light : PINK.dark;
  const legs = Math.min(sdRoundRect(p, 11, 54, 18, 66, 2), sdRoundRect(p, 30, 54, 37, 66, 2));
  if (legs <= 1) return legs > 0 ? PINK.line : p.y > 64 ? PINK.dark : PINK.mid;
  const tail = Math.min(
    distanceToSegment(p, { x: 43.5, y: 44 }, { x: 47, y: 41 }),
    distanceToSegment(p, { x: 47, y: 41 }, { x: 46, y: 38 }),
    distanceToSegment(p, { x: 46, y: 38 }, { x: 44, y: 39.5 }),
  );
  return tail < 0.9 ? PINK.dark : 0;
}

export const moni: CharacterDef = {
  id: "moni",
  name: "Moni",
  kind: "Piggy bank",
  actionLabel: "Save",
  art: {
    pivot: { x: 24, y: 66 },
    gaze: { x: 24, y: 36 },
    ground: floor({ x: 24, y: 66.5 }, 20, 3),
    anchors: () => ANCHORS,
    sample,
  },
  greeting: "Hi, I'm Moni. I make sure payments land. Which invoices are still unpaid?",
};
