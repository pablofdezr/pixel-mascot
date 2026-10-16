import type { CharacterDef } from "./characters/types";
import { NO_OUTFIT, type Outfit } from "./engine/accessories";
import { CANVAS_H, CANVAS_W, ORIGIN } from "./engine/canvas";
import { restPose, type Pose } from "./engine/pose";
import { renderFrame, toCanvas } from "./engine/render";

export type Mood =
  | "idle"
  | "attentive"
  | "thinking"
  | "talking"
  | "sleeping"
  /** Files are being dragged somewhere on the page. */
  | "eager"
  /** Files are hovering right over this character: mouth wide open. */
  | "hungry"
  /** Busy uploading: repeats its signature move. */
  | "working";

export type Gesture =
  | "hop"
  | "action"
  | "surprise"
  | "wink"
  | "happy"
  | "lookAround"
  | "stretch"
  | "dance"
  | "nod"
  | "shake"
  | "gulp"
  | "angry"
  | "sad"
  | "love"
  | "dizzy"
  | "laugh"
  | "scared"
  | "cool"
  | "celebrate"
  | "confused"
  | "think"
  | "disco"
  | "tickle";

type Point = { x: number; y: number };

// ---------- Disco ----------

const BEAT_MS = 450;
/** One step per beat: two bars of real moves, not just swaying. */
const CHOREOGRAPHY = [
  "stepLeft", "stepRight", "stepLeft", "stepRight",
  "hop", "hop", "spin", "point",
  "shimmy", "shimmy", "moonwalk", "moonwalk",
  "spin", "hop", "point", "bow",
] as const;
type Move = (typeof CHOREOGRAPHY)[number];

const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

/** Shapes the pose for one dance move, f = progress through its beat. */
function dance(move: Move, f: number, pose: Pose): Point | void {
  const down = f < 0.15;
  switch (move) {
    case "stepLeft":
    case "stepRight": {
      const side = move === "stepLeft" ? -1 : 1;
      pose.shiftX += Math.round(side * 3 * Math.sin(Math.PI * f));
      pose.tilt += side * 0.09;
      pose.squash = down ? 0.9 : 1;
      pose.lift += f > 0.3 && f < 0.7 ? 1 : 0;
      pose.mouth = "grin";
      return { x: side, y: 0 };
    }
    case "hop":
      pose.lift += Math.round(Math.sin(Math.PI * f) * 7);
      pose.squash = down ? 0.86 : 1.06;
      pose.happy = true;
      pose.mouth = "grin";
      return;
    case "spin":
      // A full turn on the spot: facing goes 1 → 0 → -1 → 0 → 1.
      pose.turn = Math.cos(2 * Math.PI * f);
      pose.lift += 2;
      pose.browLeft = pose.browRight = 2;
      return;
    case "point":
      // The disco point: lean back, chin up, eyes on the ball.
      pose.tilt -= 0.16;
      pose.lift += 1;
      pose.browLeft = pose.browRight = 3;
      pose.mouth = "grin";
      return { x: -0.8, y: -1 };
    case "shimmy":
      pose.shiftX += Math.round(Math.sin(f * Math.PI * 8) * 1.5);
      pose.squash = 0.95 + Math.abs(Math.sin(f * Math.PI * 4)) * 0.06;
      pose.happy = true;
      pose.mouth = "grin";
      return;
    case "moonwalk":
      // Gliding backwards while looking the other way.
      pose.shiftX += Math.round(4 - ease(f) * 8);
      pose.squash = 0.97;
      pose.tilt += 0.05;
      return { x: 1, y: 0 };
    case "bow":
      pose.squash = 0.84;
      pose.tilt += 0.1;
      pose.happy = true;
      pose.mouth = "grin";
      return;
  }
}

// ---------- Door ----------

/** Phases of leaving through a door, in ms; coming back plays them in reverse. */
const DOOR_PHASES = { appear: 150, open: 140, walk: 380, through: 250, close: 110, vanish: 110 };
const DOOR_TOTAL = Object.values(DOOR_PHASES).reduce((a, b) => a + b, 0);
/** When the door shuts, for timing its sound: leaving, behind it; coming back, once it is out. */
export const DOOR_SHUT_MS = {
  exit: DOOR_PHASES.appear + DOOR_PHASES.open + DOOR_PHASES.walk + DOOR_PHASES.through,
  enter: DOOR_TOTAL - DOOR_PHASES.appear - DOOR_PHASES.open,
};
/** How far past the door's centre it walks: enough for the widest character to clear the jamb. */
const THROUGH_DISTANCE = 70;

