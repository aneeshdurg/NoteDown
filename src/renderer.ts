import { Point, Stroke } from './stroke.ts';
import { CanvasContext, RealLineNumber, RenderedLineNumber } from './types.ts';
import { NoteDownDocument } from './document.ts';
import { NoteDownStorageManager } from './storage_manager.ts';
import {NoteDownEngine, StrokeEvent, EraserEventGroupEndEvent, EraserEvent, AddLineEvent, DeleteLineEvent, DuplicateLineEvent, MoveEvent, IndentEvent} from './engine.ts';
import { GetConfig } from './config.ts';

import { DragEvent, Region } from './event_manager.ts';

interface InteractiveEvent {
  clientX: number;
  clientY: number;
};

export class NoteDownRenderer {
  doc: NoteDownDocument;
  storage: NoteDownStorageManager;
  ctx: CanvasContext

  // state for drawing a stroke
  currentStroke: Stroke | null = null;
  curr_location: Point | null = null;
  is_eraser = false;
  write_in_progress = false;

  // rendering configuration
  line_spacing = 50;
  left_margin = 50;
  scroll_delta: number = 0.01;

  // state of the renderer
  y_offset = 0;
  lineToRealLine: Map<RenderedLineNumber, RealLineNumber> = new Map();
  rendered_lines: number;
  hidden_roots: Set<RealLineNumber> = new Set();

  // callbacks to customize behavior
  on_eraser_flip: (() => void) | null = null;
  on_line_tap: ((line_no: RealLineNumber) => void) | null = null;
  on_redraw: ((ctx: CanvasContext) => void) | null = null;
  on_line_select: (((line_no: RealLineNumber) => void) | null) = null;
  readonly = false;

  engine: NoteDownEngine;

  constructor(
    ctx: CanvasContext,
    doc: NoteDownDocument,
    storage: NoteDownStorageManager,
    readonly: boolean = false,
  ) {
    this.doc = doc;
    this.storage = storage;

    this.ctx = ctx;
    this.rendered_lines = this.ctx.canvas.height / this.line_spacing;
    this.rendered_lines += 1;
    for (let i = 0; i < this.rendered_lines; i++) {
      this.lineToRealLine.set(i as RenderedLineNumber, i as RealLineNumber);
    }

    this.readonly = readonly;

    this.engine = new NoteDownEngine(this.doc, this.storage);

    this.draw_layout();
  }

  vibrate(...args: any[]) {
    try{
    
      return navigator.vibrate && navigator.vibrate.apply(null, args as any);
    
    }
    catch(error){}
  }

  async save() {
    if (this.readonly) {
      return;
    }
    const state = {
      lineToRealLine: this.lineToRealLine,
      hidden_roots: this.hidden_roots,
      line_spacing: this.line_spacing,
      left_margin: this.left_margin,
    };

    await this.storage.saveUIState(state);
  }

  async load(upgradeUI: boolean) {
    let scale_factor = 1;
    let new_margin = this.left_margin;
    let old_margin = this.left_margin;
    const state = await this.storage.getUIState();
    if (!upgradeUI) {
      if (state.lineToRealLine) {
        this.lineToRealLine = state.lineToRealLine;
      }
      if (state.hidden_roots) {
        this.hidden_roots = state.hidden_roots;
      }
      if (state.line_spacing !== undefined) {
        scale_factor = this.line_spacing / state.line_spacing;
        this.line_spacing = state.line_spacing;
      } else {
        scale_factor = 0.5;
      }
      if (state.left_margin !== undefined) {
        old_margin = state.left_margin;
      }
    }

    await this.doc.load(this.storage, scale_factor, old_margin, new_margin);
  }

  wheelHandler(e: WheelEvent) {
    if (e.deltaY > 0) {
      this.scrollDown(this.scroll_delta);
    } else if (e.deltaY < 0) {
      this.scrollUp(this.scroll_delta);
    }
    this.clearAndRedraw();
    e.preventDefault();
  }

