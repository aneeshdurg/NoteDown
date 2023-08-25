/**
 * Logically define regions of the canvas which will recieve events
 **/
import { Point } from './stroke.ts';

type CallbackRetType = Promise<void> | void;
type Callback = (coords: Point) => CallbackRetType;
type CancelableCallback = (coords: Point) => Promise<boolean> | boolean | CallbackRetType;

export class DragEvent {
  start: Point;
  end: Point;

  constructor(start: Point, end: Point) {
    this.start = start;
    this.end = end;
  }
}

type PointerType = "touch" | "pen";

export interface RegionEvents {
  // touch gestures
  drag?: ((e: DragEvent) => CallbackRetType) | undefined;
  dragCancel?: (() => CallbackRetType) | undefined;
  dragEnd?: Callback | undefined;
  tap?: Callback | undefined;
  longPress?: CancelableCallback | undefined;

  // pen gestures
  penDrag?: ((e: DragEvent) => CallbackRetType) | undefined;
  penDragCancel?: (() => CallbackRetType) | undefined;
  penDragEnd?: Callback | undefined;
  penTap?: Callback | undefined;
  penLongPress?: CancelableCallback | undefined;
};

const longPressTime_ms = 750;

interface CoordinateEvent {
  clientX: number;
  clientY: number;
  target: EventTarget | null;
}

interface InteractiveEvent extends CoordinateEvent {
  preventDefault: () => void;
};


interface PointerEventLike extends InteractiveEvent {
  pointerId: number;
  pointerType: string;
};


let pointerDetailCounter = 0;
class PointerDetails {
  createdAt: number;
  moved: boolean;
  initialPos: Point
  lastPos: Point;
  counter: number;

  constructor(pos: Point) {
    this.createdAt = (new Date()).getTime();
    this.moved = false;
    this.initialPos = pos;
    this.lastPos = pos;
    this.counter = pointerDetailCounter++;
  }
};


export class Region {
  location: Point;
  width: number;
  height: number;

  touchMoveThreshold = 5;
  penMoveThreshold = 10;

  constructor(
    location: Point,
    width: number,
    height: number,
    touchMoveThreshold: number | undefined = undefined,
    penMoveThreshold: number | undefined = undefined,
  ) {
    this.location = location;
    this.width = width;
    this.height = height;
    if (touchMoveThreshold !== undefined) {
      this.touchMoveThreshold = touchMoveThreshold;
    }
    if (penMoveThreshold !== undefined) {
      this.penMoveThreshold = penMoveThreshold;
    }
  }

  static getCanvasCoords(e: CoordinateEvent): Point {
    const canvas = e.target! as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * canvas.width / rect.width;
    const y = (e.clientY - rect.top) * canvas.height / rect.height;
    return { x: x, y: y };
  }

  regionWrapper(cb: Callback) {
    return async (e: InteractiveEvent) => {
      e.preventDefault();
      const coords = Region.getCanvasCoords(e);
      if (coords.x < this.location.x || coords.x >= (this.location.x + this.width)) {
        return;
      }
      if (coords.y < this.location.y || coords.y >= (this.location.y + this.height)) {
        return;
      }
      await cb(coords);
    };
  }

  inRegion(coords: Point) {
    if (coords.x < this.location.x || coords.x >= (this.location.x + this.width)) {
      return false;
    }
    if (coords.y < this.location.y || coords.y >= (this.location.y + this.height)) {
      return false;
    }
    return true;
  }

