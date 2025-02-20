var Zt = Object.defineProperty;
var en = (E, e, t) => e in E ? Zt(E, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : E[e] = t;
var x = (E, e, t) => (en(E, typeof e != "symbol" ? e + "" : e, t), t);
class ke {
  constructor() {
    x(this, "last_line", 9);
    x(this, "indentWidth", 20);
    x(this, "linesToStrokes", /* @__PURE__ */ new Map());
    x(this, "linesTofirstContent", /* @__PURE__ */ new Map());
  }
  async load(e, t, o, r) {
    this.last_line = await e.getLastLine() || this.last_line;
    const l = await e.listSavedLines();
    for (let u of l) {
      const h = await e.getSavedLine(u, t, o, r);
      h.strokes === null || (this.linesToStrokes.set(u, h.strokes), this.linesTofirstContent.set(u, h.firstContent));
    }
  }
  async indent(e, t, o, r, l = -1) {
    if (this.linesToStrokes.get(e) === void 0)
      return;
    if (l === -1) {
      l = this.indentWidth;
      const g = this.linesTofirstContent.get(e) % this.indentWidth;
      g != 0 && (t == -1 ? l = g : l = this.indentWidth - g), console.log("Width", l);
    }
    const u = this.linesToStrokes.get(e);
    for (let p = 0; p < u.length; p++) {
      const g = u[p];
      for (let S = 0; S < g.x_points.length; S++)
        g.x_points[S] += t * l;
    }
    this.linesTofirstContent.set(
      e,
      this.linesTofirstContent.get(e) + t * l
    );
    const h = [];
    if (h.push(this.saveToStorage(e, r)), o)
      for (let p of this.childLines(e))
        h.push(this.indent(p, t, !1, r, l));
    await Promise.all(h);
  }
  hasContent(e) {
    const t = this.linesTofirstContent.get(e);
    return !(t === void 0 || t === 0);
  }
  childLines(e) {
    let t = [], o = 0, r = e, l = this.linesTofirstContent.get(r);
    if (l === void 0)
      return t;
    for (r += 1; r <= this.last_line; r++) {
      const u = this.linesTofirstContent.get(r);
      if (u === void 0) {
        if (o += 1, o == 1)
          t.push(r);
        else
          break;
        continue;
      }
      if (l < u && Math.abs(l - u) > this.indentWidth)
        t.push(r);
      else
        break;
      o = 0;
    }
    return t;
  }
  async add_stroke(e, t, o) {
    var l;
    this.linesToStrokes.get(e) === void 0 && this.linesToStrokes.set(e, []), (l = this.linesToStrokes.get(e)) == null || l.push(t);
    let r = t.leftMostPoint();
    this.linesTofirstContent.get(e) === void 0 && this.linesTofirstContent.set(e, r), this.linesTofirstContent.set(
      e,
      Math.min(this.linesTofirstContent.get(e) || 0, r)
    ), o && await this.saveToStorage(e, o), await this.updateLastLine(e, o);
  }
  async pop_stroke(e, t) {
    var o;
    (o = this.linesToStrokes.get(e)) == null || o.pop(), t && await this.saveToStorage(e, t);
  }
  async updateStrokes(e, t, o) {
    this.linesToStrokes.set(e, t);
    let r = 1 / 0;
    t.forEach((l) => {
      r = Math.min(r, l.leftMostPoint());
    }), this.linesTofirstContent.set(e, r), await this.saveToStorage(e, o);
  }
  async saveToStorage(e, t) {
    await t.saveLine(e, this.linesToStrokes.get(e), this.linesTofirstContent.get(e));
  }
  async updateLastLine(e, t, o = !1) {
    this.last_line = Math.max(this.last_line, e), o && (this.last_line = e), t && await t.saveLastLine(this.last_line);
  }
  async deleteLines(e, t, o) {
    for (let r = e; r < this.last_line; r++) {
      const l = r + t;
      this.linesToStrokes.get(l) !== void 0 ? (this.linesToStrokes.set(r, this.linesToStrokes.get(l)), this.linesTofirstContent.set(r, this.linesTofirstContent.get(l))) : (this.linesToStrokes.delete(r), this.linesTofirstContent.delete(r));
    }
    this.updateLastLine(this.last_line - t, o, !0);
    for (let r = 0; r < this.last_line; r++)
      await this.saveToStorage(r, o);
  }
  async insertLines(e, t, o) {
    for (let r = this.last_line; r >= e; r--) {
      const l = r + t;
      this.linesToStrokes.get(r) !== void 0 ? (this.linesToStrokes.set(l, this.linesToStrokes.get(r)), this.linesTofirstContent.set(l, this.linesTofirstContent.get(r)), this.linesToStrokes.delete(r), this.linesTofirstContent.delete(r)) : (this.linesToStrokes.delete(l), this.linesTofirstContent.delete(l));
    }
    this.updateLastLine(this.last_line + t, o);
    for (let r = 0; r < this.last_line; r++)
      await this.saveToStorage(r, o);
  }
  async moveLines(e, t, o, r) {
    const l = 1 + (o ? this.childLines(e).length : 0), u = [], h = [];
    for (let p = 0; p < l; p++) {
      const g = this.linesToStrokes.get(e + p), S = this.linesTofirstContent.get(e + p);
      u.push(g), h.push(S);
    }
    await this.deleteLines(e, l, r), t > e && (t = t - l), this.insertLines(t, l, r);
    for (let p = 0; p < l; p++) {
      const g = t + p;
      u[p] !== void 0 ? (this.linesToStrokes.set(g, u[p]), this.linesTofirstContent.set(g, h[p])) : (this.linesToStrokes.delete(g), this.linesTofirstContent.delete(g));
    }
    for (let p = 0; p < this.last_line; p++)
      await this.saveToStorage(p, r);
  }
  rootOnlyDoc() {
    const e = new ke();
    let t = 0, o = 0;
    const r = /* @__PURE__ */ new Map();
    for (; o <= this.last_line; ) {
      if (this.hasContent(o)) {
        const l = this.childLines(o).length;
        console.log("Selecting", o, this.last_line, l);
        for (let u of this.linesToStrokes.get(o))
          e.add_stroke(t, u, null);
        r.set(t, o), t = t + 1, l ? o = o + l : console.log("   !", o);
      } else
        console.log("   !", o, this.linesTofirstContent.get(o));
      o++;
    }
    return console.log(this.linesTofirstContent), { doc: e, mapping: r };
  }
  async copyLine(e, t, o) {
    const r = this.linesTofirstContent.get(t), l = this.linesToStrokes.get(t).map((u) => u.copy());
    this.linesTofirstContent.set(o, r), this.linesToStrokes.set(o, l), await this.saveToStorage(o, e);
  }
}
class tn {
  constructor() {
    x(this, "strokeColor", "black");
    x(this, "currentModeIsLight", !0);
    x(this, "onDarkModeCBs", []);
    x(this, "onLightModeCBs", []);
  }
  enableDarkMode() {
    this.currentModeIsLight = !1, this.strokeColor = "white";
    for (let e of this.onDarkModeCBs)
      e();
  }
  enableLightMode() {
    this.currentModeIsLight = !0, this.strokeColor = "black";
    for (let e of this.onLightModeCBs)
      e();
  }
  registerModeSwitchCB(e, t) {
    this.onDarkModeCBs.push(e), this.onLightModeCBs.push(t);
  }
}
const nn = new tn();
function Q() {
  return nn;
}
class ae {
  constructor(e) {
    /**
     * x-coordinates of all points in this stroke
     */
    x(this, "x_points");
    /**
     * y-coordinates of all points in this stroke
     */
    x(this, "y_points");
    /**
     * Offset of first point in the stroke (all points are recorded relative to this offset)
     */
    x(this, "y_root");
    this.x_points = [], this.y_points = [], this.y_root = e;
  }
  /**
   * Return a copy of this stroke
   */
  copy() {
    const e = new ae(this.y_root);
    for (let t = 0; t < this.x_points.length; t++)
      e.add(this.x_points[t], this.y_points[t] + this.y_root);
    return e;
  }
  /**
   * Add a point (x, y) to this stroke.
   * Note that y should be in global space - not relative to this.y_root
   */
  add(e, t) {
    this.x_points.push(e), this.y_points.push(t - this.y_root);
  }
  /**
   * Draw this stroke to ctx. If fastdraw is true, decrease quality to decrease
   * render time.
   */
  // TODO(aneesh) set a rendering budget instead and determine the resolution
  // from the budget
  draw(e, t, o = !1) {
    e.strokeStyle = Q().strokeColor, e.lineWidth = 2;
    let r = 1;
    o && (r = 5);
    let l = this.x_points[0], u = this.y_points[0] + t;
    for (let h = 1; h < this.x_points.length; h += r) {
      const p = this.x_points[h], g = this.y_points[h] + t;
      e.beginPath(), e.moveTo(l, u), e.lineTo(p, g), e.stroke(), l = p, u = g;
    }
  }
  /**
   * Returns true if the line segment p1-p2 intersects any line from this stroke,
   * assuming that this stroke is rooted at y_root
   */
  intersects(e, t, o) {
    const r = (b, k, C, I, R, O) => {
      const B = Math.min(C, R), X = Math.max(C, R), Y = Math.min(I, O), T = Math.max(I, O);
      return b >= B && b <= X && k >= Y && k <= T;
    }, l = t.x, u = t.y, h = o.x, p = o.y, g = (p - u) / (h - l), S = u - g * l, f = (b, k) => {
      const C = this.x_points[b], I = this.y_points[b] + e, R = this.x_points[k], O = this.y_points[k] + e, B = (O - I) / (R - C), X = I - B * C;
      if (B == g)
        return X != S ? !1 : r(C, I, l, u, h, p) || r(R, O, l, u, h, p);
      {
        const Y = (S - X) / (B - g), T = B * Y + X;
        return r(Y, T, C, I, R, O) && r(Y, T, l, u, h, p);
      }
    };
    for (let b = 1; b < this.x_points.length; b++) {
      const k = b - 1;
      if (f(k, b))
        return !0;
    }
    return !1;
  }
  /**
   * Get the minumum x-coordinate of this stroke
   */
  leftMostPoint() {
    let e = 1 / 0;
    for (let t = 0; t < this.x_points.length; t++)
      e = Math.min(e, this.x_points[t]);
    return e;
  }
}
class ve {
}
class le extends ve {
  constructor(t) {
    super();
    /**
     * Line number to operate on
     */
    x(this, "line");
    this.line = t;
  }
}
class on extends le {
  constructor(t, o) {
    super(t);
    /**
     * Stroke to add or remove from the engine
     */
    x(this, "stroke");
    this.stroke = o;
  }
  async execute(t) {
    await t.doc.add_stroke(this.line, this.stroke, t.storage);
  }
  async unexecute(t) {
    await t.doc.pop_stroke(this.line, t.storage);
  }
}
class Ce extends ve {
  async execute(e) {
    e.history.length < 2 || e.history[e.history.length - 2] instanceof Ce && e.history.pop();
  }
  async unexecute(e) {
    for (; e.history[e.history.length - 1] instanceof je; )
      e.pop();
  }
}
class je extends ve {
  constructor(t, o) {
    super();
    // This is super expensive - we actually just need to store for each deleted
    // stroke the line number and index of that stroke.
    x(this, "original");
    x(this, "new_strokes");
    this.original = t, this.new_strokes = o;
  }
  async execute(t) {
    const o = [];
    this.new_strokes.forEach((r, l) => {
      o.push(t.doc.updateStrokes(l, r, t.storage));
    }), await Promise.all(o);
  }
  async unexecute(t) {
    const o = [];
    this.original.forEach((r, l) => {
      o.push(t.doc.updateStrokes(l, r, t.storage));
    }), await Promise.all(o);
  }
}
class rn extends le {
  constructor(t, o) {
    super(t);
    x(this, "num_lines");
    this.num_lines = o;
  }
  async execute(t) {
    await t.doc.insertLines(this.line, this.num_lines, t.storage);
  }
  async unexecute(t) {
    await t.doc.deleteLines(this.line, this.num_lines, t.storage);
  }
}
class sn extends le {
  constructor(t, o) {
    super(t);
    x(this, "num_lines");
    x(this, "linesToStrokes", /* @__PURE__ */ new Map());
    x(this, "linesTofirstContent", /* @__PURE__ */ new Map());
    this.num_lines = o;
  }
  async execute(t) {
    for (let o = 0; o < this.num_lines; o++) {
      let r = this.line + o;
      t.doc.linesToStrokes.has(r) && (this.linesToStrokes.set(r, t.doc.linesToStrokes.get(r)), this.linesTofirstContent.set(r, t.doc.linesTofirstContent.get(r)));
    }
    await t.doc.deleteLines(this.line, this.num_lines, t.storage);
  }
  async unexecute(t) {
    await t.doc.insertLines(this.line, this.num_lines, t.storage);
    for (let o = 0; o < this.num_lines; o++) {
      let r = this.line + o;
      this.linesToStrokes.has(r) && (t.doc.linesToStrokes.set(r, this.linesToStrokes.get(r)), t.doc.linesTofirstContent.set(r, this.linesTofirstContent.get(r)), await t.doc.saveToStorage(r, t.storage));
    }
  }
}
class an extends le {
  async execute(e) {
    await e.doc.insertLines(this.line, 1, e.storage), await e.doc.copyLine(e.storage, this.line + 1, this.line);
  }
  async unexecute(e) {
    await e.doc.deleteLines(this.line, 1, e.storage);
  }
}
class ln extends ve {
  constructor(t, o, r) {
    super();
    x(this, "src_line");
    x(this, "dst_line");
    x(this, "move_children");
    this.src_line = t, this.dst_line = o, this.move_children = r;
  }
  async execute(t) {
    await t.doc.moveLines(this.src_line, this.dst_line, this.move_children, t.storage);
  }
  async unexecute(t) {
    this.src_line < this.dst_line ? await t.doc.moveLines(this.dst_line - 1, this.src_line, this.move_children, t.storage) : await t.doc.moveLines(this.dst_line, this.src_line + 1, this.move_children, t.storage);
  }
}
class cn extends le {
  constructor(t, o, r) {
    super(t);
    x(this, "direction");
    x(this, "indent_children");
    this.direction = o, this.indent_children = r;
  }
  async execute(t) {
    await t.doc.indent(this.line, this.direction, this.indent_children, t.storage);
  }
  async unexecute(t) {
    await t.doc.indent(this.line, -1 * this.direction, this.indent_children, t.storage);
  }
}
class dn {
  constructor(e, t) {
    /**
     * Document to operate on
     */
    x(this, "doc");
    /**
     * Storage manager to persist changes to
     */
    x(this, "storage");
    /**
     * List of `HistoryEvent`s that have been `execute`d.
     */
    x(this, "history", []);
    this.doc = e, this.storage = t;
  }
  /**
   * Execute `event` after adding it to the engine's history
   */
  async execute(e) {
    this.history.push(e), await e.execute(this);
  }
  /**
   * Unexecute the most recent event in history and return the event unexecuted.
   */
  async pop() {
    const e = this.history.pop();
    return e && await e.unexecute(this), e;
  }
}
class Qe {
  constructor(e, t) {
    x(this, "start");
    x(this, "end");
    this.start = e, this.end = t;
  }
}
const hn = 750;
class un {
  constructor(e) {
    /** Timestamp of pointer creation */
    x(this, "createdAt");
    /** Whether the pointer has moved since creation */
    x(this, "moved");
    /** Initial coordinates of pointer */
    x(this, "initialPos");
    /** Last known coordinates of pointer */
    x(this, "lastPos");
    /** When true, this object is no longer valid */
    x(this, "canceled");
    this.createdAt = (/* @__PURE__ */ new Date()).getTime(), this.moved = !1, this.initialPos = e, this.lastPos = e, this.canceled = !1;
  }
}
class ee {
  constructor(e, t, o, r = void 0, l = void 0) {
    /** Top left corner of this region */
    x(this, "location");
    x(this, "width");
    x(this, "height");
    /**
     * Number of pixels a touch event needs to move before it's considered
     * movement instead of noise
     */
    x(this, "touchMoveThreshold", 5);
    /**
     * Number of pixels a pen event needs to move before it's considered
     * movement instead of noise
     */
    x(this, "penMoveThreshold", 10);
    this.location = e, this.width = t, this.height = o, r !== void 0 && (this.touchMoveThreshold = r), l !== void 0 && (this.penMoveThreshold = l);
  }
  /** Get coordinates of an event relative the canvas coordinate space */
  static getCanvasCoords(e) {
    const t = e.target, o = t.getBoundingClientRect(), r = (e.clientX - o.left) * t.width / o.width, l = (e.clientY - o.top) * t.height / o.height;
    return { x: r, y: l };
  }
  /** Check if coords is within this region */
  inRegion(e) {
    return !(e.x < this.location.x || e.x >= this.location.x + this.width || e.y < this.location.y || e.y >= this.location.y + this.height);
  }
  /**
   * Register this region with callbacks given by `cbs`
   */
  registerRegion(e, t) {
    const o = /* @__PURE__ */ new Map(), r = (k, C) => {
      const I = o.get(C.pointerId);
      I !== void 0 && I.moved && (I.canceled = !0, k == "touch" ? t.dragCancel && t.dragCancel() : t.penDragCancel && t.penDragCancel()), o.delete(C.pointerId);
    }, l = (k, C) => (I) => {
      if (I.pointerType != k)
        return;
      const R = ee.getCanvasCoords(I);
      if (!this.inRegion(R)) {
        r(k, I);
        return;
      }
      I.preventDefault(), C(k, I);
    }, u = (k) => l("touch", k), h = (k) => l("pen", k), p = (k, C) => {
      const I = ee.getCanvasCoords(C), R = new un(I);
      o.set(C.pointerId, R), o.size > 1 && r(k, C);
      const O = k === "touch" ? t.longPress : t.penLongPress;
      O && setTimeout(async () => {
        R.canceled || R.moved || await O(R.initialPos) && r(k, C);
      }, hn);
    }, g = (k, C) => {
      const I = o.get(C.pointerId);
      if (I === void 0)
        return;
      const R = ee.getCanvasCoords(C);
      I.moved ? k == "touch" ? t.dragEnd && t.dragEnd(R) : t.penDragEnd && t.penDragEnd(R) : k == "touch" ? t.tap && t.tap(I.initialPos) : t.penTap && t.penTap(I.initialPos), r(k, C);
    }, S = (k, C) => {
      const I = o.get(C.pointerId);
      if (I === void 0)
        return;
      const R = ee.getCanvasCoords(C), O = R.x - I.lastPos.x, B = R.y - I.lastPos.y, X = Math.sqrt(O * O + B * B), Y = k === "touch" ? this.touchMoveThreshold : this.penMoveThreshold;
      if (I.moved || X > Y) {
        let T = I.lastPos;
        I.moved || (T = R), I.moved = !0, k == "touch" ? t.drag && t.drag(new Qe(T, R)) : t.penDrag && t.penDrag(new Qe(T, R)), I.lastPos = R;
      }
    };
    e.addEventListener("pointerdown", u(p)), e.addEventListener("pointerup", u(g)), e.addEventListener("pointercancel", u(r)), e.addEventListener("pointermove", u(S)), e.addEventListener("pointerdown", h(p)), e.addEventListener("pointerup", h(g)), e.addEventListener("pointercancel", h(r)), e.addEventListener("pointermove", h(S));
    const f = (k) => {
      try {
        if (k.cancelable) {
          for (let C = 0; C < k.changedTouches.length; C++)
            if (k.changedTouches[C].radiusX == 0 && k.changedTouches[C].radiusY == 0) {
              k.preventDefault();
              break;
            }
        }
      } catch (C) {
        console.log("touch exception", C);
      }
    };
    e.addEventListener("touchstart", f), e.addEventListener("touchend", f), e.addEventListener("touchmove", f);
    const b = (k) => (C) => {
      const I = ee.getCanvasCoords(C), R = C.shiftKey ? "touch" : "pen", O = C;
      if (O.pointerId = -1, O.pointerType = R, !this.inRegion(I)) {
        r(R, O);
        return;
      }
      k(R, O);
    };
    e.addEventListener("mousedown", b(p)), e.addEventListener("mouseup", b(g)), e.addEventListener("mousemove", b(S));
  }
}
class Ge {
  constructor(e, t, o, r = !1) {
    x(this, "doc");
    x(this, "storage");
    x(this, "ctx");
    // state for drawing a stroke
    x(this, "currentStroke", null);
    x(this, "curr_location", null);
    x(this, "is_eraser", !1);
    x(this, "write_in_progress", !1);
    // rendering configuration
    x(this, "line_spacing", 50);
    x(this, "left_margin", 50);
    x(this, "scroll_delta", 0.01);
    // state of the renderer
    x(this, "y_offset", 0);
    x(this, "lineToRealLine", /* @__PURE__ */ new Map());
    x(this, "rendered_lines");
    x(this, "hidden_roots", /* @__PURE__ */ new Set());
    // callbacks to customize behavior
    x(this, "on_eraser_flip", null);
    x(this, "on_line_tap", null);
    x(this, "on_redraw", null);
    x(this, "on_line_select", null);
    x(this, "readonly", !1);
    x(this, "engine");
    x(this, "last_tap_time", 0);
    x(this, "double_tap_time", 250);
    // Move line state
    x(this, "lineToMove", null);
    x(this, "movedToOtherLine", !1);
    x(this, "moveOperationID", 0);
    this.doc = t, this.storage = o, this.ctx = e, this.rendered_lines = this.ctx.canvas.height / this.line_spacing, this.rendered_lines += 1;
    for (let l = 0; l < this.rendered_lines; l++)
      this.lineToRealLine.set(l, l);
    this.readonly = r, this.engine = new dn(this.doc, this.storage), this.draw_layout();
  }
  vibrate(...e) {
    try {
      return navigator.vibrate && navigator.vibrate.apply(null, e);
    } catch {
    }
  }
  async save() {
    if (this.readonly)
      return;
    const e = {
      lineToRealLine: this.lineToRealLine,
      hidden_roots: this.hidden_roots,
      line_spacing: this.line_spacing,
      left_margin: this.left_margin
    };
    await this.storage.saveUIState(e);
  }
  async load(e) {
    let t = 1, o = this.left_margin, r = this.left_margin;
    const l = await this.storage.getUIState();
    e || (l.lineToRealLine && (this.lineToRealLine = l.lineToRealLine), l.hidden_roots && (this.hidden_roots = l.hidden_roots), l.line_spacing !== void 0 ? (t = this.line_spacing / l.line_spacing, this.line_spacing = l.line_spacing) : t = 0.5, l.left_margin !== void 0 && (r = l.left_margin)), await this.doc.load(this.storage, t, r, o);
  }
  wheelHandler(e) {
    e.deltaY > 0 ? this.scrollDown(this.scroll_delta) : e.deltaY < 0 && this.scrollUp(this.scroll_delta), this.clearAndRedraw(), e.preventDefault();
  }
  installEventHandlers() {
    this.ctx.canvas.addEventListener("wheel", this.wheelHandler.bind(this));
    let e = null, t = null, o = "scroll";
    const r = new ee({ x: this.left_margin, y: 0 }, this.ctx.canvas.width - this.left_margin, this.ctx.canvas.height, 5, 0);
    let l = null, u = null;
    const h = () => {
      l = new Promise((S) => {
        u = S;
      });
    }, p = () => {
      u(), u = null, l = null;
    }, g = {
      drag: async (S) => {
        if (!l) {
          if (h(), e === null && (e = S.end), o == "scroll") {
            const f = e.y - S.end.y;
            if (Math.abs(f) > 10) {
              const b = Math.abs(f) / this.line_spacing;
              f < 0 ? await this.scrollUp(b) : await this.scrollDown(b), this.clearAndRedraw(!0), e = S.end;
            }
          } else {
            const f = e.x - S.end.x;
            if (Math.abs(f) > 10) {
              let b = f > 0 ? 1 : -1;
              const k = this.lineToRealLine.get(t), C = this.hidden_roots.has(k), I = new cn(k, b == 1 ? -1 : 1, C);
              await this.engine.execute(I), this.clearAndRedraw(), e = S.end;
            }
          }
          p();
        }
      },
      dragCancel: async () => {
        for (; l; )
          await l;
        h(), e = null, t = null, o = "scroll", this.clearAndRedraw(), p();
      },
      tap: this.onTap.bind(this),
      penTap: this.onTap.bind(this)
    };
    if (r.registerRegion(this.ctx.canvas, g), !this.readonly) {
      const S = {
        penDrag: this.onPenMove.bind(this),
        penDragEnd: this.onPenUp.bind(this),
        penDragCancel: this.onPenUp.bind(this),
        longPress: (k) => {
          this.vibrate([100]), o = "indent", t = Math.floor(this.transformCoords(k).y / this.line_spacing);
        }
      };
      r.registerRegion(this.ctx.canvas, S);
      const f = new ee({ x: 0, y: 0 }, this.left_margin, this.ctx.canvas.height, 5, 10), b = {
        drag: this.selectMoveTarget.bind(this),
        dragEnd: this.confirmMoveTarget.bind(this),
        dragCancel: this.moveCancel.bind(this),
        tap: (k) => console.log("TAP", k),
        longPress: (k) => {
          if (this.on_line_select) {
            const C = this.transformCoords(k), I = Math.floor(C.y / this.line_spacing), R = this.lineToRealLine.get(I);
            return this.on_line_select(R), !0;
          }
        },
        penTap: this.clickHandler.bind(this)
      };
      f.registerRegion(this.ctx.canvas, b);
    }
  }
  async delete_lines(e, t) {
    this.hidden_roots.has(e) && (t += this.doc.childLines(e).length);
    const o = new sn(e, t);
    await this.engine.execute(o);
    const r = /* @__PURE__ */ new Set();
    this.hidden_roots.forEach((l) => {
      l > e + t ? r.add(l - t) : l < e && r.add(l);
    }), this.hidden_roots = r, this.infer_line_mapping(), this.clearAndRedraw(), this.save();
  }
  async add_line(e, t) {
    const o = new rn(e, t);
    await this.engine.execute(o);
    const r = /* @__PURE__ */ new Set();
    this.hidden_roots.forEach((l) => {
      l >= e ? r.add(l + t) : r.add(l);
    }), this.hidden_roots = r, this.infer_line_mapping(), this.clearAndRedraw(), this.save();
  }
  async duplicate_line(e) {
    const t = new an(e);
    await this.engine.execute(t), this.clearAndRedraw(), this.save();
  }
  flip_eraser_state() {
    this.is_eraser = !this.is_eraser, this.write_in_progress && this.onPenUp(), this.on_eraser_flip && this.on_eraser_flip();
  }
  onTap(e) {
    const t = (/* @__PURE__ */ new Date()).getTime();
    if (t - this.last_tap_time < this.double_tap_time)
      this.readonly || this.flip_eraser_state();
    else if (this.on_line_tap) {
      const o = this.transformCoords(e);
      let r = Math.floor(o.y / this.line_spacing);
      const l = this.lineToRealLine.get(r);
      this.on_line_tap(l);
    }
    this.last_tap_time = t;
  }
  moveCancel() {
    this.lineToMove = null, this.movedToOtherLine = !1, this.moveOperationID += 1;
  }
  setMoveTarget(e) {
    Math.floor(e.y / this.line_spacing) != this.lineToMove && (this.movedToOtherLine = !0);
  }
  selectMoveTarget(e) {
    const t = this.transformCoords(e.start), o = this.transformCoords(e.end), r = Math.floor(t.y / this.line_spacing);
    this.lineToMove === null && (this.lineToMove = r), this.setMoveTarget(o), this.clearAndRedraw(), this.ctx.beginPath(), this.ctx.strokeStyle = Q().strokeColor, this.ctx.lineWidth = 5, this.ctx.moveTo(this.left_margin + 30, o.y), this.ctx.lineTo(this.left_margin + 75, o.y), this.ctx.lineTo(this.left_margin + 60, o.y + 10), this.ctx.moveTo(this.left_margin + 75, o.y), this.ctx.lineTo(this.left_margin + 60, o.y - 10), this.ctx.stroke();
  }
  async confirmMoveTarget(e) {
    if (this.lineToMove !== null) {
      const t = this.transformCoords(e);
      let o = Math.floor(t.y / this.line_spacing);
      this.movedToOtherLine && o !== this.lineToMove ? (o > this.lineToMove && o++, await this.move(this.lineToMove, o)) : this.clearAndRedraw(), this.moveCancel();
    }
  }
  async move(e, t) {
    const o = this.lineToRealLine.get(e), r = this.lineToRealLine.get(t), l = this.hidden_roots.has(o);
    let u = 1;
    const h = /* @__PURE__ */ new Set();
    if (l) {
      const f = this.doc.childLines(o);
      u += f.length;
      for (let b of f)
        this.hidden_roots.has(b) && (h.add(b), this.hidden_roots.delete(b));
      this.hidden_roots.delete(o);
    }
    const p = new ln(o, r, l);
    await this.engine.execute(p);
    const g = (f) => (f > o && (f = f - u), f >= r - u && (f = f + u), f), S = /* @__PURE__ */ new Set();
    for (let f of this.hidden_roots)
      S.add(g(f));
    if (this.hidden_roots = S, l)
      if (r < o) {
        this.hidden_roots.add(r);
        for (let f of h)
          this.hidden_roots.add(r - o + f);
      } else {
        this.hidden_roots.add(r - u);
        for (let f of h)
          this.hidden_roots.add(r - u - o + f);
      }
    this.infer_line_mapping(this.lineToRealLine.get(0)), this.clearAndRedraw(), this.save();
  }
  infer_line_mapping(e = null) {
    e === null && (e = this.lineToRealLine.get(0));
    let t = e;
    for (let o = 0; o < this.rendered_lines; o++)
      this.lineToRealLine.set(o, t), this.hidden_roots.has(t) && (t = t + this.doc.childLines(t).length), t++;
  }
  // Draw ruled layout
  draw_layout() {
    this.ctx.strokeStyle = Q().strokeColor, this.ctx.lineWidth = 1;
    for (let e = 0; e < this.rendered_lines; e++)
      this.ctx.beginPath(), this.ctx.moveTo(0, e * this.line_spacing), this.ctx.lineTo(this.ctx.canvas.width, e * this.line_spacing), this.ctx.stroke();
    this.ctx.beginPath(), this.ctx.moveTo(this.left_margin, 0), this.ctx.lineTo(this.left_margin, this.ctx.canvas.height + this.y_offset * this.line_spacing), this.ctx.stroke();
  }
  clear() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }
  transformCoords(e) {
    return { x: e.x, y: e.y + this.y_offset * this.line_spacing };
  }
  getCanvasCoords(e) {
    return this.transformCoords(this.getUntransformedCanvasCoords(e));
  }
  getUntransformedCanvasCoords(e) {
    const t = this.ctx.canvas.getBoundingClientRect(), o = (e.clientX - t.left) * this.ctx.canvas.width / t.width, r = (e.clientY - t.top) * this.ctx.canvas.height / t.height;
    return { x: o, y: r };
  }
  clearAndRedraw(e = !1) {
    this.write_in_progress && !this.is_eraser || (this.clear(), this.ctx.save(), this.ctx.transform(1, 0, 0, 1, 0, -1 * this.y_offset * this.line_spacing), this.draw_layout(), this.lineToRealLine.forEach((t, o) => {
      const r = this.doc.linesToStrokes.get(t);
      if (r !== void 0) {
        for (let l = 0; l < r.length; l++)
          r[l].draw(this.ctx, o * this.line_spacing, e);
        if (this.hidden_roots.has(t)) {
          this.ctx.strokeStyle = Q().strokeColor, this.ctx.lineWidth = 5;
          const l = this.left_margin / 2, u = this.line_spacing / 2, h = Math.min(l, u), p = this.left_margin / 2, g = o * this.line_spacing + this.line_spacing / 2;
          this.ctx.beginPath(), this.ctx.moveTo(p - h / 2, g), this.ctx.lineTo(p + h / 2, g), this.ctx.moveTo(p, g - h / 2), this.ctx.lineTo(p, g + h / 2), this.ctx.stroke();
        }
      }
    }), this.on_redraw && this.on_redraw(this.ctx), this.ctx.restore());
  }
  mouseDownHandler(e) {
    const t = this.getCanvasCoords(e);
    t.x <= this.left_margin || (this.currentStroke = new ae(t.y - t.y % this.line_spacing), this.currentStroke.add(t.x, t.y), this.write_in_progress = !0, this.curr_location = t);
  }
  async toggleLineHidden(e) {
    let t = this.lineToRealLine.get(e);
    if (t === void 0)
      return !1;
    const o = this.doc.childLines(t), r = new Set(o);
    if (this.hidden_roots.has(t)) {
      const l = [];
      let u = 0;
      for (; u < o.length; ) {
        const h = o[u];
        if (l.push(h), this.hidden_roots.has(h)) {
          const p = this.doc.childLines(h);
          u += p.length + 1;
        } else
          u++;
      }
      for (let h = this.rendered_lines - 1; h >= e + 1 + l.length; h--)
        this.lineToRealLine.set(
          h,
          this.lineToRealLine.get(h - l.length)
        );
      for (let h = 0; h < l.length && !(e + 1 + h >= this.rendered_lines); h++)
        this.lineToRealLine.set(e + 1 + h, l[h]);
      return this.hidden_roots.delete(t), !0;
    } else {
      e += 1;
      let l = e;
      for (; e < this.rendered_lines && r.has(this.lineToRealLine.get(e)); )
        e += 1;
      let u = e;
      if (l != u) {
        this.hidden_roots.add(t);
        for (let h = 0; h < this.rendered_lines - l; h++) {
          let p = u + h, g = this.lineToRealLine.get(p);
          if (g === void 0) {
            const S = this.lineToRealLine.get(l + h - 1);
            if (this.hidden_roots.has(S)) {
              const f = this.doc.childLines(S);
              g = f[f.length - 1] + 1;
            } else
              g = S + 1;
          }
          this.lineToRealLine.set(l + h, g), await this.doc.updateLastLine(g, this.storage);
        }
        return !0;
      }
    }
    return !1;
  }
  async clickHandler(e) {
    const t = this.transformCoords(e);
    if (t.x > this.left_margin)
      return;
    let o = Math.floor(t.y / this.line_spacing);
    await this.toggleLineHidden(o) && this.clearAndRedraw(), await this.save();
  }
  async onPenUp() {
    if (this.curr_location = null, !this.write_in_progress || !this.currentStroke) {
      if (this.is_eraser) {
        const e = new Ce();
        await this.engine.execute(e);
      }
      return;
    }
    if (this.write_in_progress = !1, this.curr_location = null, !this.is_eraser) {
      this.ctx.save(), this.ctx.transform(1, 0, 0, 1, 0, -1 * this.y_offset * this.line_spacing), this.currentStroke.draw(this.ctx, this.currentStroke.y_root), this.ctx.restore();
      const e = Math.floor(this.currentStroke.y_root / this.line_spacing);
      let t = this.lineToRealLine.get(e), o = 1 / 0, r = 0;
      for (let h of this.currentStroke.y_points)
        o = Math.min(h, o), r = Math.max(h, r);
      this.line_spacing - o % this.line_spacing < this.line_spacing / 4 && r - o >= this.line_spacing && (t++, this.currentStroke.y_points = this.currentStroke.y_points.map((h) => h - this.line_spacing));
      const u = new on(t, this.currentStroke);
      await this.engine.execute(u);
    }
    this.currentStroke = null;
  }
  async onPenMove(e) {
    var o;
    const t = this.transformCoords(e.end);
    if (this.curr_location || (this.is_eraser || (this.write_in_progress = !0, this.currentStroke = new ae(t.y - t.y % this.line_spacing), this.currentStroke.add(t.x, t.y)), this.curr_location = t), !(t.x <= this.left_margin)) {
      if (this.is_eraser) {
        const r = /* @__PURE__ */ new Map();
        this.lineToRealLine.forEach((h, p) => {
          const g = p * this.line_spacing, S = this.doc.linesToStrokes.get(h);
          if (S === void 0)
            return;
          const f = S.filter((b) => !b.intersects(g, t, this.curr_location));
          f.length < S.length && r.set(h, f);
        });
        const l = /* @__PURE__ */ new Map();
        r.forEach((h, p) => {
          l.set(p, [...this.doc.linesToStrokes.get(p)]);
        });
        const u = new je(l, r);
        await this.engine.execute(u), this.clearAndRedraw();
      } else
        this.ctx.strokeStyle = Q().strokeColor, this.ctx.lineWidth = 2, this.ctx.save(), this.ctx.transform(1, 0, 0, 1, 0, -1 * this.y_offset * this.line_spacing), this.ctx.beginPath(), this.ctx.moveTo(this.curr_location.x, this.curr_location.y), this.ctx.lineTo(t.x, t.y), this.ctx.stroke(), this.ctx.restore(), (o = this.currentStroke) == null || o.add(t.x, t.y);
      this.curr_location = t;
    }
  }
  remap(e, t) {
    this.lineToRealLine.set(e, this.lineToRealLine.get(t));
  }
  async scrollDown(e) {
    for (this.y_offset += e; this.y_offset > 1; ) {
      this.y_offset -= 1;
      for (let o = 0; o < this.rendered_lines - 1; o++)
        this.remap(o, o + 1);
      let t = this.lineToRealLine.get(this.rendered_lines - 1);
      this.hidden_roots.has(t) ? t = t + (this.doc.childLines(t).length + 1) : t = t + 1, this.lineToRealLine.set(this.rendered_lines - 1, t), await this.save();
    }
  }
  async scrollUp(e) {
    for (this.y_offset -= e; this.y_offset < 0; ) {
      if (this.lineToRealLine.get(0) == 0) {
        this.y_offset = 0;
        return;
      }
      this.y_offset += 1;
      for (let r = this.rendered_lines - 1; r >= 1; r--) {
        const l = this.lineToRealLine.get(r - 1);
        this.lineToRealLine.set(r, l);
      }
      let t = this.lineToRealLine.get(0);
      t = t - 1;
      let o = !0;
      for (; o; ) {
        o = !1;
        for (let r of this.hidden_roots)
          if (this.doc.childLines(r).includes(t)) {
            t = r, o = !0;
            break;
          }
      }
      this.lineToRealLine.set(0, t), await this.save();
    }
  }
}
var ue = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function fn(E) {
  return E && E.__esModule && Object.prototype.hasOwnProperty.call(E, "default") ? E.default : E;
}
function fe(E) {
  throw new Error('Could not dynamically require "' + E + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var Je = { exports: {} };
/*!
    localForage -- Offline Storage, Improved
    Version 1.10.0
    https://localforage.github.io/localForage
    (c) 2013-2017 Mozilla, Apache License 2.0
*/
(function(E, e) {
  (function(t) {
    E.exports = t();
  })(function() {
    return function t(o, r, l) {
      function u(g, S) {
        if (!r[g]) {
          if (!o[g]) {
            var f = typeof fe == "function" && fe;
            if (!S && f)
              return f(g, !0);
            if (h)
              return h(g, !0);
            var b = new Error("Cannot find module '" + g + "'");
            throw b.code = "MODULE_NOT_FOUND", b;
          }
          var k = r[g] = { exports: {} };
          o[g][0].call(k.exports, function(C) {
            var I = o[g][1][C];
            return u(I || C);
          }, k, k.exports, t, o, r, l);
        }
        return r[g].exports;
      }
      for (var h = typeof fe == "function" && fe, p = 0; p < l.length; p++)
        u(l[p]);
      return u;
    }({ 1: [function(t, o, r) {
      (function(l) {
        var u = l.MutationObserver || l.WebKitMutationObserver, h;
        if (u) {
          var p = 0, g = new u(C), S = l.document.createTextNode("");
          g.observe(S, {
            characterData: !0
          }), h = function() {
            S.data = p = ++p % 2;
          };
        } else if (!l.setImmediate && typeof l.MessageChannel < "u") {
          var f = new l.MessageChannel();
          f.port1.onmessage = C, h = function() {
            f.port2.postMessage(0);
          };
        } else
          "document" in l && "onreadystatechange" in l.document.createElement("script") ? h = function() {
            var R = l.document.createElement("script");
            R.onreadystatechange = function() {
              C(), R.onreadystatechange = null, R.parentNode.removeChild(R), R = null;
            }, l.document.documentElement.appendChild(R);
          } : h = function() {
            setTimeout(C, 0);
          };
        var b, k = [];
        function C() {
          b = !0;
          for (var R, O, B = k.length; B; ) {
            for (O = k, k = [], R = -1; ++R < B; )
              O[R]();
            B = k.length;
          }
          b = !1;
        }
        o.exports = I;
        function I(R) {
          k.push(R) === 1 && !b && h();
        }
      }).call(this, typeof ue < "u" ? ue : typeof self < "u" ? self : typeof window < "u" ? window : {});
    }, {}], 2: [function(t, o, r) {
      var l = t(1);
      function u() {
      }
      var h = {}, p = ["REJECTED"], g = ["FULFILLED"], S = ["PENDING"];
      o.exports = f;
      function f(T) {
        if (typeof T != "function")
          throw new TypeError("resolver must be a function");
        this.state = S, this.queue = [], this.outcome = void 0, T !== u && I(this, T);
      }
      f.prototype.catch = function(T) {
        return this.then(null, T);
      }, f.prototype.then = function(T, N) {
        if (typeof T != "function" && this.state === g || typeof N != "function" && this.state === p)
          return this;
        var M = new this.constructor(u);
        if (this.state !== S) {
          var U = this.state === g ? T : N;
          k(M, U, this.outcome);
        } else
          this.queue.push(new b(M, T, N));
        return M;
      };
      function b(T, N, M) {
        this.promise = T, typeof N == "function" && (this.onFulfilled = N, this.callFulfilled = this.otherCallFulfilled), typeof M == "function" && (this.onRejected = M, this.callRejected = this.otherCallRejected);
      }
      b.prototype.callFulfilled = function(T) {
        h.resolve(this.promise, T);
      }, b.prototype.otherCallFulfilled = function(T) {
        k(this.promise, this.onFulfilled, T);
      }, b.prototype.callRejected = function(T) {
        h.reject(this.promise, T);
      }, b.prototype.otherCallRejected = function(T) {
        k(this.promise, this.onRejected, T);
      };
      function k(T, N, M) {
        l(function() {
          var U;
          try {
            U = N(M);
          } catch ($) {
            return h.reject(T, $);
          }
          U === T ? h.reject(T, new TypeError("Cannot resolve promise with itself")) : h.resolve(T, U);
        });
      }
      h.resolve = function(T, N) {
        var M = R(C, N);
        if (M.status === "error")
          return h.reject(T, M.value);
        var U = M.value;
        if (U)
          I(T, U);
        else {
          T.state = g, T.outcome = N;
          for (var $ = -1, z = T.queue.length; ++$ < z; )
            T.queue[$].callFulfilled(N);
        }
        return T;
      }, h.reject = function(T, N) {
        T.state = p, T.outcome = N;
        for (var M = -1, U = T.queue.length; ++M < U; )
          T.queue[M].callRejected(N);
        return T;
      };
      function C(T) {
        var N = T && T.then;
        if (T && (typeof T == "object" || typeof T == "function") && typeof N == "function")
          return function() {
            N.apply(T, arguments);
          };
      }
      function I(T, N) {
        var M = !1;
        function U(V) {
          M || (M = !0, h.reject(T, V));
        }
        function $(V) {
          M || (M = !0, h.resolve(T, V));
        }
        function z() {
          N($, U);
        }
        var H = R(z);
        H.status === "error" && U(H.value);
      }
      function R(T, N) {
        var M = {};
        try {
          M.value = T(N), M.status = "success";
        } catch (U) {
          M.status = "error", M.value = U;
        }
        return M;
      }
      f.resolve = O;
      function O(T) {
        return T instanceof this ? T : h.resolve(new this(u), T);
      }
      f.reject = B;
      function B(T) {
        var N = new this(u);
        return h.reject(N, T);
      }
      f.all = X;
      function X(T) {
        var N = this;
        if (Object.prototype.toString.call(T) !== "[object Array]")
          return this.reject(new TypeError("must be an array"));
        var M = T.length, U = !1;
        if (!M)
          return this.resolve([]);
        for (var $ = new Array(M), z = 0, H = -1, V = new this(u); ++H < M; )
          G(T[H], H);
        return V;
        function G(oe, ce) {
          N.resolve(oe).then(me, function(ne) {
            U || (U = !0, h.reject(V, ne));
          });
          function me(ne) {
            $[ce] = ne, ++z === M && !U && (U = !0, h.resolve(V, $));
          }
        }
      }
      f.race = Y;
      function Y(T) {
        var N = this;
        if (Object.prototype.toString.call(T) !== "[object Array]")
          return this.reject(new TypeError("must be an array"));
        var M = T.length, U = !1;
        if (!M)
          return this.resolve([]);
        for (var $ = -1, z = new this(u); ++$ < M; )
          H(T[$]);
        return z;
        function H(V) {
          N.resolve(V).then(function(G) {
            U || (U = !0, h.resolve(z, G));
          }, function(G) {
            U || (U = !0, h.reject(z, G));
          });
        }
      }
    }, { 1: 1 }], 3: [function(t, o, r) {
      (function(l) {
        typeof l.Promise != "function" && (l.Promise = t(2));
      }).call(this, typeof ue < "u" ? ue : typeof self < "u" ? self : typeof window < "u" ? window : {});
    }, { 2: 2 }], 4: [function(t, o, r) {
      var l = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(n) {
        return typeof n;
      } : function(n) {
        return n && typeof Symbol == "function" && n.constructor === Symbol && n !== Symbol.prototype ? "symbol" : typeof n;
      };
      function u(n, s) {
        if (!(n instanceof s))
          throw new TypeError("Cannot call a class as a function");
      }
      function h() {
        try {
          if (typeof indexedDB < "u")
            return indexedDB;
          if (typeof webkitIndexedDB < "u")
            return webkitIndexedDB;
          if (typeof mozIndexedDB < "u")
            return mozIndexedDB;
          if (typeof OIndexedDB < "u")
            return OIndexedDB;
          if (typeof msIndexedDB < "u")
            return msIndexedDB;
        } catch {
          return;
        }
      }
      var p = h();
      function g() {
        try {
          if (!p || !p.open)
            return !1;
          var n = typeof openDatabase < "u" && /(Safari|iPhone|iPad|iPod)/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) && !/BlackBerry/.test(navigator.platform), s = typeof fetch == "function" && fetch.toString().indexOf("[native code") !== -1;
          return (!n || s) && typeof indexedDB < "u" && // some outdated implementations of IDB that appear on Samsung
          // and HTC Android devices <4.4 are missing IDBKeyRange
          // See: https://github.com/mozilla/localForage/issues/128
          // See: https://github.com/mozilla/localForage/issues/272
          typeof IDBKeyRange < "u";
        } catch {
          return !1;
        }
      }
      function S(n, s) {
        n = n || [], s = s || {};
        try {
          return new Blob(n, s);
        } catch (a) {
          if (a.name !== "TypeError")
            throw a;
          for (var i = typeof BlobBuilder < "u" ? BlobBuilder : typeof MSBlobBuilder < "u" ? MSBlobBuilder : typeof MozBlobBuilder < "u" ? MozBlobBuilder : WebKitBlobBuilder, c = new i(), d = 0; d < n.length; d += 1)
            c.append(n[d]);
          return c.getBlob(s.type);
        }
      }
      typeof Promise > "u" && t(3);
      var f = Promise;
      function b(n, s) {
        s && n.then(function(i) {
          s(null, i);
        }, function(i) {
          s(i);
        });
      }
      function k(n, s, i) {
        typeof s == "function" && n.then(s), typeof i == "function" && n.catch(i);
      }
      function C(n) {
        return typeof n != "string" && (console.warn(n + " used as a key, but it is not a string."), n = String(n)), n;
      }
      function I() {
        if (arguments.length && typeof arguments[arguments.length - 1] == "function")
          return arguments[arguments.length - 1];
      }
      var R = "local-forage-detect-blob-support", O = void 0, B = {}, X = Object.prototype.toString, Y = "readonly", T = "readwrite";
      function N(n) {
        for (var s = n.length, i = new ArrayBuffer(s), c = new Uint8Array(i), d = 0; d < s; d++)
          c[d] = n.charCodeAt(d);
        return i;
      }
      function M(n) {
        return new f(function(s) {
          var i = n.transaction(R, T), c = S([""]);
          i.objectStore(R).put(c, "key"), i.onabort = function(d) {
            d.preventDefault(), d.stopPropagation(), s(!1);
          }, i.oncomplete = function() {
            var d = navigator.userAgent.match(/Chrome\/(\d+)/), a = navigator.userAgent.match(/Edge\//);
            s(a || !d || parseInt(d[1], 10) >= 43);
          };
        }).catch(function() {
          return !1;
        });
      }
      function U(n) {
        return typeof O == "boolean" ? f.resolve(O) : M(n).then(function(s) {
          return O = s, O;
        });
      }
      function $(n) {
        var s = B[n.name], i = {};
        i.promise = new f(function(c, d) {
          i.resolve = c, i.reject = d;
        }), s.deferredOperations.push(i), s.dbReady ? s.dbReady = s.dbReady.then(function() {
          return i.promise;
        }) : s.dbReady = i.promise;
      }
      function z(n) {
        var s = B[n.name], i = s.deferredOperations.pop();
        if (i)
          return i.resolve(), i.promise;
      }
      function H(n, s) {
        var i = B[n.name], c = i.deferredOperations.pop();
        if (c)
          return c.reject(s), c.promise;
      }
      function V(n, s) {
        return new f(function(i, c) {
          if (B[n.name] = B[n.name] || Se(), n.db)
            if (s)
              $(n), n.db.close();
            else
              return i(n.db);
          var d = [n.name];
          s && d.push(n.version);
          var a = p.open.apply(p, d);
          s && (a.onupgradeneeded = function(v) {
            var m = a.result;
            try {
              m.createObjectStore(n.storeName), v.oldVersion <= 1 && m.createObjectStore(R);
            } catch (_) {
              if (_.name === "ConstraintError")
                console.warn('The database "' + n.name + '" has been upgraded from version ' + v.oldVersion + " to version " + v.newVersion + ', but the storage "' + n.storeName + '" already exists.');
              else
                throw _;
            }
          }), a.onerror = function(v) {
            v.preventDefault(), c(a.error);
          }, a.onsuccess = function() {
            var v = a.result;
            v.onversionchange = function(m) {
              m.target.close();
            }, i(v), z(n);
          };
        });
      }
      function G(n) {
        return V(n, !1);
      }
      function oe(n) {
        return V(n, !0);
      }
      function ce(n, s) {
        if (!n.db)
          return !0;
        var i = !n.db.objectStoreNames.contains(n.storeName), c = n.version < n.db.version, d = n.version > n.db.version;
        if (c && (n.version !== s && console.warn('The database "' + n.name + `" can't be downgraded from version ` + n.db.version + " to version " + n.version + "."), n.version = n.db.version), d || i) {
          if (i) {
            var a = n.db.version + 1;
            a > n.version && (n.version = a);
          }
          return !0;
        }
        return !1;
      }
      function me(n) {
        return new f(function(s, i) {
          var c = new FileReader();
          c.onerror = i, c.onloadend = function(d) {
            var a = btoa(d.target.result || "");
            s({
              __local_forage_encoded_blob: !0,
              data: a,
              type: n.type
            });
          }, c.readAsBinaryString(n);
        });
      }
      function ne(n) {
        var s = N(atob(n.data));
        return S([s], { type: n.type });
      }
      function Le(n) {
        return n && n.__local_forage_encoded_blob;
      }
      function et(n) {
        var s = this, i = s._initReady().then(function() {
          var c = B[s._dbInfo.name];
          if (c && c.dbReady)
            return c.dbReady;
        });
        return k(i, n, n), i;
      }
      function tt(n) {
        $(n);
        for (var s = B[n.name], i = s.forages, c = 0; c < i.length; c++) {
          var d = i[c];
          d._dbInfo.db && (d._dbInfo.db.close(), d._dbInfo.db = null);
        }
        return n.db = null, G(n).then(function(a) {
          return n.db = a, ce(n) ? oe(n) : a;
        }).then(function(a) {
          n.db = s.db = a;
          for (var v = 0; v < i.length; v++)
            i[v]._dbInfo.db = a;
        }).catch(function(a) {
          throw H(n, a), a;
        });
      }
      function J(n, s, i, c) {
        c === void 0 && (c = 1);
        try {
          var d = n.db.transaction(n.storeName, s);
          i(null, d);
        } catch (a) {
          if (c > 0 && (!n.db || a.name === "InvalidStateError" || a.name === "NotFoundError"))
            return f.resolve().then(function() {
              if (!n.db || a.name === "NotFoundError" && !n.db.objectStoreNames.contains(n.storeName) && n.version <= n.db.version)
                return n.db && (n.version = n.db.version + 1), oe(n);
            }).then(function() {
              return tt(n).then(function() {
                J(n, s, i, c - 1);
              });
            }).catch(i);
          i(a);
        }
      }
      function Se() {
        return {
          // Running localForages sharing a database.
          forages: [],
          // Shared database.
          db: null,
          // Database readiness (promise).
          dbReady: null,
          // Deferred operations on the database.
          deferredOperations: []
        };
      }
      function nt(n) {
        var s = this, i = {
          db: null
        };
        if (n)
          for (var c in n)
            i[c] = n[c];
        var d = B[i.name];
        d || (d = Se(), B[i.name] = d), d.forages.push(s), s._initReady || (s._initReady = s.ready, s.ready = et);
        var a = [];
        function v() {
          return f.resolve();
        }
        for (var m = 0; m < d.forages.length; m++) {
          var _ = d.forages[m];
          _ !== s && a.push(_._initReady().catch(v));
        }
        var y = d.forages.slice(0);
        return f.all(a).then(function() {
          return i.db = d.db, G(i);
        }).then(function(w) {
          return i.db = w, ce(i, s._defaultConfig.version) ? oe(i) : w;
        }).then(function(w) {
          i.db = d.db = w, s._dbInfo = i;
          for (var L = 0; L < y.length; L++) {
            var D = y[L];
            D !== s && (D._dbInfo.db = i.db, D._dbInfo.version = i.version);
          }
        });
      }
      function it(n, s) {
        var i = this;
        n = C(n);
        var c = new f(function(d, a) {
          i.ready().then(function() {
            J(i._dbInfo, Y, function(v, m) {
              if (v)
                return a(v);
              try {
                var _ = m.objectStore(i._dbInfo.storeName), y = _.get(n);
                y.onsuccess = function() {
                  var w = y.result;
                  w === void 0 && (w = null), Le(w) && (w = ne(w)), d(w);
                }, y.onerror = function() {
                  a(y.error);
                };
              } catch (w) {
                a(w);
              }
            });
          }).catch(a);
        });
        return b(c, s), c;
      }
      function ot(n, s) {
        var i = this, c = new f(function(d, a) {
          i.ready().then(function() {
            J(i._dbInfo, Y, function(v, m) {
              if (v)
                return a(v);
              try {
                var _ = m.objectStore(i._dbInfo.storeName), y = _.openCursor(), w = 1;
                y.onsuccess = function() {
                  var L = y.result;
                  if (L) {
                    var D = L.value;
                    Le(D) && (D = ne(D));
                    var A = n(D, L.key, w++);
                    A !== void 0 ? d(A) : L.continue();
                  } else
                    d();
                }, y.onerror = function() {
                  a(y.error);
                };
              } catch (L) {
                a(L);
              }
            });
          }).catch(a);
        });
        return b(c, s), c;
      }
      function rt(n, s, i) {
        var c = this;
        n = C(n);
        var d = new f(function(a, v) {
          var m;
          c.ready().then(function() {
            return m = c._dbInfo, X.call(s) === "[object Blob]" ? U(m.db).then(function(_) {
              return _ ? s : me(s);
            }) : s;
          }).then(function(_) {
            J(c._dbInfo, T, function(y, w) {
              if (y)
                return v(y);
              try {
                var L = w.objectStore(c._dbInfo.storeName);
                _ === null && (_ = void 0);
                var D = L.put(_, n);
                w.oncomplete = function() {
                  _ === void 0 && (_ = null), a(_);
                }, w.onabort = w.onerror = function() {
                  var A = D.error ? D.error : D.transaction.error;
                  v(A);
                };
              } catch (A) {
                v(A);
              }
            });
          }).catch(v);
        });
        return b(d, i), d;
      }
      function st(n, s) {
        var i = this;
        n = C(n);
        var c = new f(function(d, a) {
          i.ready().then(function() {
            J(i._dbInfo, T, function(v, m) {
              if (v)
                return a(v);
              try {
                var _ = m.objectStore(i._dbInfo.storeName), y = _.delete(n);
                m.oncomplete = function() {
                  d();
                }, m.onerror = function() {
                  a(y.error);
                }, m.onabort = function() {
                  var w = y.error ? y.error : y.transaction.error;
                  a(w);
                };
              } catch (w) {
                a(w);
              }
            });
          }).catch(a);
        });
        return b(c, s), c;
      }
      function at(n) {
        var s = this, i = new f(function(c, d) {
          s.ready().then(function() {
            J(s._dbInfo, T, function(a, v) {
              if (a)
                return d(a);
              try {
                var m = v.objectStore(s._dbInfo.storeName), _ = m.clear();
                v.oncomplete = function() {
                  c();
                }, v.onabort = v.onerror = function() {
                  var y = _.error ? _.error : _.transaction.error;
                  d(y);
                };
              } catch (y) {
                d(y);
              }
            });
          }).catch(d);
        });
        return b(i, n), i;
      }
      function lt(n) {
        var s = this, i = new f(function(c, d) {
          s.ready().then(function() {
            J(s._dbInfo, Y, function(a, v) {
              if (a)
                return d(a);
              try {
                var m = v.objectStore(s._dbInfo.storeName), _ = m.count();
                _.onsuccess = function() {
                  c(_.result);
                }, _.onerror = function() {
                  d(_.error);
                };
              } catch (y) {
                d(y);
              }
            });
          }).catch(d);
        });
        return b(i, n), i;
      }
      function ct(n, s) {
        var i = this, c = new f(function(d, a) {
          if (n < 0) {
            d(null);
            return;
          }
          i.ready().then(function() {
            J(i._dbInfo, Y, function(v, m) {
              if (v)
                return a(v);
              try {
                var _ = m.objectStore(i._dbInfo.storeName), y = !1, w = _.openKeyCursor();
                w.onsuccess = function() {
                  var L = w.result;
                  if (!L) {
                    d(null);
                    return;
                  }
                  n === 0 || y ? d(L.key) : (y = !0, L.advance(n));
                }, w.onerror = function() {
                  a(w.error);
                };
              } catch (L) {
                a(L);
              }
            });
          }).catch(a);
        });
        return b(c, s), c;
      }
      function dt(n) {
        var s = this, i = new f(function(c, d) {
          s.ready().then(function() {
            J(s._dbInfo, Y, function(a, v) {
              if (a)
                return d(a);
              try {
                var m = v.objectStore(s._dbInfo.storeName), _ = m.openKeyCursor(), y = [];
                _.onsuccess = function() {
                  var w = _.result;
                  if (!w) {
                    c(y);
                    return;
                  }
                  y.push(w.key), w.continue();
                }, _.onerror = function() {
                  d(_.error);
                };
              } catch (w) {
                d(w);
              }
            });
          }).catch(d);
        });
        return b(i, n), i;
      }
      function ht(n, s) {
        s = I.apply(this, arguments);
        var i = this.config();
        n = typeof n != "function" && n || {}, n.name || (n.name = n.name || i.name, n.storeName = n.storeName || i.storeName);
        var c = this, d;
        if (!n.name)
          d = f.reject("Invalid arguments");
        else {
          var a = n.name === i.name && c._dbInfo.db, v = a ? f.resolve(c._dbInfo.db) : G(n).then(function(m) {
            var _ = B[n.name], y = _.forages;
            _.db = m;
            for (var w = 0; w < y.length; w++)
              y[w]._dbInfo.db = m;
            return m;
          });
          n.storeName ? d = v.then(function(m) {
            if (m.objectStoreNames.contains(n.storeName)) {
              var _ = m.version + 1;
              $(n);
              var y = B[n.name], w = y.forages;
              m.close();
              for (var L = 0; L < w.length; L++) {
                var D = w[L];
                D._dbInfo.db = null, D._dbInfo.version = _;
              }
              var A = new f(function(P, W) {
                var F = p.open(n.name, _);
                F.onerror = function(K) {
                  var se = F.result;
                  se.close(), W(K);
                }, F.onupgradeneeded = function() {
                  var K = F.result;
                  K.deleteObjectStore(n.storeName);
                }, F.onsuccess = function() {
                  var K = F.result;
                  K.close(), P(K);
                };
              });
              return A.then(function(P) {
                y.db = P;
                for (var W = 0; W < w.length; W++) {
                  var F = w[W];
                  F._dbInfo.db = P, z(F._dbInfo);
                }
              }).catch(function(P) {
                throw (H(n, P) || f.resolve()).catch(function() {
                }), P;
              });
            }
          }) : d = v.then(function(m) {
            $(n);
            var _ = B[n.name], y = _.forages;
            m.close();
            for (var w = 0; w < y.length; w++) {
              var L = y[w];
              L._dbInfo.db = null;
            }
            var D = new f(function(A, P) {
              var W = p.deleteDatabase(n.name);
              W.onerror = function() {
                var F = W.result;
                F && F.close(), P(W.error);
              }, W.onblocked = function() {
                console.warn('dropInstance blocked for database "' + n.name + '" until all open connections are closed');
              }, W.onsuccess = function() {
                var F = W.result;
                F && F.close(), A(F);
              };
            });
            return D.then(function(A) {
              _.db = A;
              for (var P = 0; P < y.length; P++) {
                var W = y[P];
                z(W._dbInfo);
              }
            }).catch(function(A) {
              throw (H(n, A) || f.resolve()).catch(function() {
              }), A;
            });
          });
        }
        return b(d, s), d;
      }
      var ut = {
        _driver: "asyncStorage",
        _initStorage: nt,
        _support: g(),
        iterate: ot,
        getItem: it,
        setItem: rt,
        removeItem: st,
        clear: at,
        length: lt,
        key: ct,
        keys: dt,
        dropInstance: ht
      };
      function ft() {
        return typeof openDatabase == "function";
      }
      var q = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", vt = "~~local_forage_type~", Ie = /^~~local_forage_type~([^~]+)~/, de = "__lfsc__:", pe = de.length, ge = "arbf", _e = "blob", Re = "si08", De = "ui08", Me = "uic8", Ne = "si16", Ae = "si32", Pe = "ur16", Be = "ui32", Oe = "fl32", Ue = "fl64", Fe = pe + ge.length, We = Object.prototype.toString;
      function $e(n) {
        var s = n.length * 0.75, i = n.length, c, d = 0, a, v, m, _;
        n[n.length - 1] === "=" && (s--, n[n.length - 2] === "=" && s--);
        var y = new ArrayBuffer(s), w = new Uint8Array(y);
        for (c = 0; c < i; c += 4)
          a = q.indexOf(n[c]), v = q.indexOf(n[c + 1]), m = q.indexOf(n[c + 2]), _ = q.indexOf(n[c + 3]), w[d++] = a << 2 | v >> 4, w[d++] = (v & 15) << 4 | m >> 2, w[d++] = (m & 3) << 6 | _ & 63;
        return y;
      }
      function ye(n) {
        var s = new Uint8Array(n), i = "", c;
        for (c = 0; c < s.length; c += 3)
          i += q[s[c] >> 2], i += q[(s[c] & 3) << 4 | s[c + 1] >> 4], i += q[(s[c + 1] & 15) << 2 | s[c + 2] >> 6], i += q[s[c + 2] & 63];
        return s.length % 3 === 2 ? i = i.substring(0, i.length - 1) + "=" : s.length % 3 === 1 && (i = i.substring(0, i.length - 2) + "=="), i;
      }
      function mt(n, s) {
        var i = "";
        if (n && (i = We.call(n)), n && (i === "[object ArrayBuffer]" || n.buffer && We.call(n.buffer) === "[object ArrayBuffer]")) {
          var c, d = de;
          n instanceof ArrayBuffer ? (c = n, d += ge) : (c = n.buffer, i === "[object Int8Array]" ? d += Re : i === "[object Uint8Array]" ? d += De : i === "[object Uint8ClampedArray]" ? d += Me : i === "[object Int16Array]" ? d += Ne : i === "[object Uint16Array]" ? d += Pe : i === "[object Int32Array]" ? d += Ae : i === "[object Uint32Array]" ? d += Be : i === "[object Float32Array]" ? d += Oe : i === "[object Float64Array]" ? d += Ue : s(new Error("Failed to get type for BinaryArray"))), s(d + ye(c));
        } else if (i === "[object Blob]") {
          var a = new FileReader();
          a.onload = function() {
            var v = vt + n.type + "~" + ye(this.result);
            s(de + _e + v);
          }, a.readAsArrayBuffer(n);
        } else
          try {
            s(JSON.stringify(n));
          } catch (v) {
            console.error("Couldn't convert value into a JSON string: ", n), s(null, v);
          }
      }
      function pt(n) {
        if (n.substring(0, pe) !== de)
          return JSON.parse(n);
        var s = n.substring(Fe), i = n.substring(pe, Fe), c;
        if (i === _e && Ie.test(s)) {
          var d = s.match(Ie);
          c = d[1], s = s.substring(d[0].length);
        }
        var a = $e(s);
        switch (i) {
          case ge:
            return a;
          case _e:
            return S([a], { type: c });
          case Re:
            return new Int8Array(a);
          case De:
            return new Uint8Array(a);
          case Me:
            return new Uint8ClampedArray(a);
          case Ne:
            return new Int16Array(a);
          case Pe:
            return new Uint16Array(a);
          case Ae:
            return new Int32Array(a);
          case Be:
            return new Uint32Array(a);
          case Oe:
            return new Float32Array(a);
          case Ue:
            return new Float64Array(a);
          default:
            throw new Error("Unkown type: " + i);
        }
      }
      var we = {
        serialize: mt,
        deserialize: pt,
        stringToBuffer: $e,
        bufferToString: ye
      };
      function Ye(n, s, i, c) {
        n.executeSql("CREATE TABLE IF NOT EXISTS " + s.storeName + " (id INTEGER PRIMARY KEY, key unique, value)", [], i, c);
      }
      function gt(n) {
        var s = this, i = {
          db: null
        };
        if (n)
          for (var c in n)
            i[c] = typeof n[c] != "string" ? n[c].toString() : n[c];
        var d = new f(function(a, v) {
          try {
            i.db = openDatabase(i.name, String(i.version), i.description, i.size);
          } catch (m) {
            return v(m);
          }
          i.db.transaction(function(m) {
            Ye(m, i, function() {
              s._dbInfo = i, a();
            }, function(_, y) {
              v(y);
            });
          }, v);
        });
        return i.serializer = we, d;
      }
      function Z(n, s, i, c, d, a) {
        n.executeSql(i, c, d, function(v, m) {
          m.code === m.SYNTAX_ERR ? v.executeSql("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [s.storeName], function(_, y) {
            y.rows.length ? a(_, m) : Ye(_, s, function() {
              _.executeSql(i, c, d, a);
            }, a);
          }, a) : a(v, m);
        }, a);
      }
      function _t(n, s) {
        var i = this;
        n = C(n);
        var c = new f(function(d, a) {
          i.ready().then(function() {
            var v = i._dbInfo;
            v.db.transaction(function(m) {
              Z(m, v, "SELECT * FROM " + v.storeName + " WHERE key = ? LIMIT 1", [n], function(_, y) {
                var w = y.rows.length ? y.rows.item(0).value : null;
                w && (w = v.serializer.deserialize(w)), d(w);
              }, function(_, y) {
                a(y);
              });
            });
          }).catch(a);
        });
        return b(c, s), c;
      }
      function yt(n, s) {
        var i = this, c = new f(function(d, a) {
          i.ready().then(function() {
            var v = i._dbInfo;
            v.db.transaction(function(m) {
              Z(m, v, "SELECT * FROM " + v.storeName, [], function(_, y) {
                for (var w = y.rows, L = w.length, D = 0; D < L; D++) {
                  var A = w.item(D), P = A.value;
                  if (P && (P = v.serializer.deserialize(P)), P = n(P, A.key, D + 1), P !== void 0) {
                    d(P);
                    return;
                  }
                }
                d();
              }, function(_, y) {
                a(y);
              });
            });
          }).catch(a);
        });
        return b(c, s), c;
      }
      function ze(n, s, i, c) {
        var d = this;
        n = C(n);
        var a = new f(function(v, m) {
          d.ready().then(function() {
            s === void 0 && (s = null);
            var _ = s, y = d._dbInfo;
            y.serializer.serialize(s, function(w, L) {
              L ? m(L) : y.db.transaction(function(D) {
                Z(D, y, "INSERT OR REPLACE INTO " + y.storeName + " (key, value) VALUES (?, ?)", [n, w], function() {
                  v(_);
                }, function(A, P) {
                  m(P);
                });
              }, function(D) {
                if (D.code === D.QUOTA_ERR) {
                  if (c > 0) {
                    v(ze.apply(d, [n, _, i, c - 1]));
                    return;
                  }
                  m(D);
                }
              });
            });
          }).catch(m);
        });
        return b(a, i), a;
      }
      function wt(n, s, i) {
        return ze.apply(this, [n, s, i, 1]);
      }
      function bt(n, s) {
        var i = this;
        n = C(n);
        var c = new f(function(d, a) {
          i.ready().then(function() {
            var v = i._dbInfo;
            v.db.transaction(function(m) {
              Z(m, v, "DELETE FROM " + v.storeName + " WHERE key = ?", [n], function() {
                d();
              }, function(_, y) {
                a(y);
              });
            });
          }).catch(a);
        });
        return b(c, s), c;
      }
      function Tt(n) {
        var s = this, i = new f(function(c, d) {
          s.ready().then(function() {
            var a = s._dbInfo;
            a.db.transaction(function(v) {
              Z(v, a, "DELETE FROM " + a.storeName, [], function() {
                c();
              }, function(m, _) {
                d(_);
              });
            });
          }).catch(d);
        });
        return b(i, n), i;
      }
      function xt(n) {
        var s = this, i = new f(function(c, d) {
          s.ready().then(function() {
            var a = s._dbInfo;
            a.db.transaction(function(v) {
              Z(v, a, "SELECT COUNT(key) as c FROM " + a.storeName, [], function(m, _) {
                var y = _.rows.item(0).c;
                c(y);
              }, function(m, _) {
                d(_);
              });
            });
          }).catch(d);
        });
        return b(i, n), i;
      }
      function Et(n, s) {
        var i = this, c = new f(function(d, a) {
          i.ready().then(function() {
            var v = i._dbInfo;
            v.db.transaction(function(m) {
              Z(m, v, "SELECT key FROM " + v.storeName + " WHERE id = ? LIMIT 1", [n + 1], function(_, y) {
                var w = y.rows.length ? y.rows.item(0).key : null;
                d(w);
              }, function(_, y) {
                a(y);
              });
            });
          }).catch(a);
        });
        return b(c, s), c;
      }
      function kt(n) {
        var s = this, i = new f(function(c, d) {
          s.ready().then(function() {
            var a = s._dbInfo;
            a.db.transaction(function(v) {
              Z(v, a, "SELECT key FROM " + a.storeName, [], function(m, _) {
                for (var y = [], w = 0; w < _.rows.length; w++)
                  y.push(_.rows.item(w).key);
                c(y);
              }, function(m, _) {
                d(_);
              });
            });
          }).catch(d);
        });
        return b(i, n), i;
      }
      function Ct(n) {
        return new f(function(s, i) {
          n.transaction(function(c) {
            c.executeSql("SELECT name FROM sqlite_master WHERE type='table' AND name <> '__WebKitDatabaseInfoTable__'", [], function(d, a) {
              for (var v = [], m = 0; m < a.rows.length; m++)
                v.push(a.rows.item(m).name);
              s({
                db: n,
                storeNames: v
              });
            }, function(d, a) {
              i(a);
            });
          }, function(c) {
            i(c);
          });
        });
      }
      function Lt(n, s) {
        s = I.apply(this, arguments);
        var i = this.config();
        n = typeof n != "function" && n || {}, n.name || (n.name = n.name || i.name, n.storeName = n.storeName || i.storeName);
        var c = this, d;
        return n.name ? d = new f(function(a) {
          var v;
          n.name === i.name ? v = c._dbInfo.db : v = openDatabase(n.name, "", "", 0), n.storeName ? a({
            db: v,
            storeNames: [n.storeName]
          }) : a(Ct(v));
        }).then(function(a) {
          return new f(function(v, m) {
            a.db.transaction(function(_) {
              function y(A) {
                return new f(function(P, W) {
                  _.executeSql("DROP TABLE IF EXISTS " + A, [], function() {
                    P();
                  }, function(F, K) {
                    W(K);
                  });
                });
              }
              for (var w = [], L = 0, D = a.storeNames.length; L < D; L++)
                w.push(y(a.storeNames[L]));
              f.all(w).then(function() {
                v();
              }).catch(function(A) {
                m(A);
              });
            }, function(_) {
              m(_);
            });
          });
        }) : d = f.reject("Invalid arguments"), b(d, s), d;
      }
      var St = {
        _driver: "webSQLStorage",
        _initStorage: gt,
        _support: ft(),
        iterate: yt,
        getItem: _t,
        setItem: wt,
        removeItem: bt,
        clear: Tt,
        length: xt,
        key: Et,
        keys: kt,
        dropInstance: Lt
      };
      function It() {
        try {
          return typeof localStorage < "u" && "setItem" in localStorage && // in IE8 typeof localStorage.setItem === 'object'
          !!localStorage.setItem;
        } catch {
          return !1;
        }
      }
      function He(n, s) {
        var i = n.name + "/";
        return n.storeName !== s.storeName && (i += n.storeName + "/"), i;
      }
      function Rt() {
        var n = "_localforage_support_test";
        try {
          return localStorage.setItem(n, !0), localStorage.removeItem(n), !1;
        } catch {
          return !0;
        }
      }
      function Dt() {
        return !Rt() || localStorage.length > 0;
      }
      function Mt(n) {
        var s = this, i = {};
        if (n)
          for (var c in n)
            i[c] = n[c];
        return i.keyPrefix = He(n, s._defaultConfig), Dt() ? (s._dbInfo = i, i.serializer = we, f.resolve()) : f.reject();
      }
      function Nt(n) {
        var s = this, i = s.ready().then(function() {
          for (var c = s._dbInfo.keyPrefix, d = localStorage.length - 1; d >= 0; d--) {
            var a = localStorage.key(d);
            a.indexOf(c) === 0 && localStorage.removeItem(a);
          }
        });
        return b(i, n), i;
      }
      function At(n, s) {
        var i = this;
        n = C(n);
        var c = i.ready().then(function() {
          var d = i._dbInfo, a = localStorage.getItem(d.keyPrefix + n);
          return a && (a = d.serializer.deserialize(a)), a;
        });
        return b(c, s), c;
      }
      function Pt(n, s) {
        var i = this, c = i.ready().then(function() {
          for (var d = i._dbInfo, a = d.keyPrefix, v = a.length, m = localStorage.length, _ = 1, y = 0; y < m; y++) {
            var w = localStorage.key(y);
            if (w.indexOf(a) === 0) {
              var L = localStorage.getItem(w);
              if (L && (L = d.serializer.deserialize(L)), L = n(L, w.substring(v), _++), L !== void 0)
                return L;
            }
          }
        });
        return b(c, s), c;
      }
      function Bt(n, s) {
        var i = this, c = i.ready().then(function() {
          var d = i._dbInfo, a;
          try {
            a = localStorage.key(n);
          } catch {
            a = null;
          }
          return a && (a = a.substring(d.keyPrefix.length)), a;
        });
        return b(c, s), c;
      }
      function Ot(n) {
        var s = this, i = s.ready().then(function() {
          for (var c = s._dbInfo, d = localStorage.length, a = [], v = 0; v < d; v++) {
            var m = localStorage.key(v);
            m.indexOf(c.keyPrefix) === 0 && a.push(m.substring(c.keyPrefix.length));
          }
          return a;
        });
        return b(i, n), i;
      }
      function Ut(n) {
        var s = this, i = s.keys().then(function(c) {
          return c.length;
        });
        return b(i, n), i;
      }
      function Ft(n, s) {
        var i = this;
        n = C(n);
        var c = i.ready().then(function() {
          var d = i._dbInfo;
          localStorage.removeItem(d.keyPrefix + n);
        });
        return b(c, s), c;
      }
      function Wt(n, s, i) {
        var c = this;
        n = C(n);
        var d = c.ready().then(function() {
          s === void 0 && (s = null);
          var a = s;
          return new f(function(v, m) {
            var _ = c._dbInfo;
            _.serializer.serialize(s, function(y, w) {
              if (w)
                m(w);
              else
                try {
                  localStorage.setItem(_.keyPrefix + n, y), v(a);
                } catch (L) {
                  (L.name === "QuotaExceededError" || L.name === "NS_ERROR_DOM_QUOTA_REACHED") && m(L), m(L);
                }
            });
          });
        });
        return b(d, i), d;
      }
      function $t(n, s) {
        if (s = I.apply(this, arguments), n = typeof n != "function" && n || {}, !n.name) {
          var i = this.config();
          n.name = n.name || i.name, n.storeName = n.storeName || i.storeName;
        }
        var c = this, d;
        return n.name ? d = new f(function(a) {
          n.storeName ? a(He(n, c._defaultConfig)) : a(n.name + "/");
        }).then(function(a) {
          for (var v = localStorage.length - 1; v >= 0; v--) {
            var m = localStorage.key(v);
            m.indexOf(a) === 0 && localStorage.removeItem(m);
          }
        }) : d = f.reject("Invalid arguments"), b(d, s), d;
      }
      var Yt = {
        _driver: "localStorageWrapper",
        _initStorage: Mt,
        _support: It(),
        iterate: Pt,
        getItem: At,
        setItem: Wt,
        removeItem: Ft,
        clear: Nt,
        length: Ut,
        key: Bt,
        keys: Ot,
        dropInstance: $t
      }, zt = function(s, i) {
        return s === i || typeof s == "number" && typeof i == "number" && isNaN(s) && isNaN(i);
      }, Ht = function(s, i) {
        for (var c = s.length, d = 0; d < c; ) {
          if (zt(s[d], i))
            return !0;
          d++;
        }
        return !1;
      }, Ve = Array.isArray || function(n) {
        return Object.prototype.toString.call(n) === "[object Array]";
      }, re = {}, Ke = {}, ie = {
        INDEXEDDB: ut,
        WEBSQL: St,
        LOCALSTORAGE: Yt
      }, Vt = [ie.INDEXEDDB._driver, ie.WEBSQL._driver, ie.LOCALSTORAGE._driver], he = ["dropInstance"], be = ["clear", "getItem", "iterate", "key", "keys", "length", "removeItem", "setItem"].concat(he), Kt = {
        description: "",
        driver: Vt.slice(),
        name: "localforage",
        // Default DB size is _JUST UNDER_ 5MB, as it's the highest size
        // we can use without a prompt.
        size: 4980736,
        storeName: "keyvaluepairs",
        version: 1
      };
      function Xt(n, s) {
        n[s] = function() {
          var i = arguments;
          return n.ready().then(function() {
            return n[s].apply(n, i);
          });
        };
      }
      function Te() {
        for (var n = 1; n < arguments.length; n++) {
          var s = arguments[n];
          if (s)
            for (var i in s)
              s.hasOwnProperty(i) && (Ve(s[i]) ? arguments[0][i] = s[i].slice() : arguments[0][i] = s[i]);
        }
        return arguments[0];
      }
      var Qt = function() {
        function n(s) {
          u(this, n);
          for (var i in ie)
            if (ie.hasOwnProperty(i)) {
              var c = ie[i], d = c._driver;
              this[i] = d, re[d] || this.defineDriver(c);
            }
          this._defaultConfig = Te({}, Kt), this._config = Te({}, this._defaultConfig, s), this._driverSet = null, this._initDriver = null, this._ready = !1, this._dbInfo = null, this._wrapLibraryMethodsWithReady(), this.setDriver(this._config.driver).catch(function() {
          });
        }
        return n.prototype.config = function(i) {
          if ((typeof i > "u" ? "undefined" : l(i)) === "object") {
            if (this._ready)
              return new Error("Can't call config() after localforage has been used.");
            for (var c in i) {
              if (c === "storeName" && (i[c] = i[c].replace(/\W/g, "_")), c === "version" && typeof i[c] != "number")
                return new Error("Database version must be a number.");
              this._config[c] = i[c];
            }
            return "driver" in i && i.driver ? this.setDriver(this._config.driver) : !0;
          } else
            return typeof i == "string" ? this._config[i] : this._config;
        }, n.prototype.defineDriver = function(i, c, d) {
          var a = new f(function(v, m) {
            try {
              var _ = i._driver, y = new Error("Custom driver not compliant; see https://mozilla.github.io/localForage/#definedriver");
              if (!i._driver) {
                m(y);
                return;
              }
              for (var w = be.concat("_initStorage"), L = 0, D = w.length; L < D; L++) {
                var A = w[L], P = !Ht(he, A);
                if ((P || i[A]) && typeof i[A] != "function") {
                  m(y);
                  return;
                }
              }
              var W = function() {
                for (var se = function(Jt) {
                  return function() {
                    var qt = new Error("Method " + Jt + " is not implemented by the current driver"), Xe = f.reject(qt);
                    return b(Xe, arguments[arguments.length - 1]), Xe;
                  };
                }, xe = 0, Gt = he.length; xe < Gt; xe++) {
                  var Ee = he[xe];
                  i[Ee] || (i[Ee] = se(Ee));
                }
              };
              W();
              var F = function(se) {
                re[_] && console.info("Redefining LocalForage driver: " + _), re[_] = i, Ke[_] = se, v();
              };
              "_support" in i ? i._support && typeof i._support == "function" ? i._support().then(F, m) : F(!!i._support) : F(!0);
            } catch (K) {
              m(K);
            }
          });
          return k(a, c, d), a;
        }, n.prototype.driver = function() {
          return this._driver || null;
        }, n.prototype.getDriver = function(i, c, d) {
          var a = re[i] ? f.resolve(re[i]) : f.reject(new Error("Driver not found."));
          return k(a, c, d), a;
        }, n.prototype.getSerializer = function(i) {
          var c = f.resolve(we);
          return k(c, i), c;
        }, n.prototype.ready = function(i) {
          var c = this, d = c._driverSet.then(function() {
            return c._ready === null && (c._ready = c._initDriver()), c._ready;
          });
          return k(d, i, i), d;
        }, n.prototype.setDriver = function(i, c, d) {
          var a = this;
          Ve(i) || (i = [i]);
          var v = this._getSupportedDrivers(i);
          function m() {
            a._config.driver = a.driver();
          }
          function _(L) {
            return a._extend(L), m(), a._ready = a._initStorage(a._config), a._ready;
          }
          function y(L) {
            return function() {
              var D = 0;
              function A() {
                for (; D < L.length; ) {
                  var P = L[D];
                  return D++, a._dbInfo = null, a._ready = null, a.getDriver(P).then(_).catch(A);
                }
                m();
                var W = new Error("No available storage method found.");
                return a._driverSet = f.reject(W), a._driverSet;
              }
              return A();
            };
          }
          var w = this._driverSet !== null ? this._driverSet.catch(function() {
            return f.resolve();
          }) : f.resolve();
          return this._driverSet = w.then(function() {
            var L = v[0];
            return a._dbInfo = null, a._ready = null, a.getDriver(L).then(function(D) {
              a._driver = D._driver, m(), a._wrapLibraryMethodsWithReady(), a._initDriver = y(v);
            });
          }).catch(function() {
            m();
            var L = new Error("No available storage method found.");
            return a._driverSet = f.reject(L), a._driverSet;
          }), k(this._driverSet, c, d), this._driverSet;
        }, n.prototype.supports = function(i) {
          return !!Ke[i];
        }, n.prototype._extend = function(i) {
          Te(this, i);
        }, n.prototype._getSupportedDrivers = function(i) {
          for (var c = [], d = 0, a = i.length; d < a; d++) {
            var v = i[d];
            this.supports(v) && c.push(v);
          }
          return c;
        }, n.prototype._wrapLibraryMethodsWithReady = function() {
          for (var i = 0, c = be.length; i < c; i++)
            Xt(this, be[i]);
        }, n.prototype.createInstance = function(i) {
          return new n(i);
        }, n;
      }(), jt = new Qt();
      o.exports = jt;
    }, { 3: 3 }] }, {}, [4])(4);
  });
})(Je);
var vn = Je.exports;
const j = /* @__PURE__ */ fn(vn);
class mn {
  constructor() {
    x(this, "active_notebook", null);
    x(this, "store", j);
    x(this, "saved_lines", /* @__PURE__ */ new Set());
    x(this, "known_notebooks", /* @__PURE__ */ new Set());
  }
  async listNotebooks() {
    const e = await j.getItem("notebooks") || [];
    for (let t of e)
      this.known_notebooks.add(t);
    return e;
  }
  async setActiveNotebook(e) {
    if (this.known_notebooks.size === 0)
      for (let t of await this.listNotebooks())
        this.known_notebooks.add(t);
    this.active_notebook = e, this.store = j.createInstance({ name: e }), this.saved_lines = await this.store.getItem("saved_lines") || /* @__PURE__ */ new Set(), await this.store.setItem("saved_lines", this.saved_lines), this.known_notebooks.add(e), await this.saveKnownNotebooks();
  }
  async deleteNotebook(e) {
    await j.dropInstance({ name: e }), this.known_notebooks.delete(e), await this.saveKnownNotebooks();
  }
  async notebookIsInitialized() {
    return await this.store.getItem("initialized") || !1;
  }
  async initializeNotebook() {
    await this.store.setItem("initialized", !0);
  }
  async saveLine(e, t, o) {
    await this.store.setItem(`content-strokes-line${e}`, t), await this.store.setItem(`content-firstContent-line${e}`, o), this.saved_lines.add(e), await this.store.setItem("saved_lines", this.saved_lines);
  }
  async listSavedLines() {
    return this.saved_lines;
  }
  async getSavedLine(e, t, o, r) {
    const l = (g) => (g - o) * t + r, u = await this.store.getItem(`content-strokes-line${e}`), h = u ? u.map((g) => {
      const S = new ae(g.y_root * t);
      return S.x_points = g.x_points.map(l), S.y_points = g.y_points.map((f) => f * t), S;
    }) : null, p = await this.store.getItem(`content-firstContent-line${e}`);
    return { strokes: h, firstContent: p === null ? null : l(p) };
  }
  async saveLastLine(e) {
    await this.store.setItem("lastline", e);
  }
  async getLastLine() {
    return await this.store.getItem("lastline");
  }
  async saveUIState(e) {
    await this.store.setItem("ui-state", e);
  }
  async getUIState() {
    return await this.store.getItem("ui-state");
  }
  async dumpNoteBookData() {
    const e = {
      name: this.active_notebook,
      initialized: !0
    }, t = await this.listSavedLines(), o = [], r = {};
    for (let u of t)
      o.push(u), r[u] = {
        strokes: await this.store.getItem(`content-strokes-line${u}`),
        firstContent: await this.store.getItem(`content-firstContent-line${u}`)
      };
    e["saved-lines"] = o, e["line-save-data"] = r, e.lastline = await this.getLastLine();
    const l = JSON.stringify(e);
    return new Blob([l], { type: "application/json" });
  }
  async loadNoteBookData(e) {
    await this.initializeNotebook(), this.saved_lines = new Set(e["saved-lines"]), await this.store.setItem("saved_lines", this.saved_lines);
    for (let t of this.saved_lines) {
      const o = e["line-save-data"][t];
      await this.store.setItem(`content-strokes-line${t}`, o.strokes), await this.store.setItem(`content-firstContent-line${t}`, o.firstContent);
    }
    await this.saveLastLine(e.lastline);
  }
  async saveKnownNotebooks() {
    const e = [];
    for (let t of this.known_notebooks)
      e.push(t);
    await j.setItem("notebooks", e);
  }
}
class te {
  constructor(e) {
    x(this, "container");
    x(this, "dialog");
    x(this, "on_close", null);
    x(this, "on_blur", null);
    const t = document.createElement("div");
    t.classList.add("modal");
    const o = document.createElement("div");
    o.classList.add("modal-dialog"), t.appendChild(o);
    const r = document.createElement("h1");
    r.innerText = e, o.appendChild(r), t.onclick = () => {
      this.on_blur && this.on_blur(), this.close_container();
    }, o.onclick = (l) => {
      l.stopPropagation();
    }, this.container = t, this.dialog = o;
  }
  /** Adds a canvas to the modal */
  add_canvas() {
    const e = document.createElement("canvas");
    e.width = 1e3, e.height = 1e3, e.style.height = "85%", e.style.width = "100%";
    const t = e.getContext("2d");
    return this.dialog.appendChild(e), t;
  }
  /** Appends an element to the modal */
  appendChild(e) {
    this.dialog.appendChild(e);
  }
  /** Close the modal */
  close_container() {
    this.container.remove(), this.on_close && this.on_close();
  }
  /** Render the modal */
  attach(e) {
    e.appendChild(this.container);
  }
}
function pn(E) {
  const e = new te(E), t = document.createElement("button");
  return t.classList.add("modalalert-ok"), t.innerText = "ok", t.onclick = () => {
    e.close_container();
  }, e.appendChild(t), e.attach(document.body), e;
}
function gn(E) {
  return new Promise((e) => {
    const t = new te(E);
    t.on_blur = () => {
      e(null);
    };
    const o = document.createElement("input");
    o.classList.add("modalprompt-input"), t.appendChild(o);
    const r = document.createElement("button");
    r.classList.add("modalalert-ok"), r.innerText = "ok", r.onclick = () => {
      t.close_container(), e(o.value);
    }, t.appendChild(r);
    const l = document.createElement("button");
    l.classList.add("modalalert-cancel"), l.innerText = "cancel", l.onclick = () => {
      t.close_container(), e(null);
    }, t.appendChild(l), o.addEventListener("keypress", (u) => {
      u.key === "Enter" && (u.preventDefault(), r.click());
    }), t.attach(document.body);
  });
}
function _n(E) {
  return new Promise((e) => {
    const t = new te(E);
    t.on_blur = () => {
      e(!1);
    };
    const o = document.createElement("button");
    o.classList.add("modalalert-ok"), o.innerText = "ok", o.onclick = () => {
      t.close_container(), e(!0);
    }, t.appendChild(o);
    const r = document.createElement("button");
    r.classList.add("modalalert-cancel"), r.innerText = "cancel", r.onclick = () => {
      t.close_container(), e(!1);
    }, t.appendChild(r), t.attach(document.body);
  });
}
const yn = [
  {
    name: "File",
    children: [
      {
        name: "Open",
        children: []
      },
      {
        name: "New"
      },
      {
        name: "Manage"
      }
    ]
  },
  {
    name: "Edit",
    children: [
      {
        name: "Undo"
      },
      {
        name: "Redo"
      }
    ]
  },
  {
    name: "Tools",
    children: [
      {
        name: "Eraser"
      },
      {
        name: "Quick Links"
      }
    ]
  },
  {
    name: "View",
    children: [
      {
        name: "Theme",
        children: [
          {
            name: "Light"
          },
          {
            name: "Dark"
          }
        ]
      }
    ]
  },
  {
    name: "Export",
    children: [
      {
        name: "Save"
      },
      {
        name: "Load"
      }
    ]
  }
];
class wn {
  constructor(e) {
    x(this, "el");
    this.el = document.createElement("div"), this.el.classList.add("menulabel"), this.el.innerText = e;
  }
  attach(e) {
    e.appendChild(this.el);
  }
  set(e) {
    this.el.innerText = e;
  }
}
class qe {
  constructor(e, t, o = !1) {
    x(this, "el");
    x(this, "label");
    x(this, "child", null);
    this.el = document.createElement("div"), this.el.classList.add("menuitem"), this.el.id = `${e}${t}`, o && (this.el.style.paddingRight = "0.25em"), this.label = new wn(t), this.label.attach(this.el);
  }
  /**
   * Render this object
   */
  attach(e) {
    e.appendChild(this.el);
  }
  /**
   * Set display text
   */
  setLabel(e) {
    this.label.set(e);
  }
  /**
   * Create children storage container
   */
  getChild() {
    if (this.child === null) {
      const e = document.createElement("div");
      e.classList.add("menuchild"), this.child = e, this.el.appendChild(this.child);
    }
    return this.child;
  }
  /**
   * Add callback for selection of this item
   */
  setOnClick(e) {
    this.el.onclick = e;
  }
}
function bn(E, e) {
  function t(r, l, u) {
    const h = new qe(r, u.name, r === "Menubar.");
    if (h.attach(l), u.children) {
      r !== "Menubar." && h.setLabel(`${u.name} >`);
      const p = h.getChild();
      for (let g of u.children)
        t(r + u.name + ".", p, g);
    }
  }
  const o = document.getElementById("menubar");
  for (let r of e)
    t(E + ".", o, r);
}
async function Tn(E, e, t) {
  const o = new te("Quick Links"), r = E.rootOnlyDoc(), l = o.add_canvas(), u = new Ge(l, r.doc, e, !0);
  u.clearAndRedraw(), u.installEventHandlers(), u.on_line_tap = (h) => {
    t.infer_line_mapping(r.mapping.get(h)), t.y_offset = 0, t.clearAndRedraw(), o.close_container();
  }, o.attach(document.body);
}
async function Ze(E, e) {
  const o = document.getElementById("Menubar.File.Open").getElementsByClassName("menuchild")[0];
  o.innerHTML = "";
  const r = await e.listNotebooks(), l = (h) => {
    const p = new qe("Menubar.File.Open.", h);
    return p.setOnClick(async () => {
      location.assign(`?notebook=${encodeURIComponent(h)}`);
    }), p;
  };
  l(E).attach(o);
  for (let h of r) {
    if (h == E)
      continue;
    l(decodeURIComponent(h)).attach(o);
  }
}
function xn() {
  const E = document.getElementById("Menubar.File.New");
  E.onclick = async () => {
    for (; ; ) {
      const e = await gn("New notebook name");
      if (e === "") {
        await new Promise((t) => {
          const o = pn("Please enter a notebook name");
          o.on_close = () => {
            setTimeout(t, 0);
          };
        });
        continue;
      } else
        e && location.assign(`?notebook=${encodeURIComponent(e)}`);
      break;
    }
  };
}
function En(E, e) {
  const t = document.getElementById("Menubar.File.Manage");
  t.onclick = async () => {
    const o = new te("Manage Notebooks"), r = document.createElement("div");
    r.style.position = "inherit", r.style.height = "80%", r.style.overflow = "auto";
    const l = /* @__PURE__ */ new Map(), u = document.createElement("input");
    u.style.width = "95%", u.style.height = "2em", u.style.borderRadius = "10px", u.placeholder = "Search", u.onkeyup = () => {
      for (let p of l)
        p[0].startsWith(u.value) ? p[1].style.display = "" : p[1].style.display = "none";
    }, r.appendChild(u), r.appendChild(document.createElement("br"));
    const h = await e.listNotebooks();
    for (let p of h) {
      const g = document.createElement("div"), S = document.createElement("h2");
      S.innerText = p, g.appendChild(S);
      const f = document.createElement("button");
      f.innerText = "Open", f.classList.add("modalalert-ok"), f.style.float = "none", f.style.marginTop = "0", f.onclick = () => {
        location.assign(`?notebook=${encodeURIComponent(p)}`);
      }, g.appendChild(f), g.appendChild(document.createElement("br"));
      const b = document.createElement("button");
      b.innerText = "Delete?", b.classList.add("modalalert-cancel"), b.style.float = "none", b.style.marginTop = "0", p === E && (b.disabled = !0), g.appendChild(b), g.appendChild(document.createElement("br")), g.appendChild(document.createElement("br")), b.onclick = async () => {
        await _n(`Delete ${p}?`) && (await e.deleteNotebook(p), await Ze(E, e)), o.close_container(), await new Promise((C) => {
          setTimeout(C, 0);
        }), t.click();
      }, l.set(p, g), r.appendChild(g);
    }
    o.appendChild(r), o.attach(document.body);
  };
}
async function kn(E) {
  const e = document.getElementById("style-dark").innerText, t = document.getElementById("style-light").innerText, o = document.getElementById("style-current"), r = (u) => {
    j.setItem("theme", u ? "dark" : "light"), o.innerText = u ? e : t, E.clearAndRedraw();
  };
  Q().registerModeSwitchCB(
    r.bind(null, !0),
    r.bind(null, !1)
  ), document.getElementById("Menubar.View.Theme.Light").onclick = () => {
    Q().enableLightMode();
  }, document.getElementById("Menubar.View.Theme.Dark").onclick = () => {
    Q().enableDarkMode();
  };
  let l = await j.getItem("theme");
  l || (l = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"), l == "light" ? Q().enableLightMode() : Q().enableDarkMode();
}
function Cn(E, e, t) {
  const o = document.getElementById("Menubar.Export.Save");
  o.onclick = async () => {
    const l = await e.dumpNoteBookData(), u = URL.createObjectURL(l), h = document.createElement("a");
    h.href = u, h.download = `${encodeURIComponent(E)}.json`, h.textContent = `Download ${encodeURIComponent(E)}.json`, document.body.appendChild(h), h.click(), h.remove();
  };
  const r = document.getElementById("Menubar.Export.Load");
  r.onclick = () => {
    const l = new te("Load File"), u = document.createElement("input");
    u.type = "file", u.innerText = "load", u.addEventListener("change", (p) => {
      const g = p.target.files[0], S = new FileReader();
      S.readAsText(g, "UTF-8"), S.onload = async (f) => {
        const b = f.target.result, k = JSON.parse(b);
        await e.loadNoteBookData(k), await t.save(), await t.load(!1), t.clearAndRedraw(), l.close_container();
      };
    }), l.appendChild(u), l.appendChild(document.createElement("br")), l.appendChild(document.createElement("br"));
    const h = document.createElement("button");
    h.classList.add("modalalert-cancel"), h.innerText = "cancel", h.onclick = () => {
      l.close_container();
    }, h.style.marginLeft = "25%", l.appendChild(h), l.attach(document.body);
  };
}
function Ln(E) {
  const e = document.getElementById("Menubar.Tools.Eraser").getElementsByClassName("menulabel")[0];
  E.on_eraser_flip = () => {
    E.is_eraser ? e.innerText = "Pen" : e.innerText = "Eraser";
  }, e.onclick = () => {
    E.flip_eraser_state();
  };
}
function Sn(E) {
  const e = [], t = document.getElementById("Menubar.Edit.Undo");
  t.onclick = async () => {
    const r = await E.engine.pop();
    r && (await E.clearAndRedraw(), e.push(r));
  };
  const o = document.getElementById("Menubar.Edit.Redo");
  o.onclick = async () => {
    const r = e.pop();
    r && (await E.engine.execute(r), await E.clearAndRedraw());
  };
}
function In(E, e) {
  E.vibrate([100]);
  const t = new te("Add/Delete lines"), o = document.createElement("button");
  o.innerText = "add", o.classList.add("addline"), o.innerText = "add";
  const r = document.createElement("input");
  r.type = "number", r.value = "1", r.classList.add("addlinecount");
  const l = document.createElement("button");
  l.innerText = "delete", l.classList.add("delline");
  const u = document.createElement("button");
  u.innerText = "duplicate", u.classList.add("delline"), t.appendChild(o), t.appendChild(r), t.appendChild(document.createElement("br")), t.appendChild(document.createElement("br")), t.appendChild(l), t.appendChild(document.createElement("br")), t.appendChild(document.createElement("br")), t.appendChild(u), t.attach(document.body);
  const h = () => {
    t.close_container();
  };
  o.onclick = async () => {
    await E.add_line(e, Math.floor(Number(r.value))), h();
  }, l.onclick = () => {
    E.delete_lines(e, 1), h();
  }, u.onclick = async () => {
    await E.duplicate_line(e), h();
  };
}
async function Mn() {
  if ("serviceWorker" in navigator) {
    console.log("registering serviceworker");
    try {
      const f = await navigator.serviceWorker.register("/NoteDown/service_worker.js");
      console.log(f);
    } catch (f) {
      console.log(f);
    }
  }
  bn("Menubar", yn);
  const E = document.getElementById("mycanvas");
  E.width = 1e3, E.height = 1e3;
  const e = E.getContext("2d");
  if (!e)
    return;
  const t = window.location.search, o = new URLSearchParams(t), r = o.get("upgradeui") || !1, l = async () => {
    const f = await j.getItem("lastNotebook");
    return f || "default";
  }, u = decodeURIComponent(o.get("notebook") || await l());
  await j.setItem("lastNotebook", u), document.getElementById("notebookName").innerText = u;
  const h = new mn(), p = new ke(), g = new Ge(e, p, h);
  await h.setActiveNotebook(u), await h.notebookIsInitialized() ? (await g.load(r), g.clearAndRedraw()) : (await g.save(), await h.initializeNotebook()), g.on_line_select = In.bind(null, g), g.installEventHandlers(), xn(), En(u, h), await Ze(u, h), await kn(g), Cn(u, h, g), Ln(g), Sn(g);
  const S = document.getElementById("Menubar.Tools.Quick Links");
  S.onclick = () => {
    Tn(p, h, g);
  }, window.notedown = g, window.localForage = j;
}
export {
  Mn as main
};
