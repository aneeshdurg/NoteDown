import { Point, Stroke } from './stroke.ts';
import { RealLineNumber, RenderedLineNumber } from './types.ts';
import { NoteDownDocument } from './document.ts';
import { NoteDownStorageManager } from './storage_manager.ts';

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

export class NoteDownUI {
  name: string;
  doc: NoteDownDocument;
  storage: NoteDownStorageManager;

  ctx: CanvasRenderingContext2D
  clicked = false;
  currentStroke: Stroke | null = null;
  curr_location: Point | null = null;
  margin_click_touch = false;

  line_spacing = 100;
  left_margin = 50;
  y_offset = 0;

  lineToRealLine: Map<RenderedLineNumber, RealLineNumber> = new Map();
  rendered_lines: number;

  hidden_roots: Set<RealLineNumber> = new Set();

  constructor(
    name: string,
    upgradeUI: boolean,
    ctx: CanvasRenderingContext2D,
    doc: NoteDownDocument,
    storage: NoteDownStorageManager
  ) {
    this.name = name;
    this.doc = doc;
    this.storage = storage;

    this.ctx = ctx;
    this.rendered_lines = this.ctx.canvas.height / this.line_spacing;
    this.rendered_lines += 1;
    for (let i = 0; i < this.rendered_lines; i++) {
      this.lineToRealLine.set(i as RenderedLineNumber, i as RealLineNumber);
    }


    this.draw_layout();

    this.storage.setActiveNotebook(name).then(async () => {
      if (await this.storage.notebookIsInitialized()) {
        await this.load(upgradeUI);
        this.clearAndRedraw();
      } else {
        await this.save();
        await this.storage.initializeNotebook();
      }
      this.installEventHandlers();
    });
  }

  async save() {
    const state = {
      lineToRealLine: this.lineToRealLine,
      hidden_roots: this.hidden_roots,
    };

    await this.storage.saveUIState(state);
  }

  async load(upgradeUI: boolean) {
    if (!upgradeUI) {
      const state = await this.storage.getUIState();
      this.lineToRealLine = state.lineToRealLine;
      this.hidden_roots = state.hidden_roots;
    }

    await this.doc.load(this.storage);
  }

  installEventHandlers() {
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

    const trackedPointer = new Set();

    let scrollPos: Point | null = null;
    let lineToIndent: RenderedLineNumber | null = null;
    let indentDirection: -1 | 0 | 1 | null = 0;

    this.ctx.canvas.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.pointerType != "touch") {
        return;
      }
      trackedPointer.add(e.pointerId);