  installEventHandlers() {
    // Callback for scrolling
    this.ctx.canvas.addEventListener("wheel", this.wheelHandler.bind(this));

    let scrollPos: Point | null = null;
    let lineToIndent: RenderedLineNumber | null = null;
    let mode: "scroll" | "indent" = "scroll";

    const mainbody = new Region({ x: this.left_margin, y: 0 }, this.ctx.canvas.width - this.left_margin, this.ctx.canvas.height, 5, 0);
    let dragLock: Promise<void> | null = null;
    let releaseDragLock_: (() => void) | null = null;
    const accquireDragLock = () => {
      dragLock = new Promise(r => {
        releaseDragLock_ = r;
      });
    };
    const releaseDragLock = () => {
      releaseDragLock_!();
      releaseDragLock_ = null;
      dragLock = null;
    };
    const mainbody_readonly_cbs = {
      drag: async (evt: DragEvent) => {
        if (dragLock) {
          return;
        }
        accquireDragLock();
        if (scrollPos === null) {
          // save the position without transforming
          scrollPos = evt.end;
        }
        if (mode == "scroll") {
          const deltaY = scrollPos.y - evt.end.y;
          if (Math.abs(deltaY) > 10) {
            const delta = Math.abs(deltaY) / this.line_spacing;
            if (deltaY < 0) {
              await this.scrollUp(delta);
            } else {
              await this.scrollDown(delta);
            }
            this.clearAndRedraw(true);
            scrollPos = evt.end;
          }
        } else {
          const deltaX = scrollPos.x - evt.end.x;
          if (Math.abs(deltaX) > 10) {
            let indentDirection = deltaX > 0 ? 1 : -1;
            const real_line = this.lineToRealLine.get(lineToIndent!)!;
            const indent_children = this.hidden_roots.has(real_line);

            const event = new IndentEvent(real_line, indentDirection == 1 ? -1 : 1, indent_children);
            await this.engine.execute(event);

            this.clearAndRedraw();
            scrollPos = evt.end;
          }
        }
        releaseDragLock();
      },
      dragCancel: async () => {
        while (dragLock) {
          const tmpLock = dragLock;
          await tmpLock;
        }
        accquireDragLock();
        scrollPos = null;
        lineToIndent = null;
        mode = "scroll";
        this.clearAndRedraw();
        releaseDragLock();
      },
      tap: this.onTap.bind(this),
      penTap: this.onTap.bind(this),
    };
    mainbody.registerRegion(this.ctx.canvas as HTMLCanvasElement, mainbody_readonly_cbs);

    if (!this.readonly) {
      const mainbody_editing_cbs = {
        penDrag: this.onPenMove.bind(this),
        penDragEnd: this.onPenUp.bind(this),
        penDragCancel: this.onPenUp.bind(this),
        longPress: (pt: Point) => {
          this.vibrate([100]);
          mode = "indent";
          lineToIndent = Math.floor(this.transformCoords(pt).y / this.line_spacing) as RenderedLineNumber;
        },
      }
      mainbody.registerRegion(this.ctx.canvas as HTMLCanvasElement, mainbody_editing_cbs);

      // Margin events
      const margin = new Region({ x: 0, y: 0 }, this.left_margin, this.ctx.canvas.height, 5, 10);
      const margin_cbs = {
        drag: this.selectMoveTarget.bind(this),
        dragEnd: this.confirmMoveTarget.bind(this),
        dragCancel: this.moveCancel.bind(this),
        tap: (pt: Point) => console.log("TAP", pt),
        longPress: (pt: Point) => {
          if (this.on_line_select) {
            const coords = this.transformCoords(pt);
            const curr_line = Math.floor(coords.y / this.line_spacing) as RenderedLineNumber;
            const real_line = this.lineToRealLine.get(curr_line)!;
            this.on_line_select(real_line);
            return true;
          }
        },
        penTap: this.clickHandler.bind(this),
      };
      margin.registerRegion(this.ctx.canvas as HTMLCanvasElement, margin_cbs as any);
    }
  }

  async delete_lines(line: RealLineNumber, count: number) {
    if (this.hidden_roots.has(line)) {
      count += this.doc.childLines(line).length;
    }

    const event = new DeleteLineEvent(line, count)
    await this.engine.execute(event)

    const new_hidden_roots = new Set<RealLineNumber>();
    this.hidden_roots.forEach((root) => {
      if (root > (line + count)) {
        new_hidden_roots.add(root - count as RealLineNumber);
      } else if (root < line) {
        new_hidden_roots.add(root);
      }
    });
    this.hidden_roots = new_hidden_roots;

    this.infer_line_mapping();
    this.clearAndRedraw();
    this.save();
  }

  async add_line(curr_line: RealLineNumber, num_lines: number) {
    const event = new AddLineEvent(curr_line, num_lines);
    await this.engine.execute(event);

    const new_hidden_roots = new Set<RealLineNumber>();
    this.hidden_roots.forEach((root) => {
      if (root >= curr_line) {
        new_hidden_roots.add(root + num_lines as RealLineNumber);
      } else {
        new_hidden_roots.add(root);
      }
    });
    this.hidden_roots = new_hidden_roots;

    this.infer_line_mapping();
    this.clearAndRedraw();
    this.save();
  }

