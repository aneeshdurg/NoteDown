var Zt = Object.defineProperty;
var en = (k, e, t) => e in k ? Zt(k, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : k[e] = t;
var x = (k, e, t) => (en(k, typeof e != "symbol" ? e + "" : e, t), t);
class ke {
  constructor() {
    x(this, "last_line", 9);
    x(this, "indentWidth", 20);
    x(this, "linesToStrokes", /* @__PURE__ */ new Map());
    x(this, "linesTofirstContent", /* @__PURE__ */ new Map());
  }
  async load(e, t, o, s) {
    this.last_line = await e.getLastLine() || this.last_line;
    const l = await e.listSavedLines();
    for (let u of l) {
      const h = await e.getSavedLine(u, t, o, s);
      h.strokes === null || (this.linesToStrokes.set(u, h.strokes), this.linesTofirstContent.set(u, h.firstContent));
    }
  }
  async indent(e, t, o, s, l = -1) {
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
    if (h.push(this.saveToStorage(e, s)), o)
      for (let p of this.childLines(e))
        h.push(this.indent(p, t, !1, s, l));
    await Promise.all(h);
  }
  hasContent(e) {
    const t = this.linesTofirstContent.get(e);
    return !(t === void 0 || t === 0);
  }
  childLines(e) {
    let t = [], o = 0, s = e, l = this.linesTofirstContent.get(s);
    if (l === void 0)
      return t;
    for (s += 1; s <= this.last_line; s++) {
      const u = this.linesTofirstContent.get(s);
      if (u === void 0) {
        if (o += 1, o == 1)
          t.push(s);
        else
          break;
        continue;
      }
      if (l < u && Math.abs(l - u) > this.indentWidth)
        t.push(s);
      else
        break;
      o = 0;
    }
    return t;
  }
  async add_stroke(e, t, o) {
    var l;
    this.linesToStrokes.get(e) === void 0 && this.linesToStrokes.set(e, []), (l = this.linesToStrokes.get(e)) == null || l.push(t);
    let s = t.leftMostPoint();
    this.linesTofirstContent.get(e) === void 0 && this.linesTofirstContent.set(e, s), this.linesTofirstContent.set(
      e,
      Math.min(this.linesTofirstContent.get(e) || 0, s)
    ), o && await this.saveToStorage(e, o), await this.updateLastLine(e, o);
  }
  async pop_stroke(e, t) {
    var o;
    (o = this.linesToStrokes.get(e)) == null || o.pop(), t && await this.saveToStorage(e, t);
  }
  async updateStrokes(e, t, o) {
    this.linesToStrokes.set(e, t);
    let s = 1 / 0;
    t.forEach((l) => {
      s = Math.min(s, l.leftMostPoint());
    }), this.linesTofirstContent.set(e, s), await this.saveToStorage(e, o);
  }
  async saveToStorage(e, t) {
    await t.saveLine(e, this.linesToStrokes.get(e), this.linesTofirstContent.get(e));
  }
  async updateLastLine(e, t, o = !1) {
    this.last_line = Math.max(this.last_line, e), o && (this.last_line = e), t && await t.saveLastLine(this.last_line);
  }
  async deleteLines(e, t, o) {
    for (let s = e; s < this.last_line; s++) {
      const l = s + t;
      this.linesToStrokes.get(l) !== void 0 ? (this.linesToStrokes.set(s, this.linesToStrokes.get(l)), this.linesTofirstContent.set(s, this.linesTofirstContent.get(l))) : (this.linesToStrokes.delete(s), this.linesTofirstContent.delete(s));
    }
    this.updateLastLine(this.last_line - t, o, !0);
    for (let s = 0; s < this.last_line; s++)
      await this.saveToStorage(s, o);
  }
  async insertLines(e, t, o) {
    for (let s = this.last_line; s >= e; s--) {
      const l = s + t;
      this.linesToStrokes.get(s) !== void 0 ? (this.linesToStrokes.set(l, this.linesToStrokes.get(s)), this.linesTofirstContent.set(l, this.linesTofirstContent.get(s)), this.linesToStrokes.delete(s), this.linesTofirstContent.delete(s)) : (this.linesToStrokes.delete(l), this.linesTofirstContent.delete(l));
    }
    this.updateLastLine(this.last_line + t, o);
    for (let s = 0; s < this.last_line; s++)
      await this.saveToStorage(s, o);
  }
  async moveLines(e, t, o, s) {
    const l = 1 + (o ? this.childLines(e).length : 0), u = [], h = [];
    for (let p = 0; p < l; p++) {
      const g = this.linesToStrokes.get(e + p), S = this.linesTofirstContent.get(e + p);
      u.push(g), h.push(S);
    }
    await this.deleteLines(e, l, s), t > e && (t = t - l), this.insertLines(t, l, s);
    for (let p = 0; p < l; p++) {
      const g = t + p;
      u[p] !== void 0 ? (this.linesToStrokes.set(g, u[p]), this.linesTofirstContent.set(g, h[p])) : (this.linesToStrokes.delete(g), this.linesTofirstContent.delete(g));
    }
    for (let p = 0; p < this.last_line; p++)
      await this.saveToStorage(p, s);
  }
  rootOnlyDoc() {
    const e = new ke();
    let t = 0, o = 0;
    const s = /* @__PURE__ */ new Map();
    for (; o <= this.last_line; ) {
      if (this.hasContent(o)) {
        const l = this.childLines(o).length;
        console.log("Selecting", o, this.last_line, l);
        for (let u of this.linesToStrokes.get(o))
          e.add_stroke(t, u, null);
        s.set(t, o), t = t + 1, l ? o = o + l : console.log("   !", o);
      } else
        console.log("   !", o, this.linesTofirstContent.get(o));
      o++;
    }
    return console.log(this.linesTofirstContent), { doc: e, mapping: s };
  }
  async copyLine(e, t, o) {
    const s = this.linesTofirstContent.get(t), l = this.linesToStrokes.get(t).map((u) => u.copy());
    this.linesTofirstContent.set(o, s), this.linesToStrokes.set(o, l), await this.saveToStorage(o, e);
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
function j() {
  return nn;
}
class ae {
  constructor(e) {
    x(this, "x_points");
    x(this, "y_points");
    x(this, "y_root");
    this.x_points = [], this.y_points = [], this.y_root = e;
  }
  copy() {
    const e = new ae(this.y_root);
    for (let t = 0; t < this.x_points.length; t++)
      e.add(this.x_points[t], this.y_points[t] + this.y_root);
    return e;
  }
  add(e, t) {
    this.x_points.push(e), this.y_points.push(t - this.y_root);
  }
  draw(e, t, o = !1) {
    e.strokeStyle = j().strokeColor, e.lineWidth = 2;
    let s = 1;
    o && (s = 5);
    let l = this.x_points[0], u = this.y_points[0] + t;
    for (let h = 1; h < this.x_points.length; h += s) {
      const p = this.x_points[h], g = this.y_points[h] + t;
      e.beginPath(), e.moveTo(l, u), e.lineTo(p, g), e.stroke(), l = p, u = g;
    }
  }
  intersects(e, t, o) {
    const s = (b, E, C, I, R, B) => {
      const O = Math.min(C, R), K = Math.max(C, R), Y = Math.min(I, B), T = Math.max(I, B);
      return b >= O && b <= K && E >= Y && E <= T;
    }, l = t.x, u = t.y, h = o.x, p = o.y, g = (p - u) / (h - l), S = u - g * l, f = (b, E) => {
      const C = this.x_points[b], I = this.y_points[b] + e, R = this.x_points[E], B = this.y_points[E] + e, O = (B - I) / (R - C), K = I - O * C;
      if (O == g)
        return K != S ? !1 : s(C, I, l, u, h, p) || s(R, B, l, u, h, p);
      {
        const Y = (S - K) / (O - g), T = O * Y + K;
        return s(Y, T, C, I, R, B) && s(Y, T, l, u, h, p);
      }
    };
    for (let b = 1; b < this.x_points.length; b++) {
      const E = b - 1;
      if (f(E, b))
        return !0;
    }
    return !1;
  }
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
    x(this, "line");
    this.line = t;
  }
}
class on extends le {
  constructor(t, o) {
    super(t);
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
    this.new_strokes.forEach((s, l) => {
      o.push(t.doc.updateStrokes(l, s, t.storage));
    }), await Promise.all(o);
  }
  async unexecute(t) {
    const o = [];
    this.original.forEach((s, l) => {
      o.push(t.doc.updateStrokes(l, s, t.storage));
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
    this.num_lines = o;
  }
  async execute(t) {
    await t.doc.deleteLines(this.line, this.num_lines, t.storage);
  }
  async unexecute(t) {
    await t.doc.insertLines(this.line, this.num_lines, t.storage);
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
  constructor(t, o, s) {
    super();
    x(this, "src_line");
    x(this, "dst_line");
    x(this, "move_children");
    this.src_line = t, this.dst_line = o, this.move_children = s;
  }
  async execute(t) {
    await t.doc.moveLines(this.src_line, this.dst_line, this.move_children, t.storage);
  }
  async unexecute(t) {
    this.src_line < this.dst_line ? await t.doc.moveLines(this.dst_line - 1, this.src_line, this.move_children, t.storage) : await t.doc.moveLines(this.dst_line, this.src_line + 1, this.move_children, t.storage);
  }
}
class cn extends le {
  constructor(t, o, s) {
    super(t);
    x(this, "direction");
    x(this, "indent_children");
    this.direction = o, this.indent_children = s;
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
    x(this, "doc");
    x(this, "storage");
    x(this, "history", []);
    this.doc = e, this.storage = t;
  }
  async execute(e) {
    this.history.push(e), await e.execute(this);
  }
  async pop() {
    const e = this.history.pop();
    e && await e.unexecute(this);
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
let un = 0;
class fn {
  constructor(e) {
    x(this, "createdAt");
    x(this, "moved");
    x(this, "initialPos");
    x(this, "lastPos");
    x(this, "counter");
    this.createdAt = (/* @__PURE__ */ new Date()).getTime(), this.moved = !1, this.initialPos = e, this.lastPos = e, this.counter = un++;
  }
}
class Q {
  constructor(e, t, o, s = void 0, l = void 0) {
    x(this, "location");
    x(this, "width");
    x(this, "height");
    x(this, "touchMoveThreshold", 5);
    x(this, "penMoveThreshold", 10);
    this.location = e, this.width = t, this.height = o, s !== void 0 && (this.touchMoveThreshold = s), l !== void 0 && (this.penMoveThreshold = l);
  }
  static getCanvasCoords(e) {
    const t = e.target, o = t.getBoundingClientRect(), s = (e.clientX - o.left) * t.width / o.width, l = (e.clientY - o.top) * t.height / o.height;
    return { x: s, y: l };
  }
  regionWrapper(e) {
    return async (t) => {
      t.preventDefault();
      const o = Q.getCanvasCoords(t);
      o.x < this.location.x || o.x >= this.location.x + this.width || o.y < this.location.y || o.y >= this.location.y + this.height || await e(o);
    };
  }
  inRegion(e) {
    return !(e.x < this.location.x || e.x >= this.location.x + this.width || e.y < this.location.y || e.y >= this.location.y + this.height);
  }
  touchWrapper(e) {
    return async (t) => {
      t.preventDefault();
      for (let o = 0; o < t.changedTouches.length; o++)
        if (t.changedTouches[o].radiusX == 0 && t.changedTouches[o].radiusY == 0) {
          const s = Q.getCanvasCoords(t.changedTouches[o]);
          if (!this.inRegion(s))
            return;
          await e(s);
          break;
        }
    };
  }
  touchRegionWrapper(e) {
    const t = this.regionWrapper(e);
    return async (o) => {
      if (o.pointerType != "touch")
        return;
      await t(o), o.preventDefault();
      const s = Q.getCanvasCoords(o);
      this.inRegion(s) && await e(s);
    };
  }
  registerEventHandler(e, t, o) {
    e.addEventListener(t, this.regionWrapper(o));
  }
  registerRegion(e, t) {
    const o = /* @__PURE__ */ new Map(), s = (E, C) => {
      const I = o.get(C.pointerId);
      I !== void 0 && I.moved && (E == "touch" ? t.dragCancel && t.dragCancel() : t.penDragCancel && t.penDragCancel()), o.delete(C.pointerId);
    }, l = (E, C) => (I) => {
      if (I.pointerType != E)
        return;
      const R = Q.getCanvasCoords(I);
      if (!this.inRegion(R)) {
        s(E, I);
        return;
      }
      I.preventDefault(), C(E, I);
    }, u = (E) => l("touch", E), h = (E) => l("pen", E), p = (E, C) => {
      const I = Q.getCanvasCoords(C);
      o.set(C.pointerId, new fn(I)), o.size > 1 && s(E, C);
      const R = E === "touch" ? t.longPress : t.penLongPress;
      R && setTimeout(async () => {
        const B = o.get(C.pointerId);
        B === void 0 || B.moved || await R(B.initialPos) && s(E, C);
      }, hn);
    }, g = (E, C) => {
      const I = o.get(C.pointerId);
      if (I === void 0)
        return;
      const R = Q.getCanvasCoords(C);
      I.moved ? E == "touch" ? t.dragEnd && t.dragEnd(R) : t.penDragEnd && t.penDragEnd(R) : E == "touch" ? t.tap && t.tap(I.initialPos) : t.penTap && t.penTap(I.initialPos), s(E, C);
    }, S = (E, C) => {
      const I = o.get(C.pointerId);
      if (I === void 0)
        return;
      const R = Q.getCanvasCoords(C), B = R.x - I.lastPos.x, O = R.y - I.lastPos.y, K = Math.sqrt(B * B + O * O), Y = E === "touch" ? this.touchMoveThreshold : this.penMoveThreshold;
      if (I.moved || K > Y) {
        let T = I.lastPos;
        I.moved || (T = R), I.moved = !0, E == "touch" ? t.drag && t.drag(new Qe(T, R)) : t.penDrag && t.penDrag(new Qe(T, R)), I.lastPos = R;
      }
    };
    e.addEventListener("pointerdown", u(p)), e.addEventListener("pointerup", u(g)), e.addEventListener("pointercancel", u(s)), e.addEventListener("pointermove", u(S)), e.addEventListener("pointerdown", h(p)), e.addEventListener("pointerup", h(g)), e.addEventListener("pointercancel", h(s)), e.addEventListener("pointermove", h(S));
    const f = (E) => {
      try {
        if (E.cancelable) {
          for (let C = 0; C < E.changedTouches.length; C++)
            if (E.changedTouches[C].radiusX == 0 && E.changedTouches[C].radiusY == 0) {
              E.preventDefault();
              break;
            }
        }
      } catch (C) {
        console.log("touch exception", C);
      }
    };
    e.addEventListener("touchstart", f), e.addEventListener("touchend", f), e.addEventListener("touchmove", f);
    const b = (E) => (C) => {
      const I = Q.getCanvasCoords(C), R = C.shiftKey ? "touch" : "pen", B = C;
      if (B.pointerId = -1, B.pointerType = R, !this.inRegion(I)) {
        s(R, B);
        return;
      }
      E(R, B);
    };
    e.addEventListener("mousedown", b(p)), e.addEventListener("mouseup", b(g)), e.addEventListener("mousemove", b(S));
  }
}
class Ge {
  constructor(e, t, o, s = !1) {
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
    this.readonly = s, this.engine = new dn(this.doc, this.storage), this.draw_layout();
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
    let t = 1, o = this.left_margin, s = this.left_margin;
    const l = await this.storage.getUIState();
    e || (l.lineToRealLine && (this.lineToRealLine = l.lineToRealLine), l.hidden_roots && (this.hidden_roots = l.hidden_roots), l.line_spacing !== void 0 ? (t = this.line_spacing / l.line_spacing, this.line_spacing = l.line_spacing) : t = 0.5, l.left_margin !== void 0 && (s = l.left_margin)), await this.doc.load(this.storage, t, s, o);
  }
  wheelHandler(e) {
    e.deltaY > 0 ? this.scrollDown(this.scroll_delta) : e.deltaY < 0 && this.scrollUp(this.scroll_delta), this.clearAndRedraw(), e.preventDefault();
  }
  installEventHandlers() {
    this.ctx.canvas.addEventListener("wheel", this.wheelHandler.bind(this));
    let e = null, t = null, o = "scroll";
    const s = new Q({ x: this.left_margin, y: 0 }, this.ctx.canvas.width - this.left_margin, this.ctx.canvas.height, 5, 0);
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
              const E = this.lineToRealLine.get(t), C = this.hidden_roots.has(E), I = new cn(E, b == 1 ? -1 : 1, C);
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
    if (s.registerRegion(this.ctx.canvas, g), !this.readonly) {
      const S = {
        penDrag: this.onPenMove.bind(this),
        penDragEnd: this.onPenUp.bind(this),
        penDragCancel: this.onPenUp.bind(this),
        longPress: (E) => {
          navigator.vibrate([100]), o = "indent", t = Math.floor(this.transformCoords(E).y / this.line_spacing);
        }
      };
      s.registerRegion(this.ctx.canvas, S);
      const f = new Q({ x: 0, y: 0 }, this.left_margin, this.ctx.canvas.height, 5, 10), b = {
        drag: this.selectMoveTarget.bind(this),
        dragEnd: this.confirmMoveTarget.bind(this),
        dragCancel: this.moveCancel.bind(this),
        tap: (E) => console.log("TAP", E),
        longPress: (E) => {
          if (this.on_line_select) {
            const C = this.transformCoords(E), I = Math.floor(C.y / this.line_spacing), R = this.lineToRealLine.get(I);
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
    const s = /* @__PURE__ */ new Set();
    this.hidden_roots.forEach((l) => {
      l > e + t ? s.add(l - t) : l < e && s.add(l);
    }), this.hidden_roots = s, this.infer_line_mapping(), this.clearAndRedraw(), this.save();
  }
  async add_line(e, t) {
    const o = new rn(e, t);
    await this.engine.execute(o);
    const s = /* @__PURE__ */ new Set();
    this.hidden_roots.forEach((l) => {
      l >= e ? s.add(l + t) : s.add(l);
    }), this.hidden_roots = s, this.infer_line_mapping(), this.clearAndRedraw(), this.save();
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
      let s = Math.floor(o.y / this.line_spacing);
      const l = this.lineToRealLine.get(s);
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
    const t = this.transformCoords(e.start), o = this.transformCoords(e.end), s = Math.floor(t.y / this.line_spacing);
    this.lineToMove === null && (this.lineToMove = s), this.setMoveTarget(o), this.clearAndRedraw(), this.ctx.beginPath(), this.ctx.strokeStyle = j().strokeColor, this.ctx.lineWidth = 5, this.ctx.moveTo(this.left_margin + 30, o.y), this.ctx.lineTo(this.left_margin + 75, o.y), this.ctx.lineTo(this.left_margin + 60, o.y + 10), this.ctx.moveTo(this.left_margin + 75, o.y), this.ctx.lineTo(this.left_margin + 60, o.y - 10), this.ctx.stroke();
  }
  async confirmMoveTarget(e) {
    if (this.lineToMove !== null) {
      const t = this.transformCoords(e);
      let o = Math.floor(t.y / this.line_spacing);
      this.movedToOtherLine && o !== this.lineToMove ? (o > this.lineToMove && o++, await this.move(this.lineToMove, o)) : this.clearAndRedraw(), this.moveCancel();
    }
  }
  async move(e, t) {
    const o = this.lineToRealLine.get(e), s = this.lineToRealLine.get(t), l = this.hidden_roots.has(o);
    let u = 1;
    const h = /* @__PURE__ */ new Set();
    if (l) {
      const f = this.doc.childLines(o);
      u += f.length;
      for (let b of f)
        this.hidden_roots.has(b) && (h.add(b), this.hidden_roots.delete(b));
      this.hidden_roots.delete(o);
    }
    const p = new ln(o, s, l);
    await this.engine.execute(p);
    const g = (f) => (f > o && (f = f - u), f >= s - u && (f = f + u), f), S = /* @__PURE__ */ new Set();
    for (let f of this.hidden_roots)
      S.add(g(f));
    if (this.hidden_roots = S, l)
      if (s < o) {
        this.hidden_roots.add(s);
        for (let f of h)
          this.hidden_roots.add(s - o + f);
      } else {
        this.hidden_roots.add(s - u);
        for (let f of h)
          this.hidden_roots.add(s - u - o + f);
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
    this.ctx.strokeStyle = j().strokeColor, this.ctx.lineWidth = 1;
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
    const t = this.ctx.canvas.getBoundingClientRect(), o = (e.clientX - t.left) * this.ctx.canvas.width / t.width, s = (e.clientY - t.top) * this.ctx.canvas.height / t.height;
    return { x: o, y: s };
  }
  clearAndRedraw(e = !1) {
    this.write_in_progress && !this.is_eraser || (this.clear(), this.ctx.save(), this.ctx.transform(1, 0, 0, 1, 0, -1 * this.y_offset * this.line_spacing), this.draw_layout(), this.lineToRealLine.forEach((t, o) => {
      const s = this.doc.linesToStrokes.get(t);
      if (s !== void 0) {
        for (let l = 0; l < s.length; l++)
          s[l].draw(this.ctx, o * this.line_spacing, e);
        if (this.hidden_roots.has(t)) {
          this.ctx.strokeStyle = j().strokeColor, this.ctx.lineWidth = 5;
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
    const o = this.doc.childLines(t), s = new Set(o);
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
      for (; e < this.rendered_lines && s.has(this.lineToRealLine.get(e)); )
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
      let t = this.lineToRealLine.get(e), o = 1 / 0, s = 0;
      for (let h of this.currentStroke.y_points)
        o = Math.min(h, o), s = Math.max(h, s);
      this.line_spacing - o % this.line_spacing < this.line_spacing / 4 && s - o >= this.line_spacing && (t++, this.currentStroke.y_points = this.currentStroke.y_points.map((h) => h - this.line_spacing));
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
        const s = /* @__PURE__ */ new Map();
        this.lineToRealLine.forEach((h, p) => {
          const g = p * this.line_spacing, S = this.doc.linesToStrokes.get(h);
          if (S === void 0)
            return;
          const f = S.filter((b) => !b.intersects(g, t, this.curr_location));
          f.length < S.length && s.set(h, f);
        });
        const l = /* @__PURE__ */ new Map();
        s.forEach((h, p) => {
          l.set(p, [...this.doc.linesToStrokes.get(p)]);
        });
        const u = new je(l, s);
        await this.engine.execute(u), this.clearAndRedraw();
      } else
        this.ctx.strokeStyle = j().strokeColor, this.ctx.lineWidth = 2, this.ctx.save(), this.ctx.transform(1, 0, 0, 1, 0, -1 * this.y_offset * this.line_spacing), this.ctx.beginPath(), this.ctx.moveTo(this.curr_location.x, this.curr_location.y), this.ctx.lineTo(t.x, t.y), this.ctx.stroke(), this.ctx.restore(), (o = this.currentStroke) == null || o.add(t.x, t.y);
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
      for (let s = this.rendered_lines - 1; s >= 1; s--) {
        const l = this.lineToRealLine.get(s - 1);
        this.lineToRealLine.set(s, l);
      }
      let t = this.lineToRealLine.get(0);
      t = t - 1;
      let o = !0;
      for (; o; ) {
        o = !1;
        for (let s of this.hidden_roots)
          if (this.doc.childLines(s).includes(t)) {
            t = s, o = !0;
            break;
          }
      }
      this.lineToRealLine.set(0, t), await this.save();
    }
  }
}
var ue = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function vn(k) {
  return k && k.__esModule && Object.prototype.hasOwnProperty.call(k, "default") ? k.default : k;
}
function fe(k) {
  throw new Error('Could not dynamically require "' + k + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var Je = { exports: {} };
/*!
    localForage -- Offline Storage, Improved
    Version 1.10.0
    https://localforage.github.io/localForage
    (c) 2013-2017 Mozilla, Apache License 2.0
*/
(function(k, e) {
  (function(t) {
    k.exports = t();
  })(function() {
    return function t(o, s, l) {
      function u(g, S) {
        if (!s[g]) {
          if (!o[g]) {
            var f = typeof fe == "function" && fe;
            if (!S && f)
              return f(g, !0);
            if (h)
              return h(g, !0);
            var b = new Error("Cannot find module '" + g + "'");
            throw b.code = "MODULE_NOT_FOUND", b;
          }
          var E = s[g] = { exports: {} };
          o[g][0].call(E.exports, function(C) {
            var I = o[g][1][C];
            return u(I || C);
          }, E, E.exports, t, o, s, l);
        }
        return s[g].exports;
      }
      for (var h = typeof fe == "function" && fe, p = 0; p < l.length; p++)
        u(l[p]);
      return u;
    }({ 1: [function(t, o, s) {
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
        var b, E = [];
        function C() {
          b = !0;
          for (var R, B, O = E.length; O; ) {
            for (B = E, E = [], R = -1; ++R < O; )
              B[R]();
            O = E.length;
          }
          b = !1;
        }
        o.exports = I;
        function I(R) {
          E.push(R) === 1 && !b && h();
        }
      }).call(this, typeof ue < "u" ? ue : typeof self < "u" ? self : typeof window < "u" ? window : {});
    }, {}], 2: [function(t, o, s) {
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
          E(M, U, this.outcome);
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
        E(this.promise, this.onFulfilled, T);
      }, b.prototype.callRejected = function(T) {
        h.reject(this.promise, T);
      }, b.prototype.otherCallRejected = function(T) {
        E(this.promise, this.onRejected, T);
      };
      function E(T, N, M) {
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
      f.resolve = B;
      function B(T) {
        return T instanceof this ? T : h.resolve(new this(u), T);
      }
      f.reject = O;
      function O(T) {
        var N = new this(u);
        return h.reject(N, T);
      }
      f.all = K;
      function K(T) {
        var N = this;
        if (Object.prototype.toString.call(T) !== "[object Array]")
          return this.reject(new TypeError("must be an array"));
        var M = T.length, U = !1;
        if (!M)
          return this.resolve([]);
        for (var $ = new Array(M), z = 0, H = -1, V = new this(u); ++H < M; )
          J(T[H], H);
        return V;
        function J(oe, ce) {
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
          N.resolve(V).then(function(J) {
            U || (U = !0, h.resolve(z, J));
          }, function(J) {
            U || (U = !0, h.reject(z, J));
          });
        }
      }
    }, { 1: 1 }], 3: [function(t, o, s) {
      (function(l) {
        typeof l.Promise != "function" && (l.Promise = t(2));
      }).call(this, typeof ue < "u" ? ue : typeof self < "u" ? self : typeof window < "u" ? window : {});
    }, { 2: 2 }], 4: [function(t, o, s) {
      var l = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(n) {
        return typeof n;
      } : function(n) {
        return n && typeof Symbol == "function" && n.constructor === Symbol && n !== Symbol.prototype ? "symbol" : typeof n;
      };
      function u(n, r) {
        if (!(n instanceof r))
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
          var n = typeof openDatabase < "u" && /(Safari|iPhone|iPad|iPod)/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) && !/BlackBerry/.test(navigator.platform), r = typeof fetch == "function" && fetch.toString().indexOf("[native code") !== -1;
          return (!n || r) && typeof indexedDB < "u" && // some outdated implementations of IDB that appear on Samsung
          // and HTC Android devices <4.4 are missing IDBKeyRange
          // See: https://github.com/mozilla/localForage/issues/128
          // See: https://github.com/mozilla/localForage/issues/272
          typeof IDBKeyRange < "u";
        } catch {
          return !1;
        }
      }
      function S(n, r) {
        n = n || [], r = r || {};
        try {
          return new Blob(n, r);
        } catch (a) {
          if (a.name !== "TypeError")
            throw a;
          for (var i = typeof BlobBuilder < "u" ? BlobBuilder : typeof MSBlobBuilder < "u" ? MSBlobBuilder : typeof MozBlobBuilder < "u" ? MozBlobBuilder : WebKitBlobBuilder, c = new i(), d = 0; d < n.length; d += 1)
            c.append(n[d]);
          return c.getBlob(r.type);
        }
      }
      typeof Promise > "u" && t(3);
      var f = Promise;
      function b(n, r) {
        r && n.then(function(i) {
          r(null, i);
        }, function(i) {
          r(i);
        });
      }
      function E(n, r, i) {
        typeof r == "function" && n.then(r), typeof i == "function" && n.catch(i);
      }
      function C(n) {
        return typeof n != "string" && (console.warn(n + " used as a key, but it is not a string."), n = String(n)), n;
      }
      function I() {
        if (arguments.length && typeof arguments[arguments.length - 1] == "function")
          return arguments[arguments.length - 1];
      }
      var R = "local-forage-detect-blob-support", B = void 0, O = {}, K = Object.prototype.toString, Y = "readonly", T = "readwrite";
      function N(n) {
        for (var r = n.length, i = new ArrayBuffer(r), c = new Uint8Array(i), d = 0; d < r; d++)
          c[d] = n.charCodeAt(d);
        return i;
      }
      function M(n) {
        return new f(function(r) {
          var i = n.transaction(R, T), c = S([""]);
          i.objectStore(R).put(c, "key"), i.onabort = function(d) {
            d.preventDefault(), d.stopPropagation(), r(!1);
          }, i.oncomplete = function() {
            var d = navigator.userAgent.match(/Chrome\/(\d+)/), a = navigator.userAgent.match(/Edge\//);
            r(a || !d || parseInt(d[1], 10) >= 43);
          };
        }).catch(function() {
          return !1;
        });
      }
      function U(n) {
        return typeof B == "boolean" ? f.resolve(B) : M(n).then(function(r) {
          return B = r, B;
        });
      }
      function $(n) {
        var r = O[n.name], i = {};
        i.promise = new f(function(c, d) {
          i.resolve = c, i.reject = d;
        }), r.deferredOperations.push(i), r.dbReady ? r.dbReady = r.dbReady.then(function() {
          return i.promise;
        }) : r.dbReady = i.promise;
      }
      function z(n) {
        var r = O[n.name], i = r.deferredOperations.pop();
        if (i)
          return i.resolve(), i.promise;
      }
      function H(n, r) {
        var i = O[n.name], c = i.deferredOperations.pop();
        if (c)
          return c.reject(r), c.promise;
      }
      function V(n, r) {
        return new f(function(i, c) {
          if (O[n.name] = O[n.name] || Se(), n.db)
            if (r)
              $(n), n.db.close();
            else
              return i(n.db);
          var d = [n.name];
          r && d.push(n.version);
          var a = p.open.apply(p, d);
          r && (a.onupgradeneeded = function(v) {
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
      function J(n) {
        return V(n, !1);
      }
      function oe(n) {
        return V(n, !0);
      }
      function ce(n, r) {
        if (!n.db)
          return !0;
        var i = !n.db.objectStoreNames.contains(n.storeName), c = n.version < n.db.version, d = n.version > n.db.version;
        if (c && (n.version !== r && console.warn('The database "' + n.name + `" can't be downgraded from version ` + n.db.version + " to version " + n.version + "."), n.version = n.db.version), d || i) {
          if (i) {
            var a = n.db.version + 1;
            a > n.version && (n.version = a);
          }
          return !0;
        }
        return !1;
      }
      function me(n) {
        return new f(function(r, i) {
          var c = new FileReader();
          c.onerror = i, c.onloadend = function(d) {
            var a = btoa(d.target.result || "");
            r({
              __local_forage_encoded_blob: !0,
              data: a,
              type: n.type
            });
          }, c.readAsBinaryString(n);
        });
      }
      function ne(n) {
        var r = N(atob(n.data));
        return S([r], { type: n.type });
      }
      function Le(n) {
        return n && n.__local_forage_encoded_blob;
      }
      function et(n) {
        var r = this, i = r._initReady().then(function() {
          var c = O[r._dbInfo.name];
          if (c && c.dbReady)
            return c.dbReady;
        });
        return E(i, n, n), i;
      }
      function tt(n) {
        $(n);
        for (var r = O[n.name], i = r.forages, c = 0; c < i.length; c++) {
          var d = i[c];
          d._dbInfo.db && (d._dbInfo.db.close(), d._dbInfo.db = null);
        }
        return n.db = null, J(n).then(function(a) {
          return n.db = a, ce(n) ? oe(n) : a;
        }).then(function(a) {
          n.db = r.db = a;
          for (var v = 0; v < i.length; v++)
            i[v]._dbInfo.db = a;
        }).catch(function(a) {
          throw H(n, a), a;
        });
      }
      function q(n, r, i, c) {
        c === void 0 && (c = 1);
        try {
          var d = n.db.transaction(n.storeName, r);
          i(null, d);
        } catch (a) {
          if (c > 0 && (!n.db || a.name === "InvalidStateError" || a.name === "NotFoundError"))
            return f.resolve().then(function() {
              if (!n.db || a.name === "NotFoundError" && !n.db.objectStoreNames.contains(n.storeName) && n.version <= n.db.version)
                return n.db && (n.version = n.db.version + 1), oe(n);
            }).then(function() {
              return tt(n).then(function() {
                q(n, r, i, c - 1);
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
        var r = this, i = {
          db: null
        };
        if (n)
          for (var c in n)
            i[c] = n[c];
        var d = O[i.name];
        d || (d = Se(), O[i.name] = d), d.forages.push(r), r._initReady || (r._initReady = r.ready, r.ready = et);
        var a = [];
        function v() {
          return f.resolve();
        }
        for (var m = 0; m < d.forages.length; m++) {
          var _ = d.forages[m];
          _ !== r && a.push(_._initReady().catch(v));
        }
        var y = d.forages.slice(0);
        return f.all(a).then(function() {
          return i.db = d.db, J(i);
        }).then(function(w) {
          return i.db = w, ce(i, r._defaultConfig.version) ? oe(i) : w;
        }).then(function(w) {
          i.db = d.db = w, r._dbInfo = i;
          for (var L = 0; L < y.length; L++) {
            var D = y[L];
            D !== r && (D._dbInfo.db = i.db, D._dbInfo.version = i.version);
          }
        });
      }
      function it(n, r) {
        var i = this;
        n = C(n);
        var c = new f(function(d, a) {
          i.ready().then(function() {
            q(i._dbInfo, Y, function(v, m) {
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
        return b(c, r), c;
      }
      function ot(n, r) {
        var i = this, c = new f(function(d, a) {
          i.ready().then(function() {
            q(i._dbInfo, Y, function(v, m) {
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
        return b(c, r), c;
      }
      function rt(n, r, i) {
        var c = this;
        n = C(n);
        var d = new f(function(a, v) {
          var m;
          c.ready().then(function() {
            return m = c._dbInfo, K.call(r) === "[object Blob]" ? U(m.db).then(function(_) {
              return _ ? r : me(r);
            }) : r;
          }).then(function(_) {
            q(c._dbInfo, T, function(y, w) {
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
      function st(n, r) {
        var i = this;
        n = C(n);
        var c = new f(function(d, a) {
          i.ready().then(function() {
            q(i._dbInfo, T, function(v, m) {
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
        return b(c, r), c;
      }
      function at(n) {
        var r = this, i = new f(function(c, d) {
          r.ready().then(function() {
            q(r._dbInfo, T, function(a, v) {
              if (a)
                return d(a);
              try {
                var m = v.objectStore(r._dbInfo.storeName), _ = m.clear();
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
        var r = this, i = new f(function(c, d) {
          r.ready().then(function() {
            q(r._dbInfo, Y, function(a, v) {
              if (a)
                return d(a);
              try {
                var m = v.objectStore(r._dbInfo.storeName), _ = m.count();
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
      function ct(n, r) {
        var i = this, c = new f(function(d, a) {
          if (n < 0) {
            d(null);
            return;
          }
          i.ready().then(function() {
            q(i._dbInfo, Y, function(v, m) {
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
        return b(c, r), c;
      }
      function dt(n) {
        var r = this, i = new f(function(c, d) {
          r.ready().then(function() {
            q(r._dbInfo, Y, function(a, v) {
              if (a)
                return d(a);
              try {
                var m = v.objectStore(r._dbInfo.storeName), _ = m.openKeyCursor(), y = [];
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
      function ht(n, r) {
        r = I.apply(this, arguments);
        var i = this.config();
        n = typeof n != "function" && n || {}, n.name || (n.name = n.name || i.name, n.storeName = n.storeName || i.storeName);
        var c = this, d;
        if (!n.name)
          d = f.reject("Invalid arguments");
        else {
          var a = n.name === i.name && c._dbInfo.db, v = a ? f.resolve(c._dbInfo.db) : J(n).then(function(m) {
            var _ = O[n.name], y = _.forages;
            _.db = m;
            for (var w = 0; w < y.length; w++)
              y[w]._dbInfo.db = m;
            return m;
          });
          n.storeName ? d = v.then(function(m) {
            if (m.objectStoreNames.contains(n.storeName)) {
              var _ = m.version + 1;
              $(n);
              var y = O[n.name], w = y.forages;
              m.close();
              for (var L = 0; L < w.length; L++) {
                var D = w[L];
                D._dbInfo.db = null, D._dbInfo.version = _;
              }
              var A = new f(function(P, W) {
                var F = p.open(n.name, _);
                F.onerror = function(X) {
                  var se = F.result;
                  se.close(), W(X);
                }, F.onupgradeneeded = function() {
                  var X = F.result;
                  X.deleteObjectStore(n.storeName);
                }, F.onsuccess = function() {
                  var X = F.result;
                  X.close(), P(X);
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
            var _ = O[n.name], y = _.forages;
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
        return b(d, r), d;
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
      var Z = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", vt = "~~local_forage_type~", Ie = /^~~local_forage_type~([^~]+)~/, de = "__lfsc__:", pe = de.length, ge = "arbf", _e = "blob", Re = "si08", De = "ui08", Me = "uic8", Ne = "si16", Ae = "si32", Pe = "ur16", Be = "ui32", Oe = "fl32", Ue = "fl64", Fe = pe + ge.length, We = Object.prototype.toString;
      function $e(n) {
        var r = n.length * 0.75, i = n.length, c, d = 0, a, v, m, _;
        n[n.length - 1] === "=" && (r--, n[n.length - 2] === "=" && r--);
        var y = new ArrayBuffer(r), w = new Uint8Array(y);
        for (c = 0; c < i; c += 4)
          a = Z.indexOf(n[c]), v = Z.indexOf(n[c + 1]), m = Z.indexOf(n[c + 2]), _ = Z.indexOf(n[c + 3]), w[d++] = a << 2 | v >> 4, w[d++] = (v & 15) << 4 | m >> 2, w[d++] = (m & 3) << 6 | _ & 63;
        return y;
      }
      function ye(n) {
        var r = new Uint8Array(n), i = "", c;
        for (c = 0; c < r.length; c += 3)
          i += Z[r[c] >> 2], i += Z[(r[c] & 3) << 4 | r[c + 1] >> 4], i += Z[(r[c + 1] & 15) << 2 | r[c + 2] >> 6], i += Z[r[c + 2] & 63];
        return r.length % 3 === 2 ? i = i.substring(0, i.length - 1) + "=" : r.length % 3 === 1 && (i = i.substring(0, i.length - 2) + "=="), i;
      }
      function mt(n, r) {
        var i = "";
        if (n && (i = We.call(n)), n && (i === "[object ArrayBuffer]" || n.buffer && We.call(n.buffer) === "[object ArrayBuffer]")) {
          var c, d = de;
          n instanceof ArrayBuffer ? (c = n, d += ge) : (c = n.buffer, i === "[object Int8Array]" ? d += Re : i === "[object Uint8Array]" ? d += De : i === "[object Uint8ClampedArray]" ? d += Me : i === "[object Int16Array]" ? d += Ne : i === "[object Uint16Array]" ? d += Pe : i === "[object Int32Array]" ? d += Ae : i === "[object Uint32Array]" ? d += Be : i === "[object Float32Array]" ? d += Oe : i === "[object Float64Array]" ? d += Ue : r(new Error("Failed to get type for BinaryArray"))), r(d + ye(c));
        } else if (i === "[object Blob]") {
          var a = new FileReader();
          a.onload = function() {
            var v = vt + n.type + "~" + ye(this.result);
            r(de + _e + v);
          }, a.readAsArrayBuffer(n);
        } else
          try {
            r(JSON.stringify(n));
          } catch (v) {
            console.error("Couldn't convert value into a JSON string: ", n), r(null, v);
          }
      }
      function pt(n) {
        if (n.substring(0, pe) !== de)
          return JSON.parse(n);
        var r = n.substring(Fe), i = n.substring(pe, Fe), c;
        if (i === _e && Ie.test(r)) {
          var d = r.match(Ie);
          c = d[1], r = r.substring(d[0].length);
        }
        var a = $e(r);
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
      function Ye(n, r, i, c) {
        n.executeSql("CREATE TABLE IF NOT EXISTS " + r.storeName + " (id INTEGER PRIMARY KEY, key unique, value)", [], i, c);
      }
      function gt(n) {
        var r = this, i = {
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
              r._dbInfo = i, a();
            }, function(_, y) {
              v(y);
            });
          }, v);
        });
        return i.serializer = we, d;
      }
      function ee(n, r, i, c, d, a) {
        n.executeSql(i, c, d, function(v, m) {
          m.code === m.SYNTAX_ERR ? v.executeSql("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [r.storeName], function(_, y) {
            y.rows.length ? a(_, m) : Ye(_, r, function() {
              _.executeSql(i, c, d, a);
            }, a);
          }, a) : a(v, m);
        }, a);
      }
      function _t(n, r) {
        var i = this;
        n = C(n);
        var c = new f(function(d, a) {
          i.ready().then(function() {
            var v = i._dbInfo;
            v.db.transaction(function(m) {
              ee(m, v, "SELECT * FROM " + v.storeName + " WHERE key = ? LIMIT 1", [n], function(_, y) {
                var w = y.rows.length ? y.rows.item(0).value : null;
                w && (w = v.serializer.deserialize(w)), d(w);
              }, function(_, y) {
                a(y);
              });
            });
          }).catch(a);
        });
        return b(c, r), c;
      }
      function yt(n, r) {
        var i = this, c = new f(function(d, a) {
          i.ready().then(function() {
            var v = i._dbInfo;
            v.db.transaction(function(m) {
              ee(m, v, "SELECT * FROM " + v.storeName, [], function(_, y) {
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
        return b(c, r), c;
      }
      function ze(n, r, i, c) {
        var d = this;
        n = C(n);
        var a = new f(function(v, m) {
          d.ready().then(function() {
            r === void 0 && (r = null);
            var _ = r, y = d._dbInfo;
            y.serializer.serialize(r, function(w, L) {
              L ? m(L) : y.db.transaction(function(D) {
                ee(D, y, "INSERT OR REPLACE INTO " + y.storeName + " (key, value) VALUES (?, ?)", [n, w], function() {
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
      function wt(n, r, i) {
        return ze.apply(this, [n, r, i, 1]);
      }
      function bt(n, r) {
        var i = this;
        n = C(n);
        var c = new f(function(d, a) {
          i.ready().then(function() {
            var v = i._dbInfo;
            v.db.transaction(function(m) {
              ee(m, v, "DELETE FROM " + v.storeName + " WHERE key = ?", [n], function() {
                d();
              }, function(_, y) {
                a(y);
              });
            });
          }).catch(a);
        });
        return b(c, r), c;
      }
      function Tt(n) {
        var r = this, i = new f(function(c, d) {
          r.ready().then(function() {
            var a = r._dbInfo;
            a.db.transaction(function(v) {
              ee(v, a, "DELETE FROM " + a.storeName, [], function() {
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
        var r = this, i = new f(function(c, d) {
          r.ready().then(function() {
            var a = r._dbInfo;
            a.db.transaction(function(v) {
              ee(v, a, "SELECT COUNT(key) as c FROM " + a.storeName, [], function(m, _) {
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
      function Et(n, r) {
        var i = this, c = new f(function(d, a) {
          i.ready().then(function() {
            var v = i._dbInfo;
            v.db.transaction(function(m) {
              ee(m, v, "SELECT key FROM " + v.storeName + " WHERE id = ? LIMIT 1", [n + 1], function(_, y) {
                var w = y.rows.length ? y.rows.item(0).key : null;
                d(w);
              }, function(_, y) {
                a(y);
              });
            });
          }).catch(a);
        });
        return b(c, r), c;
      }
      function kt(n) {
        var r = this, i = new f(function(c, d) {
          r.ready().then(function() {
            var a = r._dbInfo;
            a.db.transaction(function(v) {
              ee(v, a, "SELECT key FROM " + a.storeName, [], function(m, _) {
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
        return new f(function(r, i) {
          n.transaction(function(c) {
            c.executeSql("SELECT name FROM sqlite_master WHERE type='table' AND name <> '__WebKitDatabaseInfoTable__'", [], function(d, a) {
              for (var v = [], m = 0; m < a.rows.length; m++)
                v.push(a.rows.item(m).name);
              r({
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
      function Lt(n, r) {
        r = I.apply(this, arguments);
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
                  }, function(F, X) {
                    W(X);
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
        }) : d = f.reject("Invalid arguments"), b(d, r), d;
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
      function He(n, r) {
        var i = n.name + "/";
        return n.storeName !== r.storeName && (i += n.storeName + "/"), i;
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
        var r = this, i = {};
        if (n)
          for (var c in n)
            i[c] = n[c];
        return i.keyPrefix = He(n, r._defaultConfig), Dt() ? (r._dbInfo = i, i.serializer = we, f.resolve()) : f.reject();
      }
      function Nt(n) {
        var r = this, i = r.ready().then(function() {
          for (var c = r._dbInfo.keyPrefix, d = localStorage.length - 1; d >= 0; d--) {
            var a = localStorage.key(d);
            a.indexOf(c) === 0 && localStorage.removeItem(a);
          }
        });
        return b(i, n), i;
      }
      function At(n, r) {
        var i = this;
        n = C(n);
        var c = i.ready().then(function() {
          var d = i._dbInfo, a = localStorage.getItem(d.keyPrefix + n);
          return a && (a = d.serializer.deserialize(a)), a;
        });
        return b(c, r), c;
      }
      function Pt(n, r) {
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
        return b(c, r), c;
      }
      function Bt(n, r) {
        var i = this, c = i.ready().then(function() {
          var d = i._dbInfo, a;
          try {
            a = localStorage.key(n);
          } catch {
            a = null;
          }
          return a && (a = a.substring(d.keyPrefix.length)), a;
        });
        return b(c, r), c;
      }
      function Ot(n) {
        var r = this, i = r.ready().then(function() {
          for (var c = r._dbInfo, d = localStorage.length, a = [], v = 0; v < d; v++) {
            var m = localStorage.key(v);
            m.indexOf(c.keyPrefix) === 0 && a.push(m.substring(c.keyPrefix.length));
          }
          return a;
        });
        return b(i, n), i;
      }
      function Ut(n) {
        var r = this, i = r.keys().then(function(c) {
          return c.length;
        });
        return b(i, n), i;
      }
      function Ft(n, r) {
        var i = this;
        n = C(n);
        var c = i.ready().then(function() {
          var d = i._dbInfo;
          localStorage.removeItem(d.keyPrefix + n);
        });
        return b(c, r), c;
      }
      function Wt(n, r, i) {
        var c = this;
        n = C(n);
        var d = c.ready().then(function() {
          r === void 0 && (r = null);
          var a = r;
          return new f(function(v, m) {
            var _ = c._dbInfo;
            _.serializer.serialize(r, function(y, w) {
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
      function $t(n, r) {
        if (r = I.apply(this, arguments), n = typeof n != "function" && n || {}, !n.name) {
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
        }) : d = f.reject("Invalid arguments"), b(d, r), d;
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
      }, zt = function(r, i) {
        return r === i || typeof r == "number" && typeof i == "number" && isNaN(r) && isNaN(i);
      }, Ht = function(r, i) {
        for (var c = r.length, d = 0; d < c; ) {
          if (zt(r[d], i))
            return !0;
          d++;
        }
        return !1;
      }, Ve = Array.isArray || function(n) {
        return Object.prototype.toString.call(n) === "[object Array]";
      }, re = {}, Xe = {}, ie = {
        INDEXEDDB: ut,
        WEBSQL: St,
        LOCALSTORAGE: Yt
      }, Vt = [ie.INDEXEDDB._driver, ie.WEBSQL._driver, ie.LOCALSTORAGE._driver], he = ["dropInstance"], be = ["clear", "getItem", "iterate", "key", "keys", "length", "removeItem", "setItem"].concat(he), Xt = {
        description: "",
        driver: Vt.slice(),
        name: "localforage",
        // Default DB size is _JUST UNDER_ 5MB, as it's the highest size
        // we can use without a prompt.
        size: 4980736,
        storeName: "keyvaluepairs",
        version: 1
      };
      function Kt(n, r) {
        n[r] = function() {
          var i = arguments;
          return n.ready().then(function() {
            return n[r].apply(n, i);
          });
        };
      }
      function Te() {
        for (var n = 1; n < arguments.length; n++) {
          var r = arguments[n];
          if (r)
            for (var i in r)
              r.hasOwnProperty(i) && (Ve(r[i]) ? arguments[0][i] = r[i].slice() : arguments[0][i] = r[i]);
        }
        return arguments[0];
      }
      var Qt = function() {
        function n(r) {
          u(this, n);
          for (var i in ie)
            if (ie.hasOwnProperty(i)) {
              var c = ie[i], d = c._driver;
              this[i] = d, re[d] || this.defineDriver(c);
            }
          this._defaultConfig = Te({}, Xt), this._config = Te({}, this._defaultConfig, r), this._driverSet = null, this._initDriver = null, this._ready = !1, this._dbInfo = null, this._wrapLibraryMethodsWithReady(), this.setDriver(this._config.driver).catch(function() {
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
                    var qt = new Error("Method " + Jt + " is not implemented by the current driver"), Ke = f.reject(qt);
                    return b(Ke, arguments[arguments.length - 1]), Ke;
                  };
                }, xe = 0, Gt = he.length; xe < Gt; xe++) {
                  var Ee = he[xe];
                  i[Ee] || (i[Ee] = se(Ee));
                }
              };
              W();
              var F = function(se) {
                re[_] && console.info("Redefining LocalForage driver: " + _), re[_] = i, Xe[_] = se, v();
              };
              "_support" in i ? i._support && typeof i._support == "function" ? i._support().then(F, m) : F(!!i._support) : F(!0);
            } catch (X) {
              m(X);
            }
          });
          return E(a, c, d), a;
        }, n.prototype.driver = function() {
          return this._driver || null;
        }, n.prototype.getDriver = function(i, c, d) {
          var a = re[i] ? f.resolve(re[i]) : f.reject(new Error("Driver not found."));
          return E(a, c, d), a;
        }, n.prototype.getSerializer = function(i) {
          var c = f.resolve(we);
          return E(c, i), c;
        }, n.prototype.ready = function(i) {
          var c = this, d = c._driverSet.then(function() {
            return c._ready === null && (c._ready = c._initDriver()), c._ready;
          });
          return E(d, i, i), d;
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
          }), E(this._driverSet, c, d), this._driverSet;
        }, n.prototype.supports = function(i) {
          return !!Xe[i];
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
            Kt(this, be[i]);
        }, n.prototype.createInstance = function(i) {
          return new n(i);
        }, n;
      }(), jt = new Qt();
      o.exports = jt;
    }, { 3: 3 }] }, {}, [4])(4);
  });
})(Je);
var mn = Je.exports;
const G = /* @__PURE__ */ vn(mn);
class pn {
  constructor() {
    x(this, "active_notebook", null);
    x(this, "store", G);
    x(this, "saved_lines", /* @__PURE__ */ new Set());
    x(this, "known_notebooks", /* @__PURE__ */ new Set());
  }
  async listNotebooks() {
    const e = await G.getItem("notebooks") || [];
    for (let t of e)
      this.known_notebooks.add(t);
    return e;
  }
  async setActiveNotebook(e) {
    if (this.known_notebooks.size === 0)
      for (let t of await this.listNotebooks())
        this.known_notebooks.add(t);
    this.active_notebook = e, this.store = G.createInstance({ name: e }), this.saved_lines = await this.store.getItem("saved_lines") || /* @__PURE__ */ new Set(), await this.store.setItem("saved_lines", this.saved_lines), this.known_notebooks.add(e), await this.saveKnownNotebooks();
  }
  async deleteNotebook(e) {
    await G.dropInstance({ name: e }), this.known_notebooks.delete(e), await this.saveKnownNotebooks();
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
  async getSavedLine(e, t, o, s) {
    const l = (g) => (g - o) * t + s, u = await this.store.getItem(`content-strokes-line${e}`), h = u ? u.map((g) => {
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
    }, t = await this.listSavedLines(), o = [], s = {};
    for (let u of t)
      o.push(u), s[u] = {
        strokes: await this.store.getItem(`content-strokes-line${u}`),
        firstContent: await this.store.getItem(`content-firstContent-line${u}`)
      };
    e["saved-lines"] = o, e["line-save-data"] = s, e.lastline = await this.getLastLine();
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
    await G.setItem("notebooks", e);
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
    const s = document.createElement("h1");
    s.innerText = e, o.appendChild(s), t.onclick = () => {
      this.on_blur && this.on_blur(), this.close_container();
    }, o.onclick = (l) => {
      l.stopPropagation();
    }, this.container = t, this.dialog = o;
  }
  add_canvas() {
    const e = document.createElement("canvas");
    e.width = 1e3, e.height = 1e3, e.style.height = "85%", e.style.width = "100%";
    const t = e.getContext("2d");
    return this.dialog.appendChild(e), t;
  }
  appendChild(e) {
    this.dialog.appendChild(e);
  }
  close_container() {
    this.container.remove(), this.on_close && this.on_close();
  }
  attach(e) {
    e.appendChild(this.container);
  }
}
function gn(k) {
  const e = new te(k), t = document.createElement("button");
  return t.classList.add("modalalert-ok"), t.innerText = "ok", t.onclick = () => {
    e.close_container();
  }, e.appendChild(t), e.attach(document.body), e;
}
function _n(k) {
  return new Promise((e) => {
    const t = new te(k);
    t.on_blur = () => {
      e(null);
    };
    const o = document.createElement("input");
    o.classList.add("modalprompt-input"), t.appendChild(o);
    const s = document.createElement("button");
    s.classList.add("modalalert-ok"), s.innerText = "ok", s.onclick = () => {
      t.close_container(), e(o.value);
    }, t.appendChild(s);
    const l = document.createElement("button");
    l.classList.add("modalalert-cancel"), l.innerText = "cancel", l.onclick = () => {
      t.close_container(), e(null);
    }, t.appendChild(l), o.addEventListener("keypress", (u) => {
      u.key === "Enter" && (u.preventDefault(), s.click());
    }), t.attach(document.body);
  });
}
function yn(k) {
  return new Promise((e) => {
    const t = new te(k);
    t.on_blur = () => {
      e(!1);
    };
    const o = document.createElement("button");
    o.classList.add("modalalert-ok"), o.innerText = "ok", o.onclick = () => {
      t.close_container(), e(!0);
    }, t.appendChild(o);
    const s = document.createElement("button");
    s.classList.add("modalalert-cancel"), s.innerText = "cancel", s.onclick = () => {
      t.close_container(), e(!1);
    }, t.appendChild(s), t.attach(document.body);
  });
}
const wn = [
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
class bn {
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
    this.el = document.createElement("div"), this.el.classList.add("menuitem"), this.el.id = `${e}${t}`, o && (this.el.style.paddingRight = "0.25em"), this.label = new bn(t), this.label.attach(this.el);
  }
  attach(e) {
    e.appendChild(this.el);
  }
  setLabel(e) {
    this.label.set(e);
  }
  getChild() {
    if (this.child === null) {
      const e = document.createElement("div");
      e.classList.add("menuchild"), this.child = e, this.el.appendChild(this.child);
    }
    return this.child;
  }
  setOnClick(e) {
    this.el.onclick = e;
  }
}
function Tn(k, e) {
  function t(s, l, u) {
    const h = new qe(s, u.name, s === "Menubar.");
    if (h.attach(l), u.children) {
      s !== "Menubar." && h.setLabel(`${u.name} >`);
      const p = h.getChild();
      for (let g of u.children)
        t(s + u.name + ".", p, g);
    }
  }
  const o = document.getElementById("menubar");
  for (let s of e)
    t(k + ".", o, s);
}
async function xn(k, e, t) {
  const o = new te("Quick Links"), s = k.rootOnlyDoc(), l = o.add_canvas(), u = new Ge(l, s.doc, e, !0);
  u.clearAndRedraw(), u.installEventHandlers(), u.on_line_tap = (h) => {
    t.infer_line_mapping(s.mapping.get(h)), t.y_offset = 0, t.clearAndRedraw(), o.close_container();
  }, o.attach(document.body);
}
async function Ze(k, e) {
  const o = document.getElementById("Menubar.File.Open").getElementsByClassName("menuchild")[0];
  o.innerHTML = "";
  const s = await e.listNotebooks(), l = (h) => {
    const p = new qe("Menubar.File.Open.", h);
    return p.setOnClick(async () => {
      location.assign(`?notebook=${encodeURIComponent(h)}`);
    }), p;
  };
  l(k).attach(o);
  for (let h of s) {
    if (h == k)
      continue;
    l(decodeURIComponent(h)).attach(o);
  }
}
function En() {
  const k = document.getElementById("Menubar.File.New");
  k.onclick = async () => {
    for (; ; ) {
      const e = await _n("New notebook name");
      if (e === "") {
        await new Promise((t) => {
          const o = gn("Please enter a notebook name");
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
function kn(k, e) {
  const t = document.getElementById("Menubar.File.Manage");
  t.onclick = async () => {
    const o = new te("Manage Notebooks"), s = document.createElement("div");
    s.style.position = "inherit", s.style.height = "80%", s.style.overflow = "auto";
    const l = /* @__PURE__ */ new Map(), u = document.createElement("input");
    u.style.width = "95%", u.style.height = "2em", u.style.borderRadius = "10px", u.placeholder = "Search", u.onkeyup = () => {
      for (let p of l)
        p[0].startsWith(u.value) ? p[1].style.display = "" : p[1].style.display = "none";
    }, s.appendChild(u), s.appendChild(document.createElement("br"));
    const h = await e.listNotebooks();
    for (let p of h) {
      const g = document.createElement("div"), S = document.createElement("h2");
      S.innerText = p, g.appendChild(S);
      const f = document.createElement("button");
      f.innerText = "Open", f.classList.add("modalalert-ok"), f.style.float = "none", f.style.marginTop = "0", f.onclick = () => {
        location.assign(`?notebook=${encodeURIComponent(p)}`);
      }, g.appendChild(f), g.appendChild(document.createElement("br"));
      const b = document.createElement("button");
      b.innerText = "Delete?", b.classList.add("modalalert-cancel"), b.style.float = "none", b.style.marginTop = "0", p === k && (b.disabled = !0), g.appendChild(b), g.appendChild(document.createElement("br")), g.appendChild(document.createElement("br")), b.onclick = async () => {
        await yn(`Delete ${p}?`) && (await e.deleteNotebook(p), await Ze(k, e)), o.close_container(), await new Promise((C) => {
          setTimeout(C, 0);
        }), t.click();
      }, l.set(p, g), s.appendChild(g);
    }
    o.appendChild(s), o.attach(document.body);
  };
}
async function Cn(k) {
  const e = document.getElementById("style-dark").innerText, t = document.getElementById("style-light").innerText, o = document.getElementById("style-current"), s = (u) => {
    G.setItem("theme", u ? "dark" : "light"), o.innerText = u ? e : t, k.clearAndRedraw();
  };
  j().registerModeSwitchCB(
    s.bind(null, !0),
    s.bind(null, !1)
  ), document.getElementById("Menubar.View.Theme.Light").onclick = () => {
    j().enableLightMode();
  }, document.getElementById("Menubar.View.Theme.Dark").onclick = () => {
    j().enableDarkMode();
  };
  let l = await G.getItem("theme");
  l = l || "light", l == "light" ? j().enableLightMode() : j().enableDarkMode();
}
function Ln(k, e, t) {
  const o = document.getElementById("Menubar.Export.Save");
  o.onclick = async () => {
    const l = await e.dumpNoteBookData(), u = URL.createObjectURL(l), h = document.createElement("a");
    h.href = u, h.download = `${encodeURIComponent(k)}.json`, h.textContent = `Download ${encodeURIComponent(k)}.json`, document.body.appendChild(h), h.click(), h.remove();
  };
  const s = document.getElementById("Menubar.Export.Load");
  s.onclick = () => {
    const l = new te("Load File"), u = document.createElement("input");
    u.type = "file", u.innerText = "load", u.addEventListener("change", (p) => {
      const g = p.target.files[0], S = new FileReader();
      S.readAsText(g, "UTF-8"), S.onload = async (f) => {
        const b = f.target.result, E = JSON.parse(b);
        await e.loadNoteBookData(E), await t.save(), await t.load(!1), t.clearAndRedraw(), l.close_container();
      };
    }), l.appendChild(u), l.appendChild(document.createElement("br")), l.appendChild(document.createElement("br"));
    const h = document.createElement("button");
    h.classList.add("modalalert-cancel"), h.innerText = "cancel", h.onclick = () => {
      l.close_container();
    }, h.style.marginLeft = "25%", l.appendChild(h), l.attach(document.body);
  };
}
function Sn(k) {
  const e = document.getElementById("Menubar.Tools.Eraser").getElementsByClassName("menulabel")[0];
  k.on_eraser_flip = () => {
    k.is_eraser ? e.innerText = "Pen" : e.innerText = "Eraser";
  }, e.onclick = () => {
    k.flip_eraser_state();
  };
}
function In(k, e) {
  navigator.vibrate([100]);
  const t = new te("Add/Delete lines"), o = document.createElement("button");
  o.innerText = "add", o.classList.add("addline"), o.innerText = "add";
  const s = document.createElement("input");
  s.type = "number", s.value = "1", s.classList.add("addlinecount");
  const l = document.createElement("button");
  l.innerText = "delete", l.classList.add("delline");
  const u = document.createElement("button");
  u.innerText = "duplicate", u.classList.add("delline"), t.appendChild(o), t.appendChild(s), t.appendChild(document.createElement("br")), t.appendChild(document.createElement("br")), t.appendChild(l), t.appendChild(document.createElement("br")), t.appendChild(document.createElement("br")), t.appendChild(u), t.attach(document.body);
  const h = () => {
    t.close_container();
  };
  o.onclick = async () => {
    await k.add_line(e, Math.floor(Number(s.value))), h();
  }, l.onclick = () => {
    k.delete_lines(e, 1), h();
  }, u.onclick = async () => {
    await k.duplicate_line(e), h();
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
  Tn("Menubar", wn);
  const k = document.getElementById("mycanvas");
  k.width = 1e3, k.height = 1e3;
  const e = k.getContext("2d");
  if (!e)
    return;
  const t = window.location.search, o = new URLSearchParams(t), s = o.get("upgradeui") || !1, l = async () => {
    const f = await G.getItem("lastNotebook");
    return f || "default";
  }, u = decodeURIComponent(o.get("notebook") || await l());
  await G.setItem("lastNotebook", u), document.getElementById("notebookName").innerText = u;
  const h = new pn(), p = new ke(), g = new Ge(e, p, h);
  await h.setActiveNotebook(u), await h.notebookIsInitialized() ? (await g.load(s), g.clearAndRedraw()) : (await g.save(), await h.initializeNotebook()), g.on_line_select = In.bind(null, g), g.installEventHandlers(), En(), kn(u, h), await Ze(u, h), await Cn(g), Ln(u, h, g), Sn(g);
  const S = document.getElementById("Menubar.Tools.Quick Links");
  S.onclick = () => {
    xn(p, h, g);
  }, window.notedown = g, window.localForage = G;
}
export {
  Mn as main
};
