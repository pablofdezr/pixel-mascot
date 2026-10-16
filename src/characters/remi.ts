import { accessoryColor, faceAnchors, type Anchors, type Outfit } from "../engine/accessories";
import { faceColor, standardFace } from "../engine/face";
import { floor } from "../engine/ground";
import { boxShade, distanceToSegment, hex, palette, sdRoundRect, sdTriangle, type Vec } from "../engine/pixels";
import type { Pose } from "../engine/pose";
import type { CharacterDef } from "./types";

const PAPER = palette("#7b6f58", "#d9cfb5", "#f7f1e3", "#fffaf0", "#ffffff");
const FLAP = hex("#efe6cf");
const FLAP_INSIDE = hex("#cbbf9f");
const FOLD = hex("#d2c7aa");
const LETTER = hex("#ffffff");
const LETTER_LINE = hex("#c5cad4");
const LETTER_TOTAL = hex("#d9443a");
const STAMP = hex("#d9443a");
const STAMP_EDGE = hex("#ffffff");
const WING = palette("#8a8f9c", "#c9ced8", "#eef1f6", "#ffffff", "#ffffff");

// A long envelope, about 2:1 like a DL envelope.
const BODY = { x0: -6, y0: 30, x1: 54, y1: 60 };
const FLAP_TIP = 47;

const SCALE = 1.15;

const FACE = standardFace({ x: 24, y: 46.5 }, { lid: hex("#ece2c8"), mouth: { x: 24, y: 56.5, w: 2.6 }, size: 1 / SCALE });

const ANCHORS: Anchors = faceAnchors(FACE, { top: { x: 24, y: 30 }, width: 18 });

/** 0 sealed → 1 flap fully open with the invoice peeking out. */
const opening = (pose: Pose) => Math.max(pose.action, pose.mouthOpen * 0.3, pose.mouth === "o" ? 0.25 : 0);

function wing(p: Vec, side: -1 | 1, pose: Pose): number {
  // Two-frame flap, fast while flying.
  const up = Math.sin(pose.time * 11) > 0;
  const c = { x: 24 + side * 33, y: up ? 39 : 43 };
  const tip = { x: c.x + side * 4, y: up ? c.y - 4 : c.y + 1 };
  const sd = sdTriangle(p, { x: c.x - side * 3, y: c.y - 2 }, { x: c.x - side * 3, y: c.y + 3 }, tip);
  if (sd > 1) return 0;
  if (sd > 0) return WING.line;
  return Math.floor(p.y) % 2 === 0 ? WING.mid : WING.light;
}

function sample(p: Vec, pose: Pose, outfit: Outfit): number {
  const extra = accessoryColor(p, outfit, ANCHORS) || faceColor(p, FACE, pose);
  if (extra) return extra;

  const open = opening(pose);
  const tipY = FLAP_TIP - open * 36;
  const flap = sdTriangle(p, { x: BODY.x0, y: BODY.y0 }, { x: BODY.x1, y: BODY.y0 }, { x: 24, y: tipY });

  // A postage stamp in the corner, perforated edge and all.
  const stamp = sdRoundRect(p, 44, 33, 50.5, 40, 0.3);
  if (stamp <= 0) return stamp > -1 ? (Math.floor(p.x + p.y) % 2 ? STAMP_EDGE : STAMP) : STAMP;

  // Sealed: the flap folds down over the front.
  if (tipY > BODY.y0) {
    if (flap <= 0) return flap > -1 ? PAPER.line : FLAP;
  }

  const body = sdRoundRect(p, BODY.x0, BODY.y0, BODY.x1, BODY.y1, 2);
  if (body <= 0 && body > -1) return PAPER.line;
  if (body <= 0) {
    const fold = Math.min(
      distanceToSegment(p, { x: BODY.x0, y: BODY.y1 }, { x: 20, y: 46 }),
      distanceToSegment(p, { x: BODY.x1, y: BODY.y1 }, { x: 28, y: 46 }),
    );
    if (fold < 0.55) return FOLD;
    return boxShade(p, body, BODY.x0, BODY.y0, BODY.x1, BODY.y1, PAPER);
  }
  if (body <= 1) return PAPER.line;

  // Open: the invoice rises out of the pocket, in front of the raised flap.
  const rise = open * 12;
  const letterTop = 33 - rise;
  const letter = sdRoundRect(p, 0, letterTop, 48, 44, 0.5);
  if (open > 0.05 && letter <= 1) {
    if (letter > 0) return PAPER.line;
    const row = Math.floor(p.y - letterTop);
    if (row === 2 || row === 4) return p.x > 4 && p.x < 30 ? LETTER_LINE : LETTER;
    if (row === 6 && p.x > 34 && p.x < 44) return LETTER_TOTAL;
    return LETTER;
  }

  if (tipY <= BODY.y0 && flap <= 1) return flap > 0 ? PAPER.line : FLAP_INSIDE;

  return wing(p, -1, pose) || wing(p, 1, pose);
}

export const remi: CharacterDef = {
  id: "remi",
  name: "Remi",
  kind: "Envelope with wings",
  actionLabel: "Open up",
  floats: true,
  art: {
    pivot: { x: 24, y: 60 },
    scale: SCALE,
    gaze: { x: 24, y: 46.5 },
    ground: floor({ x: 24, y: 68 }, 28, 2.8),
    anchors: () => ANCHORS,
    sample,
  },
  greeting: "Hi, I'm Remi. I get your invoices where they need to go. Sending something?",
};
