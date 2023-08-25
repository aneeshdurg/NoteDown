import { Point, Stroke } from './stroke.ts';
import { RealLineNumber, RenderedLineNumber } from './types.ts';
import { NoteDownDocument } from './document.ts';
import { NoteDownStorageManager } from './storage_manager.ts';

import { DragEvent, Region } from './ui.ts';

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

export class NoteDownRenderer {
  name: string;
  doc: NoteDownDocument;
  storage: NoteDownStorageManager;

  ctx: CanvasRenderingContext2D
  clicked = false;
  currentStroke: Stroke | null = null;
  curr_location: Point | null = null;

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

  wheelHandler(e: WheelEvent) {
    if (e.deltaY > 0) {
      this.scrollDown();
      this.clearAndRedraw();
    } else if (e.deltaY < 0) {
      this.scrollUp();
      this.clearAndRedraw();
    }
    e.preventDefault();
  }

  installEventHandlers() {
    this.ctx.canvas.addEventListener("touchstart", (e) => { e.preventDefault(); });
    this.ctx.canvas.addEventListener("touchend", (e) => { e.preventDefault(); });
    this.ctx.canvas.addEventListener("touchmove", (e) => { e.preventDefault(); });

    // Callback for scrolling
    this.ctx.canvas.addEventListener("wheel", this.wheelHandler.bind(this));

    let scrollPos: Point | null = null;
    let lineToIndent: RenderedLineNumber | null = null;
    let mode: "scroll" | "indent" = "scroll";

    const mainbody = new Region({ x: this.left_margin, y: 0 }, this.ctx.canvas.width - this.left_margin, this.ctx.canvas.height, 5, 0);
    const mainbody_cbs = {
      drag: async (evt: DragEvent) => {
        if (scrollPos === null) {
          // save the position without transforming
          scrollPos = evt.start;
        }
        if (mode == "scroll") {
          const deltaY = scrollPos.y - evt.end.y;
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
            scrollPos = evt.end;
          }
        } else {
          const deltaX = scrollPos.x - evt.end.x;
          if (Math.abs(deltaX) > 10) {
            let indentDirection = deltaX > 0 ? 1 : -1;
            const real_line = this.lineToRealLine.get(lineToIndent!)!;
            const indent_children = this.hidden_roots.has(real_line);
            if (indentDirection == 1) {
              await this.doc.indent(real_line, -1, indent_children, this.storage);
            } else if (indentDirection == -1) {
              await this.doc.indent(real_line, 1, indent_children, this.storage);
            }
            this.clearAndRedraw();
            scrollPos = evt.end;
          }
        }
      },
      dragCancel: () => {
        scrollPos = null;
        lineToIndent = null;
        mode = "scroll";
      },
      longPress: (pt: Point) => {
        navigator.vibrate([100]);
        mode = "indent";
        lineToIndent = Math.floor(this.transformCoords(pt).y / this.line_spacing) as RenderedLineNumber;
      },
      penDrag: (evt: DragEvent) => {
        this.onPenMove(evt.end);
      },
      penDragEnd: this.onPenUp.bind(this),
      penDragCancel: this.onPenUp.bind(this),
    };
    mainbody.registerRegion(this.ctx.canvas, mainbody_cbs);

    // Margin events

    let lineToMove: RenderedLineNumber | null = null;
    let movedToOtherLine = false;
    let moveOperationID = 0;

    const moveCancel = () => {
      lineToMove = null;
      movedToOtherLine = false;
      moveOperationID += 1;
    };

    const setMoveTarget = (coords: Point) => {
      let curr_line = Math.floor(coords.y / this.line_spacing) as RenderedLineNumber;
      if (curr_line != lineToMove) {
        movedToOtherLine = true;
      }
    };

