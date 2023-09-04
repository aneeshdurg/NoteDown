import { NoteDownDocument } from './document.ts';
import { NoteDownRenderer } from './renderer.ts';
import { LocalStorageManager } from './local_storage_manager.ts';
import { RealLineNumber } from './types.ts';

import localForage from "localforage";

export async function main() {
  if ("serviceWorker" in navigator) {
    console.log("registering serviceworker");
    try {
      const registration = await navigator.serviceWorker.register("/NoteDown/service_worker.js");
      console.log(registration);
    } catch (e) {
      console.log(e);
    }
  }
  console.log("!");

  const canvas = <HTMLCanvasElement>document.getElementById("mycanvas");
  canvas.width = 1000;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const notebook = decodeURIComponent(urlParams.get("notebook") || "default");
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
  const ui = new NoteDownRenderer(notebook, ctx, doc, storage);
  storage.setActiveNotebook(notebook).then(async () => {
    if (await storage.notebookIsInitialized()) {
      await ui.load(upgradeUI);
      ui.clearAndRedraw();
    } else {
      await ui.save();
      await storage.initializeNotebook();
    }
    ui.installEventHandlers();
  });

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
  const entry = document.createElement("option");
  entry.value = encodeURIComponent(notebook);
  entry.innerHTML = notebook;
  change_notebook.appendChild(entry);
  change_notebook.value = notebook;
  for (let notebook of notebooks) {
    const entry = document.createElement("option");
    entry.value = notebook;
    entry.innerHTML = decodeURIComponent(notebook);
    change_notebook.appendChild(entry);
  }
  change_notebook.onchange = () => {
    location.assign(`?notebook=${encodeURIComponent(change_notebook.value)}`);
  };

  const download = <HTMLElement>document.getElementById("download");
  download.onclick = async () => {
    const blob = await storage.dumpNoteBookData();
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = `${encodeURIComponent(notebook)}.json`;
    a.textContent = `Download ${encodeURIComponent(notebook)}.json`;
    document.body.appendChild(a);
    a.click();
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

  const toc = <HTMLElement>document.getElementById("toc");
  toc.onclick = async () => {
    const modal_container = document.createElement("div");
    modal_container.classList.add("modal");
    const modal_dialog = document.createElement("div");
    modal_dialog.classList.add("modal-dialog");
    modal_container.appendChild(modal_dialog);

    const toc_canvas = document.createElement("canvas");
    toc_canvas.width = 1000;
    toc_canvas.height = 1000;
    toc_canvas.style.width = "100%";
    const ctx = toc_canvas.getContext("2d")!;

    modal_dialog.appendChild(toc_canvas);
    const close_container = () => {
      modal_container.remove();
    };
    modal_container.onclick = close_container;
    modal_dialog.onclick = (e) => {
      e.stopPropagation();
    };

    const root_doc = doc.rootOnlyDoc();
    const toc_ui = new NoteDownRenderer(notebook, ctx, root_doc.doc, storage, true);
    toc_ui.clearAndRedraw();
    toc_ui.installEventHandlers();
    toc_ui.on_line_tap = (line_no: RealLineNumber) => {
      ui.infer_line_mapping(root_doc.mapping.get(line_no)!);
      ui.y_offset = 0;
      close_container();
    };
    document.body.appendChild(modal_container);
  };

  window.addEventListener('beforeinstallprompt', (e) => {
    console.log(e);
  });

  const render = () => {
    ui.clearAndRedraw();
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
}
