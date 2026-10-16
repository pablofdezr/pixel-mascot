import { accessoryColor, faceAnchors, type Anchors } from "../engine/accessories";
import { faceColor, standardFace } from "../engine/face";
import { sheet } from "../engine/ground";
import { ballShade, boxShade, hex, palette, sdRoundRect, tone, type Vec } from "../engine/pixels";
import type { CharacterDef } from "./types";

// A glossy black plastic handle on a red, wide rectangular stamp.
const PLASTIC = palette("#08080b", "#18181e", "#2b2b34", "#4f4f60", "#a6a6bd");
const LACQUER = palette("#4a1512", "#a32b24", "#d9443a", "#ef7a62", "#ffc2b0");
const RUBBER_LINE = hex("#120d0d");
const RUBBER = hex("#3a3030");
const RUBBER_DARK = hex("#241c1c");

const KNOB = { x: 24, y: 16 };
const BLOCK = { x0: 1, y0: 35, x1: 47, y1: 58 };

const FACE = standardFace({ x: 24, y: 45 }, { lid: LACQUER.light, mouth: { x: 24, y: 54.5, w: 3 } });

const ANCHORS: Anchors = faceAnchors(FACE, { top: { x: 24, y: 9 }, width: 14 });

function body(p: Vec): number {
  const { x0, y0, x1, y1 } = BLOCK;
  const block = sdRoundRect(p, x0, y0, x1, y1, 3);
  if (block <= 1) return boxShade(p, block, x0, y0, x1, y1, LACQUER);

  const rubber = sdRoundRect(p, x0 + 1.5, y1 - 0.5, x1 - 1.5, y1 + 5.5, 1.5);
  if (rubber <= 0) return p.y > y1 + 3.5 ? RUBBER_DARK : RUBBER;
  if (rubber <= 1) return RUBBER_LINE;

  const knob = ballShade(p, KNOB, 7, PLASTIC);
  if (knob) return knob;

  // The neck is a plastic cylinder: lit on the left, shaded on the right.
  const neck = sdRoundRect(p, 21, 22, 27, y0 + 1, 1.5);
  if (neck > 1) return 0;
  if (neck > 0) return PLASTIC.line;
  return tone(PLASTIC, -((p.x - 24) / 3) * 0.8);
}

const RED_INK = hex("#d9443a");

export const pum: CharacterDef = {
  id: "pum",
  name: "Pum",
  kind: "Rubber stamp",
  actionLabel: "Stamp",
  slams: true,
  art: {
    pivot: { x: 24, y: 63.5 },
    gaze: { x: 24, y: 45 },
    // A white invoice under him, already stamped once in the corner.
    ground: sheet({
      corners: [
        { x: 18, y: 30 },
        { x: 70, y: 22 },
        { x: 52, y: 79 },
        { x: -10, y: 87 },
      ],
      paper: "#fdfdfb",
      paperShade: "#eeeee8",
      edge: "#8e8e86",
      shadow: "#d4d4cc",
      rules: { count: 9, color: "#cfd3dc", from: 0.16, to: 0.74, inset: 0.08 },
      marks: (draw) => {
        const header = hex("#5b6170");
        for (let u = 0.08; u <= 0.46; u += 0.004) for (let v = 0.06; v <= 0.11; v += 0.004) draw(u, v, header);
        // The imprint: a red frame with two lines of "text".
        for (let i = 0; i <= 1; i += 0.004) {
          draw(0.06 + i * 0.3, 0.8, RED_INK);
          draw(0.06 + i * 0.3, 0.95, RED_INK);
          draw(0.06, 0.8 + i * 0.15, RED_INK);
          draw(0.36, 0.8 + i * 0.15, RED_INK);
          draw(0.1 + i * 0.22, 0.86, RED_INK);
          draw(0.12 + i * 0.16, 0.9, RED_INK);
        }
      },
    }),
    anchors: () => ANCHORS,
    sample: (p, pose, outfit) => accessoryColor(p, outfit, ANCHORS) || faceColor(p, FACE, pose) || body(p),
  },
  greeting: "Hi, I'm Pum. Looks like you're making an invoice. Want a hand?",
};
