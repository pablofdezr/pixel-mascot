/**
 * Every character shares one canvas: 144×134 sprite pixels. Characters are
 * modelled in a 48×72 space whose origin sits at ORIGIN on the canvas; the
 * rows above it leave room for hops and hats, the rows below for ties.
 */
// Wide enough for a thought bubble beside the head.
export const CANVAS_W = 144;
export const CANVAS_H = 134;
// Centred: the 48-wide model sits in the middle of the canvas.
export const ORIGIN = { x: 48, y: 30 };

/**
 * Rows at the top kept clear for a speech balloon that overlaps the canvas
 * (Sumalos pulls its balloon 16px down over it). Symbols floating over a
 * character, the door and the disco ball stay below this line.
 */
export const BALLOON_OVERLAP = 18;
