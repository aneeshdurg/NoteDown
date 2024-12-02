/**
 * Logically define regions of the canvas which will recieve events
 */
import { Point } from './stroke.ts';

type CallbackRetType = Promise<void> | void;
type Callback = (coords: Point) => CallbackRetType;
type CancelableCallback = (coords: Point) => Promise<boolean> | boolean | CallbackRetType;

/**
 * Line segment that was dragged
 */
export class DragEvent {
  start: Point;
  end: Point;

  constructor(start: Point, end: Point) {
    this.start = start;
    this.end = end;
  }
}

type PointerType = "touch" | "pen";

/**
 * Callbacks supported by a `Region`
 */
export interface RegionEvents {
  // touch gestures
  /** Callback invoked to begin or update dragging via touch */
  drag?: ((e: DragEvent) => CallbackRetType) | undefined;
  /**
   * Callback invoked when dragging is canceled
   * In most cases, this represents scenarios where the drag operation should be
   * ignored instead of committed
   */
  dragCancel?: (() => CallbackRetType) | undefined;
  /** Callback invoked when dragging completes succesfully */
  dragEnd?: Callback | undefined;
  /** Callback invoked when the region is tapped briefly via touch */
  tap?: Callback | undefined;
  /** Callback invoked when the region is pressed and held via touch */
  longPress?: CancelableCallback | undefined;

  // pen gestures
  /** Callback invoked to begin or update dragging via pen */
  penDrag?: ((e: DragEvent) => CallbackRetType) | undefined;
  /**
   * Callback invoked when dragging is canceled
   * In most cases, this represents scenarios where the drag operation should be
   * ignored instead of committed
   */
  penDragCancel?: (() => CallbackRetType) | undefined;
  /** Callback invoked when dragging completes succesfully */
  penDragEnd?: Callback | undefined;
  /** Callback invoked when the region is tapped briefly via pen */
  penTap?: Callback | undefined;
  /** Callback invoked when the region is pressed and held via pen */
  penLongPress?: CancelableCallback | undefined;
};

/** Timeout before a longPress callback is invoked */
const longPressTime_ms = 750;

/**
 * DOM event with coordinates
 */
interface CoordinateEvent {
  clientX: number;
  clientY: number;
  target: EventTarget | null;
}

/**
 * DOM event that could interact with the browser UI and presents a
 * preventDefault method
 */
interface InteractiveEvent extends CoordinateEvent {
  preventDefault: () => void;
};

/** Interface for a touch or pen event */
interface PointerEventLike extends InteractiveEvent {
  pointerId: number;
  pointerType: string;
};


class PointerDetails {
  /** Timestamp of pointer creation */
  createdAt: number;
  /** Whether the pointer has moved since creation */
  moved: boolean;
  /** Initial coordinates of pointer */
  initialPos: Point
  /** Last known coordinates of pointer */
  lastPos: Point;
  /** When true, this object is no longer valid */
  canceled: boolean;

  constructor(pos: Point) {
    this.createdAt = (new Date()).getTime();
    this.moved = false;
    this.initialPos = pos;
    this.lastPos = pos;
    this.canceled = false;
  }
};

/**
 * Region partitions canvas coordinate space into rectangles and registers rich
 * callbacks that only fire when the corresponding actions occur within the
 * specified partition.
 *
 * See RegionEvents for a list of events and callbacks that can be defined for a
 * Region.
 */
export class Region {
  /** Top left corner of this region */
  location: Point;
  width: number;
  height: number;

  /**
   * Number of pixels a touch event needs to move before it's considered
   * movement instead of noise
   */
  touchMoveThreshold = 5;
  /**
   * Number of pixels a pen event needs to move before it's considered
   * movement instead of noise
   */
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

  /** Get coordinates of an event relative the canvas coordinate space */
  static getCanvasCoords(e: CoordinateEvent): Point {
    const canvas = e.target! as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * canvas.width / rect.width;
    const y = (e.clientY - rect.top) * canvas.height / rect.height;
    return { x: x, y: y };
  }

  /** Check if coords is within this region */
  inRegion(coords: Point) {
    if (coords.x < this.location.x || coords.x >= (this.location.x + this.width)) {
      return false;
    }
    if (coords.y < this.location.y || coords.y >= (this.location.y + this.height)) {
      return false;
    }
    return true;
  }

