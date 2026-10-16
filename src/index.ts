// pixel-mascot: procedural pixel-art mascots. Every frame is computed from
// signed distance functions; there are no sprite images.

export {
  Animator,
  applyMood,
  gestureFrame,
  moodFrame,
  GESTURE_MS,
  GESTURE_NAMES,
  MOODS,
  DOOR_SHUT_MS,
  type Gesture,
  type Mood,
} from "./animator.ts";

export { CHARACTERS } from "./characters/index.ts";
export { archi } from "./characters/archi.ts";
export { calcu } from "./characters/calcu.ts";
export { euri } from "./characters/euri.ts";
export { grapo } from "./characters/grapo.ts";
export { lapi } from "./characters/lapi.ts";
export { maleti } from "./characters/maleti.ts";
export { moni } from "./characters/moni.ts";
export { pum } from "./characters/pum.ts";
export { regi } from "./characters/regi.ts";
export { remi } from "./characters/remi.ts";
export { tiqui } from "./characters/tiqui.ts";
export type { CharacterDef } from "./characters/types.ts";

export { renderFrame, toCanvas, type Art } from "./engine/render.ts";
export { restPose, type Pose, type Mark, type MouthShape } from "./engine/pose.ts";
export { standardFace, faceColor, MOUTH_SCALE, type Face } from "./engine/face.ts";
export {
  accessoryColor,
  faceAnchors,
  neckUnder,
  NO_OUTFIT,
  SIZE,
  WARDROBE,
  type Anchors,
  type Outfit,
  type Slot,
} from "./engine/accessories.ts";
export { sheet, floor, type Ground, type SheetSpec } from "./engine/ground.ts";
export { BALLOON_OVERLAP, CANVAS_H, CANVAS_W, ORIGIN } from "./engine/canvas.ts";
export { inkAt, textWidth } from "./engine/pixelfont.ts";
export {
  ballShade,
  boxShade,
  distanceToPolyline,
  distanceToSegment,
  hex,
  LIGHT,
  nearestOnSegment,
  normalize,
  palette,
  rotate,
  sdCircle,
  sdRoundRect,
  sdTriangle,
  TAU,
  tone,
  type Palette,
  type Vec,
} from "./engine/pixels.ts";
