// Grab-bag of useful type aliases/abstractions

/**
 * Helper value to create a struct with an inaccessible member
 */
declare const tag: unique symbol

/**
 * Utility type to build "tagged" types. See Opaque below
 */
class OpaqueTag<S extends symbol> {
  [tag]: S | null = null;
}

/**
 * Opaque<T, S> is essential a value that can be used as if it is T, but cannot
 * be implicitly cast to a T. Effectively a wrapper that prevents implicit
 * casting. S must be a unique symbol that is only used to construct the type
 * wrapper.
 */
type Opaque<T, S extends symbol> = T & OpaqueTag<S>;

/**
 * Tag for RenderedLineNumber
 */
declare const RenderedLineNumberS: unique symbol
/**
 * Type that holds values that index lines in their rendered space
 * e.g. Suppose some document with 100 lines is being rendered on a screen that
 * only displays 10 lines at once. The first line on the screen will have a
 * RenderedLineNumber value of 0, regardless of which line from the document is
 * displayed.
 */
export type RenderedLineNumber = Opaque<number, typeof RenderedLineNumberS>

/**
 * Tag for RealLineNumber
 */
declare const RealLineNumberS: unique symbol
/**
 * Type that holds values that index lines in the document space
 * e.g. Suppose some document with 100 lines is being rendered on a screen that
 * only displays 10 lines at once. Each line on the screen will have a
 * RealLineNumber value of their index into the document being rendered,
 * regardless of which line on screen they are being displayed in.
 */
export type RealLineNumber = Opaque<number, typeof RealLineNumberS>

/**
 * Definition of the subset of HTMLCanvasElement that we access so that tests
 * can mock this interface
 */
export interface CanvasElement {
  height: number;
  width: number;
  addEventListener: typeof HTMLCanvasElement.prototype.addEventListener;
  getBoundingClientRect: typeof HTMLCanvasElement.prototype.getBoundingClientRect;
};

/**
 * Definition of the subset of CanvasRenderingContext2D that we access so that tests
 * can mock this interface
 */
export interface CanvasContext {
  beginPath: typeof CanvasRenderingContext2D.prototype.beginPath;
  strokeStyle: typeof CanvasRenderingContext2D.prototype.strokeStyle;
  lineWidth: typeof CanvasRenderingContext2D.prototype.lineWidth;
  moveTo: typeof CanvasRenderingContext2D.prototype.moveTo;
  lineTo: typeof CanvasRenderingContext2D.prototype.lineTo;
  stroke: typeof CanvasRenderingContext2D.prototype.stroke;
  clearRect: typeof CanvasRenderingContext2D.prototype.clearRect;
  save: typeof CanvasRenderingContext2D.prototype.save;
  restore: typeof CanvasRenderingContext2D.prototype.restore;
  transform: typeof CanvasRenderingContext2D.prototype.transform;
  canvas: typeof CanvasRenderingContext2D.prototype.canvas;
};



/**
 * Type for a valid JSON object (key/value map)
 */
export type JsonObject = { [key: string]: JsonValue };
/**
 * Type for a valid JSON value
 */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | JsonObject;
