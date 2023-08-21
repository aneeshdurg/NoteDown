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

class Document {
  last_line: number = 9;

  linesToStrokes: Map<RealLineNumber, Stroke[]> = new Map();
  linesTofirstContent: Map<RealLineNumber, number> = new Map();

  constructor() { }

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
          section.push(ToRealLineNumber(lineNo));
          break;
        }
        continue;
      }
      if (indent < firstContent && Math.abs(indent - firstContent) > 20) {
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

interface InteractiveEvent {
  clientX: number;
  clientY: number;
};

const touchWrapper = (f: (e: InteractiveEvent) => void): (e: TouchEvent) => void => {
  return (e: TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].radiusX == 0 && e.changedTouches[i].radiusY == 0) {
        f(e.changedTouches[i]);
        break;
      }
    }
  }
};

class NoteDownUI {
  doc: Document;

  ctx: CanvasRenderingContext2D
  clicked = false;
  currentStroke: Stroke | null = null;
  curr_location: { x: number, y: number } | null = null;
  margin_click_touch = false;

  line_spacing = 100;
  left_margin = 50;

  lineToRealLine: Map<RenderedLineNumber, RealLineNumber> = new Map();
  rendered_lines: number;

  hidden_roots: Set<RealLineNumber> = new Set();

  constructor(ctx: CanvasRenderingContext2D, doc: Document) {
    this.doc = doc;

    this.ctx = ctx;

    this.ctx.canvas.addEventListener("touchstart", this.genericTouchStart.bind(this));
    this.ctx.canvas.addEventListener("touchend", this.genericTouchEnd.bind(this));
    this.ctx.canvas.addEventListener("touchmove", this.genericTouchMove.bind(this));

    const mouseDownHandler = this.mouseDownHandler.bind(this);
    this.ctx.canvas.addEventListener("mousedown", mouseDownHandler);
    this.ctx.canvas.addEventListener("touchstart", touchWrapper(mouseDownHandler));

    const mouseUpHandler = this.mouseUpHandler.bind(this);
    this.ctx.canvas.addEventListener("mouseup", mouseUpHandler);
    this.ctx.canvas.addEventListener("touchend", touchWrapper(mouseUpHandler));

    const mouseMoveHandler = this.mouseMoveHandler.bind(this);
    this.ctx.canvas.addEventListener("mousemove", mouseMoveHandler);
    this.ctx.canvas.addEventListener("touchmove", touchWrapper(mouseMoveHandler));

    // Callback for scrolling
    this.ctx.canvas.addEventListener("wheel", (e) => {
      if (e.deltaY > 0) {
        this.scrollDown();
        this.clearAndRedraw();
      } else if (e.deltaY < 0) {
        this.scrollUp();
        this.clearAndRedraw();
      }
      e.preventDefault();
    });

    this.draw_layout();

    this.rendered_lines = this.ctx.canvas.height / this.line_spacing;
    for (let i = 0; i < this.rendered_lines; i++) {
      this.lineToRealLine.set(ToRenderedLineNumber(i), ToRealLineNumber(i));
    }

    const trackedPointer = new Set();

    let scrollPos: { x: number, y: number } | null = null;

    this.ctx.canvas.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.pointerType != "touch") {
        return;
      }
      trackedPointer.add(e.pointerId);


      const coords = this.getCanvasCoords(e);
      if (trackedPointer.size > 1) {
        scrollPos = null;
        document.getElementById("log")!.innerHTML = `\n<br>   INVALID ${[...trackedPointer]} ${coords.x}, ${coords.y}` + document.getElementById("log")!.innerHTML;
      } else {
        if (coords.x >= this.left_margin) {
          scrollPos = coords;
        }
        document.getElementById("log")!.innerHTML = `\n<br>   ${coords.x}, ${coords.y}` + document.getElementById("log")!.innerHTML;
      }

