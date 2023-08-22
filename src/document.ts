import { Stroke } from './stroke.ts';
import { RealLineNumber } from './types.ts';

export class NoteDownDocument {
  last_line: number = 9;
  indentWidth = 20;

  linesToStrokes: Map<RealLineNumber, Stroke[]> = new Map();
  linesTofirstContent: Map<RealLineNumber, number> = new Map();

  constructor() { }

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

  add_stroke(curr_line: RealLineNumber, stroke: Stroke) {
    if (!this.linesToStrokes.has(curr_line)) {
      this.linesToStrokes.set(curr_line, []);
    }
    this.linesToStrokes.get(curr_line)?.push(stroke);

    let leftMostPoint = Infinity;
    for (let i = 0; i < stroke.x_points.length; i++) {
      // TODO:
      // if (stroke.y_points[i] < 0 || stroke.y_points[i] >= line_spacing) {
      //   continue;
      // }

      leftMostPoint = Math.min(leftMostPoint, stroke.x_points[i]);
    }
    if (!this.linesTofirstContent.has(curr_line)) {
      this.linesTofirstContent.set(curr_line, leftMostPoint)
    }
    this.linesTofirstContent.set(curr_line,
      Math.min(this.linesTofirstContent.get(curr_line) || 0, leftMostPoint));
  }

  updateLastLine(new_last: RealLineNumber) {
    // TODO The document can only ever grow with this implementation
    this.last_line = Math.max(this.last_line, new_last);
  }
}
