import { NoteDownStorageManager, LineSaveData } from "./storage_manager.ts";
import { Stroke } from "./stroke.ts";
import { RealLineNumber } from './types.ts';
import { JsonValue, JsonObject } from './types.ts';

import localForage from "localforage";

export class LocalStorageManager implements NoteDownStorageManager {
  active_notebook: string | null = null;
  store: typeof localForage = localForage;
  saved_lines: Set<RealLineNumber> = new Set();
  known_notebooks: Set<string> = new Set();

  constructor() { }

  async listNotebooks(): Promise<string[]> {
    const notebooks: string[] = (await localForage.getItem("notebooks")) || [];
    for (let notebook of notebooks) {
      this.known_notebooks.add(notebook);
    }
    return notebooks;
  }

  async setActiveNotebook(notebook: string) {
    this.active_notebook = notebook;
    this.store = localForage.createInstance({ name: notebook });
    this.saved_lines = (await this.store.getItem("saved_lines") as Set<RealLineNumber>) || new Set();
    await this.store.setItem("saved_lines", this.saved_lines);
    this.known_notebooks.add(notebook);

    const notebooks: string[] = [];
    for (let notebook of this.known_notebooks) {
      notebooks.push(notebook);
    }
    await localForage.setItem("notebooks", notebooks);
  }

  async notebookIsInitialized(): Promise<boolean> {
    return (await this.store.getItem("initialized")) || false;

  }

  async initializeNotebook() {
    await this.store.setItem("initialized", true);
  }

  async saveLine(lineNumber: RealLineNumber, strokes: Stroke[], firstContent: number) {
    await this.store.setItem(`content-strokes-line${lineNumber}`, strokes);
    await this.store.setItem(`content-firstContent-line${lineNumber}`, firstContent);

    this.saved_lines.add(lineNumber);
    await this.store.setItem("saved_lines", this.saved_lines);
  }

  async listSavedLines(): Promise<Iterable<RealLineNumber>> {
    return this.saved_lines;
  }

  async getSavedLine(
    lineNumber: RealLineNumber,
    scale_factor: number,
    old_margin: number,
    new_margin: number
  ): Promise<LineSaveData> {
    const mapX = (x: number) => (x - old_margin) * scale_factor + new_margin;
    const strokes_raw: any[] | null = await this.store.getItem(`content-strokes-line${lineNumber}`);
    const strokes = strokes_raw ? strokes_raw.map((o: any): Stroke => {
      const s = new Stroke(o.y_root * scale_factor);
      s.x_points = o.x_points.map(mapX);
      s.y_points = o.y_points.map(x => x * scale_factor);
      return s;
    }) : null;
    const firstContent: number | null = await this.store.getItem(`content-firstContent-line${lineNumber}`);
    return { strokes: strokes, firstContent: firstContent === null ? null : mapX(firstContent) };
  }

  async saveLastLine(lastLine: number) {
    await this.store.setItem("lastline", lastLine);
  }

  async getLastLine(): Promise<number | null> {
    return await this.store.getItem("lastline");
  }

  async saveUIState(state: any) {
    await this.store.setItem('ui-state', state);
  }

  async getUIState(): Promise<any> {
    return await this.store.getItem('ui-state');
  }

  async dumpNoteBookData(): Promise<Blob> {
    const obj: { [key: string]: JsonValue } = {
      name: this.active_notebook,
      initialized: true,
    };
    const saved_lines = await this.listSavedLines();
    const saved_lines_list: RealLineNumber[] = [];
    const lineSaveData: JsonObject = {};
    for (let line of saved_lines) {
      saved_lines_list.push(line);
      lineSaveData[line] = {
        strokes: await this.store.getItem(`content-strokes-line${line}`),
        firstContent: await this.store.getItem(`content-firstContent-line${line}`),
      };
    }
    obj["line-save-data"] = lineSaveData;
    obj["lastline"] = await this.getLastLine();

    const data = JSON.stringify(obj);
    return new Blob([data], { type: "application/json" });
  };
}