  touchWrapper(cb: Callback): (e: TouchEvent) => Promise<void> {
    return async (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].radiusX == 0 && e.changedTouches[i].radiusY == 0) {
          const coords = Region.getCanvasCoords(e.changedTouches[i]);
          if (!this.inRegion(coords)) {
            return;
          }
          await cb(coords);

          break;
        }
      }
    }
  };

  touchRegionWrapper(cb: Callback) {
    const wrapped_cb = this.regionWrapper(cb);
    return async (e: PointerEventLike) => {
      if (e.pointerType != "touch") {
        return
      };
      await wrapped_cb(e);
      e.preventDefault();
      const coords = Region.getCanvasCoords(e);
      if (!this.inRegion(coords)) {
        return;
      }
      await cb(coords);
    };
  }

  registerEventHandler(canvas: HTMLCanvasElement, event: keyof HTMLElementEventMap, handler: Callback) {
    canvas.addEventListener(event, this.regionWrapper(handler) as any);
  }

  registerRegion(canvas: HTMLCanvasElement, cbs: RegionEvents) {
    const trackedPointer = new Map();

    const pointerCancel = (type: PointerType, e: PointerEventLike) => {
      const details = trackedPointer.get(e.pointerId)
      if (details !== undefined && details.moved) {
        if (type == "touch") {
          if (cbs.dragCancel) {
            cbs.dragCancel();
          }
        } else {
          if (cbs.penDragCancel) {
            cbs.penDragCancel();
          }
        }
      }
      trackedPointer.delete(e.pointerId);
    };

    type WrappedFnType = (type: PointerType, e: PointerEventLike) => void;

    const pointerEventWrapper = (type: PointerType, f: WrappedFnType) => {
      return (e: PointerEventLike) => {
        if (e.pointerType != type) {
          return;
        }
        const coords = Region.getCanvasCoords(e);
        if (!this.inRegion(coords)) {
          pointerCancel(type, e);
        }
        e.preventDefault();
        f(type, e);
      };
    };

    const touchEventWrapper = (f: WrappedFnType) => pointerEventWrapper("touch", f);
    const penEventWrapper = (f: WrappedFnType) => pointerEventWrapper("pen", f);

    const touchDown = (type: PointerType, e: PointerEventLike) => {
      const coords = Region.getCanvasCoords(e);
      trackedPointer.set(e.pointerId, new PointerDetails(coords));

      if (trackedPointer.size > 1) {
        pointerCancel(type, e);
      }

      const cb = type === "touch" ? cbs.longPress : cbs.penLongPress;

      if (cb) {
        setTimeout(async () => {
          const details = trackedPointer.get(e.pointerId);
          if (details === undefined || details.moved) {
            return;
          }
          if (await cb(details.initialPos)) {
            pointerCancel(type, e);
          }
        }, longPressTime_ms);
      }
    };

    const touchUp = (type: PointerType, e: PointerEventLike) => {
      const details = trackedPointer.get(e.pointerId)
      if (details === undefined) {
        return;
      }
      const coords = Region.getCanvasCoords(e);

      if (!details.moved) {
        if (type == "touch") {
          if (cbs.tap) {
            cbs.tap(details.initialPos);
          }
        } else {
          if (cbs.penTap) {
            cbs.penTap(details.initialPos);
          }
        }
      } else {
        if (type == "touch") {
          if (cbs.dragEnd) {
            cbs.dragEnd(coords);
          }
        } else {
          if (cbs.penDragEnd) {
            cbs.penDragEnd(coords);
          }
        }
      }
      pointerCancel(type, e);
    };

    const touchMove = (type: PointerType, e: PointerEventLike) => {
      const details = trackedPointer.get(e.pointerId)
      if (details === undefined) {
        return;
      }

      const coords = Region.getCanvasCoords(e);
      const deltaX = coords.x - details.lastPos.x;
      const deltaY = coords.y - details.lastPos.y;
      const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const threshold = type === "touch" ? this.touchMoveThreshold : this.penMoveThreshold;
      if (details.moved || dist > threshold) {
        details.moved = true;
        if (type == "touch") {
          if (cbs.drag) {
            cbs.drag(new DragEvent(details.lastPos, coords));
          }
        } else {
          if (cbs.penDrag) {
            cbs.penDrag(new DragEvent(details.lastPos, coords));
          }
        }
        details.lastPos = coords;
      }
    };


    canvas.addEventListener("pointerdown", touchEventWrapper(touchDown));
    canvas.addEventListener("pointerup", touchEventWrapper(touchUp));
    canvas.addEventListener("pointercancel", touchEventWrapper(pointerCancel));
    canvas.addEventListener("pointermove", touchEventWrapper(touchMove));

    canvas.addEventListener("pointerdown", penEventWrapper(touchDown));
    canvas.addEventListener("pointerup", penEventWrapper(touchUp));
    canvas.addEventListener("pointercancel", penEventWrapper(pointerCancel));
    canvas.addEventListener("pointermove", penEventWrapper(touchMove));

    // Disable all touch events - we only want pointer events
    canvas.addEventListener("touchstart", (e) => { e.preventDefault(); });
    canvas.addEventListener("touchend", (e) => { e.preventDefault(); });
    canvas.addEventListener("touchmove", (e) => { e.preventDefault(); });

    // mouse compatibility layer
    const mouseEventWrapper = (f: WrappedFnType) => {
      return (e: MouseEvent) => {
        const coords = Region.getCanvasCoords(e);
        const type = e.shiftKey ? "touch" : "pen";
        const ptr_e = e as unknown as PointerEventLike;
        ptr_e.pointerId = -1;
        ptr_e.pointerType = type;
        if (!this.inRegion(coords)) {
          pointerCancel(type, ptr_e);
        }
        f(type, ptr_e);
      };
    };
    canvas.addEventListener("mousedown", mouseEventWrapper(touchDown));
    canvas.addEventListener("mouseup", mouseEventWrapper(touchUp));
    canvas.addEventListener("mousemove", mouseEventWrapper(touchMove));
  }
}