  async duplicate_line(line: RealLineNumber) {
    const event = new DuplicateLineEvent(line);
    await this.engine.execute(event);

    this.clearAndRedraw();
    this.save();
  }

  flip_eraser_state() {
    this.is_eraser = !this.is_eraser;
    if (this.write_in_progress) {
      this.onPenUp();
    }
    if (this.on_eraser_flip) {
      this.on_eraser_flip();
    }
  }

  last_tap_time = 0;
  double_tap_time = 250;
  onTap(pt: Point) {
    const curr_time = (new Date()).getTime();
    if ((curr_time - this.last_tap_time) < this.double_tap_time) {
      if (!this.readonly) {
        this.flip_eraser_state();
      }
    } else {
      if (this.on_line_tap) {
        const coords = this.transformCoords(pt);
        let curr_line = Math.floor(coords.y / this.line_spacing) as RenderedLineNumber;
        const real_line = this.lineToRealLine.get(curr_line)!;
        this.on_line_tap(real_line);
      }
    }
    this.last_tap_time = curr_time;
  }

  // Move line state
  lineToMove: RenderedLineNumber | null = null;
  movedToOtherLine = false;
  moveOperationID = 0;

  moveCancel() {
    this.lineToMove = null;
    this.movedToOtherLine = false;
    this.moveOperationID += 1;
  };

  setMoveTarget(coords: Point) {
    let curr_line = Math.floor(coords.y / this.line_spacing) as RenderedLineNumber;
    if (curr_line != this.lineToMove) {
      this.movedToOtherLine = true;
    }
  };

  selectMoveTarget(evt: DragEvent) {
    const start = this.transformCoords(evt.start);
    const end = this.transformCoords(evt.end);
    const start_line = Math.floor(start.y / this.line_spacing) as RenderedLineNumber;
    if (this.lineToMove === null) {
      this.lineToMove = start_line;
    }
    this.setMoveTarget(end);

    this.clearAndRedraw();
    this.ctx.beginPath();
    this.ctx.strokeStyle = GetConfig().strokeColor;
    this.ctx.lineWidth = 5;
    this.ctx.moveTo(this.left_margin + 30, end.y);
    this.ctx.lineTo(this.left_margin + 75, end.y);
    this.ctx.lineTo(this.left_margin + 60, end.y + 10);
    this.ctx.moveTo(this.left_margin + 75, end.y);
    this.ctx.lineTo(this.left_margin + 60, end.y - 10);
    this.ctx.stroke();
  }

  async confirmMoveTarget(pt: Point) {
    if (this.lineToMove !== null) {
      const coords = this.transformCoords(pt);
      let curr_line = Math.floor(coords.y / this.line_spacing) as RenderedLineNumber;
      if (this.movedToOtherLine && curr_line !== this.lineToMove) {
        if (curr_line > this.lineToMove) {
          // the target is below the initial point, drop the line one line
          // below
          curr_line++;
        }
        await this.move(this.lineToMove, curr_line);
      } else {
        this.clearAndRedraw();
      }
      this.moveCancel();
    }
  }

  async move(src: RenderedLineNumber, dst: RenderedLineNumber) {
    const real_line_src = this.lineToRealLine.get(src)!;
    const real_line_dst = this.lineToRealLine.get(dst)!;
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

    const event = new MoveEvent(real_line_src, real_line_dst, move_children);
    await this.engine.execute(event);

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
      if (real_line_dst < real_line_src) {
        this.hidden_roots.add(real_line_dst);
        for (let root of hidden_children) {
          this.hidden_roots.add(real_line_dst - real_line_src + root as RealLineNumber);
        }
      } else {
        this.hidden_roots.add(real_line_dst - num_shift as RealLineNumber);
        for (let root of hidden_children) {
          this.hidden_roots.add(real_line_dst - num_shift - real_line_src + root as RealLineNumber);
        }
      }
    }

