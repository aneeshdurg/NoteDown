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
      localForage.dropInstance({ name: notebook });
    } catch (e) {
      console.log(e);
    }
  }

  const storage = new LocalStorageManager();
  const doc = new NoteDownDocument();
  const ui = new NoteDownRenderer(notebook, upgradeUI, ctx, doc, storage);
  (window as any).notedown_ui = ui;
  (window as any).localForage = localForage;

  const new_notebook = <HTMLElement>document.getElementById("create-new-notebook");
  new_notebook.onclick = () => {
    while (true) {
      const value = prompt("New notebook name");
      if (value === "") {
        alert("Please enter a notebook name");
        continue
      } else if (value) {
        location.assign(`?notebook=${encodeURIComponent(value)}`);
      }
      break;
    }
  };

  const change_notebook = <HTMLSelectElement>document.getElementById("change-notebook");
  const notebooks = await storage.listNotebooks();
  for (let notebook of notebooks) {
    const entry = document.createElement("option");
    entry.value = notebook;
    entry.innerHTML = decodeURIComponent(notebook);
    change_notebook.appendChild(entry);
  }
  change_notebook.value = notebook;
  change_notebook.onchange = () => {
    location.assign(`?notebook=${encodeURIComponent(change_notebook.value)}`);
  };

  const eraser = <HTMLElement>document.getElementById("eraser");
  ui.on_eraser_flip = () => {
    if (ui.is_eraser) {
      eraser.innerText = "Pen";
    } else {
      eraser.innerText = "Eraser";
    }
  }
  eraser.onclick = () => {
    ui.is_eraser = !ui.is_eraser;
  };
}
