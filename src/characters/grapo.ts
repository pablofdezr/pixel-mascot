import { accessoryColor, faceAnchors, type Anchors, type Outfit } from "../engine/accessories.ts";
import { faceColor, standardFace } from "../engine/face.ts";
import { floor } from "../engine/ground.ts";
import { ballShade, boxShade, hex, palette, rotate, sdRoundRect, type Vec } from "../engine/pixels.ts";
import type { Pose } from "../engine/pose.ts";
import type { CharacterDef } from "./types.ts";

const RED = palette("#4f1214", "#a52a2a", "#d64541", "#f07a6e", "#ffc4b8");
const BLACK = palette("#0c0c10", "#1d1d24", "#2f2f38", "#4a4a56", "#6c6c7a");
const CHROME = palette("#3b3f48", "#7d8590", "#b4bcc6", "#dde3ea", "#ffffff");
const MOUTH = hex("#3a1216");
const STAPLES = hex("#f2f4f8");

/** The arm swings open around the hinge at the back. */
const HINGE = { x: -1.5, y: 52.5 };

const SCALE = 1.25;

/** Seen from the side, facing right; the eyes pop up over the arm. */
const FACE = standardFace({ x: 41, y: 48.5 }, { lid: RED.light, size: 1 / SCALE });

const ARM_ANCHORS: Anchors = faceAnchors(FACE, { top: { x: 41, y: 34 }, width: 14 }, 37);

/** Talking and stapling open the jaw; negative turns the front upwards. */
function jaw(pose: Pose): number {
  const talk = Math.max(pose.mouthOpen, pose.mouth === "o" ? 0.6 : pose.mouth === "grin" ? 0.4 : 0);
  return -(talk * 0.12 + pose.action * 0.34);
}

function anchors(pose: Pose): Anchors {
  const angle = jaw(pose);
  const turn = (v: Vec) => rotate(v, HINGE, angle);
  return {
    ...ARM_ANCHORS,
    headTop: turn(ARM_ANCHORS.headTop),
    eyes: [turn(FACE.eyes[0]), turn(FACE.eyes[1])],
    neck: turn(ARM_ANCHORS.neck),
  };
}

function sample(p: Vec, pose: Pose, outfit: Outfit): number {
  const hinge = ballShade(p, HINGE, 3.2, CHROME);
  if (hinge) return hinge;

  // Everything on the arm is drawn in the arm's own, rotated frame.
  const q = rotate(p, HINGE, -jaw(pose));
  const onArm = accessoryColor(q, outfit, ARM_ANCHORS) || faceColor(q, FACE, pose);
  if (onArm) return onArm;

  // A long, low stapler: the arm runs the full length of the base.
  const strip = sdRoundRect(q, -1, 42.3, 51, 45.3, 1.5);
  if (strip <= 1) return boxShade(q, strip, -1, 42.3, 51, 45.3, CHROME);
  const arm = sdRoundRect(q, -4, 44, 54, 56.5, 4.5);
  if (arm <= 1) return boxShade(q, arm, -4, 44, 54, 56.5, RED);
  // A row of staples under the front of the arm: its teeth.
  if (q.y > 56.5 && q.y < 58.2 && q.x > 35 && q.x < 52 && Math.floor(q.x) % 3 !== 0) return STAPLES;

  const anvil = sdRoundRect(p, 41, 55.3, 51, 57, 0.8);
  if (anvil <= 1) return boxShade(p, anvil, 41, 55.3, 51, 57, CHROME);
  const base = sdRoundRect(p, -6, 56.5, 54, 62.5, 2);
  if (base <= 1) return boxShade(p, base, -6, 56.5, 54, 62.5, BLACK);

  // The gap between arm and base, once the jaw opens.
  if (p.y < 56.5 && q.y > 56.5 && q.x < 53.5 && p.x > 1 && p.x < 54) return MOUTH;
  return 0;
}

export const grapo: CharacterDef = {
  id: "grapo",
  name: "Grapo",
  kind: "Stapler",
  actionLabel: "Staple",
  art: {
    pivot: { x: 24, y: 62 },
    scale: SCALE,
    gaze: { x: 41, y: 48.5 },
    ground: floor({ x: 24, y: 62.5 }, 39, 3.5),
    anchors,
    sample,
  },
  greeting: "Hi, I'm Grapo. Every invoice gets stapled to its receipt. What do you need?",
};