  /**
   * Register this region with callbacks given by `cbs`
   */
  registerRegion(canvas: HTMLCanvasElement, cbs: RegionEvents) {
    /**
     * Map from pointer ids to information about pointer location/timers
     */
    const trackedPointer: Map<number, PointerDetails> = new Map();

    /**
     * Unregister a pointer from tracking - canceling any pending drag events
     * first
     */
    const pointerCancel = (type: PointerType, e: PointerEventLike) => {
      const details = trackedPointer.get(e.pointerId)
      if (details !== undefined && details.moved) {
        details.canceled = true;
        // Since drag events could be stateful, inform consumers that the drag
        // should be considered canceled (as opposed to completed).
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

    // Utility type for generic callbacks (could be pen or touch)
    type WrappedFnType = (type: PointerType, e: PointerEventLike) => void;

    /** Wraps `f` with a check that the event type matches `type` */
    const pointerEventWrapper = (type: PointerType, f: WrappedFnType) => {
      return (e: PointerEventLike) => {
        if (e.pointerType != type) {
          return;
        }
        const coords = Region.getCanvasCoords(e);
        if (!this.inRegion(coords)) {
          pointerCancel(type, e);
          return;
        }
        e.preventDefault();
        f(type, e);
      };
    };

    /** only runs `f` for touch events */
    const touchEventWrapper = (f: WrappedFnType) => pointerEventWrapper("touch", f);
    /** only runs `f` for pen events */
    const penEventWrapper = (f: WrappedFnType) => pointerEventWrapper("pen", f);

    const touchDown = (type: PointerType, e: PointerEventLike) => {
      const coords = Region.getCanvasCoords(e);
      const details = new PointerDetails(coords);
      trackedPointer.set(e.pointerId, details);

      if (trackedPointer.size > 1) {
        pointerCancel(type, e);
      }

      const cb = type === "touch" ? cbs.longPress : cbs.penLongPress;

      if (cb) {
        // Setup an event for the longPress event that will fire the longPress
        // callback if the pointer doesn't move for the duration of the timeout
        setTimeout(async () => {
          // If this pointer has already been canceled, or if it has moved, we
          // don't want to run the callback.
          if (details.canceled || details.moved) {
            return;
          }
          if (await cb(details.initialPos)) {
            // Unregister this pointer to prevent the `tap` event from firing as
            // well on pointer up (if the callback requested it to be supressed)
            pointerCancel(type, e);
          }
        }, longPressTime_ms);
      }
    };

    const touchUp = (type: PointerType, e: PointerEventLike) => {
      const details = trackedPointer.get(e.pointerId)
      // If this pointer was unregistered, don't run any callbacks
      if (details === undefined) {
        return;
      }
      const coords = Region.getCanvasCoords(e);

      if (!details.moved) {
        // If we didn't move between down/up events, then run the tap callbacks
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
        // We moved, so run end the drag with the callback
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
      // If this pointer was unregistered, don't run any callbacks
      if (details === undefined) {
        return;
      }

      const coords = Region.getCanvasCoords(e);
      const deltaX = coords.x - details.lastPos.x;
      const deltaY = coords.y - details.lastPos.y;
      const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const threshold = type === "touch" ? this.touchMoveThreshold : this.penMoveThreshold;
      // We only run callbacks if the distance moved is greater than the
      // threshold
      if (details.moved || dist > threshold) {
        let start = details.lastPos;
        if (!details.moved) {
          // TODO(aneesh) is this necessary? lastPos is initalized to the same
          // value as initialPos...
          start = coords;
        }
        // Set moved to true so that longPress callbacks will be supressed.
        details.moved = true;
        if (type == "touch") {
          if (cbs.drag) {
            cbs.drag(new DragEvent(start, coords));
          }
        } else {
          if (cbs.penDrag) {
            cbs.penDrag(new DragEvent(start, coords));
          }
        }
        details.lastPos = coords;
      }
    };


    // Register all touch events
    canvas.addEventListener("pointerdown", touchEventWrapper(touchDown));
    canvas.addEventListener("pointerup", touchEventWrapper(touchUp));
    canvas.addEventListener("pointercancel", touchEventWrapper(pointerCancel));
    canvas.addEventListener("pointermove", touchEventWrapper(touchMove));

    // Register all pen events
    canvas.addEventListener("pointerdown", penEventWrapper(touchDown));
    canvas.addEventListener("pointerup", penEventWrapper(touchUp));
    canvas.addEventListener("pointercancel", penEventWrapper(pointerCancel));
    canvas.addEventListener("pointermove", penEventWrapper(touchMove));

    // Disable all touch pen events - we don't want to pan while drawing
    const disableTouchEvt = (e: TouchEvent) => {
      try {
        if (e.cancelable) {
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].radiusX == 0 && e.changedTouches[i].radiusY == 0) {
              e.preventDefault();
              break;
            }
          }
        }
      } catch (e) {
        console.log("touch exception", e);
      }
    };
    canvas.addEventListener("touchstart", disableTouchEvt);
    canvas.addEventListener("touchend", disableTouchEvt);
    canvas.addEventListener("touchmove", disableTouchEvt);

    // mouse compatibility layer for testing/use on desktop
    const mouseEventWrapper = (f: WrappedFnType) => {
      return (e: MouseEvent) => {
        const coords = Region.getCanvasCoords(e);
        // When shift is held, simulate touch events instead of pen events
        const type = e.shiftKey ? "touch" : "pen";
        const ptr_e = e as unknown as PointerEventLike;
        ptr_e.pointerId = -1;
        ptr_e.pointerType = type;
        if (!this.inRegion(coords)) {
          pointerCancel(type, ptr_e);
          return;
        }
        f(type, ptr_e);
      };
    };
    canvas.addEventListener("mousedown", mouseEventWrapper(touchDown));
    canvas.addEventListener("mouseup", mouseEventWrapper(touchUp));
    canvas.addEventListener("mousemove", mouseEventWrapper(touchMove));
  }
}
