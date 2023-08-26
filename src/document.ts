import { Stroke } from './stroke.ts';
import { RealLineNumber } from './types.ts';
import { NoteDownStorageManager } from './storage_manager.ts';

export class NoteDownDocument {
  last_line: number = 9;
  indentWidth = 20;

  linesToStrokes: Map<RealLineNumber, Stroke[]> = new Map();
  linesTofirstContent: Map<RealLineNumber, number> = new Map();

  constructor() { }

  async load(storage: NoteDownStorageManager, scale_factor: number, old_margin: number, new_margin: number) {
    this.last_line = (await storage.getLastLine()) || this.last_line;
    const saved_lines = await storage.listSavedLines();
    for (let saved_line of saved_lines) {
      const line_data = await storage.getSavedLine(saved_line, scale_factor, old_margin, new_margin);
      if (line_data.strokes === null) {
      } else {
        this.linesToStrokes.set(saved_line, line_data.strokes);
        this.linesTofirstContent.set(saved_line, line_data.firstContent!);
      }
    }
  }

  async indent(line: RealLineNumber, direction: 1 | -1, indent_children: boolean, storage: NoteDownStorageManager) {
    if (this.linesToStrokes.get(line) === undefined) {
      return;
    }

    const strokes = this.linesToStrokes.get(line)!;
    for (let i = 0; i < strokes.length; i++) {
      const stroke = strokes[i];
      for (let j = 0; j < stroke.x_points.length; j++) {
        stroke.x_points[j] += direction * this.indentWidth;
      }
    }
    this.linesTofirstContent.set(line,
      this.linesTofirstContent.get(line)! + direction * this.indentWidth);

    const promises: Promise<void>[] = [];
    promises.push(this.saveToStorage(line, storage));

    if (indent_children) {
      for (let child of this.childLines(line)) {
        promises.push(this.indent(child, direction, false, storage));
      }
    }

    await Promise.all(promises);
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
        } else {
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
    if (this.linesToStrokes.get(curr_line) === undefined) {
      this.linesToStrokes.set(curr_line, []);
    }
    this.linesToStrokes.get(curr_line)?.push(stroke);

    let leftMostPoint = stroke.leftMostPoint();
    if (this.linesTofirstContent.get(curr_line) === undefined) {
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

  async moveLines(src: RealLineNumber, dst: RealLineNumber, move_children: boolean, storage: NoteDownStorageManager) {
    const remap_amt = 1 + (move_children ? this.childLines(src).length : 0);

    const src_strokes: (Stroke[] | undefined)[] = []
    const src_firstContents: (number[] | undefined) = []
    for (let i = 0; i < remap_amt; i++) {
      const strokes = this.linesToStrokes.get(src + i as RealLineNumber)!;
      const firstContent = this.linesTofirstContent.get(src + i as RealLineNumber)!;

      src_strokes.push(strokes);
      src_firstContents.push(firstContent);
    }

    // Remove the lines from the src document
    for (let i = src; i < this.last_line; i++) {
      const line = i + remap_amt as RealLineNumber
      if (this.linesToStrokes.get(line) !== undefined) {
        this.linesToStrokes.set(i, this.linesToStrokes.get(line)!);
        this.linesTofirstContent.set(i, this.linesTofirstContent.get(line)!);
      } else {
        this.linesToStrokes.delete(i);
        this.linesTofirstContent.delete(i);
      }
    }
    this.last_line -= remap_amt;

    if (dst > src) {
      dst = dst - remap_amt as RealLineNumber;
    }

    // Create a gap where the new lines will go
    for (let i = this.last_line as RealLineNumber; i >= dst; i--) {
      const line = i + remap_amt as RealLineNumber;
      if (this.linesToStrokes.get(i) !== undefined) {
        this.linesToStrokes.set(line, this.linesToStrokes.get(i)!);
        this.linesTofirstContent.set(line, this.linesTofirstContent.get(i)!);
      } else {
        this.linesToStrokes.delete(line);
        this.linesTofirstContent.delete(line);
      }
    }
    this.last_line += remap_amt;

    // Paste the new lines
    for (let i = 0; i < remap_amt; i++) {
      const line = dst + i as RealLineNumber
      if (src_strokes[i] !== undefined) {
        this.linesToStrokes.set(line, src_strokes[i]!);
        this.linesTofirstContent.set(line, src_firstContents[i]);
      } else {
        this.linesToStrokes.delete(line);
        this.linesTofirstContent.delete(line);
      }
    }

    for (let i = 0 as RealLineNumber; i < this.last_line; i++) {
      await this.saveToStorage(i, storage);
    }
  }
}
