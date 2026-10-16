import { accessoryColor, faceAnchors, type Outfit } from "../engine/accessories";
import { faceColor, standardFace } from "../engine/face";
import { floor } from "../engine/ground";
import { inkAt, textWidth } from "../engine/pixelfont";
import { boxShade, hex, palette, sdRoundRect, type Vec } from "../engine/pixels";
import type { Pose } from "../engine/pose";
import type { CharacterDef } from "./types";

/**
 * A modern electronic cash register, seen from the front: light grey case with
 * a navy top, a receipt printing out on the left, a customer display on a pole
 * on the right, colour keys either side of the face and the cash drawer below.
 */
const CASE = palette("#6d7480", "#c3c8d0", "#e3e6ea", "#f2f4f6", "#ffffff");
const NAVY = palette("#0b1433", "#16245a", "#1e2f6e", "#2f4590", "#4c64b0");
const DRAWER = palette("#7a808a", "#cfd3da", "#eceef1", "#f7f8f9", "#ffffff");
const CHROME = palette("#3b3f48", "#7d8590", "#b4bcc6", "#dde3ea", "#ffffff");
const RECESS = hex("#070b1c");
const PAPER = hex("#fdfdfb");
const PRINT = hex("#9aa0aa");
const SCREEN = hex("#10261a");
const DIGIT = hex("#6cf08a");
const TRAY = hex("#4a505a");
const COIN = hex("#e0b63a");
const KEY_COLORS = {
  pink: palette("#7a2c3c", "#d06a80", "#f28da0", "#f8b4c2", "#ffe0e7"),
  yellow: palette("#6e5a10", "#c9ad2a", "#f2d64b", "#f8e88a", "#fff8c8"),
  green: palette("#1f5a24", "#3f9a46", "#52b85a", "#86d48c", "#c4efc7"),
  blue: palette("#10265e", "#2a54b0", "#3a6fd0", "#76a0ea", "#c0d4f8"),
};

const BODY = { x0: -1, y0: 30, x1: 49, y1: 58 };
const TOP = { x0: 1, y0: 19, x1: 47, y1: 32 };
const DRAWER_BOX = { x0: -5, y0: 57, x1: 53, y1: 70 };

const FACE = standardFace({ x: 24, y: 45 }, { lid: CASE.light, mouth: { x: 24, y: 54, w: 3 } });
const ANCHORS = faceAnchors(FACE, { top: { x: 24, y: 19 }, width: 18 });

/** What the customer display shows: 0 at rest, running totals while talking, the amount when ringing up. */
function readout(pose: Pose): string {
  if (pose.action > 0.3) return "120€";
  if (pose.mouthOpen > 0 || pose.mouth === "o") return String((Math.floor(pose.time * 5) * 613) % 9999);
  return "0";
}

/** The customer display: a white head on a short pole, top right. */
function pole(p: Vec, pose: Pose): number {
  const head = sdRoundRect(p, 25, 3, 51, 12.5, 3);
  if (head <= 1) {
    const screen = sdRoundRect(p, 27.5, 5, 48.5, 10.5, 0.5);
    if (screen <= 0) {
      const text = readout(pose);
      return inkAt(p, text, { x: 47 - textWidth(text), y: 5.5 }) ? DIGIT : SCREEN;
    }
    return boxShade(p, head, 25, 3, 51, 12.5, CASE);
  }
  const stem = sdRoundRect(p, 36.5, 11, 40, 20, 0.5);
  return stem <= 1 ? boxShade(p, stem, 36.5, 11, 40, 20, CASE) : 0;
}

/** The receipt sticking out of the printer, top left; it grows as a sale rings up. */
function receipt(p: Vec, pose: Pose): number {
  const top = 11 - Math.round(pose.action * 6);
  const sd = sdRoundRect(p, 5.5, top, 16.5, 27, 0.3);
  if (sd > 1) return 0;
  if (sd > 0) return PRINT;
  const row = Math.floor(p.y - top);
  return row > 1 && row % 2 === 0 && p.x > 7 && p.x < 15 - (row % 4) ? PRINT : PAPER;
}

/** Colour keys in two columns, either side of the face. */
function keys(p: Vec): number {
  const layout: [number, number, keyof typeof KEY_COLORS][] = [
    [0.5, 35, "pink"], [0.5, 41, "pink"], [0.5, 47, "yellow"],
    [40.5, 35, "green"], [40.5, 41, "blue"], [40.5, 47, "blue"],
  ];
  for (const [x0, y0, color] of layout) {
    const sd = sdRoundRect(p, x0, y0, x0 + 7, y0 + 4.5, 1);
    if (sd <= 1) return boxShade(p, sd, x0, y0, x0 + 7, y0 + 4.5, KEY_COLORS[color]);
  }
  return 0;
}

/** The cash drawer: slides out (down, seen from the front) to show the coins. */
function drawer(p: Vec, pose: Pose): number {
  const out = Math.round(pose.action * 5);
  const { x0, y0, x1, y1 } = DRAWER_BOX;
  const front = sdRoundRect(p, x0, y0 + out, x1, y1 + out, 2);
  if (front <= 1) {
    if (Math.hypot(p.x - 24, p.y - (y0 + out + 6.5)) < 1.6) return CHROME.mid;
    const panel = sdRoundRect(p, x0 + 5, y0 + out + 2.5, x1 - 5, y1 + out - 2, 1);
    if (panel <= 0 && panel > -1) return DRAWER.dark;
    return boxShade(p, front, x0, y0 + out, x1, y1 + out, DRAWER);
  }
  if (out > 0 && p.y >= y0 && p.y < y0 + out && p.x > x0 + 2 && p.x < x1 - 2) {
    return Math.floor(p.x / 3) % 2 === 0 && p.y > y0 + 0.5 ? COIN : TRAY;
  }
  return 0;
}

function sample(p: Vec, pose: Pose, outfit: Outfit): number {
  const extra = accessoryColor(p, outfit, ANCHORS) || faceColor(p, FACE, pose);
  if (extra) return extra;

  const front = pole(p, pose) || keys(p);
  if (front) return front;

  const top = sdRoundRect(p, TOP.x0, TOP.y0, TOP.x1, TOP.y1, 4);
  if (top <= 1) {
    const paper = receipt(p, pose);
    if (paper) return paper;
    // The printer slot the receipt comes out of, and the mode key on the right.
    if (sdRoundRect(p, 4, 22, 18, 29, 1) <= 0) return RECESS;
    if (Math.hypot(p.x - 43, p.y - 26) < 1.6) return CHROME.mid;
    return boxShade(p, top, TOP.x0, TOP.y0, TOP.x1, TOP.y1, NAVY);
  }
  const paper = receipt(p, pose);
  if (paper) return paper;

  const body = sdRoundRect(p, BODY.x0, BODY.y0, BODY.x1, BODY.y1, 4);
  if (body <= 1) return boxShade(p, body, BODY.x0, BODY.y0, BODY.x1, BODY.y1, CASE);
  return drawer(p, pose);
}

export const regi: CharacterDef = {
  id: "regi",
  name: "Regi",
  kind: "Cash register",
  actionLabel: "Ring up",
  art: {
    pivot: { x: 24, y: 70 },
    gaze: { x: 24, y: 45 },
    ground: floor({ x: 24, y: 70.5 }, 30, 3),
    anchors: () => ANCHORS,
    sample,
  },
  greeting: "Hi, I'm Regi. When an invoice gets paid, I go cha-ching. Anything to log?",
};