      document.getElementById("log")!.innerHTML = `\n<br>Down ${e.pointerId}: ${e.clientX}, ${e.clientY} ${e.pointerType}` + document.getElementById("log")!.innerHTML;
      console.log(e);
    });

    this.ctx.canvas.addEventListener("pointercancel", (e: PointerEvent) => {
      document.getElementById("log")!.innerHTML = `\n<br>Cancel ${e.pointerId}: ${e.pointerType}` + document.getElementById("log")!.innerHTML;
      trackedPointer.delete(e.pointerId);
    });
    this.ctx.canvas.addEventListener("pointerup", (e: PointerEvent) => {
      if (e.pointerType != "touch") {
        return;
      }

      scrollPos = null;

      trackedPointer.delete(e.pointerId);
      document.getElementById("log")!.innerHTML = `\n<br>Up   ${e.pointerId}: ${e.clientX}, ${e.clientY} ${e.pointerType}` + document.getElementById("log")!.innerHTML;
    });

    this.ctx.canvas.addEventListener("pointermove", (e: PointerEvent) => {
      if (e.pointerType != "touch") {
        return;
      }
      if (!trackedPointer.has(e.pointerId)) {
        return;
      }

      const coords = this.getCanvasCoords(e);
      // document.getElementById("log")!.innerHTML = `\n<br>   ${scrollPos === null}` + document.getElementById("log")!.innerHTML;
      if (scrollPos) {
        const deltaY = scrollPos.y - coords.y;
        if (Math.abs(deltaY) > 10) {
          if (deltaY < 0) {
            this.scrollUp();
            this.clearAndRedraw();
          } else {
            this.scrollDown();
            this.clearAndRedraw();
          }
          scrollPos = coords;
        }
        // document.getElementById("log")!.innerHTML = `\n<br>   ${deltaY}` + document.getElementById("log")!.innerHTML;
      }
      // document.getElementById("log")!.innerHTML = `\n<br>Move ${e.pointerId}: ${e.clientX}, ${e.clientY}` + document.getElementById("log")!.innerHTML;
    });
  }

  genericTouchStart(e: TouchEvent) {
    // let counter = 0;
    // for (let i = 0; i < e.changedTouches.length; i++) {
    //   if (e.changedTouches[i].radiusX == 0 && e.changedTouches[i].radiusY == 0) {
    //     continue;
    //   }
    //   counter += 1;
    // }
    // document.getElementById("log")!.innerHTML = counter.toString() + "," + e.changedTouches.length;
  }

  genericTouchMove() {
  }

  genericTouchEnd() {
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

  getCanvasCoords(e: InteractiveEvent) {
    const rect = this.ctx.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * this.ctx.canvas.width / rect.width;
    const y = (e.clientY - rect.top) * this.ctx.canvas.height / rect.height;
    return { x: x, y: y };
  }

  clearAndRedraw() {
    this.clear();
    this.draw_layout();
    this.lineToRealLine.forEach((real_line, phys_line) => {
      const strokes = this.doc.linesToStrokes.get(real_line);
      if (strokes === undefined) {
        return;
      }

      for (let i = 0; i < strokes.length; i++) {
        strokes[i].draw(this.ctx, phys_line * this.line_spacing);
      }

      if (this.hidden_roots.has(real_line)) {
        this.ctx.strokeStyle = "black";
        this.ctx.lineWidth = 5;

        const plus_width = this.left_margin / 2;
        const plus_height = this.line_spacing / 2;
        const plus_dim = Math.min(plus_width, plus_height);

        const mid_pt_x = this.left_margin / 2;
        const mid_pt_y = phys_line * this.line_spacing + this.line_spacing / 2;

        this.ctx.beginPath();
        this.ctx.moveTo(mid_pt_x - plus_dim / 2, mid_pt_y);
        this.ctx.lineTo(mid_pt_x + plus_dim / 2, mid_pt_y);
        this.ctx.moveTo(mid_pt_x, mid_pt_y - plus_dim / 2);
        this.ctx.lineTo(mid_pt_x, mid_pt_y + plus_dim / 2);
        this.ctx.stroke();
      }
    });
  }

  mouseDownHandler(e: InteractiveEvent) {
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

  toggleLineHidden(line: RenderedLineNumber): boolean {
    let real_line = this.lineToRealLine.get(line);
    if (real_line === undefined) {
      return false;
    }
    const hidden_real_lines_list = this.doc.childLines(real_line);
    const hidden_real_lines = new Set(hidden_real_lines_list);

    if (this.hidden_roots.has(real_line)) {
      const lines_to_unhide: RealLineNumber[] = [];
      let i = 0;
      while (i < hidden_real_lines_list.length) {
        const line = hidden_real_lines_list[i];
        lines_to_unhide.push(line);
        if (this.hidden_roots.has(line)) {
          const hidden_child_lines = this.doc.childLines(line);
          i += hidden_child_lines.length + 1;
        } else {
          i++;
        }
      }
      for (let i = this.rendered_lines - 1; i >= line + 1 + lines_to_unhide.length; i--) {
        this.lineToRealLine.set(
          ToRenderedLineNumber(i),
          this.lineToRealLine.get((i - lines_to_unhide.length) as RenderedLineNumber)!
        );
      }
      for (let i = 0; i < lines_to_unhide.length; i++) {
        if ((line + 1 + i) >= this.rendered_lines) {
          break;
        }
        this.lineToRealLine.set((line + 1 + i) as RenderedLineNumber, lines_to_unhide[i]);
      }
      this.hidden_roots.delete(real_line);
      return true;
    } else {
      (line as number) += 1;
      let start_line = line;
      while (line < this.rendered_lines &&
        hidden_real_lines.has(this.lineToRealLine.get(line)!)) {
        (line as number) += 1;
      }
      let end_line = line;

      if (start_line != end_line) {
        this.hidden_roots.add(real_line);
        for (let i = 0; i < this.rendered_lines - start_line; i++) {
          let phys_target_line = (end_line + i) as RenderedLineNumber;
          let target_line = this.lineToRealLine.get(phys_target_line);
          if (target_line === undefined) {
            const prev_line = this.lineToRealLine.get((start_line + i - 1) as RenderedLineNumber)!;
            if (this.hidden_roots.has(prev_line)) {
              const children = this.doc.childLines(prev_line);
              // this assumes children is sorted
              const max_child = children[children.length - 1];
              target_line = (max_child + 1) as RealLineNumber;
            } else {
              target_line = (prev_line + 1) as RealLineNumber;
            }
          }
          this.lineToRealLine.set((start_line + i) as RenderedLineNumber, target_line);
          this.doc.updateLastLine(target_line);
        }

        return true;
      }
    }
    return false;
  }

  clickHandler(e: InteractiveEvent) {
    const coords = this.getCanvasCoords(e);
    if (coords.x > this.left_margin) {
      return;
    }

    let curr_line = ToRenderedLineNumber(Math.floor(coords.y / this.line_spacing));
    if (this.toggleLineHidden(curr_line)) {
      this.clearAndRedraw();
    }
  }

  mouseUpHandler(e: InteractiveEvent) {
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
    const real_line = this.lineToRealLine.get(phys_line)!;
    this.doc.add_stroke(real_line, this.currentStroke);
    this.currentStroke = null;
  };

  mouseMoveHandler(e: InteractiveEvent) {
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

  remap(start: RenderedLineNumber, end: RenderedLineNumber) {
    this.lineToRealLine.set(start, this.lineToRealLine.get(end)!);
  }

  scrollDown() {
    for (let i = 0 as RenderedLineNumber; (i as number) < this.rendered_lines - 1; i++) {
      this.remap(i, i + 1 as RenderedLineNumber);
    }

    let final_value = this.lineToRealLine.get(this.rendered_lines - 1 as RenderedLineNumber)!;
    final_value = final_value + 1 as RealLineNumber;
    this.lineToRealLine.set(this.rendered_lines - 1 as RenderedLineNumber, final_value);
  }

  scrollUp() {
    if (this.lineToRealLine.get(0 as RenderedLineNumber)! == 0) {
      return;
    }
    for (let i = this.rendered_lines - 1; i >= 1; i--) {
      const next_value = this.lineToRealLine.get((i - 1) as RenderedLineNumber)!;
      this.lineToRealLine.set(i as RenderedLineNumber, next_value);
    }

    let first_value = this.lineToRealLine.get(0 as RenderedLineNumber)!;
    first_value = first_value - 1 as RealLineNumber;
    for (let root of this.hidden_roots) {
      if (this.doc.childLines(root).includes(first_value)) {
        first_value = root;
        break;
      }
    }
    this.lineToRealLine.set(0 as RenderedLineNumber, first_value);
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

  const doc = new Document();
  const ui = new NoteDownUI(ctx, doc);

  (window as any).notedown_ui = ui;
}
