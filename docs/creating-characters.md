# Creating a character

A character in pixel-mascot is not a drawing. It is a function that answers one question for the
renderer: what colour is this point? The renderer asks it for every pixel of the canvas, every frame,
after undoing the pose (the hop, the lean, the squash), so the function only ever thinks about the
character standing still. Outlines stay one pixel wide at any angle because they are computed fresh.

This guide builds a complete one, Mugsy the coffee mug. The finished file is
[`examples/characters/mug.ts`](../examples/characters/mug.ts); run `npm run dev` to see it next to
the built-in characters.

## The space you draw in

Every character is modelled in a 48 × 72 space. `x` grows to the right and `y` grows **down**. The
renderer places that space in the middle of a 144 × 134 canvas, leaving room above for hops, hats and
the symbols that float over the head, and room to the sides for the thought bubble and the door.

```
 (0,0) ──────────── x ──▶ (48,0)
   │
   │      the character, standing
   y      on its pivot near the bottom
   │
   ▼
 (0,72)
```

A character fills roughly x 6 to 42 and y 6 to 66. Bigger is fine, but every hat and tie is sized for
that, and the shadow and floor expect feet around y 64.

## 1. Shapes are distance functions

Each part is a signed distance: negative inside the shape, positive outside, 0 on the edge. The
helpers in `pixels.ts` cover most needs:

| Helper | Shape |
| --- | --- |
| `sdRoundRect(p, x0, y0, x1, y1, r)` | Rounded rectangle |
| `sdCircle(p, centre, r)` | Circle |
| `sdTriangle(p, a, b, c)` | Triangle |
| `distanceToSegment(p, a, b)`, `distanceToPolyline(p, points)` | Distance to a line, for strokes |

The convention every character follows: a distance above 1 is empty (return `0`), between 0 and 1 is
the outline, and below 0 is the fill. The mug's cup is one rounded rectangle:

```ts
const CUP = { x0: 10, y0: 30, x1: 36, y1: 64 };

const cup = sdRoundRect(p, CUP.x0, CUP.y0, CUP.x1, CUP.y1, 3);
```

## 2. Colour and light

Colours are packed numbers, made with `hex("#rrggbb")`. A **palette** is an outline plus four tones
from shadow to highlight:

```ts
const BODY = palette("#1d4e57", "#2f7f8c", "#45a3b1", "#7fcbd5", "#c8eef2");
//                     line      dark       mid        light      shine
```

Light comes from the upper left (`LIGHT`), as on the Office assistants. Three helpers shade with it:

- **`boxShade(p, sd, x0, y0, x1, y1, palette)`:** for box-like bodies. Outline, a bevel lit on the
  top-left and shaded on the bottom-right, and a flat face. It takes the distance you already computed.
- **`ballShade(p, centre, r, palette)`:** for round things, from the surface normal.
- **`tone(palette, facing)`:** the building block. `facing` runs from -1 (away from the light) to 1
  (towards it); it returns the matching tone.

The mug's handle is a half ring shaded with `tone`:

```ts
const HANDLE = { x: 37, y: 46, r: 6, width: 2.2 };

function handle(p: Vec): number {
  const d = Math.hypot(p.x - HANDLE.x, p.y - HANDLE.y);
  // Only the half ring sticking out to the right of the cup.
  if (p.x < CUP.x1 - 1) return 0;
  const off = Math.abs(d - HANDLE.r);
  if (off > HANDLE.width + 1) return 0;
  if (off > HANDLE.width) return BODY.line;
  // Shade the round handle by how much its surface faces the light.
  const facing = ((p.x - HANDLE.x) * LIGHT.x + (p.y - HANDLE.y) * LIGHT.y) / d;
  return tone(BODY, facing * Math.sign(d - HANDLE.r || 1));
}
```

## 3. The face everyone shares

Don't draw eyes. `standardFace` gives every character the same face, and with it every expression:
blinks, happy `^ ^` eyes, heart pupils, frowns, the talking mouth. You choose where it goes:

```ts
const FACE = standardFace({ x: 23, y: 44 }, { lid: BODY.light, mouth: { x: 23, y: 55, w: 3 } });
```

- The first argument is the point between the eyes.
- `lid` is the colour of the eyelid when it closes, usually a light tone of the body.
- `mouth` is its centre and half-width. Leave it out for a character without a mouth.
- `size` shrinks the face for a character drawn bigger than 1:1 (see `scale` below), so on screen
  every pair of eyes measures the same.

The eyes are about 26 pixels across together, so leave room for them.

## 4. Anchors: where things are worn

Accessories don't know about your character. They read **anchors**: the top centre of the head and
how wide it is, the eyes, the mouth, and the neck. `faceAnchors` fills in everything from the face
except the head:

```ts
const ANCHORS: Anchors = faceAnchors(FACE, { top: { x: 23, y: 30 }, width: 26 });
```

`top` is where a hat's brim should sit, and `width` is how wide that head is. The neck point is
computed for you, just below the lowest a talking mouth reaches, so a bow tie never covers it.

## 5. The sample function

This is the character. Draw front to back: accessories first, then the face, then the body, and
return `0` where there is nothing.

