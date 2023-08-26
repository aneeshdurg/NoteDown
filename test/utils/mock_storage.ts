import { RealLineNumber } from '../../src/types.ts';
import { NoteDownStorageManager } from '../../src/storage_manager.ts';
import { Stroke } from '../../src/stroke.ts';

export class MockStorageManager implements NoteDownStorageManager {
  storage: Map<string, Map<string, any>>;
  active_notebook: string | null = null;

  constructor() {
    this.storage = new Map();
  }

  async listNotebooks(): Promise<string[]> {
    const notebooks: string[] = [];
    for (let kv of this.storage) {
      notebooks.push(kv[0]);
    }
    return notebooks;
  }

  async setActiveNotebook(notebook: string): Promise<void> {
    this.active_notebook = notebook;
    if (!this.storage.has(notebook)) {
      this.storage.set(notebook, new Map());
      this.storage.get(notebook)!.set("saved-lines", new Set());
    }
  }

  async notebookIsInitialized(): Promise<boolean> {
    return this.storage.get(this.active_notebook!)!.get("initialized");
  }

  async initializeNotebook(): Promise<void> {
    this.storage.get(this.active_notebook!)!.set("initialized", true);
  }

  async saveLine(lineNumber: RealLineNumber, strokes: Stroke[], firstContent: number): Promise<void> {
    this.storage.get(this.active_notebook!)!.set(`line-content-${lineNumber}`, { strokes: strokes, firstContent: firstContent });
    (this.storage.get(this.active_notebook!)!.get("saved-lines") as Set<RealLineNumber>).add(lineNumber);
  }

  async listSavedLines(): Promise<Iterable<RealLineNumber>> {
    return this.storage.get(this.active_notebook!)!.get("saved-lines");
  }

  async getSavedLine(lineNumber: RealLineNumber, _scale_factor: number, _old_margin: number, _new_margin: number): Promise<{ strokes: Stroke[] | null, firstContent: number | null }> {
    const data = this.storage.get(this.active_notebook!)!.get(`line-content-${lineNumber}`);
    if (data) {
      // TODO the transformation of saved data should not happen at this layer
      return data;
    } else {
      return { strokes: null, firstContent: null };
    }
  }

  async saveLastLine(lastLine: number): Promise<void> {
    this.storage.get(this.active_notebook!)!.set("last-line", lastLine);
  }

  async getLastLine(): Promise<number | null> {
    return this.storage.get(this.active_notebook!)!.get("last-line");
  }

  async saveUIState(state: any): Promise<void> {
    this.storage.get(this.active_notebook!)!.set("ui-state", state);
  }

  async getUIState(): Promise<any> {
    return this.storage.get(this.active_notebook!)!.get("ui-state");
  }
}
