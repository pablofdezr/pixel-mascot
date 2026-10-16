import type { Art } from "../engine/render.ts";

export interface CharacterDef {
  id: string;
  name: string;
  /** What it is, shown under its name. */
  kind: string;
  art: Art;
  /** Button label for its signature move. */
  actionLabel: string;
  /** Hovers above the floor instead of standing on it. */
  floats?: boolean;
  /** The signature move is a hard downward stamp rather than a pop. */
  slams?: boolean;
  /** The balloon's first line. */
  greeting: string;
}