// Pixel art reads better on a reduced frame rate, like a sprite sheet.
const FPS = 15;
const BLINK_MS = 170;
// Left alone this long with nobody moving the pointer, a character dozes off.
const DOZE_MS = 45_000;

/** Gestures played at random while idle, so the characters never freeze. */
const FIDGETS: Gesture[] = [
  "lookAround", "wink", "dance", "stretch", "happy", "action", "surprise", "nod", "hop", "laugh", "confused", "cool", "love",
];

const quantize = (value: number, step: number) => Math.round(value / step) * step;
const random = (min: number, max: number) => min + Math.random() * (max - min);

interface GestureSpec {
  ms: number;
  /** Shapes the pose at progress k (0..1). Returns a gaze override, if any. */
  apply(k: number, pose: Pose, def: CharacterDef): Point | void;
}

const GESTURES: Record<Gesture, GestureSpec> = {
  hop: {
    ms: 560,
    apply(k, pose) {
      const ms = k * 560;
      if (ms < 90) pose.squash = 0.88;
      else if (ms < 450) {
        pose.lift += Math.round(Math.sin((Math.PI * (ms - 90)) / 360) * 8);
        pose.squash = 1.06;
        pose.browLeft = pose.browRight = 2;
      } else pose.squash = 0.9;
    },
  },
  action: {
    ms: 900,
    apply(k, pose, def) {
      if (def.slams) {
        // Wind up, slam down, then spring back: a rubber stamp.
        if (k < 0.35) {
          pose.lift += Math.round((k / 0.35) * 8);
          pose.squash = 1.08;
          pose.browLeft = pose.browRight = 2;
        } else if (k < 0.5) {
          pose.squash = 0.74;
          pose.mouth = "o";
          pose.blinkLeft = pose.blinkRight = 0.5;
        } else {
          pose.squash = 0.74 + ((k - 0.5) / 0.5) * 0.26;
          pose.mouth = "grin";
        }
        return;
      }
      pose.action = quantize(Math.sin(Math.PI * k), 0.125);
      pose.lift += Math.round(Math.sin(Math.PI * k) * 2);
      // Eyebrows waggle in alternation while it happens.
      const beat = Math.floor(k * 8) % 2;
      pose.browLeft = beat ? 3 : 0;
      pose.browRight = beat ? 0 : 3;
      pose.mouth = "grin";
    },
  },
  surprise: {
    ms: 1000,
    apply(k, pose) {
      if (k < 0.12) {
        pose.squash = 0.9;
        return;
      }
      pose.lift += Math.round((1 - k) * 4);
      pose.eyeScale = 1.15;
      pose.browLeft = pose.browRight = 3;
      pose.mouth = "o";
      pose.mark = "exclaim";
      return { x: 0, y: 0 };
    },
  },
  wink: {
    ms: 800,
    apply(k, pose) {
      if (k > 0.15 && k < 0.75) pose.blinkRight = 1;
      pose.browLeft = 2;
      pose.tilt -= 0.06;
      pose.mouth = "grin";
      return { x: 0.3, y: 0.2 };
    },
  },
  happy: {
    ms: 1100,
    apply(k, pose) {
      pose.happy = true;
      pose.mouth = "grin";
      pose.browLeft = pose.browRight = 1;
      pose.lift += Math.round(Math.abs(Math.sin(k * Math.PI * 2)) * 4);
    },
  },
  lookAround: {
    ms: 2000,
    apply(k, pose) {
      if (k < 0.35) {
        pose.shiftX -= 1;
        pose.tilt -= 0.04;
        return { x: -1, y: 0 };
      }
      if (k < 0.45) return { x: 0, y: 0 };
      if (k < 0.8) {
        pose.shiftX += 1;
        pose.tilt += 0.04;
        pose.browRight = 2;
        return { x: 1, y: 0 };
      }
      return { x: 0, y: -0.6 };
    },
  },
  stretch: {
    ms: 1300,
    apply(k, pose) {
      // Up on tiptoes with a big yawn, then settle.
      if (k < 0.55) {
        pose.squash = 1 + Math.sin((k / 0.55) * (Math.PI / 2)) * 0.14;
        pose.mouth = "o";
        pose.mouthOpen = 1;
        pose.blinkLeft = pose.blinkRight = 0.5;
        pose.browLeft = pose.browRight = 2;
      } else if (k < 0.7) {
        pose.squash = 0.9;
      } else {
        pose.blinkLeft = pose.blinkRight = 0.5;
      }
    },
  },
  dance: {
    ms: 1400,
    apply(k, pose) {
      const wave = Math.sin(k * Math.PI * 6);
      pose.tilt += wave * 0.14;
      pose.shiftX += Math.round(wave * 2);
      pose.lift += Math.round(Math.abs(wave) * 2);
      pose.happy = true;
      pose.mouth = "grin";
    },
  },
  nod: {
    ms: 800,
    apply(k, pose) {
      const down = Math.sin(k * Math.PI * 4) > 0;
      pose.squash = down ? 0.92 : 1;
      pose.mouth = "smile";
      pose.browLeft = pose.browRight = 1;
      return { x: 0, y: down ? 0.7 : 0.2 };
    },
  },
  gulp: {
    ms: 750,
    apply(k, pose) {
      // Stretch up with everything open, snap shut, then a satisfied squish.
      if (k < 0.3) {
        pose.squash = 1.12;
        pose.action = 1;
        pose.mouth = "o";
        pose.mouthOpen = 1;
        pose.eyeScale = 1.15;
        pose.browLeft = pose.browRight = 3;
      } else if (k < 0.55) {
        pose.squash = 0.8;
        pose.mouth = "flat";
        pose.blinkLeft = pose.blinkRight = 1;
      } else {
        pose.squash = 0.8 + ((k - 0.55) / 0.45) * 0.2;
        pose.happy = true;
        pose.mouth = "grin";
      }
    },
  },
  angry: {
    ms: 1300,
    apply(k, pose) {
      pose.frown = 1;
      pose.browLeft = pose.browRight = -1;
      pose.eyeScale = 0.92;
      pose.mouth = "flat";
      pose.squash = 0.96;
      pose.shiftX += Math.round(Math.sin(k * Math.PI * 14) * 1);
      pose.mark = "anger";
    },
  },
  sad: {
    ms: 1800,
    apply(_k, pose) {
      pose.frown = -1;
      pose.mouth = "sad";
      pose.blinkLeft = pose.blinkRight = 0.3;
      pose.squash = 0.95;
      pose.tilt += 0.05;
      return { x: -0.2, y: 0.7 };
    },
  },
  love: {
    ms: 1600,
    apply(k, pose) {
      pose.hearts = true;
      pose.mouth = "grin";
      pose.browLeft = pose.browRight = 2;
      pose.lift += Math.round(Math.abs(Math.sin(k * Math.PI * 3)) * 2);
      pose.tilt += Math.sin(k * Math.PI * 2) * 0.05;
      pose.mark = "heart";
      return { x: 0, y: 0 };
    },
  },
  dizzy: {
    ms: 1700,
    apply(k, pose) {
      // Pupils spin, the body wobbles.
      pose.tilt += Math.sin(k * Math.PI * 4) * 0.12;
      pose.shiftX += Math.round(Math.sin(k * Math.PI * 4) * 1.5);
      pose.mouth = "o";
      pose.browLeft = Math.floor(k * 6) % 2 ? 2 : 0;
      pose.browRight = 2 - pose.browLeft;
      return { x: Math.cos(k * Math.PI * 8), y: Math.sin(k * Math.PI * 8) };
    },
  },
  laugh: {
    ms: 1400,
    apply(k, pose) {
      pose.happy = true;
      pose.mouth = "grin";
      pose.browLeft = pose.browRight = 2;
      pose.lift += Math.round(Math.abs(Math.sin(k * Math.PI * 8)) * 2);
      pose.tilt += Math.sin(k * Math.PI * 4) * 0.05;
    },
  },
  scared: {
    ms: 1300,
    apply(k, pose) {
      pose.eyeScale = 1.2;
      pose.pupilScale = 0.55;
      pose.frown = -0.6;
      pose.browLeft = pose.browRight = 3;
      pose.mouth = "o";
      pose.squash = 0.94;
      // Shivering.
      pose.shiftX += Math.floor(k * 40) % 2 ? 1 : -1;
      pose.mark = "exclaim";
    },
  },
  cool: {
    ms: 1600,
    apply(_k, pose) {
      pose.blinkLeft = pose.blinkRight = 0.45;
      pose.browLeft = 1;
      pose.mouth = "smile";
      pose.tilt -= 0.07;
      pose.lift += 1;
      return { x: 0.7, y: 0 };
    },
  },
  celebrate: {
    ms: 1500,
    apply(k, pose) {
      // Two big jumps, landing with a squish.
      const jump = Math.abs(Math.sin(k * Math.PI * 2));
      pose.lift += Math.round(jump * 9);
      pose.squash = jump < 0.15 ? 0.9 : 1.05;
      pose.happy = true;
      pose.mouth = "grin";
      pose.browLeft = pose.browRight = 3;
      pose.tilt += Math.sin(k * Math.PI * 2) * 0.08;
    },
  },
  think: {
    ms: 2200,
    apply(k, pose) {
      // Chin up, one brow raised, lips pressed, a slow sway while it ponders.
      pose.tilt += 0.08 + Math.sin(k * Math.PI * 2) * 0.02;
      pose.browRight = 3;
      pose.browLeft = 0;
      pose.mouth = "flat";
      pose.blinkLeft = pose.blinkRight = 0.2;
      pose.mark = "thought";
      return { x: 0.7, y: -0.8 };
    },
  },
  confused: {
    ms: 1700,
    apply(_k, pose) {
      pose.browLeft = 3;
      pose.browRight = -1;
      pose.tilt += 0.08;
      pose.mouth = "flat";
      pose.mark = "question";
      return { x: -0.6, y: -0.7 };
    },
  },
  tickle: {
    // Short: a quick giggle fit. Few wiggles, so they stay readable at the sprite's 15 fps.
    ms: 650,
    apply(k, pose) {
      // Ramps in fast and settles at the end, so it starts and stops like a real giggle fit.
      const envelope = Math.min(1, k / 0.1) * Math.min(1, (1 - k) / 0.25);
      const squirm = Math.sin(k * Math.PI * 7);
      // Wriggling: leaning side to side, twisting on itself, stretching and scrunching up.
      pose.tilt += squirm * 0.13 * envelope;
      pose.shiftX += Math.round(Math.sin(k * Math.PI * 5) * 2 * envelope);
      pose.squash = 1 + Math.sin(k * Math.PI * 6) * 0.09 * envelope;
      pose.turn = 1 - Math.abs(Math.sin(k * Math.PI * 3)) * 0.28 * envelope;
      pose.lift += Math.round(Math.abs(Math.sin(k * Math.PI * 4)) * 2 * envelope);
      // Laughing: eyes squeezed shut in ^ ^, mouth wide open, brows bouncing.
      pose.happy = true;
      pose.mouth = "grin";
      pose.browLeft = pose.browRight = Math.floor(k * 6) % 2 ? 3 : 1;
    },
  },
  disco: {
    ms: CHOREOGRAPHY.length * BEAT_MS,
    apply(k, pose) {
      // The ball drops in for the first beat and rises away on the last.
      const edge = 1 / CHOREOGRAPHY.length;
      pose.disco = k < edge ? k / edge : k > 1 - edge ? (1 - k) / edge : 1;
      const beat = k * CHOREOGRAPHY.length;
      const move = CHOREOGRAPHY[Math.min(CHOREOGRAPHY.length - 1, Math.floor(beat))];
      // Brows bounce on every beat.
      pose.browLeft = pose.browRight = beat % 1 < 0.2 ? 2 : 0;
      return dance(move, beat % 1, pose);
    },
  },
  shake: {
    ms: 800,
    apply(k, pose) {
      const side = Math.sin(k * Math.PI * 6);
      pose.shiftX += Math.round(side * 2);
      pose.mouth = "flat";
      pose.browLeft = pose.browRight = -1;
      return { x: side, y: 0 };
    },
  },
};

