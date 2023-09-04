import { NoteDownDocument } from './document.ts';
import { NoteDownRenderer } from './renderer.ts';
import { NoteDownStorageManager } from './storage_manager.ts';
import { LocalStorageManager } from './local_storage_manager.ts';
import { RealLineNumber } from './types.ts';
import { Modal } from './modal.ts';

import localForage from "localforage";

async function setupNotebookSwitcher(current_notebook: string, storage: NoteDownStorageManager) {
  const change_notebook = <HTMLSelectElement>document.getElementById("change-notebook");
  const notebooks = await storage.listNotebooks();
  const entry = document.createElement("option");
  entry.value = encodeURIComponent(current_notebook);
  entry.innerHTML = current_notebook;
  change_notebook.appendChild(entry);
  change_notebook.value = current_notebook;
  for (let name of notebooks) {
    if (name == current_notebook) {
      continue;
    }
    const entry = document.createElement("option");
    entry.value = name;
    entry.innerHTML = decodeURIComponent(name);
    change_notebook.appendChild(entry);
  }
  change_notebook.onchange = () => {
    location.assign(`?notebook=${encodeURIComponent(change_notebook.value)}`);
  };
}

function setupNotebookCreator() {
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
}

async function quickLinks(doc: NoteDownDocument, storage: NoteDownStorageManager, renderer: NoteDownRenderer) {
  const modal = new Modal("Quick Links");

  const quick_links = doc.rootOnlyDoc();
  const ctx = modal.add_canvas();
  const toc_ui = new NoteDownRenderer(ctx, quick_links.doc, storage, true);
  toc_ui.clearAndRedraw();
  toc_ui.installEventHandlers();
  toc_ui.on_line_tap = (line_no: RealLineNumber) => {
    renderer.infer_line_mapping(quick_links.mapping.get(line_no)!);
    renderer.y_offset = 0;
    modal.close_container();
  };

  modal.attach(document.body);
}

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
  const renderer = new NoteDownRenderer(ctx, doc, storage);

  await storage.setActiveNotebook(notebook);
  if (await storage.notebookIsInitialized()) {
    await renderer.load(upgradeUI);
    renderer.clearAndRedraw();
  } else {
    await renderer.save();
    await storage.initializeNotebook();
  }
  renderer.installEventHandlers();

  setupNotebookCreator();
  await setupNotebookSwitcher(notebook, storage);

  const download = <HTMLElement>document.getElementById("download");
  download.onclick = async () => {
    const blob = await storage.dumpNoteBookData();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${encodeURIComponent(notebook)}.json`;
    a.textContent = `Download ${encodeURIComponent(notebook)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const eraser = <HTMLElement>document.getElementById("eraser");
  renderer.on_eraser_flip = () => {
    if (renderer.is_eraser) {
      eraser.innerText = "Pen";
    } else {
      eraser.innerText = "Eraser";
    }
  }
  eraser.onclick = () => {
    renderer.flip_eraser_state();
  };

  const toc = <HTMLElement>document.getElementById("toc");
  toc.onclick = () => { quickLinks(doc, storage, renderer); };

  window.addEventListener('beforeinstallprompt', (e) => {
    console.log(e);
  });

  // for debugging purposes
  (window as any).notedown_ui = renderer;
  (window as any).localForage = localForage;
}
