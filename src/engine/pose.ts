import type { Vec } from "./pixels";

export type MouthShape = "smile" | "grin" | "o" | "flat" | "sad";

/** A symbol floating over the head. */
export type Mark = "question" | "exclaim" | "heart" | "anger" | "thought";

/** Everything a character needs to draw one frame. */
export interface Pose {
  /** Seconds, for looping details such as flapping wings. */
  time: number;
  /** Pixels the whole figure is lifted. */
  lift: number;
  /** Pixels the figure leans sideways. */
  shiftX: number;
  /** Radians, positive leans right. */
  tilt: number;
  /** Vertical scale; < 1 squashes, > 1 stretches. */
  squash: number;
  /** Where the pupils point, each axis in -1..1. */
  look: Vec;
  /** Lids: 0 open → 1 closed. */
  blinkLeft: number;
  blinkRight: number;
  /** Eye size multiplier: > 1 for surprise. */
  eyeScale: number;
  /** Closed, smiling ^ ^ eyes. */
  happy: boolean;
  /** Eyebrow lift in pixels; negative lowers them. */
  browLeft: number;
  browRight: number;
  /** Brow angle: 1 angry (inner ends down), -1 worried (inner ends up). */
  frown: number;
  /** Pupil size multiplier: < 1 for fright. */
  pupilScale: number;
  /** Heart-shaped pupils. */
  hearts: boolean;
  /** 0 closed → 1 wide open. */
  mouthOpen: number;
  mouth: MouthShape;
  /** The character's signature move, 0 → 1 → 0 (stamp, print, staple, open...). */
  action: number;
  /** Phase of the floating "z z" while asleep, or null when awake. */
  sleep: number | null;
  mark: Mark | null;
  /** Facing: 1 normal, -1 mirrored; passing through 0 turns it side-on (a spin). */
  turn: number;
  /** Extra size: < 1 shrinks, as when walking away through a door. */
  depth: number;
  /** A door beside the character (canvas x of its centre), growing in and swinging open. */
  door: { x: number; appear: number; open: number } | null;
  /** 0 in front of the door → 1 through it: only what is inside the doorway shows. */
  through: number;
  /** Disco: 0 off → 1 mirror ball down and lights sweeping. */
  disco: number;
  /** Nothing drawn at all: the character has left. */
  hidden: boolean;
}

export function restPose(time: number): Pose {
  return {
    time,
    lift: 0,
    shiftX: 0,
    tilt: 0,
    squash: 1,
    look: { x: 0, y: 0 },
    blinkLeft: 0,
    blinkRight: 0,
    eyeScale: 1,
    happy: false,
    browLeft: 0,
    browRight: 0,
    frown: 0,
    pupilScale: 1,
    hearts: false,
    mouthOpen: 0,
    mouth: "smile",
    action: 0,
    sleep: null,
    mark: null,
    turn: 1,
    depth: 1,
    door: null,
    through: 0,
    disco: 0,
    hidden: false,
  };
}