```ts
function sample(p: Vec, pose: Pose, outfit: Outfit): number {
  const front = accessoryColor(p, outfit, ANCHORS) || faceColor(p, FACE, pose);
  if (front) return front;
  const cup = sdRoundRect(p, CUP.x0, CUP.y0, CUP.x1, CUP.y1, 3);
  if (cup <= 1) return coffee(p) || boxShade(p, cup, CUP.x0, CUP.y0, CUP.x1, CUP.y1, BODY);
  return handle(p) || steam(p, pose);
}
```

It runs about 19,000 times per frame, so keep it cheap. Put constants outside it, and check a cheap
bounding shape before any expensive maths.

## 6. Moving parts and the signature move

The `pose` tells you what the animator is doing. Three fields are there for you to react to:

- **`pose.action`:** 0 → 1 → 0 while the character plays its signature move (`play("action")`). The
  stamp slams, the till receipt prints, the envelope opens.
- **`pose.mouthOpen`:** 0 to 1 while it talks. The calculator's screen runs numbers.
- **`pose.time`:** seconds, for anything that loops, like flapping wings.

The mug's signature move is a puff of steam, which also drifts up a little while it talks:

```ts
function steam(p: Vec, pose: Pose): number {
  const amount = Math.max(pose.action, pose.mouthOpen * 0.4);
  if (amount <= 0) return 0;
  const top = CUP.y0 - 2 - amount * 20;
  if (p.y < top || p.y > CUP.y0 - 1) return 0;
  for (const k of [-1, 0, 1]) {
    const x = 23 + k * 6 + Math.sin((p.y + pose.time * 18 + k * 5) * 0.45) * 1.6;
    if (Math.abs(p.x - x) < 0.9) return STEAM;
  }
  return 0;
}
```

Everything else (hops, tilts, squashes, spins, the door) the renderer does to your drawing as a whole.

## 7. Put it together

```ts
export const mug: CharacterDef = {
  id: "mug",
  name: "Mugsy",
  kind: "Coffee mug",
  actionLabel: "Steam",
  greeting: "Hi, I'm Mugsy. Ask me anything, I'm fully caffeinated.",
  art: {
    pivot: { x: 24, y: 64 },
    gaze: { x: 23, y: 44 },
    ground: floor({ x: 24, y: 64.5 }, 20, 3),
    anchors: () => ANCHORS,
    sample,
  },
};
```

| Field | Meaning |
| --- | --- |
| `pivot` | The point it stands on. Hops, tilts and squashes happen around it. |
| `gaze` | Between the eyes; the eyes follow the pointer from here. |
| `ground` | `floor(centre, rx, ry)` for a soft round shadow, or `sheet({...})` for a sheet of paper under it, like the invoice under Pum. |
| `anchors` | Where accessories go. A function of the pose, in case a part that wears things moves. |
| `scale` | Optional. Draws the model bigger or smaller around the pivot (Remi the envelope uses it). Pass `size: 1 / scale` to `standardFace` to keep the eyes the standard size. |
| `floats` | Optional. Hovers above the floor and bobs, like Remi. |
| `slams` | Optional. Makes the signature move a hard downward stamp instead of a pop, like Pum. |

## 8. Check it

Render its whole sprite sheet, every mood and gesture at six moments each:

```sh
npm run sheet -- examples/characters/mug.ts
npm run sheet -- examples/characters/mug.ts --outfit head:top-hat,face:glasses,neck:bow-tie
```

Open the PNG and look for:

- [ ] Nothing is clipped: hats on the head, the thought bubble and symbols beside it.
- [ ] The outline is one pixel all round, including where parts meet.
- [ ] The face sits where you meant, and the mouth isn't hidden behind anything when it opens.
- [ ] Every hat, pair of glasses and tie lands in the right place (try several).
- [ ] The signature move reads in the `action` row.
- [ ] It's cheap enough. On a laptop, aim for under about 15 ms a frame with an outfit on.

Then add it to the example page with `npm run dev`.

## Ask an AI to draft one

The engine is small enough for a model to read whole. Give it the files and this prompt, then run the
sheet and send back what looks wrong:

```text
You are writing a character for pixel-mascot, a procedural pixel-art engine.
Read src/engine/pixels.ts, src/engine/face.ts, src/engine/accessories.ts (the
first 60 lines), src/engine/ground.ts, src/characters/types.ts,
docs/creating-characters.md and examples/characters/mug.ts.

Write one TypeScript module that exports a CharacterDef for: <describe it,
e.g. "a stack of sticky notes whose signature move peels the top note off">.

Rules:
- Model space is 48 wide and 72 tall, y grows down; keep the body within
  roughly x 6..42 and y 6..66, standing on y 64.
- Build every part from the distance helpers; return 0 for empty, the
  palette's line colour where the distance is 0..1, and fill below 0.
- One palette per material, made with palette(line, dark, mid, light, shine),
  shaded with boxShade, ballShade or tone so light comes from the upper left.
- Use standardFace for the face and faceAnchors for the anchors. Leave about
  26 pixels of width for the eyes.
- sample() draws accessoryColor, then faceColor, then the body.
- Make the signature move react to pose.action (0 to 1 and back), and
  optionally something to pose.mouthOpen while it talks.
- Keep sample() cheap: constants outside it, bounding checks first.
- Import everything from "../../src" and export nothing else.
```

The first draft is rarely right. Expect a round or two on proportions and on where the face sits.