    this.infer_line_mapping(this.lineToRealLine.get(0 as RenderedLineNumber)!);
    this.clearAndRedraw();
    this.save();
  }

  infer_line_mapping(first_line: RealLineNumber | null = null) {
    if (first_line === null) {
      first_line = this.lineToRealLine.get(0 as RenderedLineNumber)!;
    }
    let curr_line = first_line;
    for (let i = 0 as RenderedLineNumber; i < this.rendered_lines; i++) {
      this.lineToRealLine.set(i, curr_line);
      if (this.hidden_roots.has(curr_line)) {
        curr_line = curr_line + this.doc.childLines(curr_line).length as RealLineNumber;
      }
      // always increment by 1
      curr_line++;
    }
  }

  // Draw ruled layout
  draw_layout() {
    this.ctx.strokeStyle = GetConfig().strokeColor;
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

  clearAndRedraw(fastdraw: boolean = false) {
    if (this.write_in_progress && !this.is_eraser) {
      return;
    }
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
        strokes[i].draw(this.ctx, phys_line * this.line_spacing, fastdraw);
      }

      if (this.hidden_roots.has(real_line)) {
        this.ctx.strokeStyle = GetConfig().strokeColor;
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
    if (this.on_redraw) {
      this.on_redraw(this.ctx);
    }
    this.ctx.restore();
  }

  mouseDownHandler(e: InteractiveEvent) {
    const coords = this.getCanvasCoords(e);
    if (coords.x <= this.left_margin) {
      return;
    }
    this.currentStroke = new Stroke(coords.y - (coords.y % this.line_spacing))
    this.currentStroke.add(coords.x, coords.y);
    this.write_in_progress = true;
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

  async clickHandler(pt: Point) {
    const coords = this.transformCoords(pt);
    if (coords.x > this.left_margin) {
      return;
    }

    let curr_line = Math.floor(coords.y / this.line_spacing) as RenderedLineNumber;
    if (await this.toggleLineHidden(curr_line)) {
      this.clearAndRedraw();
    }
    await this.save();
  }

  async onPenUp() {
    this.curr_location = null;
    if (!this.write_in_progress || !this.currentStroke) {
      if (this.is_eraser) {
        const event = new EraserEventGroupEndEvent();
        await this.engine.execute(event);
      }
      return;
    }
    this.write_in_progress = false;
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

      const event = new StrokeEvent(real_line, this.currentStroke);
      await this.engine.execute(event);
    }
    this.currentStroke = null;
  };

  async onPenMove(evt: DragEvent) {
    const coords = this.transformCoords(evt.end);
    if (!this.curr_location) {
      if (!this.is_eraser) {
        this.write_in_progress = true;
        this.currentStroke = new Stroke(coords.y - (coords.y % this.line_spacing))
        this.currentStroke.add(coords.x, coords.y);
      }
      this.curr_location = coords;
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

      const originals = new Map<RealLineNumber, Stroke[]>();
      updates.forEach((_, line) => {
        originals.set(line, [...this.doc.linesToStrokes.get(line)!]);
      });

      const event = new EraserEvent(originals, updates);
      await this.engine.execute(event);

      this.clearAndRedraw();
    } else {
      this.ctx.strokeStyle = GetConfig().strokeColor;
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

  async scrollDown(delta: number) {
    this.y_offset += delta;
    while (this.y_offset > 1) {
      this.y_offset -= 1;
      for (let i = 0 as RenderedLineNumber; (i as number) < this.rendered_lines - 1; i++) {
        this.remap(i, i + 1 as RenderedLineNumber);
      }

      let final_value = this.lineToRealLine.get(this.rendered_lines - 1 as RenderedLineNumber)!;
      if (this.hidden_roots.has(final_value)) {
        final_value = final_value + (this.doc.childLines(final_value).length + 1) as RealLineNumber;
      } else {
        final_value = final_value + 1 as RealLineNumber;
      }
      this.lineToRealLine.set(this.rendered_lines - 1 as RenderedLineNumber, final_value);
      await this.save();
    }
  }

  async scrollUp(delta: number) {
    this.y_offset -= delta;
    while (this.y_offset < 0) {
      if (this.lineToRealLine.get(0 as RenderedLineNumber)! == 0) {
        this.y_offset = 0;
        return;
      }
      this.y_offset += 1;
      for (let i = this.rendered_lines - 1; i >= 1; i--) {
        const next_value = this.lineToRealLine.get((i - 1) as RenderedLineNumber)!;
        this.lineToRealLine.set(i as RenderedLineNumber, next_value);
      }

      let first_value = this.lineToRealLine.get(0 as RenderedLineNumber)!;
      first_value = first_value - 1 as RealLineNumber;
      let needs_transform = true;
      while (needs_transform) {
        needs_transform = false;
        for (let root of this.hidden_roots) {
          if (this.doc.childLines(root).includes(first_value)) {
            first_value = root;
            needs_transform = true;
            break;
          }
        }
      }
      this.lineToRealLine.set(0 as RenderedLineNumber, first_value);
      await this.save();
    }
  }
}
