import { NoteDownDocument } from './document.ts';
import { NoteDownStorageManager } from './storage_manager.ts';
import { RealLineNumber } from './types.ts';
import { Stroke } from './stroke.ts';

abstract class HistoryEvent {
  abstract execute(engine: NoteDownEngine): Promise<void>;
  abstract execute(engine: NoteDownEngine): Promise<void>;
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
}

export class DuplicateLineEvent extends LineEvent {
  async execute(engine: NoteDownEngine) {
    await engine.doc.insertLines(this.line, 1, engine.storage);
    await engine.doc.copyLine(engine.storage, this.line + 1 as RealLineNumber, this.line);
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
}
