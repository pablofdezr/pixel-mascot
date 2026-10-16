// The quick start from the README, kept here so `npm run typecheck` checks it.
import { Animator, pum } from "../src/index.ts";

const canvas = document.querySelector("canvas")!;
const mascot = new Animator(canvas, pum);

mascot.outfit = { head: "top-hat", face: "none", neck: "bow-tie" };
mascot.play("hop");

// Tie it to whatever your app is doing.
export function onRequestStart() {
  mascot.setMood("thinking");
}
export function onFirstToken() {
  mascot.setMood("talking");
}
export function onDone() {
  mascot.setMood("idle");
  mascot.play("happy");
}

// When the canvas goes away.
export function unmount() {
  mascot.destroy();
}
