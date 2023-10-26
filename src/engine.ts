import { NoteDownDocument } from './document.ts';
import { NoteDownStorageManager } from './storage_manager.ts';
import { RealLineNumber } from './types.ts';
import { Stroke } from './stroke.ts';

class HistoryEvent { }

class LineEvent extends HistoryEvent {
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
}

export class AddLineEvent extends LineEvent {
  num_lines: number
  constructor(line: RealLineNumber, num_lines: number) {
    super(line);
    this.num_lines = num_lines;
  }
}

export class DeleteLineEvent extends LineEvent {
  num_lines: number
  constructor(line: RealLineNumber, num_lines: number) {
    super(line);
    this.num_lines = num_lines;
  }
}

export class DuplicateLineEvent extends LineEvent { }

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
}

export class IndentEvent extends LineEvent {
  direction: -1 | 1;
  indent_children: boolean;
  constructor(line: RealLineNumber, direction: -1 | 1, indent_children: boolean) {
    super(line);
    this.direction = direction;
    this.indent_children = indent_children;
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

    if (event instanceof StrokeEvent) {
      return this.execute_stroke(event);
    }

    if (event instanceof EraserEvent) {
      return this.execute_eraser(event);
    }

    if (event instanceof AddLineEvent) {
      return this.execute_add_line(event);
    }

    if (event instanceof DeleteLineEvent) {
      return this.execute_delete_line(event);
    }

    if (event instanceof DuplicateLineEvent) {
      return this.execute_duplicate_line(event);
    }

    if (event instanceof MoveEvent) {
      return this.execute_move(event);
    }

    if (event instanceof IndentEvent) {
      return this.execute_indent(event);
    }
  }

  async execute_stroke(event: StrokeEvent) {
    await this.doc.add_stroke(event.line, event.stroke, this.storage);
  }

  async execute_eraser(event: EraserEvent) {
    const promises: Promise<void>[] = [];
    event.new_strokes.forEach((strokes, line) => {
      promises.push(this.doc.updateStrokes(line, strokes, this.storage));
    });
    await Promise.all(promises);
  }

  async execute_add_line(event: AddLineEvent) {
    await this.doc.insertLines(event.line, event.num_lines, this.storage);
  }

  async execute_delete_line(event: DeleteLineEvent) {
    await this.doc.deleteLines(event.line, event.num_lines, this.storage);
  }

  async execute_duplicate_line(event: DuplicateLineEvent) {
    await this.doc.insertLines(event.line, 1, this.storage);
    await this.doc.copyLine(this.storage, event.line + 1 as RealLineNumber, event.line);
  }

  async execute_move(event: MoveEvent) {
    await this.doc.moveLines(event.src_line, event.dst_line, event.move_children, this.storage);
  }

  async execute_indent(event: IndentEvent) {
    await this.doc.indent(event.line, event.direction, event.indent_children, this.storage);
  }
}
