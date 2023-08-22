import { NoteDownStorageManager } from "./storage_manager.ts";
import { Stroke } from "./stroke.ts";
import { RealLineNumber } from './types.ts';

import localForage from "localforage";

export class LocalStorageManager implements NoteDownStorageManager {
  active_notebook: string | null = null;
  store: typeof localForage = localForage;
  saved_lines: Set<RealLineNumber> = new Set();

  constructor() { }

  async listNotebooks(): Promise<string[]> {
    return (await localForage.getItem("notebooks"))!;
  }

  async setActiveNotebook(notebook: string) {
    this.active_notebook = notebook;
    this.store = localForage.createInstance({ name: notebook });
    this.saved_lines = (await this.store.getItem("saved_lines") as Set<RealLineNumber>) || new Set();
    await this.store.setItem("saved_lines", this.saved_lines);
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

  async getSavedLine(lineNumber: RealLineNumber): Promise<{ strokes: Stroke[], firstContent: number }> {
    const strokes_raw: any[] = (await this.store.getItem(`content-strokes-line${lineNumber}`))!;
    const strokes = strokes_raw.map((o: any): Stroke => {
      const s = new Stroke(o.y_root);
      s.x_points = o.x_points;
      s.y_points = o.y_points;
      return s;
    });
    const firstContent: number = (await this.store.getItem(`content-firstContent-line${lineNumber}`))!;
    return { strokes: strokes, firstContent: firstContent };
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

}
