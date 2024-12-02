import { RealLineNumber } from './types.ts';
import { Stroke } from './stroke.ts';

/**
 * Data needed to persist a line to storage
 */
export type LineSaveData = { strokes: Stroke[] | null, firstContent: number | null };
/**
 * Interface for a storage implementation
*/
export interface NoteDownStorageManager {
  /**
   * List all notebooks tracked in storage
   */
  listNotebooks: () => Promise<string[]>;
  /**
   * Set the active notebook - all methods that retrive data from a notebook
   * will retrieve data from the active notebook
   */
  setActiveNotebook: (notebook: string) => Promise<void>;
  /**
   * Delete a notebook with name `name`
   */
  deleteNotebook: (name: string) => Promise<void>;

  /**
   * Returns true if the active notebook is initialized. Notebooks must be initialized
   * in storage before any save/load operations can be guaranteed to succeed
   */
  notebookIsInitialized: () => Promise<boolean>;
  /**
   * Initializes the active notebook in storage
   */
  initializeNotebook: () => Promise<void>;

  /**
   * Saves a line to the active notebook with the data provided.
   * Previous data at `lineNumber` may be cleared if previously present.
   */
  saveLine: (lineNumber: RealLineNumber, strokes: Stroke[], firstContent: number) => Promise<void>;
  /**
   * List all lines in the active notebook with save data
   */
  listSavedLines: () => Promise<Iterable<RealLineNumber>>;
  /**
   * Retrieve a line from storage. `scale_factor`, `old_margin`, `new_margin`
   * are used to resize the contents from storage if the renderer has changed
   * the scale at which rendering is done
   */
  getSavedLine: (lineNumber: RealLineNumber, scale_factor: number, old_margin: number, new_margin: number) => Promise<LineSaveData>;

  /**
   * Save the last line of the active notebook. This can be used to "truncate" the
   * document - shrink or sparsely expand
   */
  saveLastLine: (lastLine: number) => Promise<void>;
  /**
   * Get the maximum line number tracked by the active notebook - can be
   * modified with `this.saveLastLine`
   */
  getLastLine: () => Promise<number | null>;

  /**
   * Save an arbitrary object to storage representing any UI configuration that
   * should be persisted
   */
  saveUIState: (state: any) => Promise<void>;
  /**
   * Get the saved UI state
   */
  getUIState: () => Promise<any>;

  /**
   * Serialize all data for the active notebook as a downloadable Blob
   */
  dumpNoteBookData: () => Promise<Blob>;
}
