import { CanvasContext, CanvasElement } from '../../src/types.ts';

export class MockCanvas implements CanvasElement {
  height: number = 0;
  width: number = 0;
  addEventListener(..._args: any) { }
  getBoundingClientRect(): DOMRect {
    return new DOMRect(0, 0, this.width, this.height);
  }
}

export class MockCanvasContext implements CanvasContext {
  strokeStyle: any = "";
  lineWidth: any = 0;
  canvas: CanvasElement;

  constructor() {
    this.canvas = new MockCanvas();
    this.canvas.width = 1000;
    this.canvas.height = 1000;
  }

  beginPath() { }
  stroke() { }
  moveTo(_x: number, _y: number) { }
  lineTo(_x: number, _y: number) { }
  clearRect(_x: number, _y: number, _width: number, _height: number) { }
  save() { }
  restore() { }
  transform(_a: number, _b: number, _c: number, _d: number, _e: number, _f: number) { }
}