      const coords = this.getCanvasCoords(e);
      if (trackedPointer.size > 1) {
        scrollPos = null;
      } else {
        if (coords.x >= this.left_margin) {
          scrollPos = this.getUntransformedCanvasCoords(e);
          lineToIndent = Math.floor(coords.y / this.line_spacing) as RenderedLineNumber;
        }
      }
    });

    this.ctx.canvas.addEventListener("pointercancel", (e: PointerEvent) => {
      trackedPointer.delete(e.pointerId);
      scrollPos = null;
      lineToIndent = null;
      indentDirection = 0;
    });
    this.ctx.canvas.addEventListener("pointerup", (e: PointerEvent) => {
      if (e.pointerType != "touch") {
        return;
      }

      if (lineToIndent !== null) {
        const real_line = this.lineToRealLine.get(lineToIndent)!;
        if (indentDirection == 1) {
          this.doc.unindent(real_line);
        } else if (indentDirection == -1) {
          this.doc.indent(real_line);
        }
        this.clearAndRedraw();
      }

      scrollPos = null;
      lineToIndent = null;
      indentDirection = 0;

      trackedPointer.delete(e.pointerId);
    });

    this.ctx.canvas.addEventListener("pointermove", async (e: PointerEvent) => {
      if (e.pointerType != "touch") {
        return;
      }
      if (!trackedPointer.has(e.pointerId)) {
        return;
      }

      const coords = this.getUntransformedCanvasCoords(e);
      if (scrollPos) {
        const deltaX = scrollPos.x - coords.x;
        if (Math.abs(deltaX) > 10) {
          let newIndentDirection = deltaX > 0 ? 1 : -1;
          if (indentDirection == 0) {
            indentDirection = (newIndentDirection as (-1 | 1 | 0));
          } else if (indentDirection != newIndentDirection) {
            indentDirection = null;
          }
        }
        const deltaY = scrollPos.y - coords.y;
        if (Math.abs(deltaY) > 10) {
          for (let i = 0; i < 25; i++) {
            lineToIndent = null;
            if (deltaY < 0) {
              this.scrollUp();
            } else {
              this.scrollDown();
            }
            this.clearAndRedraw();
          }
          scrollPos = coords;
        }
      }
    });

  }

  // Draw ruled layout
  draw_layout() {
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 1;

    for (let i = 0; i < this.rendered_lines; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i * this.line_spacing);
      this.ctx.lineTo(this.ctx.canvas.width, i * this.line_spacing);
      this.ctx.stroke();
    }
    this.ctx.beginPath();
    this.ctx.moveTo(this.left_margin, 0);
    this.ctx.lineTo(this.left_margin, this.ctx.canvas.height + this.y_offset * this.line_spacing);
    this.ctx.stroke();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  getCanvasCoords(e: InteractiveEvent): Point {
    const pt = this.getUntransformedCanvasCoords(e);
    pt.y += this.y_offset * this.line_spacing;
    return pt;
  }

  getUntransformedCanvasCoords(e: InteractiveEvent): Point {
    const rect = this.ctx.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * this.ctx.canvas.width / rect.width;
    const y = (e.clientY - rect.top) * this.ctx.canvas.height / rect.height;
    return { x: x, y: y };
  }

  clearAndRedraw() {
    this.clear();
    this.ctx.save();
    this.ctx.transform(1, 0, 0, 1, 0, -1 * this.y_offset * this.line_spacing);
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
    this.ctx.restore();
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

  async toggleLineHidden(line: RenderedLineNumber): Promise<boolean> {
    // It is expected that the caller of this function calls save
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
          i as RenderedLineNumber,
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
          await this.doc.updateLastLine(target_line, this.storage);
        }

        return true;
      }
    }
    return false;
  }

  async clickHandler(e: InteractiveEvent) {
    const coords = this.getCanvasCoords(e);
    if (coords.x > this.left_margin) {
      return;
    }

    let curr_line = Math.floor(coords.y / this.line_spacing) as RenderedLineNumber;
    if (await this.toggleLineHidden(curr_line)) {
      this.clearAndRedraw();
    }
    await this.save();
  }

  is_eraser = false;

  async mouseUpHandler(e: InteractiveEvent) {
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
    if (!this.is_eraser) {
      this.ctx.save();
      this.ctx.transform(1, 0, 0, 1, 0, -1 * this.y_offset * this.line_spacing);
      this.currentStroke.draw(this.ctx, this.currentStroke.y_root);
      this.ctx.restore();

      const phys_line = Math.floor(this.currentStroke.y_root / this.line_spacing) as RenderedLineNumber;
      let real_line = this.lineToRealLine.get(phys_line)!;
      let min_y = Infinity;
      let max_y = 0;
      for (let y of this.currentStroke.y_points) {
        min_y = Math.min(y, min_y);
        max_y = Math.max(y, max_y);
      }
      console.log(min_y, this.line_spacing - min_y % this.line_spacing, max_y, max_y % this.line_spacing);
      const inset = this.line_spacing - min_y % this.line_spacing;
      console.log(">", inset, this.line_spacing / 4, max_y - min_y, this.line_spacing)
      if (inset < this.line_spacing / 4 && (max_y - min_y) >= this.line_spacing) {
        real_line++;
        this.currentStroke.y_points = this.currentStroke.y_points.map((y) => y - this.line_spacing);
        console.log(" change line", real_line);
      }
      await this.doc.add_stroke(real_line, this.currentStroke, this.storage);
    }
    this.currentStroke = null;
  };

  async mouseMoveHandler(e: InteractiveEvent) {
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

    if (this.is_eraser) {
      // TODO move this to Document
      const updates = new Map<RealLineNumber, Stroke[]>;
      this.lineToRealLine.forEach((real_line, rendered_line) => {
        const y_root = rendered_line * this.line_spacing;
        const strokes = this.doc.linesToStrokes.get(real_line);
        if (strokes === undefined) {
          return;
        }

        const new_strokes = strokes.filter((s) => !s.intersects(y_root, coords, this.curr_location!));
        if (new_strokes.length < strokes.length) {
          updates.set(real_line, new_strokes);
        }
      });

      const promises: Promise<void>[] = [];
      updates.forEach((strokes, line) => {
        promises.push(this.doc.updateStrokes(line, strokes, this.storage));
      });
      await Promise.all(promises);

      this.clearAndRedraw();
    } else {
      this.ctx.strokeStyle = "black";
      this.ctx.lineWidth = 2;

      this.ctx.save();
      this.ctx.transform(1, 0, 0, 1, 0, -1 * this.y_offset * this.line_spacing);
      this.ctx.beginPath();
      this.ctx.moveTo(this.curr_location.x, this.curr_location.y);
      this.ctx.lineTo(coords.x, coords.y);
      this.ctx.stroke();
      this.ctx.restore();

      this.currentStroke?.add(coords.x, coords.y);
    }
    this.curr_location = coords;
  }

  remap(start: RenderedLineNumber, end: RenderedLineNumber) {
    this.lineToRealLine.set(start, this.lineToRealLine.get(end)!);
  }

  async scrollDown() {
    if (this.y_offset < 1) {
      this.y_offset += 0.01;
      if ((1 - this.y_offset) >= 0.01) {
        return;
      }
    }

    this.y_offset = 0;
    for (let i = 0 as RenderedLineNumber; (i as number) < this.rendered_lines - 1; i++) {
      this.remap(i, i + 1 as RenderedLineNumber);
    }

    let final_value = this.lineToRealLine.get(this.rendered_lines - 1 as RenderedLineNumber)!;
    final_value = final_value + 1 as RealLineNumber;
    this.lineToRealLine.set(this.rendered_lines - 1 as RenderedLineNumber, final_value);
    await this.save();
  }

  async scrollUp() {
    console.log(this.y_offset);
    if (this.y_offset > 0) {
      this.y_offset -= 0.01;
      if (this.y_offset >= 0.01) {
        return;
      }
    }

    if (this.lineToRealLine.get(0 as RenderedLineNumber)! == 0) {
      this.y_offset = 0;
      return;
    }
    this.y_offset = 1 - this.y_offset;
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
    await this.save();
  }
}


