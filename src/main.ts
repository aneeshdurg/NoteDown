import { NoteDownDocument } from './document.ts';
import { NoteDownRenderer } from './renderer.ts';
import { NoteDownStorageManager } from './storage_manager.ts';
import { LocalStorageManager } from './local_storage_manager.ts';
import { RealLineNumber } from './types.ts';
import { Modal, modalAlert, modalPrompt, modalConfirm } from './modal.ts';
import { GetConfig } from './config.ts';

import localForage from "localforage";

async function setupNotebookSwitcher(current_notebook: string, storage: NoteDownStorageManager) {
  const change_notebook = <HTMLSelectElement>document.getElementById("change-notebook");
  change_notebook.innerHTML = "";

  const notebooks = await storage.listNotebooks();
  const makeMenuEntry = (name: string) => {
    const entry = document.createElement("div");
    entry.classList.add("menuitem");
    const label = document.createElement("div");
    label.classList.add("menulabel");
    label.innerText = name;
    entry.appendChild(label);
    entry.onclick = async () => {
      location.assign(`?notebook=${encodeURIComponent(name)}`);
    };
    return entry;
  };
  const entry = makeMenuEntry(current_notebook);
  // entry.value = encodeURIComponent(current_notebook);
  change_notebook.appendChild(entry);
  change_notebook.value = current_notebook;
  for (let name of notebooks) {
    if (name == current_notebook) {
      continue;
    }
    const entry = makeMenuEntry(decodeURIComponent(name));
    // entry.value = name;
    change_notebook.appendChild(entry);
  }
}

function setupNotebookCreator() {
  const new_notebook = <HTMLElement>document.getElementById("create-new-notebook");
  new_notebook.onclick = async () => {
    while (true) {
      const value = await modalPrompt("New notebook name");
      if (value === "") {
        await new Promise<void>((r) => {
          const modal = modalAlert("Please enter a notebook name");
          // add a short delay to allow the modal to despawn before the loop
          // resumes
          modal.on_close = () => { setTimeout(r, 0); };
        });
        continue
      } else if (value) {
        location.assign(`?notebook=${encodeURIComponent(value)}`);
      }
      break;
    }
  };
}

function setupNotebookManager(curr_notebook: string, storage: NoteDownStorageManager) {
  const manage_notebooks = <HTMLElement>document.getElementById("manage-notebooks");
  manage_notebooks.onclick = async () => {
    const modal = new Modal("Manage Notebooks");

    const container = document.createElement("div");
    // TODO - move to style.css
    container.style.position = "inherit";
    container.style.height = "80%";
    container.style.overflow = "auto";

    const elements = new Map<string, HTMLElement>();

    const searchbar = document.createElement("input");
    // TODO - move to style.css
    searchbar.style.width = "95%";
    searchbar.style.height = "2em";
    searchbar.style.borderRadius = "10px";
    searchbar.placeholder = "Search";
    searchbar.onkeyup = () => {
      for (let kv of elements) {
        if (!kv[0].startsWith(searchbar.value)) {
          kv[1].style.display = "none";
        } else {
          kv[1].style.display = "";
        }
      }
    };
    container.appendChild(searchbar);
    container.appendChild(document.createElement("br"));

    const notebooks = await storage.listNotebooks();

    const light_dark_class = GetConfig().currentModeIsLight ? "light" : "dark";
    for (let notebook of notebooks) {
      const entry = document.createElement("div");

      const heading = document.createElement("h2");
      heading.classList.add(light_dark_class);
      heading.innerText = notebook;
      entry.appendChild(heading);

      const open_notebook = document.createElement("button");
      open_notebook.innerText = "Open";
      open_notebook.classList.add("modalalert-ok");
      // Override style defaults for "modalalert-ok"
      open_notebook.style.float = "none";
      open_notebook.style.marginTop = "0";
      open_notebook.onclick = () => {
        location.assign(`?notebook=${encodeURIComponent(notebook)}`);
      };
      entry.appendChild(open_notebook);
      entry.appendChild(document.createElement("br"));

      const delete_notebook = document.createElement("button");
      delete_notebook.innerText = "Delete?";
      delete_notebook.classList.add("modalalert-cancel");
      // Override style defaults for "modalalert-cancel"
      delete_notebook.style.float = "none";
      delete_notebook.style.marginTop = "0";
      if (notebook === curr_notebook) {
        delete_notebook.disabled = true;
      }
      entry.appendChild(delete_notebook);

      entry.appendChild(document.createElement("br"));
      entry.appendChild(document.createElement("br"));

      delete_notebook.onclick = async () => {
        const confirm_delete = await modalConfirm(`Delete ${notebook}?`);
        if (confirm_delete) {
          await storage.deleteNotebook(notebook);
          await setupNotebookSwitcher(curr_notebook, storage);
        }
        modal.close_container();
        await new Promise(r => {
          setTimeout(r, 0);
        });
        manage_notebooks.click();
      };

      elements.set(notebook, entry);
      container.appendChild(entry);
    }
    modal.appendChild(container);

    modal.attach(document.body);
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
    renderer.clearAndRedraw();
    modal.close_container();
  };

  modal.attach(document.body);
}