/** Shapes the pose for a resting mood at time t; returns a gaze override, if any. */
export function applyMood(pose: Pose, mood: Mood, t: number): Point | undefined {
  let gaze: Point | undefined;
  switch (mood) {
    case "idle":
      pose.lift = Math.round((Math.sin(t * Math.PI * 0.8) + 1) / 2);
      pose.tilt = Math.sin(t * 0.9) * 0.035;
      break;
    case "attentive":
      pose.lift = 1;
      pose.tilt = -0.05;
      pose.browLeft = pose.browRight = 2;
      pose.eyeScale = 1.06;
      break;
    case "thinking":
      pose.tilt = 0.09 + Math.sin(t * 2.4) * 0.015;
      pose.browRight = 3;
      pose.mouth = "flat";
      pose.mark = "thought";
      gaze = { x: 0.7, y: -0.75 };
      break;
    case "talking": {
      const beat = Math.abs(Math.sin(t * 8));
      pose.lift = Math.round(beat * 1.4);
      pose.tilt = Math.sin(t * 4.5) * 0.045;
      pose.browLeft = pose.browRight = Math.round(beat * 2);
      pose.mouthOpen = quantize(Math.abs(Math.sin(t * 13)), 0.5);
      break;
    }
    case "eager": {
      pose.lift = Math.round(Math.abs(Math.sin(t * 6)) * 2);
      pose.browLeft = pose.browRight = 2;
      pose.eyeScale = 1.08;
      pose.mouth = "grin";
      break;
    }
    case "hungry": {
      // Wide open and bouncing, everything that can open is open.
      pose.lift = 1 + Math.round(Math.abs(Math.sin(t * 9)) * 2);
      pose.squash = 1.05;
      pose.browLeft = pose.browRight = 3;
      pose.eyeScale = 1.16;
      pose.mouth = "o";
      pose.mouthOpen = 1;
      pose.action = 0.75;
      break;
    }
    case "working":
      pose.tilt = Math.sin(t * 3) * 0.03;
      pose.browLeft = pose.browRight = 1;
      pose.mouth = "flat";
      gaze = { x: 0, y: -0.8 };
      break;
    case "sleeping":
      pose.squash = 0.97 + Math.round((Math.sin(t * 1.6) + 1) / 2) * 0.02;
      pose.blinkLeft = pose.blinkRight = 1;
      pose.mouth = Math.sin(t * 1.6) > 0.6 ? "o" : "flat";
      pose.sleep = (t * 0.45) % 1;
      gaze = { x: 0, y: 0.5 };
      break;
  }

  return gaze;
}

