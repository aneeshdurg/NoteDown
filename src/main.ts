import { Stroke } from './stroke.ts';
import { Opaque } from './opaque.ts';

declare const RenderedLineNumberS: unique symbol
type RenderedLineNumber = Opaque<number, typeof RenderedLineNumberS>
function ToRenderedLineNumber(n: number): RenderedLineNumber {
  return (n as any);
}

declare const RealLineNumberS: unique symbol
type RealLineNumber = Opaque<number, typeof RealLineNumberS>
function ToRealLineNumber(n: number): RealLineNumber {
  return (n as any);
}

const touchWrapper = (f) => {
  return (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].radiusX == 0 && e.changedTouches[i].radiusY == 0) {
        f(e.changedTouches[i]);
        break;
      }
    }
  }
};

class NoteDownEngine {
  hidden_roots: Set<number> = new Set();
  last_line: number = 9;
  rendered_lines: number = 10;

  lineToRealLine: Map<RenderedLineNumber, RealLineNumber> = new Map();
  linesToStrokes: Map<RealLineNumber, Stroke[]> = new Map();
  linesTofirstContent: Map<RealLineNumber, number> = new Map();

  constructor() {
    for (let i = 0; i <= this.last_line; i++) {
      this.lineToRealLine.set(ToRenderedLineNumber(i), ToRealLineNumber(i));
    }
  }

  childLines(root: RealLineNumber) {
    let section: RealLineNumber[] = [];
    let blankLineCount = 0;
    let lineNo = root;

    let indent = this.linesTofirstContent.get(lineNo);
    console.log(lineNo, indent)
    if (indent === undefined) {
      return section;
    }

    (lineNo as number) += 1
    for (; lineNo < this.last_line; lineNo++) {
      const firstContent = this.linesTofirstContent.get(lineNo);
      if (firstContent === undefined) {
        blankLineCount += 1;
        continue;
      }
      if (blankLineCount < 2 && indent < firstContent && Math.abs(indent - firstContent) > 10) {
        if (blankLineCount == 1) {
          section.push(ToRealLineNumber(lineNo - 1));
        }
        section.push(lineNo);
      } else {
        break;
      }
      blankLineCount = 0;
    }
    return section;
  }

