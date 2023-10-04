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

  async indent(line: RealLineNumber, direction: 1 | -1, indent_children: boolean, storage: NoteDownStorageManager, width: number = -1) {
    if (this.linesToStrokes.get(line) === undefined) {
      return;
    }

    if (width === -1) {
      width = this.indentWidth;
      const firstContent = this.linesTofirstContent.get(line)!;
      const rem = firstContent % this.indentWidth;
      if (rem != 0) {
        if (direction == -1) {
          width = rem;
        } else {
          width = this.indentWidth - rem;
        }
      }

      console.log("Width", width);
    }
    const strokes = this.linesToStrokes.get(line)!;
    for (let i = 0; i < strokes.length; i++) {
      const stroke = strokes[i];
      for (let j = 0; j < stroke.x_points.length; j++) {
        stroke.x_points[j] += direction * width;
      }
    }
    this.linesTofirstContent.set(line,
      this.linesTofirstContent.get(line)! + direction * width);

    const promises: Promise<void>[] = [];
    promises.push(this.saveToStorage(line, storage));

    if (indent_children) {
      for (let child of this.childLines(line)) {
        promises.push(this.indent(child, direction, false, storage, width));
      }
    }

    await Promise.all(promises);
  }

  hasContent(lineNo: RealLineNumber) {
    const firstContent = this.linesTofirstContent.get(lineNo);
    if (firstContent === undefined || firstContent === 0) {
      return false;
    }
    return true;
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

  async add_stroke(curr_line: RealLineNumber, stroke: Stroke, storage: NoteDownStorageManager | null) {
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


    if (storage) {
      await this.saveToStorage(curr_line, storage);
    }
    await this.updateLastLine(curr_line, storage);
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

  async updateLastLine(new_last: RealLineNumber, storage: NoteDownStorageManager | null, force: boolean = false) {
    // TODO The document can only ever grow with this implementation
    this.last_line = Math.max(this.last_line, new_last);
    if (force) {
      this.last_line = new_last;
    }
    if (storage) {
      await storage.saveLastLine(this.last_line);
    }
  }

  async deleteLines(start: RealLineNumber, count: number, storage: NoteDownStorageManager) {
    for (let i = start; i < this.last_line; i++) {
      const line = i + count as RealLineNumber
      if (this.linesToStrokes.get(line) !== undefined) {
        this.linesToStrokes.set(i, this.linesToStrokes.get(line)!);
        this.linesTofirstContent.set(i, this.linesTofirstContent.get(line)!);
      } else {
        this.linesToStrokes.delete(i);
        this.linesTofirstContent.delete(i);
      }
    }
    this.updateLastLine(this.last_line - count as RealLineNumber, storage, true);
    for (let i = 0 as RealLineNumber; i < this.last_line; i++) {
      await this.saveToStorage(i, storage);
    }
  }

  async insertLines(target: RealLineNumber, count: number, storage: NoteDownStorageManager) {
    for (let i = this.last_line as RealLineNumber; i >= target; i--) {
      const line = i + count as RealLineNumber;
      if (this.linesToStrokes.get(i) !== undefined) {
        this.linesToStrokes.set(line, this.linesToStrokes.get(i)!);
        this.linesTofirstContent.set(line, this.linesTofirstContent.get(i)!);

        this.linesToStrokes.delete(i);
        this.linesTofirstContent.delete(i);
      } else {
        this.linesToStrokes.delete(line);
        this.linesTofirstContent.delete(line);
      }
    }
    this.updateLastLine(this.last_line + count as RealLineNumber, storage);
    for (let i = 0 as RealLineNumber; i < this.last_line; i++) {
      await this.saveToStorage(i, storage);
    }
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
    await this.deleteLines(src, remap_amt, storage);

    if (dst > src) {
      dst = dst - remap_amt as RealLineNumber;
    }

    // Create a gap where the new lines will go
    this.insertLines(dst, remap_amt, storage);

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

  rootOnlyDoc(): { doc: NoteDownDocument, mapping: Map<RealLineNumber, RealLineNumber> } {
    const doc = new NoteDownDocument();
    let new_line_no = 0 as RealLineNumber;
    let i = 0 as RealLineNumber
    const mapping = new Map<RealLineNumber, RealLineNumber>();
    while (i <= this.last_line) {
      if (this.hasContent(i)) {
        const children = this.childLines(i).length;
        console.log("Selecting", i, this.last_line, children);
        for (let s of this.linesToStrokes.get(i)!) {
          doc.add_stroke(new_line_no, s, null);
        }
        mapping.set(new_line_no, i);
        new_line_no = new_line_no + 1 as RealLineNumber;
        if (children) {
          i = i + children as RealLineNumber;
        } else {
          console.log("   !", i);
        }
      } else {
        console.log("   !", i, this.linesTofirstContent.get(i));
      }
      i++;
    }
    console.log(this.linesTofirstContent);
    return { doc: doc, mapping: mapping };
  }

  async copyLine(storage: NoteDownStorageManager, src: RealLineNumber, dst: RealLineNumber) {
    const firstContent = this.linesTofirstContent.get(src)!;
    const strokes = this.linesToStrokes.get(src)!.map(x => x.copy());

    this.linesTofirstContent.set(dst, firstContent);
    this.linesToStrokes.set(dst, strokes);
    await this.saveToStorage(dst, storage);
  }
}