/** Every gesture, in the order they are declared. */
export const GESTURE_NAMES = Object.keys(GESTURES) as Gesture[];

/** Every mood a character can hold. */
export const MOODS: Mood[] = ["idle", "attentive", "thinking", "talking", "sleeping", "eager", "hungry", "working"];

/** How long a gesture lasts, in ms. */
export const GESTURE_MS = (name: Gesture) => GESTURES[name].ms;

/**
 * One frame of a gesture at progress k (0..1), with no clock, pointer or
 * randomness: the sprite sheet draws its cells from this. Eyes look straight
 * ahead unless the gesture aims them.
 */
export function gestureFrame(def: CharacterDef, name: Gesture, k: number): Pose {
  const spec = GESTURES[name];
  const pose = restPose(k * (spec.ms / 1000));
  if (def.floats) pose.lift += 3;
  const gaze = spec.apply(k, pose, def);
  pose.look = gaze ?? { x: 0, y: 0 };
  pose.tilt = quantize(pose.tilt, 0.025);
  return pose;
}

/** One frame of a resting mood at time t, for the sprite sheet. */
export function moodFrame(def: CharacterDef, mood: Mood, t: number): Pose {
  const pose = restPose(t);
  const gaze = applyMood(pose, mood, t);
  if (def.floats) pose.lift += (mood === "sleeping" ? 1 : 3) + Math.round(Math.sin(t * 2.2) * 1.5);
  pose.look = gaze ?? { x: 0, y: 0 };
  pose.tilt = quantize(pose.tilt, 0.025);
  return pose;
}