  add_stroke(line: RenderedLineNumber, stroke: Stroke) {
    const curr_line = this.lineToRealLine.get(line);
    if (curr_line === undefined) {
      return;
    }
    if (!this.linesToStrokes.has(curr_line)) {
      this.linesToStrokes.set(curr_line, []);
    }
    this.linesToStrokes.get(curr_line)?.push(stroke);

    let leftMostPoint = Infinity;
    for (let i = 0; i < stroke.x_points.length; i++) {
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

  toggleLineHidden(line: RenderedLineNumber): boolean {
    console.log("toggleLineHidden", line);
    let real_line = this.lineToRealLine.get(line);
    if (real_line === undefined) {
      return false;
    }
    const hidden_real_lines_list = this.childLines(real_line);
    const hidden_real_lines = new Set(hidden_real_lines_list);
    console.log(hidden_real_lines);

    if (this.hidden_roots.has(real_line)) {
      const lines_to_unhide: RealLineNumber[] = [];
      let i = 0;
      while (i < hidden_real_lines_list.length) {
        const line = hidden_real_lines_list[i];
        lines_to_unhide.push(line);
        if (this.hidden_roots.has(line)) {
          const hidden_child_lines = this.childLines(line);
          console.log(line, "->", hidden_child_lines);
          i += hidden_child_lines.length + 1;
        } else {
          i++;
        }
      }
      console.log("!", lines_to_unhide);
      for (let i = this.rendered_lines - 1; i >= line + 1 + lines_to_unhide.length; i--) {
        this.lineToRealLine.set(
          ToRenderedLineNumber(i),
          this.lineToRealLine.get((i - lines_to_unhide.length) as RenderedLineNumber) || ToRealLineNumber(0)
        );
      }
      for (let i = 0; i < lines_to_unhide.length; i++) {
        console.log("s", line + 1 + i, lines_to_unhide[i])
        this.lineToRealLine.set((line + 1 + i) as RenderedLineNumber, lines_to_unhide[i]);
      }
      this.hidden_roots.delete(real_line);
      return true;
    } else {
      (line as number) += 1;
      let start_line = line;
      while (line < this.rendered_lines &&
        hidden_real_lines.has(this.lineToRealLine.get(line) || ToRealLineNumber(0))) {
        console.log(line);
        (line as number) += 1;
      }
      let end_line = line;

      if (start_line != end_line) {
        this.hidden_roots.add(real_line);
        for (let i = 0; i < this.rendered_lines - start_line; i++) {
          let phys_target_line = (end_line + i) as RenderedLineNumber;
          let target_line = this.lineToRealLine.get(phys_target_line);
          if (target_line == undefined) {
            target_line = (this.last_line + 1) as RealLineNumber;
          }
          console.log("s", start_line + i, target_line);
          this.lineToRealLine.set((start_line + i) as RenderedLineNumber, target_line);
          this.last_line = Math.max(this.last_line, target_line);
        }

        return true;
      }
    }
    return false;
  }
}

class NoteDownUI {
  engine: NoteDownEngine;

  ctx: CanvasRenderingContext2D
  clicked = false;
  currentStroke: Stroke | null = null;
  curr_location: { x: number, y: number } | null = null;
  margin_click_touch = false;

  line_spacing = 100;
  left_margin = 50;

  constructor(ctx: CanvasRenderingContext2D, engine: NoteDownEngine) {
    this.engine = engine;

    this.ctx = ctx;

    const mouseDownHandler = this.mouseDownHandler.bind(this);
    this.ctx.canvas.addEventListener("mousedown", mouseDownHandler);
    this.ctx.canvas.addEventListener("touchstart", touchWrapper(mouseDownHandler));

    const mouseUpHandler = this.mouseUpHandler.bind(this);
    this.ctx.canvas.addEventListener("mouseup", mouseUpHandler);
    this.ctx.canvas.addEventListener("touchend", touchWrapper(mouseUpHandler));

    const mouseMoveHandler = this.mouseMoveHandler.bind(this);
    this.ctx.canvas.addEventListener("mousemove", mouseMoveHandler);
    this.ctx.canvas.addEventListener("touchmove", touchWrapper(mouseMoveHandler));

    this.draw_layout();
  }

  // Draw ruled layout
  draw_layout() {
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 1;

    for (let i = 0; i < this.ctx.canvas.height; i += this.line_spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.ctx.canvas.width, i);
      this.ctx.stroke();
    }
    this.ctx.beginPath();
    this.ctx.moveTo(this.left_margin, 0);
    this.ctx.lineTo(this.left_margin, this.ctx.canvas.height);
    this.ctx.stroke();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  getCanvasCoords(e) {
    const rect = this.ctx.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * this.ctx.canvas.width / rect.width;
    const y = (e.clientY - rect.top) * this.ctx.canvas.height / rect.height;
    return { x: x, y: y };
  }

  clearAndRedraw() {
    this.clear();
    this.draw_layout();
    this.engine.lineToRealLine.forEach((real_line, phys_line) => {
      const strokes = this.engine.linesToStrokes.get(real_line);
      if (strokes === undefined) {
        return;
      }

      for (let i = 0; i < strokes.length; i++) {
        strokes[i].draw(this.ctx, phys_line * this.line_spacing);
      }

      if (this.engine.hidden_roots.has(real_line)) {
        this.ctx.strokeStyle = "black";
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(this.left_margin / 4, phys_line * this.line_spacing + this.line_spacing / 2);
        this.ctx.lineTo(3 * this.left_margin / 4, phys_line * this.line_spacing + this.line_spacing / 2);
        this.ctx.moveTo(this.left_margin / 2, phys_line * this.line_spacing + this.line_spacing / 4);
        this.ctx.lineTo(this.left_margin / 2, phys_line * this.line_spacing + 3 * this.line_spacing / 4);
        this.ctx.stroke();
      }
    });
  }

  mouseDownHandler(e) {
    const coords = this.getCanvasCoords(e);
    if (coords.x <= this.left_margin) {
      this.margin_click_touch = true;
      return;
    }
    this.currentStroke = new Stroke(coords.y - (coords.y % this.line_spacing))
    this.currentStroke.add(coords.x, coords.y);
    this.clicked = true;
    this.curr_location = coords;
  }

  clickHandler(e) {
    const coords = this.getCanvasCoords(e);
    if (coords.x > this.left_margin) {
      return;
    }

    let curr_line = ToRenderedLineNumber(Math.floor(coords.y / this.line_spacing));
    if (this.engine.toggleLineHidden(curr_line)) {
      this.clearAndRedraw();
    }
  }

  mouseUpHandler(e) {
    if (this.margin_click_touch) {
      this.margin_click_touch = false;
      this.clickHandler(e);
      return;
    }
    if (!this.clicked || !this.currentStroke) {
      return;
    }
    this.clicked = false;
    this.curr_location = null;
    this.currentStroke.draw(this.ctx, this.currentStroke.y_root);
    const phys_line = ToRenderedLineNumber(Math.floor(this.currentStroke.y_root / this.line_spacing));
    this.engine.add_stroke(phys_line, this.currentStroke);
    this.currentStroke = null;
  };

  mouseMoveHandler(e) {
    const coords = this.getCanvasCoords(e);
    if (!this.clicked || !this.curr_location) {
      if (this.margin_click_touch && coords.x > this.left_margin) {
        this.margin_click_touch = false;
      }
      return;
    }
    if (coords.x <= this.left_margin) {
      return;
    }

    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo(this.curr_location.x, this.curr_location.y);
    this.ctx.lineTo(coords.x, coords.y);
    this.ctx.stroke();
    this.curr_location = coords;
    this.currentStroke?.add(coords.x, coords.y);
  }
}



export async function main() {
  const canvas = <HTMLCanvasElement>document.getElementById("mycanvas");
  canvas.width = 1000;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const engine = new NoteDownEngine();
  const ui = new NoteDownUI(ctx, engine);

  (window as any).notedown_ui = ui;
}
