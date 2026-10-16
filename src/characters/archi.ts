import { accessoryColor, faceAnchors, type Anchors, type Outfit } from "../engine/accessories";
import { faceColor, standardFace } from "../engine/face";
import { floor } from "../engine/ground";
import { boxShade, hex, palette, sdRoundRect, type Vec } from "../engine/pixels";
import type { Pose } from "../engine/pose";
import type { CharacterDef } from "./types";

const FRONT = palette("#6b5a2e", "#c9a85c", "#e6c97c", "#f3dc9a", "#fff0c4");
const BACK = palette("#5c4b24", "#b39348", "#d4b468", "#e3c784", "#f6e3ae");
const SHEET = palette("#8e8e86", "#e4e4dc", "#fdfdfb", "#ffffff", "#ffffff");
const SHEET_LINE = hex("#c5cad4");
const SHEET_TOTAL = hex("#d9443a");
const TAB_TEXT = hex("#8a7438");

/** Front panel, and the taller back panel with its tab behind it. */
const FRONT_PANEL = { x0: -5, y0: 28, x1: 53, y1: 68 };
const BACK_PANEL = { x0: -4, y0: 22, x1: 52, y1: 66 };
const TAB = { x0: -2, y0: 16.5, x1: 14, y1: 24 };

const FACE = standardFace({ x: 24, y: 43 }, { lid: FRONT.light, mouth: { x: 24, y: 54.5, w: 3 } });

const ANCHORS: Anchors = faceAnchors(FACE, { top: { x: 24, y: 22 }, width: 20 });

/** Papers peeking out of the top; filing pushes an invoice right up out of the folder. */
function papers(p: Vec, pose: Pose): number {
  const jiggle = pose.mouthOpen > 0 ? 1 : 0;
  const sheets = [
    { x0: 0, rise: 2 + jiggle, invoice: false },
    { x0: 8, rise: 4 + pose.action * 14, invoice: true },
  ];
  for (const s of sheets) {
    const top = FRONT_PANEL.y0 - 1 - s.rise;
    const sd = sdRoundRect(p, s.x0, top, s.x0 + 40, FRONT_PANEL.y0 + 6, 0.5);
    if (sd > 1) continue;
    if (sd > 0) return SHEET.line;
    const row = Math.floor(p.y - top);
    if (s.invoice && row === 7 && p.x > s.x0 + 26 && p.x < s.x0 + 36) return SHEET_TOTAL;
    if ((row === 2 || row === 4) && p.x > s.x0 + 3 && p.x < s.x0 + 28) return SHEET_LINE;
    return SHEET.mid;
  }
  return 0;
}

function sample(p: Vec, pose: Pose, outfit: Outfit): number {
  const extra = accessoryColor(p, outfit, ANCHORS) || faceColor(p, FACE, pose);
  if (extra) return extra;

  const front = sdRoundRect(p, FRONT_PANEL.x0, FRONT_PANEL.y0, FRONT_PANEL.x1, FRONT_PANEL.y1, 2);
  if (front <= 1) return boxShade(p, front, FRONT_PANEL.x0, FRONT_PANEL.y0, FRONT_PANEL.x1, FRONT_PANEL.y1, FRONT);

  const paper = papers(p, pose);
  if (paper) return paper;

  const tab = sdRoundRect(p, TAB.x0, TAB.y0, TAB.x1, TAB.y1, 2);
  if (tab <= 0 && Math.floor(p.y) === 19 && p.x > TAB.x0 + 3 && p.x < TAB.x1 - 4) return TAB_TEXT;
  const back = Math.min(tab, sdRoundRect(p, BACK_PANEL.x0, BACK_PANEL.y0, BACK_PANEL.x1, BACK_PANEL.y1, 2));
  return back <= 1 ? boxShade(p, back, BACK_PANEL.x0, TAB.y0, BACK_PANEL.x1, BACK_PANEL.y1, BACK) : 0;
}

export const archi: CharacterDef = {
  id: "archi",
  name: "Archi",
  kind: "Ring binder",
  actionLabel: "File it",
  art: {
    pivot: { x: 24, y: 68 },
    gaze: { x: 24, y: 43 },
    ground: floor({ x: 24, y: 68.5 }, 31, 3),
    anchors: () => ANCHORS,
    sample,
  },
  greeting: "Hi, I'm Archi. Whatever you give me, I file by client and by month.",
};