    const margin = new Region({ x: 0, y: 0 }, this.left_margin, this.ctx.canvas.height, 5, 10);
    const margin_cbs = {
      drag: (evt: DragEvent) => {
        const start = this.transformCoords(evt.start);
        const end = this.transformCoords(evt.end);
        const start_line = Math.floor(start.y / this.line_spacing) as RenderedLineNumber;
        if (lineToMove === null) {
          lineToMove = start_line;
        }
        setMoveTarget(end);
      },
      dragEnd: async (pt: Point) => {
        if (lineToMove !== null) {
          const coords = this.transformCoords(pt);
          let curr_line = Math.floor(coords.y / this.line_spacing) as RenderedLineNumber;
          if (movedToOtherLine && curr_line !== lineToMove) {
            if (curr_line > lineToMove) {
              // the target is below the initial point, drop the line one line
              // below
              curr_line++;
            }
            await this.move(lineToMove, curr_line);
          }
          moveCancel();
        }
      },
      dragCancel: moveCancel,
      tap: (pt: Point) => console.log("TAP", pt),
      longPress: (_: Point) => {
        navigator.vibrate([100]);
        return true;
      },

      penTap: (pt: Point) => {
        const coords = this.transformCoords(pt);
        this.clickHandler(coords);
      },
    };
    margin.registerRegion(this.ctx.canvas, margin_cbs as any);
  }

  async move(src: RenderedLineNumber, dst: RenderedLineNumber) {
    const real_line_src = this.lineToRealLine.get(src)!;
    const real_line_dst = this.lineToRealLine.get(dst)!;
    console.log("Move", real_line_src, " -> ", real_line_dst);
    const move_children = this.hidden_roots.has(real_line_src);
    let num_shift = 1;
    const hidden_children: Set<RealLineNumber> = new Set();
    if (move_children) {
      const children = this.doc.childLines(real_line_src);
      num_shift += children.length;
      for (let child of children) {
        if (this.hidden_roots.has(child)) {
          hidden_children.add(child);
          this.hidden_roots.delete(child);
        }
      }
      this.hidden_roots.delete(real_line_src);
    }
    await this.doc.moveLines(real_line_src, real_line_dst, move_children, this.storage);
    const mapLineNumber = (x: RealLineNumber) => {
      // First map the line as if the src lines were completely deleted
      if (x > real_line_src) {
        x = x - num_shift as RealLineNumber;
      }
      // Next account for the shift after reinserting the lines
      if (x >= (real_line_dst - num_shift)) {
        x = x + num_shift as RealLineNumber;
      }
      return x;
    };

    const final_hidden_roots: Set<RealLineNumber> = new Set();
    for (let root of this.hidden_roots) {
      final_hidden_roots.add(mapLineNumber(root));
    }
    this.hidden_roots = final_hidden_roots;

    if (move_children) {
      this.hidden_roots.add(real_line_dst);
      for (let root of hidden_children) {
        this.hidden_roots.add(real_line_dst - real_line_src + root as RealLineNumber);
      }
    }

    let curr_line = this.lineToRealLine.get(0 as RenderedLineNumber)!;
    for (let i = 0 as RenderedLineNumber; i < this.rendered_lines; i++) {
      console.log(i, " -> ", curr_line);
      this.lineToRealLine.set(i, curr_line);
      if (this.hidden_roots.has(curr_line)) {
        curr_line = curr_line + this.doc.childLines(curr_line).length as RealLineNumber;
      }
      // always increment by 1
      curr_line++;
    }
    this.clearAndRedraw();
    this.save();
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

  transformCoords(pt: Point): Point {
    return { x: pt.x, y: pt.y + this.y_offset * this.line_spacing };
  }

  getCanvasCoords(e: InteractiveEvent): Point {
    return this.transformCoords(this.getUntransformedCanvasCoords(e));
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

  async clickHandler(coords: Point) {
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

  async onPenUp() {
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
      const inset = this.line_spacing - min_y % this.line_spacing;
      if (inset < this.line_spacing / 4 && (max_y - min_y) >= this.line_spacing) {
        real_line++;
        this.currentStroke.y_points = this.currentStroke.y_points.map((y) => y - this.line_spacing);
      }
      await this.doc.add_stroke(real_line, this.currentStroke, this.storage);
    }
    this.currentStroke = null;
  };

  async onPenMove(pt: Point) {
    const coords = this.transformCoords(pt);
    if (!this.clicked) {
      this.currentStroke = new Stroke(coords.y - (coords.y % this.line_spacing))
      this.currentStroke.add(coords.x, coords.y);
      this.clicked = true;
      this.curr_location = coords;
    }
    if (!this.clicked || !this.curr_location) {
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