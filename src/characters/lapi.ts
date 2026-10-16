import { accessoryColor, faceAnchors, type Outfit } from "../engine/accessories.ts";
import { faceColor, standardFace } from "../engine/face.ts";
import { floor } from "../engine/ground.ts";
import { hex, palette, sdRoundRect, sdTriangle, type Vec } from "../engine/pixels.ts";
import type { Pose } from "../engine/pose.ts";
import type { CharacterDef } from "./types.ts";

// A chunky yellow pencil standing on its eraser, point up.
const LINE = hex("#5a4210");
const FACET_LIGHT = hex("#ffe27a");
const FACET = hex("#f5c400");
const FACET_DARK = hex("#d29e00");
const WOOD = hex("#e8c08a");
const WOOD_DARK = hex("#c99a5e");
const GRAPHITE = hex("#3b3b42");
const FERRULE = palette("#4a4a52", "#8d929c", "#c4c9d2", "#e4e8ee", "#ffffff");
const ERASER = hex("#f08ca0");
const ERASER_DARK = hex("#d06a80");
const ERASER_LINE = hex("#7a2c3c");
const INK = hex("#2c2c34");

const BODY = { x0: 10, x1: 38, y0: 16, y1: 54 };
const TIP = { x: 24, y: 2 };

const FACE = standardFace({ x: 24, y: 33 }, { lid: FACET_LIGHT, mouth: { x: 24, y: 45, w: 3 } });
const ANCHORS = faceAnchors(FACE, { top: { x: 24, y: 5 }, width: 10 });

/** Signing: a squiggly signature runs out along the floor beside it. */
function signature(p: Vec, pose: Pose): number {
  if (pose.action <= 0.05) return 0;
  const end = 28 + pose.action * 26;
  if (p.x < 28 || p.x > end) return 0;
  const y = 66 + Math.sin((p.x - 28) * 0.8) * 2.2 - (p.x - 28) * 0.08;
  return Math.abs(p.y - y) < 0.85 ? INK : 0;
}

function body(p: Vec): number {
  // Sharpened cone: bare wood with a graphite point.
  const cone = sdTriangle(p, { x: BODY.x0, y: BODY.y0 }, { x: BODY.x1, y: BODY.y0 }, TIP);
  if (cone <= 0) {
    if (p.y < TIP.y + 5) return GRAPHITE;
    return p.x > 26 ? WOOD_DARK : WOOD;
  }
  // Three facets of the hexagonal barrel: lit, flat, shaded.
  if (p.x >= BODY.x0 && p.x <= BODY.x1 && p.y >= BODY.y0 && p.y <= BODY.y1) {
    if (p.x < BODY.x0 + 1 || p.x > BODY.x1 - 1) return LINE;
    if (p.x < 19.3) return FACET_LIGHT;
    if (p.x < 28.7) return FACET;
    return FACET_DARK;
  }
  const ferrule = sdRoundRect(p, BODY.x0 - 0.5, BODY.y1, BODY.x1 + 0.5, 59.5, 0.5);
  if (ferrule <= 0) return Math.floor(p.y) % 2 === 0 ? FERRULE.dark : FERRULE.light;
  const eraser = sdRoundRect(p, BODY.x0, 59, BODY.x1, 66, 3);
  if (eraser <= 0) return p.y > 64 || p.x > 33 ? ERASER_DARK : ERASER;
  if (Math.min(cone, ferrule, eraser) <= 1) return eraser <= 1 ? ERASER_LINE : LINE;
  return 0;
}

function sample(p: Vec, pose: Pose, outfit: Outfit): number {
  return accessoryColor(p, outfit, ANCHORS) || faceColor(p, FACE, pose) || body(p) || signature(p, pose);
}

export const lapi: CharacterDef = {
  id: "lapi",
  name: "Lapi",
  kind: "Pencil",
  actionLabel: "Sign",
  art: {
    pivot: { x: 24, y: 66 },
    gaze: { x: 24, y: 33 },
    ground: floor({ x: 24, y: 66.5 }, 15, 3),
    anchors: () => ANCHORS,
    sample,
  },
  greeting: "Hi, I'm Lapi. I write line items, take notes and sign whatever needs signing.",
};
