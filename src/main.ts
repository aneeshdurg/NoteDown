import { NoteDownDocument } from './document.ts';
import { NoteDownUI } from './ui.ts';

export async function main() {
  const canvas = <HTMLCanvasElement>document.getElementById("mycanvas");
  canvas.width = 1000;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const doc = new NoteDownDocument();
  const ui = new NoteDownUI(ctx, doc);

  const eraser = <HTMLElement>document.getElementById("eraser");
  eraser.onclick = () => {
    ui.is_eraser = !ui.is_eraser;
    if (ui.is_eraser) {
      eraser.innerText = "Pen";
    } else {
      eraser.innerText = "Eraser";
    }
  };
  (window as any).notedown_ui = ui;
}
