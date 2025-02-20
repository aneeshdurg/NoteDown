import { NoteDownDocument } from './document.ts';
import { NoteDownStorageManager } from './storage_manager.ts';
import { RealLineNumber } from './types.ts';
import { Stroke } from './stroke.ts';

/**
 * Abstract base class for an event that can be recorded as history
 */
export abstract class HistoryEvent {
  /**
   * Apply this event to `engine`
   */
  abstract execute(engine: NoteDownEngine): Promise<void>;
  /**
   * Undo `this.execute`
   * Assumes that the most recently applied event to `engine` was `this`.
   */
  abstract unexecute(engine: NoteDownEngine): Promise<void>;
}

/**
 * Abstract base class for a history event that holds a line number
 */
abstract class LineEvent extends HistoryEvent {
  /**
   * Line number to operate on
   */
  line: RealLineNumber
  constructor(line: RealLineNumber) {
    super();
    this.line = line;
  }
}

/**
 * Event that records the effect of adding a new stroke
 */
export class StrokeEvent extends LineEvent {
  /**
   * Stroke to add or remove from the engine
   */
  stroke: Stroke;

  constructor(line: RealLineNumber, stroke: Stroke) {
    super(line);
    this.stroke = stroke;
  }

  async execute(engine: NoteDownEngine) {
    await engine.doc.add_stroke(this.line, this.stroke, engine.storage);
  }

  async unexecute(engine: NoteDownEngine) {
    await engine.doc.pop_stroke(this.line, engine.storage);
  }
}

/**
 * Event that records the end of an erase
 *
 * When the user begins erasing, a series of `EraserEvent`s are created for each
 * "stroke" of the eraser. When the eraser s lifted, an EraserEventGroupEndEvent
 * is generated. This allows each erase stroke to be immediately commited to
 * history, but also allows a single undo to restore ALL erased content.
 */
export class EraserEventGroupEndEvent extends HistoryEvent {
  async execute(engine: NoteDownEngine) {
    if (engine.history.length < 2) {
      return
    }

    if (engine.history[engine.history.length - 2] instanceof EraserEventGroupEndEvent) {
      // Remove the duplicate GroupEnd event.
      engine.history.pop();
    }
  }

  async unexecute(engine: NoteDownEngine) {
    while (engine.history[engine.history.length - 1] instanceof EraserEvent) {
      engine.pop();
    }
  }
}

/**
 * Event that records the effect of a single erase stroke
 */
export class EraserEvent extends HistoryEvent {
  // This is super expensive - we actually just need to store for each deleted
  // stroke the line number and index of that stroke.
  original: Map<RealLineNumber, Stroke[]>
  new_strokes: Map<RealLineNumber, Stroke[]>
  constructor(original: Map<RealLineNumber, Stroke[]>, new_strokes: Map<RealLineNumber, Stroke[]>) {
    super();
    this.original = original;
    this.new_strokes = new_strokes;
  }

  async execute(engine: NoteDownEngine) {
    const promises: Promise<void>[] = [];
    this.new_strokes.forEach((strokes, line) => {
      promises.push(engine.doc.updateStrokes(line, strokes, engine.storage));
    });
    await Promise.all(promises);
  }

  async unexecute(engine: NoteDownEngine) {
    const promises: Promise<void>[] = [];
    this.original.forEach((strokes, line) => {
      promises.push(engine.doc.updateStrokes(line, strokes, engine.storage));
    });
    await Promise.all(promises);
  }
}

/**
 * Event that records the effect of adding lines to the document
 */
export class AddLineEvent extends LineEvent {
  num_lines: number
  constructor(line: RealLineNumber, num_lines: number) {
    super(line);
    this.num_lines = num_lines;
  }

  async execute(engine: NoteDownEngine) {
    await engine.doc.insertLines(this.line, this.num_lines, engine.storage);
  }

  async unexecute(engine: NoteDownEngine) {
    await engine.doc.deleteLines(this.line, this.num_lines, engine.storage);
  }
}

/**
 * Event that records the effect of deleting lines to the document
 */
export class DeleteLineEvent extends LineEvent {
  num_lines: number

  linesToStrokes: Map<RealLineNumber, Stroke[]> = new Map();
  linesTofirstContent: Map<RealLineNumber, number> = new Map();

  constructor(line: RealLineNumber, num_lines: number) {
    super(line);
    this.num_lines = num_lines;
  }


