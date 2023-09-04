import { RealLineNumber } from './types.ts';
import { Stroke } from './stroke.ts';

export type LineSaveData = { strokes: Stroke[] | null, firstContent: number | null };
export interface NoteDownStorageManager {
  listNotebooks: () => Promise<string[]>;
  setActiveNotebook: (notebook: string) => Promise<void>;

  notebookIsInitialized: () => Promise<boolean>;
  initializeNotebook: () => Promise<void>;

  saveLine: (lineNumber: RealLineNumber, strokes: Stroke[], firstContent: number) => Promise<void>;
  listSavedLines: () => Promise<Iterable<RealLineNumber>>;
  getSavedLine: (lineNumber: RealLineNumber, scale_factor: number, old_margin: number, new_margin: number) => Promise<LineSaveData>;

  saveLastLine: (lastLine: number) => Promise<void>;
  getLastLine: () => Promise<number | null>;

  saveUIState: (state: any) => Promise<void>;
  getUIState: () => Promise<any>;

  dumpNoteBookData: () => Promise<Blob>;
}
