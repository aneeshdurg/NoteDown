import { RealLineNumber } from './types.ts';
import { Stroke } from './stroke.ts';

export interface NoteDownStorageManager {
  listNotebooks: () => Promise<string[]>;
  setActiveNotebook: (notebook: string) => Promise<void>;

  notebookIsInitialized: () => Promise<boolean>;
  initializeNotebook: () => Promise<void>;

  saveLine: (lineNumber: RealLineNumber, strokes: Stroke[], firstContent: number) => Promise<void>;
  listSavedLines: () => Promise<Iterable<RealLineNumber>>;
  getSavedLine: (lineNumber: RealLineNumber) => Promise<{ strokes: Stroke[] | null, firstContent: number | null }>;

  saveLastLine: (lastLine: number) => Promise<void>;
  getLastLine: () => Promise<number | null>;

  saveUIState: (state: any) => Promise<void>;
  getUIState: () => Promise<any>;
}
