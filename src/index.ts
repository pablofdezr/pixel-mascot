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
} from "./animator";

export { CHARACTERS } from "./characters";
export { archi } from "./characters/archi";
export { calcu } from "./characters/calcu";
export { euri } from "./characters/euri";
export { grapo } from "./characters/grapo";
export { lapi } from "./characters/lapi";
export { maleti } from "./characters/maleti";
export { moni } from "./characters/moni";
export { pum } from "./characters/pum";
export { regi } from "./characters/regi";
export { remi } from "./characters/remi";
export { tiqui } from "./characters/tiqui";
export type { CharacterDef } from "./characters/types";

export { renderFrame, toCanvas, type Art } from "./engine/render";
export { restPose, type Pose, type Mark, type MouthShape } from "./engine/pose";
export { standardFace, faceColor, MOUTH_SCALE, type Face } from "./engine/face";
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
} from "./engine/accessories";
export { sheet, floor, type Ground, type SheetSpec } from "./engine/ground";
export { BALLOON_OVERLAP, CANVAS_H, CANVAS_W, ORIGIN } from "./engine/canvas";
export { inkAt, textWidth } from "./engine/pixelfont";
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
} from "./engine/pixels";