  async execute(engine: NoteDownEngine) {
    for (let i = 0; i < this.num_lines; i++) {
      let curr_line = this.line + i as RealLineNumber;
      if (engine.doc.linesToStrokes.has(curr_line)) {
        this.linesToStrokes.set(curr_line, engine.doc.linesToStrokes.get(curr_line)!);
        this.linesTofirstContent.set(curr_line, engine.doc.linesTofirstContent.get(curr_line)!);
      };
    };
    await engine.doc.deleteLines(this.line, this.num_lines, engine.storage);
  }

  async unexecute(engine: NoteDownEngine) {
    await engine.doc.insertLines(this.line, this.num_lines, engine.storage);
    for (let i = 0; i < this.num_lines; i++) {
      let curr_line = this.line + i as RealLineNumber;
      if (this.linesToStrokes.has(curr_line)) {
        engine.doc.linesToStrokes.set(curr_line, this.linesToStrokes.get(curr_line)!);
        engine.doc.linesTofirstContent.set(curr_line, this.linesTofirstContent.get(curr_line)!);
        await engine.doc.saveToStorage(curr_line, engine.storage);
      };
    };

  }
}

/**
 * Event that records the effect of duplicating a line
 */
export class DuplicateLineEvent extends LineEvent {
  async execute(engine: NoteDownEngine) {
    await engine.doc.insertLines(this.line, 1, engine.storage);
    await engine.doc.copyLine(engine.storage, this.line + 1 as RealLineNumber, this.line);
  }

  async unexecute(engine: NoteDownEngine) {
    await engine.doc.deleteLines(this.line, 1, engine.storage);
  }
}

/**
 * Event that records the effect of moving a line
 */
export class MoveEvent extends HistoryEvent {
  src_line: RealLineNumber
  dst_line: RealLineNumber
  move_children: boolean

  constructor(src_line: RealLineNumber, dst_line: RealLineNumber, move_children: boolean) {
    super();
    this.src_line = src_line;
    this.dst_line = dst_line;
    this.move_children = move_children;
  }

  async execute(engine: NoteDownEngine) {
    await engine.doc.moveLines(this.src_line, this.dst_line, this.move_children, engine.storage);
  }

  async unexecute(engine: NoteDownEngine) {
    if (this.src_line < this.dst_line) {
      await engine.doc.moveLines(this.dst_line - 1 as RealLineNumber, this.src_line, this.move_children, engine.storage);
    } else {
      await engine.doc.moveLines(this.dst_line, this.src_line + 1 as RealLineNumber, this.move_children, engine.storage);
    }
  }
}

/**
 * Event that records the effect of indenting a line
 */
export class IndentEvent extends LineEvent {
  direction: -1 | 1;
  indent_children: boolean;
  constructor(line: RealLineNumber, direction: -1 | 1, indent_children: boolean) {
    super(line);
    this.direction = direction;
    this.indent_children = indent_children;
  }

  async execute(engine: NoteDownEngine) {
    await engine.doc.indent(this.line, this.direction, this.indent_children, engine.storage);
  }

  async unexecute(engine: NoteDownEngine) {
    await engine.doc.indent(this.line, (-1 * this.direction) as (-1 | 1), this.indent_children, engine.storage);
  }
}

/**
 * Engine that applies `HistoryEvent`s to a `NoteDownDocument` and persists
 * mutations to a `NoteDownStorageManager`.
 */
export class NoteDownEngine {
  /**
   * Document to operate on
   */
  doc: NoteDownDocument;
  /**
   * Storage manager to persist changes to
   */
  storage: NoteDownStorageManager;

  /**
   * List of `HistoryEvent`s that have been `execute`d.
   */
  history: HistoryEvent[] = [];

  constructor(doc: NoteDownDocument, storage: NoteDownStorageManager) {
    this.doc = doc;
    this.storage = storage;
  }

  /**
   * Execute `event` after adding it to the engine's history
   */
  async execute(event: HistoryEvent) {
    this.history.push(event);
    await event.execute(this);
  }

  /**
   * Unexecute the most recent event in history and return the event unexecuted.
   */
  async pop(): Promise<HistoryEvent | undefined> {
    const evt = this.history.pop();
    if (evt) {
      await evt.unexecute(this);
    }
    return evt;
  }
}
