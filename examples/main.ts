import { Animator, CHARACTERS, GESTURE_NAMES, MOODS, NO_OUTFIT, WARDROBE, type CharacterDef, type Mood, type Slot } from "../src";
import { mug } from "./characters/mug";

// Every built-in character plus the one from docs/creating-characters.md.
const characters: CharacterDef[] = [...CHARACTERS, mug];

const canvas = document.querySelector<HTMLCanvasElement>("#stage")!;
const characterPicker = document.querySelector<HTMLSelectElement>("#character")!;
const moodPicker = document.querySelector<HTMLSelectElement>("#mood")!;

let outfit = { ...NO_OUTFIT };
let animator: Animator | null = null;

function show(def: CharacterDef) {
  animator?.destroy();
  animator = new Animator(canvas, def);
  animator.outfit = outfit;
  animator.play("hop");
  canvas.setAttribute("aria-label", `${def.name}, ${def.kind}`);
  renderGestures(def);
}

function option(value: string, label: string) {
  const el = document.createElement("option");
  el.value = value;
  el.textContent = label;
  return el;
}

characterPicker.append(...characters.map((c) => option(c.id, `${c.name}, ${c.kind.toLowerCase()}`)));
characterPicker.onchange = () => show(characters.find((c) => c.id === characterPicker.value)!);

moodPicker.append(...MOODS.map((m) => option(m, `Mood: ${m}`)));
moodPicker.onchange = () => animator?.setMood(moodPicker.value as Mood);

const slots = document.querySelector("#slots")!;
for (const slot of Object.keys(WARDROBE) as Slot[]) {
  const picker = document.createElement("select");
  picker.setAttribute("aria-label", slot);
  picker.append(option("none", `${slot}: none`), ...WARDROBE[slot].map((item) => option(item.id, item.label)));
  picker.onchange = () => {
    outfit = { ...outfit, [slot]: picker.value };
    if (animator) animator.outfit = outfit;
  };
  slots.append(picker);
}

function renderGestures(def: CharacterDef) {
  const row = document.querySelector("#gestures")!;
  row.replaceChildren(
    ...GESTURE_NAMES.map((gesture) => {
      const button = document.createElement("button");
      button.textContent = gesture === "action" ? def.actionLabel : gesture;
      button.onclick = () => animator?.play(gesture);
      return button;
    }),
  );
}

canvas.onclick = () => animator?.play("tickle");
show(characters[0]);
