import { NoteDownDocument } from './document.ts';
import { NoteDownStorageManager } from './storage_manager.ts';
import { RealLineNumber } from './types.ts';
import { Stroke } from './stroke.ts';

abstract class HistoryEvent {
  abstract execute(engine: NoteDownEngine): Promise<void>;
  abstract unexecute(engine: NoteDownEngine): Promise<void>;
}

abstract class LineEvent extends HistoryEvent {
  line: RealLineNumber
  constructor(line: RealLineNumber) {
    super();
    this.line = line;
  }
}

export class StrokeEvent extends LineEvent {
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

export class DeleteLineEvent extends LineEvent {
  num_lines: number
  constructor(line: RealLineNumber, num_lines: number) {
    super(line);
    this.num_lines = num_lines;
  }

  async execute(engine: NoteDownEngine) {
    await engine.doc.deleteLines(this.line, this.num_lines, engine.storage);
  }

  async unexecute(engine: NoteDownEngine) {
    await engine.doc.insertLines(this.line, this.num_lines, engine.storage);
  }
}

export class DuplicateLineEvent extends LineEvent {
  async execute(engine: NoteDownEngine) {
    await engine.doc.insertLines(this.line, 1, engine.storage);
    await engine.doc.copyLine(engine.storage, this.line + 1 as RealLineNumber, this.line);
  }

  async unexecute(engine: NoteDownEngine) {
    await engine.doc.deleteLines(this.line, 1, engine.storage);
  }
}

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

export class NoteDownEngine {
  doc: NoteDownDocument;
  storage: NoteDownStorageManager;

  history: HistoryEvent[] = [];

  constructor(doc: NoteDownDocument, storage: NoteDownStorageManager) {
    this.doc = doc;
    this.storage = storage;
  }

  async execute(event: HistoryEvent) {
    this.history.push(event);
    await event.execute(this);
  }

  async pop() {
    const evt = this.history.pop();
    if (evt) {
      await evt.unexecute(this);
    }
  }
}
