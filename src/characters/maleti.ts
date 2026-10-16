import { accessoryColor, faceAnchors, type Outfit } from "../engine/accessories";
import { faceColor, standardFace } from "../engine/face";
import { floor } from "../engine/ground";
import { boxShade, hex, palette, sdRoundRect, type Vec } from "../engine/pixels";
import type { Pose } from "../engine/pose";
import type { CharacterDef } from "./types";

const LEATHER = palette("#3b2210", "#7a4a22", "#a5682f", "#c98a4c", "#e8b27a");
const HANDLE = palette("#2a170a", "#4f2f15", "#6b4220", "#8a5a30", "#a87444");
const GOLD = palette("#6e5410", "#b8901e", "#d4a72c", "#f0cf63", "#fff3b8");
const INSIDE = hex("#2a170a");
const PAPER = hex("#fdfdfb");
const PAPER_LINE = hex("#c5cad4");

const CASE = { x0: -6, y0: 28, x1: 54, y1: 68 };
/** Where the lid meets the case; opening lifts everything above it. */
const SEAM = 36;

const FACE = standardFace({ x: 24, y: 46 }, { lid: LEATHER.light, mouth: { x: 24, y: 56, w: 3 } });
const ANCHORS = faceAnchors(FACE, { top: { x: 24, y: 21 }, width: 16 });

function lid(p: Vec): number {
  // Carrying handle: a ring on top.
  const handle = sdRoundRect(p, 16, 21, 32, 30, 3);
  const hole = sdRoundRect(p, 19.5, 24.5, 28.5, 30, 1.5);
  if (handle <= 1 && hole > 0) return boxShade(p, handle, 16, 21, 32, 30, HANDLE);

  const top = sdRoundRect(p, CASE.x0, CASE.y0, CASE.x1, SEAM + 1, 3);
  if (top > 1 || p.y > SEAM) return 0;
  // Two brass clasps on the seam.
  for (const cx of [5, 43]) {
    const clasp = sdRoundRect(p, cx - 2.5, SEAM - 4, cx + 2.5, SEAM, 0.6);
    if (clasp <= 1) return boxShade(p, clasp, cx - 2.5, SEAM - 4, cx + 2.5, SEAM, GOLD);
  }
  return boxShade(p, top, CASE.x0, CASE.y0, CASE.x1, SEAM + 1, LEATHER);
}

function sample(p: Vec, pose: Pose, outfit: Outfit): number {
  const extra = accessoryColor(p, outfit, ANCHORS) || faceColor(p, FACE, pose);
  if (extra) return extra;

  // Opening lifts the lid: everything above the seam rises.
  const rise = Math.round(pose.action * 7);
  const top = lid({ x: p.x, y: p.y + rise });
  if (top) return top;

  // The gap shows papers inside the case.
  if (rise > 0 && p.y > SEAM - rise && p.y <= SEAM && p.x > CASE.x0 + 1 && p.x < CASE.x1 - 1) {
    const inPaper = p.x > 0 && p.x < 48 && p.y > SEAM - rise + 1;
    if (!inPaper) return INSIDE;
    return Math.floor(p.y) % 2 === 0 && p.x > 4 && p.x < 36 ? PAPER_LINE : PAPER;
  }

  const lower = sdRoundRect(p, CASE.x0, SEAM, CASE.x1, CASE.y1, 3);
  if (lower > 1) return 0;
  if (Math.abs(p.y - SEAM - 0.5) < 0.6) return LEATHER.line;
  return boxShade(p, lower, CASE.x0, SEAM, CASE.x1, CASE.y1, LEATHER);
}

export const maleti: CharacterDef = {
  id: "maleti",
  name: "Maleti",
  kind: "Briefcase",
  actionLabel: "Open",
  art: {
    pivot: { x: 24, y: 68 },
    gaze: { x: 24, y: 46 },
    ground: floor({ x: 24, y: 68.5 }, 32, 3),
    anchors: () => ANCHORS,
    sample,
  },
  greeting: "Hi, I'm Maleti. I carry all your clients' details. Who are we invoicing?",
};
