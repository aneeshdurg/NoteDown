import { NoteDownDocument } from './document.ts';
import { NoteDownRenderer } from './renderer.ts';
import { LocalStorageManager } from './local_storage_manager.ts';

import localForage from "localforage";

export async function main() {
  const canvas = <HTMLCanvasElement>document.getElementById("mycanvas");
  canvas.width = 1000;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const notebook = urlParams.get("notebook") || "default";
  const forceCreate = urlParams.get("forcecreate") || false;
  const upgradeUI = (urlParams.get("upgradeui") || false) as boolean;
  if (forceCreate) {
    try {
      localForage.dropInstance({name: notebook});
    } catch (e) {
      console.log(e);
    }
  }

  const storage = new LocalStorageManager();
  const doc = new NoteDownDocument();
  const ui = new NoteDownRenderer(notebook, upgradeUI, ctx, doc, storage);

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
  (window as any).localForage = localForage;
}
