import { Stroke } from './stroke.ts';
import { RealLineNumber } from './types.ts';
import { NoteDownStorageManager } from './storage_manager.ts';

export class NoteDownDocument {
  last_line: number = 9;
  indentWidth = 20;

  linesToStrokes: Map<RealLineNumber, Stroke[]> = new Map();
  linesTofirstContent: Map<RealLineNumber, number> = new Map();

  constructor() { }

  async load(storage: NoteDownStorageManager) {
    this.last_line = (await storage.getLastLine()) || this.last_line;
    const saved_lines = await storage.listSavedLines();
    for (let saved_line of saved_lines) {
      const line_data = await storage.getSavedLine(saved_line);
      this.linesToStrokes.set(saved_line, line_data.strokes);
      this.linesTofirstContent.set(saved_line, line_data.firstContent);
    }
  }

  indent(line: RealLineNumber) {
    if (!this.linesToStrokes.has(line)) {
      return;
    }

    const strokes = this.linesToStrokes.get(line)!;
    for (let i = 0; i < strokes.length; i++) {
      const stroke = strokes[i];
      for (let j = 0; j < stroke.x_points.length; j++) {
        stroke.x_points[j] += this.indentWidth;
      }
    }
    this.linesTofirstContent.set(line,
      this.linesTofirstContent.get(line)! + this.indentWidth);
  }

  unindent(line: RealLineNumber) {
    if (!this.linesToStrokes.has(line)) {
      return;
    }

    // TODO guard against < 0?
    const strokes = this.linesToStrokes.get(line)!;
    for (let i = 0; i < strokes.length; i++) {
      const stroke = strokes[i];
      for (let j = 0; j < stroke.x_points.length; j++) {
        stroke.x_points[j] -= this.indentWidth;
      }
    }
    this.linesTofirstContent.set(line,
      this.linesTofirstContent.get(line)! - this.indentWidth);
  }

  childLines(root: RealLineNumber) {
    let section: RealLineNumber[] = [];
    let blankLineCount = 0;
    let lineNo = root;

    let indent = this.linesTofirstContent.get(lineNo);
    if (indent === undefined) {
      return section;
    }

    (lineNo as number) += 1
    for (; lineNo <= this.last_line; lineNo++) {
      const firstContent = this.linesTofirstContent.get(lineNo);
      if (firstContent === undefined) {
        blankLineCount += 1;
        if (blankLineCount == 1) {
          section.push(lineNo as RealLineNumber);
          break;
        }
        continue;
      }
      if (indent < firstContent && Math.abs(indent - firstContent) > this.indentWidth) {
        section.push(lineNo);
      } else {
        break;
      }
      blankLineCount = 0;
    }
    return section;
  }

  async add_stroke(curr_line: RealLineNumber, stroke: Stroke, storage: NoteDownStorageManager) {
    if (!this.linesToStrokes.has(curr_line)) {
      this.linesToStrokes.set(curr_line, []);
    }
    this.linesToStrokes.get(curr_line)?.push(stroke);

    let leftMostPoint = stroke.leftMostPoint();
    if (!this.linesTofirstContent.has(curr_line)) {
      this.linesTofirstContent.set(curr_line, leftMostPoint)
    }
    this.linesTofirstContent.set(curr_line,
      Math.min(this.linesTofirstContent.get(curr_line) || 0, leftMostPoint));


    await this.saveToStorage(curr_line, storage);
  }

  async updateStrokes(line: RealLineNumber, strokes: Stroke[], storage: NoteDownStorageManager) {
    this.linesToStrokes.set(line, strokes);
    let leftMostPoint = Infinity;
    strokes.forEach((s) => {
      leftMostPoint = Math.min(leftMostPoint, s.leftMostPoint());
    });
    this.linesTofirstContent.set(line, leftMostPoint);
    await this.saveToStorage(line, storage);
  }

  async saveToStorage(line: RealLineNumber, storage: NoteDownStorageManager) {
    await storage.saveLine(line, this.linesToStrokes.get(line)!, this.linesTofirstContent.get(line)!);
  }

  async updateLastLine(new_last: RealLineNumber, storage: NoteDownStorageManager) {
    // TODO The document can only ever grow with this implementation
    this.last_line = Math.max(this.last_line, new_last);
    await storage.saveLastLine(this.last_line);
  }
}