/** Drives one character's pose over time and paints it onto its canvas. */
export class Animator {
  readonly canvas: HTMLCanvasElement;
  outfit: Outfit = { ...NO_OUTFIT };

  private readonly def: CharacterDef;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly image: ImageData;
  private readonly pixels: Uint32Array;
  private readonly layer = new Uint32Array(CANVAS_W * CANVAS_H);

  private mood: Mood = "idle";
  /** Leaving or coming back through a door; while gone, nothing is drawn. */
  private scene: { kind: "exit" | "enter"; start: number; done: () => void } | null = null;
  private gone = false;
  private sleepForced = false;
  private gesture: { name: Gesture; start: number } | null = null;
  private gazeTarget: Point | null = null;
  private pointer: Point | null = null;
  private lastActivity = performance.now();
  private nextFidget = performance.now() + random(4000, 9000);
  private look: Point = { x: 0, y: 0 };
  private nextBlink = 0;
  private blinkStart = -Infinity;
  private lastFrame = 0;
  private raf = 0;
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private readonly track = (e: PointerEvent | DragEvent) => {
    this.pointer = { x: e.clientX, y: e.clientY };
    this.lastActivity = performance.now();
    // Moving the pointer wakes a character that dozed off by itself.
    if (this.mood === "sleeping" && !this.sleepForced) this.wake("surprise");
  };

