import type { Vec } from "./pixels";

/** 3×5 pixel digits and symbols for little LCD screens. */
const GLYPHS: Record<string, string[]> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", "###", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", "..#", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
  "%": ["#.#", "..#", ".#.", "#..", "#.#"],
  "€": [".##", "#..", "###", "#..", ".##"],
  ",": ["...", "...", "...", ".#.", "#.."],
};

/** Width of `text` in pixels: 3px glyphs, 1px apart. */
export const textWidth = (text: string) => text.length * 4 - 1;

/** True where `text`, drawn with its top-left at `origin`, has an inked pixel. */
export function inkAt(p: Vec, text: string, origin: Vec): boolean {
  const gx = Math.floor(p.x - origin.x);
  const gy = Math.floor(p.y - origin.y);
  if (gx < 0 || gy < 0 || gy >= 5 || gx >= text.length * 4 || gx % 4 === 3) return false;
  return GLYPHS[text[Math.floor(gx / 4)]]?.[gy][gx % 4] === "#";
}