async function setupLightDarkToggle(renderer: NoteDownRenderer) {
  const toggleLightMode = (isLight: boolean) => {
    let currentClass = "light";
    let targetClass = "dark";
    if (!isLight) {
      currentClass = "dark";
      targetClass = "light";
    }
    localForage.setItem("theme", targetClass);
    const els = document.getElementsByClassName(currentClass);
    while (els.length) {
      const el = els[0];
      el.classList.remove(currentClass);
      el.classList.add(targetClass);
    }
    renderer.clearAndRedraw();
  }

  GetConfig().registerModeSwitchCB(
    toggleLightMode.bind(null, true), toggleLightMode.bind(null, false));
  document.getElementById("EnableLightMode")!.onclick = () => {
    GetConfig().enableLightMode();
  }
  document.getElementById("EnableDarkMode")!.onclick = () => {
    GetConfig().enableDarkMode();
  }

  let defaultTheme = (await localForage.getItem("theme")) as string | undefined;
  defaultTheme = defaultTheme || "light";
  if (defaultTheme == "light") {
    GetConfig().enableLightMode();
  } else {
    GetConfig().enableDarkMode();
  }
}

function setupSaveLoad(
  notebook: string,
  storage: LocalStorageManager,
  renderer: NoteDownRenderer
) {
  const download = <HTMLElement>document.getElementById("save_doc");
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

  const upload = <HTMLElement>document.getElementById("load_doc");
  upload.onclick = () => {
    const modal = new Modal("Load File");

    const fileinput = document.createElement("input");
    fileinput.type = "file";
    fileinput.innerText = "load";
    fileinput.addEventListener("change", (e) => {
      // getting a hold of the file reference
      const file = (e.target as any).files[0] as Blob;

      // setting up the reader
      const reader = new FileReader();
      reader.readAsText(file, 'UTF-8');

      // here we tell the reader what to do when it's done reading...
      reader.onload = async (readerEvent) => {
        const content = readerEvent.target!.result as string; // this is the content!
        const data = JSON.parse(content);
        await storage.loadNoteBookData(data);
        await renderer.save();
        await renderer.load(false);
        renderer.clearAndRedraw();
        modal.close_container();
      };
    });
    modal.appendChild(fileinput);
    modal.appendChild(document.createElement("br"));
    modal.appendChild(document.createElement("br"));

    const cancel = document.createElement("button");
    cancel.classList.add("modalalert-cancel");
    cancel.innerText = "cancel";
    cancel.onclick = () => {
      modal.close_container();
    }
    cancel.style.marginLeft = "25%";
    modal.appendChild(cancel);
    modal.attach(document.body);
  };
}

function onLineSelect(renderer: NoteDownRenderer, line: RealLineNumber) {
  navigator.vibrate([100]);
  const modal = new Modal("Add/Delete lines");
  const add = document.createElement("button");
  add.innerText = "add";
  add.classList.add("addline");
  add.innerText = "add";
  const addlinecount = document.createElement("input");
  addlinecount.type = "number";
  addlinecount.value = "1";
  addlinecount.classList.add("addlinecount");
  const del = document.createElement("button");
  del.innerText = "delete";
  del.classList.add("delline");

  const duplicate = document.createElement("button");
  duplicate.innerText = "duplicate";
  duplicate.classList.add("delline");

  modal.appendChild(add);
  modal.appendChild(addlinecount);
  modal.appendChild(document.createElement("br"));
  modal.appendChild(document.createElement("br"));
  modal.appendChild(del);
  modal.appendChild(document.createElement("br"));
  modal.appendChild(document.createElement("br"));
  modal.appendChild(duplicate);
  modal.attach(document.body);

  const finish = () => {
    modal.close_container();
  };

  add.onclick = async () => {
    await renderer.add_line(line, Math.floor(Number(addlinecount.value)));
    finish();
  };

  del.onclick = () => {
    renderer.delete_lines(line, 1);
    finish();
  };

  duplicate.onclick = async () => {
    await renderer.duplicate_line(line);
    finish();
  };
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
  const getLastNotebook = async () => {
    const notebook = await localForage.getItem("lastNotebook");
    if (notebook) {
      return notebook as string;
    }
    return "default";
  };
  const notebook = decodeURIComponent(urlParams.get("notebook") || await getLastNotebook());
  await localForage.setItem("lastNotebook", notebook);
  document.getElementById("notebookName")!.innerText = notebook;
  const upgradeUI = (urlParams.get("upgradeui") || false) as boolean;

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
  renderer.on_line_select = onLineSelect.bind(null, renderer);
  renderer.installEventHandlers();

  setupNotebookCreator();
  setupNotebookManager(notebook, storage);
  await setupNotebookSwitcher(notebook, storage);
  await setupLightDarkToggle(renderer);
  setupSaveLoad(notebook, storage, renderer);

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
  // const render = () => {
  //   renderer.clearAndRedraw();
  //   requestAnimationFrame(render);
  // };
  // requestAnimationFrame(render);
}
