declare const tag: unique symbol
class OpaqueTag<S extends symbol> {
  [tag]: S | null = null;
}

type Opaque<T, S extends symbol> = T & OpaqueTag<S>;

declare const RenderedLineNumberS: unique symbol
export type RenderedLineNumber = Opaque<number, typeof RenderedLineNumberS>

declare const RealLineNumberS: unique symbol
export type RealLineNumber = Opaque<number, typeof RealLineNumberS>

// To make mocking canvas stuff out easier
export interface CanvasElement {
  height: number;
  width: number;
  addEventListener: typeof HTMLCanvasElement.prototype.addEventListener;
  getBoundingClientRect: typeof HTMLCanvasElement.prototype.getBoundingClientRect;
};

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
  getImageData: typeof CanvasRenderingContext2D.prototype.getImageData;
  putImageData: typeof CanvasRenderingContext2D.prototype.putImageData;
  canvas: typeof CanvasRenderingContext2D.prototype.canvas;
};



export type JsonObject = { [key: string]: JsonValue };
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | JsonObject;