  constructor(canvas: HTMLCanvasElement, def: CharacterDef) {
    this.canvas = canvas;
    this.def = def;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    this.ctx = canvas.getContext("2d")!;
    this.image = this.ctx.createImageData(CANVAS_W, CANVAS_H);
    this.pixels = new Uint32Array(this.image.data.buffer);

    window.addEventListener("pointermove", this.track);
    // Pointer events stop during a native drag; dragover keeps the eyes on the file.
    window.addEventListener("dragover", this.track);

    this.raf = requestAnimationFrame(this.frame);
  }

  /** Stops drawing and listening; call when the canvas goes away. */
  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("pointermove", this.track);
    window.removeEventListener("dragover", this.track);
  }

  setMood(mood: Mood) {
    if (mood === this.mood) return;
    this.mood = mood;
    this.sleepForced = false;
    this.lastActivity = performance.now();
  }

  sleep() {
    this.mood = "sleeping";
    this.sleepForced = true;
    this.gesture = null;
  }

  /** Walks out through a door that appears beside it; resolves once it is gone. */
  exit(): Promise<void> {
    this.gesture = null;
    return new Promise((done) => (this.scene = { kind: "exit", start: performance.now(), done }));
  }

  /** Comes back in through the door, the exit played in reverse. */
  enter(): Promise<void> {
    this.gone = false;
    this.gesture = null;
    return new Promise((done) => (this.scene = { kind: "enter", start: performance.now(), done }));
  }

  /** Plays a gesture now, waking the character if needed. */
  play(name: Gesture) {
    if (this.scene || this.gone) return;
    if (this.mood === "sleeping") this.setMood("idle");
    this.gesture = { name, start: performance.now() };
    this.lastActivity = performance.now();
  }

  /** Stare at a screen point instead of following the pointer; null releases. */
  gazeAt(point: Point | null) {
    this.gazeTarget = point;
  }

  private wake(gesture: Gesture) {
    this.setMood("idle");
    this.play(gesture);
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    if (document.hidden || now - this.lastFrame < 1000 / FPS) return;
    this.lastFrame = now;

    renderFrame(this.pixels, this.layer, this.def.art, this.pose(now), this.outfit);
    this.ctx.putImageData(this.image, 0, 0);
  };

  private pose(now: number): Pose {
    const t = now / 1000;
    const pose = restPose(t);
    let gaze: Point | void = undefined;

    this.scheduleIdle(now);

    gaze = applyMood(pose, this.mood, t) ?? gaze;

    // Floating characters hover a few pixels up and bob gently.
    if (this.def.floats) pose.lift += (this.mood === "sleeping" ? 1 : 3) + Math.round(Math.sin(t * 2.2) * 1.5);

    if (this.gone) return { ...pose, hidden: true };
    if (this.scene) gaze = this.applyScene(now, pose) ?? gaze;

    if (this.gesture) {
      const spec = GESTURES[this.gesture.name];
      const k = (now - this.gesture.start) / spec.ms;
      if (k >= 1) this.gesture = null;
      else gaze = spec.apply(k, pose, this.def) ?? gaze;
    }

    if (this.mood !== "sleeping" && !pose.happy) {
      const blink = this.updateBlink(now);
      pose.blinkLeft = Math.max(pose.blinkLeft, blink);
      pose.blinkRight = Math.max(pose.blinkRight, blink);
    }
    pose.look = this.updateLook(gaze);

    if (this.reducedMotion.matches) {
      pose.lift = this.def.floats ? 3 : 0;
      pose.shiftX = 0;
      pose.tilt = 0;
      pose.squash = 1;
    }
    // Snap the angle so the sprite steps between poses instead of shimmering.
    pose.tilt = quantize(pose.tilt, 0.025);
    return pose;
  }

  /**
   * Leaving: the door rises from the floor and swings open, the character
   * hops over, steps in shrinking into the light, and the door closes and
   * sinks away. Coming back runs the same timeline backwards.
   */
  private applyScene(now: number, pose: Pose): Point | void {
    const scene = this.scene!;
    const elapsed = now - scene.start;
    if (elapsed >= DOOR_TOTAL) {
      this.scene = null;
      if (scene.kind === "exit") {
        this.gone = true;
        pose.hidden = true;
      }
      scene.done();
      return;
    }
    let ms = scene.kind === "exit" ? elapsed : DOOR_TOTAL - elapsed;
    const pivotX = ORIGIN.x + this.def.art.pivot.x;
    const doorX = Math.min(CANVAS_W - 16, pivotX + 44);
    const distance = doorX - pivotX;
    const door = { x: doorX, appear: 1, open: 0 };
    pose.door = door;

    const phase = (length: number) => {
      const t = Math.min(1, Math.max(0, ms / length));
      ms -= length;
      return t;
    };
    door.appear = phase(DOOR_PHASES.appear);
    door.open = phase(DOOR_PHASES.open);
    if (ms <= 0) return { x: 1, y: 0 };

    const walk = phase(DOOR_PHASES.walk);
    pose.shiftX = Math.round(distance * ease(walk));
    pose.lift += Math.round(Math.abs(Math.sin(walk * Math.PI * 4)) * 3);
    pose.tilt += 0.05;
    if (ms <= 0) return { x: 1, y: 0 };

    // Stepping in: it walks on through the doorway and slips out of sight behind the jamb.
    const through = phase(DOOR_PHASES.through);
    pose.through = Math.max(0.01, through);
    pose.shiftX = Math.round(distance + ease(through) * THROUGH_DISTANCE);
    pose.lift = Math.round(Math.abs(Math.sin(through * Math.PI * 3)) * 2);
    if (ms <= 0) return { x: 1, y: 0 };

    // Gone in: the door closes behind it, then sinks back into the floor.
    pose.through = 1;
    pose.shiftX = distance + THROUGH_DISTANCE;
    door.open = 1 - phase(DOOR_PHASES.close);
    door.appear = 1 - phase(DOOR_PHASES.vanish);
    return { x: 1, y: 0 };
  }

  private scheduleIdle(now: number) {
    // While uploading, it keeps doing its signature move back to back.
    if (this.mood === "working" && !this.gesture) this.gesture = { name: "action", start: now };
    if (this.mood !== "idle" || this.gesture || this.scene || this.gone) return;
    if (now - this.lastActivity > DOZE_MS) {
      this.mood = "sleeping";
      return;
    }
    if (now >= this.nextFidget) {
      this.gesture = { name: FIDGETS[Math.floor(Math.random() * FIDGETS.length)], start: now };
      this.nextFidget = now + random(5000, 10000);
    }
  }

  private updateLook(override: Point | void): Point {
    let target: Point = { x: 0, y: 0 };
    if (override) {
      target = override;
    } else {
      const focus = this.gazeTarget ?? this.pointer;
      if (focus) {
        const rect = this.canvas.getBoundingClientRect();
        const eyes = toCanvas(this.def.art, this.def.art.gaze);
        const eyesX = rect.left + (eyes.x / CANVAS_W) * rect.width;
        const eyesY = rect.top + (eyes.y / CANVAS_H) * rect.height;
        const dx = focus.x - eyesX;
        const dy = focus.y - eyesY;
        const distance = Math.hypot(dx, dy) || 1;
        const reach = Math.min(distance / 140, 1);
        target = { x: (dx / distance) * reach, y: (dy / distance) * reach };
      }
    }
    this.look.x += (target.x - this.look.x) * 0.45;
    this.look.y += (target.y - this.look.y) * 0.45;
    return this.look;
  }

  private updateBlink(now: number): number {
    if (now >= this.nextBlink) {
      this.blinkStart = now;
      // Now and then a double blink, otherwise every 2–5 s.
      this.nextBlink = now + (Math.random() < 0.2 ? 260 : random(2000, 5000));
    }
    const elapsed = now - this.blinkStart;
    if (elapsed >= BLINK_MS) return 0;
    // Close fast, open a little slower; snapped to three lid positions.
    const progress = elapsed / BLINK_MS;
    const closed = progress < 0.4 ? progress / 0.4 : 1 - (progress - 0.4) / 0.6;
    return quantize(closed, 0.5);
  }
}
