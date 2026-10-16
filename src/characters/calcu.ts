import { accessoryColor, faceAnchors, type Anchors, type Outfit } from "../engine/accessories.ts";
import { faceColor, standardFace } from "../engine/face.ts";
import { floor } from "../engine/ground.ts";
import { inkAt, textWidth } from "../engine/pixelfont.ts";
import { boxShade, hex, palette, sdRoundRect, type Vec } from "../engine/pixels.ts";
import type { Pose } from "../engine/pose.ts";
import type { CharacterDef } from "./types.ts";

const BODY = palette("#5e5848", "#b9b19c", "#d9d3c3", "#ece7da", "#fbf9f2");
const KEY = palette("#4a4a52", "#8d8f99", "#c9ccd6", "#e4e6ee", "#ffffff");
const OPERATOR = palette("#7a3d0a", "#c96f1f", "#f29f3d", "#f8c17e", "#ffe2bd");
const KEY_DOWN = hex("#7d808c");
const LCD_FRAME = hex("#3a3a42");
const LCD = hex("#a9b98f");
const LCD_SHADE = hex("#97a87d");
const DIGIT = hex("#26301c");

const SHELL = { x0: 6, y0: 7, x1: 42, y1: 64 };
const SCREEN = { x0: 10, y0: 11, x1: 38, y1: 21 };

const FACE = standardFace({ x: 24, y: 35 }, { lid: BODY.light, mouth: { x: 24, y: 46, w: 3 } });

const ANCHORS: Anchors = faceAnchors(FACE, { top: { x: 24, y: 7 }, width: 18 });

/** What the screen shows: 0 at rest, running figures while talking, the VAT rate while calculating. */
function readout(pose: Pose): string {
  if (pose.action > 0.3) return "21%";
  if (pose.mouthOpen > 0 || pose.mouth === "o") return String((Math.floor(pose.time * 6) * 7919) % 99999);
  return "0";
}

function screen(p: Vec, pose: Pose): number {
  const { x0, y0, x1, y1 } = SCREEN;
  const frame = sdRoundRect(p, x0, y0, x1, y1, 1.5);
  if (frame > 1) return 0;
  if (frame > -1) return LCD_FRAME;

  // Digits right-aligned.
  const text = readout(pose);
  if (inkAt(p, text, { x: x1 - 2 - textWidth(text), y: y0 + 2.5 })) return DIGIT;
  return p.y < y0 + 2 ? LCD_SHADE : LCD;
}

/** A 4×3 keypad; the right column is orange operators. One key goes down while it works. */
function keypad(p: Vec, pose: Pose): number {
  const busy = pose.mouthOpen > 0 || pose.action > 0;
  const pressed = busy ? Math.floor(pose.time * 8) % 12 : -1;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const x0 = 9.5 + col * 7.6;
      const y0 = 50 + row * 4.6;
      const sd = sdRoundRect(p, x0, y0, x0 + 5.6, y0 + 3.4, 1);
      if (sd > 1) continue;
      if (row * 4 + col === pressed && sd <= 0) return KEY_DOWN;
      return boxShade(p, sd, x0, y0, x0 + 5.6, y0 + 3.4, col === 3 ? OPERATOR : KEY);
    }
  }
  return 0;
}

function sample(p: Vec, pose: Pose, outfit: Outfit): number {
  const extra = accessoryColor(p, outfit, ANCHORS) || faceColor(p, FACE, pose);
  if (extra) return extra;
  const shell = sdRoundRect(p, SHELL.x0, SHELL.y0, SHELL.x1, SHELL.y1, 4);
  if (shell > 1) return 0;
  return screen(p, pose) || keypad(p, pose) || boxShade(p, shell, SHELL.x0, SHELL.y0, SHELL.x1, SHELL.y1, BODY);
}

export const calcu: CharacterDef = {
  id: "calcu",
  name: "Calcu",
  kind: "Calculator",
  actionLabel: "Calculate",
  art: {
    pivot: { x: 24, y: 64 },
    gaze: { x: 24, y: 35 },
    ground: floor({ x: 24, y: 64.5 }, 20, 3),
    anchors: () => ANCHORS,
    sample,
  },
  greeting: "Hi, I'm Calcu. Bases, VAT, withholding: you bring the numbers, I do the sums.",
};
