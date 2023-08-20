export class Stroke {
  x_points: number[]
  y_points: number[]
  y_root: number
  constructor(y_root: number) {
    this.x_points = [];
    this.y_points = [];
    this.y_root = y_root;
  }

  add(x: number, y: number) {
    this.x_points.push(x);
    this.y_points.push(y - this.y_root);
  }

  draw(ctx: CanvasRenderingContext2D, y_root: number) {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(this.x_points[0], this.y_points[0] + y_root);
    for (let i = 1; i < this.x_points.length; i++) {
      ctx.lineTo(this.x_points[i], this.y_points[i] + y_root);
    }
    ctx.stroke();
  }
};
