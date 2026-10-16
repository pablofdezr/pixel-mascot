import { accessoryColor, faceAnchors, type Anchors, type Outfit } from "../engine/accessories.ts";
import { faceColor, standardFace } from "../engine/face.ts";
import { floor } from "../engine/ground.ts";
import { hex, type Vec } from "../engine/pixels.ts";
import type { Pose } from "../engine/pose.ts";
import type { CharacterDef } from "./types.ts";

const PAPER_LINE = hex("#6f6f68");
const PAPER = hex("#fbfbf6");
const PAPER_LIGHT = hex("#ffffff");
const PAPER_SHADE = hex("#e4e4dc");
const PRINT = hex("#8a8a84");
const PRINT_FAINT = hex("#b9b9b1");

const STRIP = { x0: 10, x1: 38, bottom: 62 };

/** Torn edges: a 4px zigzag, 0..2px deep. */
const tear = (x: number) => Math.abs((((x - STRIP.x0) % 4) + 4) % 4 - 2);
const bottomAt = (x: number) => STRIP.bottom + tear(x);

/** Printing makes the receipt grow longer, upwards. */
const stripTop = (pose: Pose) => 9 - Math.round(pose.action * 6);
const topAt = (x: number, pose: Pose) => stripTop(pose) + tear(x) - 2;

/**
 * The paper ripples sideways in an S as it goes down, swaying gently. The base
 * stays put so it keeps standing on the floor.
 */
const WAVE = 2.6;
const wavePhase = (y: number, pose: Pose) => ((STRIP.bottom - y) / 52) * Math.PI * 2 + Math.sin(pose.time * 1.3) * 0.5;
const waveAt = (y: number, pose: Pose) => Math.sin(wavePhase(y, pose)) * WAVE * Math.min(1, (STRIP.bottom - y) / 10);

/** Undo the ripple: everything on the receipt is drawn as if it were flat. */
const unwave = (p: Vec, pose: Pose): Vec => ({ x: p.x - waveAt(p.y, pose), y: p.y });

const FACE = standardFace({ x: 24, y: 25 }, { lid: hex("#e8e8e0"), mouth: { x: 24, y: 37.5, w: 2.8 } });

const ANCHORS = (pose: Pose): Anchors => faceAnchors(FACE, { top: { x: 24, y: stripTop(pose) - 1 }, width: 20 });

/** Where things are on screen, ripple included (for the floating "z z"). */
const anchors = (pose: Pose): Anchors => {
  const flat = ANCHORS(pose);
  return { ...flat, headTop: { x: flat.headTop.x + waveAt(flat.headTop.y, pose), y: flat.headTop.y } };
};

/** Printed receipt lines on the lower half: a separator, two items and the total. */
function printed(p: Vec): number {
  const x = Math.floor(p.x);
  const y = Math.floor(p.y);
  if (x < 13 || x > 35) return 0;
  if (y === 43) return x % 2 === 0 ? PRINT_FAINT : 0;
  if (y === 46 || y === 49) return (x <= 26 && (x * 7 + y) % 5 !== 0) || x >= 31 ? PRINT : 0;
  if (y === 53 || y === 54) return x <= 19 || x >= 29 ? PRINT : 0;
  return 0;
}

function body(p: Vec, pose: Pose): number {
  const inStrip = (grow: number) =>
    p.x >= STRIP.x0 - grow && p.x <= STRIP.x1 + grow && p.y >= topAt(p.x, pose) - grow && p.y <= bottomAt(p.x) + grow;

  if (inStrip(0)) {
    const ink = printed(p);
    if (ink) return ink;
    if (p.x > STRIP.x1 - 2.5) return PAPER_SHADE;
    if (p.x < STRIP.x0 + 1.5) return PAPER_LIGHT;
    // Where the ripple bends away from the light the paper dims.
    return Math.cos(wavePhase(p.y, pose)) < -0.55 ? PAPER_SHADE : PAPER;
  }
  return inStrip(1) ? PAPER_LINE : 0;
}

function sample(screen: Vec, pose: Pose, outfit: Outfit): number {
  const p = unwave(screen, pose);
  return accessoryColor(p, outfit, ANCHORS(pose)) || faceColor(p, FACE, pose) || body(p, pose);
}

export const tiqui: CharacterDef = {
  id: "tiqui",
  name: "Tiqui",
  kind: "Till receipt",
  actionLabel: "Print",
  art: {
    pivot: { x: 24, y: 62 },
    gaze: { x: 24, y: 25 },
    ground: floor({ x: 24, y: 63 }, 18, 3),
    anchors,
    sample,
  },
  greeting: "Hi, I'm Tiqui. Every invoice you make, I print with care. What do you need?",
};
